import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, FindOptionsWhere } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { AccountsService } from '../accounts/accounts.service';
import { AccountType } from '../common/enums/account-type.enum';
import { AccountNature } from '../common/enums/account-nature.enum';
import { AccountCategory } from '../common/enums/account-category.enum';
import { GeneralLedgerService } from '../general-ledger/general-ledger.service';
import { GlAccountConfiguration } from '../common/entities/gl-account-configuration.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(GlAccountConfiguration)
    private glConfigRepository: Repository<GlAccountConfiguration>,
    private accountsService: AccountsService,
    private dataSource: DataSource,
    private generalLedgerService: GeneralLedgerService,
  ) {}

  /**
   * Create a new customer and link to the universal AR account
   */
  async create(
    createCustomerDto: CreateCustomerDto,
    userId: string,
  ): Promise<Customer> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Generate customer code (CUST-0001, CUST-0002, etc.)
      const customerCode = await this.getNextCustomerCode();

      // 2. Get the actual generic Accounts Receivable Control Account UUID
      const customersParentAccountId = await this.getCustomersParentAccountId();

      // 3. Create customer record
      const customer = manager.create(Customer, {
        code: customerCode,
        name: createCustomerDto.name,
        contactPerson: createCustomerDto.contactPerson,
        email: createCustomerDto.email,
        phone: createCustomerDto.phone,
        mobile: createCustomerDto.mobile,
        addressLine1: createCustomerDto.addressLine1,
        addressLine2: createCustomerDto.addressLine2,
        city: createCustomerDto.city,
        state: createCustomerDto.state,
        country: createCustomerDto.country ?? 'Pakistan',
        postalCode: createCustomerDto.postalCode,
        creditLimit: createCustomerDto.creditLimit ?? 0,
        creditDays: createCustomerDto.creditDays ?? 0,
        graceDays: createCustomerDto.graceDays ?? 3,
        taxId: createCustomerDto.taxId,
        gstNumber: createCustomerDto.gstNumber,
        receivableAccountId: customersParentAccountId, // Points purely to the GL AR control account!
        isActive: createCustomerDto.isActive ?? true,
        metadata: createCustomerDto.metadata,
        createdById: userId,
      });

      await manager.save(customer);

      const createdCustomer = await manager.findOne(Customer, {
        where: { id: customer.id },
        relations: ['receivableAccount'],
      });

      if (!createdCustomer) {
        throw new Error('Failed to create customer');
      }

      return createdCustomer;
    });
  }

  /**
   * Find all customers with pagination and filtering
   */
  async findAll(queryDto: QueryCustomersDto): Promise<{
    data: Customer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      search,
      isActive,
      city,
      state,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = queryDto;

    const where: FindOptionsWhere<Customer> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (city) {
      where.city = city;
    }

    if (state) {
      where.state = state;
    }

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.receivableAccount', 'account')
      .where(where);

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.code ILIKE :search OR customer.contactPerson ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`customer.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single customer by ID
   */
  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['receivableAccount', 'creator', 'updater'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Find a customer by code
   */
  async findByCode(code: string): Promise<Customer | null> {
    return await this.customerRepository.findOne({
      where: { code },
      relations: ['receivableAccount'],
    });
  }

  /**
   * Update a customer
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    userId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id);

    // Update customer fields
    Object.assign(customer, {
      ...updateCustomerDto,
      updatedById: userId,
    });

    await this.customerRepository.save(customer);

    return await this.findOne(id);
  }

  /**
   * Soft delete a customer
   * Only allowed if customer has no active GRNs or invoices
   */
  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);

    // TODO: Add check for active GRNs/invoices when those modules are implemented
    // For now, just soft delete

    await this.customerRepository.softDelete(id);
  }

  /**
   * Get customer's current balance from the Subledger (Invoices)
   */
  async getBalance(id: string): Promise<{
    customerId: string;
    customerName: string;
    accountCode: string;
    balance: number;
    balanceType: 'DR' | 'CR';
  }> {
    const customer = await this.findOne(id);

    // Sum all unpaid invoices as the DR balance.
    // In a full implementation, we'd also subtract unapplied CR Vouchers or Payments.
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(balance_due), 0) as balance FROM invoices WHERE customer_id = $1 AND status NOT IN ('DRAFT', 'CANCELLED')`,
      [id],
    );
    const balance = parseFloat(result[0].balance || 0);

    return {
      customerId: customer.id,
      customerName: customer.name,
      accountCode: customer.receivableAccount?.code || '1-1100', // The AR Control Account code
      balance: balance,
      balanceType: balance >= 0 ? 'DR' : 'CR',
    };
  }
  /**
   * Generate the next customer code (CUST-0001, CUST-0002, etc.)
   */
  private async getNextCustomerCode(): Promise<string> {
    // Only match standard CUST-NNNN pattern (ignore special codes like CUST-GOV-001)
    const lastCustomer = await this.customerRepository
      .createQueryBuilder('c')
      .where("c.code ~ '^CUST-[0-9]+$'")
      .orderBy('c.code', 'DESC')
      .getOne();

    if (!lastCustomer) {
      return 'CUST-0001';
    }

    const lastNumber = parseInt(lastCustomer.code.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Get the designated Accounts Receivable parent account from global config
   */
  private async getCustomersParentAccountId(): Promise<string> {
    const config = await this.glConfigRepository.findOne({
      where: { configKey: 'ACCOUNTS_RECEIVABLE', isActive: true },
    });
    if (!config || !config.accountId) {
      throw new Error(
        'Critical Configuration Error: ACCOUNTS_RECEIVABLE GL configuration is missing.',
      );
    }
    return config.accountId;
  }
}
