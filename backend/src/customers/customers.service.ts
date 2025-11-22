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

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private accountsService: AccountsService,
    private dataSource: DataSource,
    private generalLedgerService: GeneralLedgerService,
  ) { }

  /**
   * Create a new customer with an associated AR account
   * Uses database transaction to ensure data consistency
   */
  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<Customer> {
    // Use transaction to ensure both customer and account are created atomically
    return await this.dataSource.transaction(async (manager) => {
      // 1. Generate customer code (CUST-0001, CUST-0002, etc.)
      const customerCode = await this.getNextCustomerCode();

      // 2. Generate account code (02-0001, 02-0002, etc.)
      const accountCode = this.generateAccountCode(customerCode);

      // 3. Get or create the "Customers" parent account (02)
      const customersParentAccountId = await this.getCustomersParentAccountId(userId);

      // 4. Create AR account in Chart of Accounts
      const arAccount = await this.accountsService.create(
        {
          code: accountCode,
          name: createCustomerDto.name,
          accountType: AccountType.DETAIL,
          nature: AccountNature.DEBIT, // AR is a debit account
          category: AccountCategory.CUSTOMER,
          parentAccountId: customersParentAccountId,
          openingBalance: 0,
          isActive: createCustomerDto.isActive ?? true,
        },
        userId,
      );

      // 5. Create customer record
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
        receivableAccountId: arAccount.id,
        isActive: createCustomerDto.isActive ?? true,
        metadata: createCustomerDto.metadata,
        createdById: userId,
      });

      await manager.save(customer);

      // 6. Update the account with customer reference (bidirectional link)
      await manager
        .createQueryBuilder()
        .update('accounts')
        .set({ customerId: customer.id })
        .where('id = :accountId', { accountId: arAccount.id })
        .execute();

      // 7. Return customer with related account
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
    const { search, isActive, city, state, page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC' } = queryDto;

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
   * Note: Account name is automatically synced
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto, userId: string): Promise<Customer> {
    const customer = await this.findOne(id);

    // Update customer fields
    Object.assign(customer, {
      ...updateCustomerDto,
      updatedById: userId,
    });

    await this.customerRepository.save(customer);

    // If name changed, sync with account
    if (updateCustomerDto.name && updateCustomerDto.name !== customer.name) {
      await this.accountsService.update(
        customer.receivableAccountId,
        { name: updateCustomerDto.name },
        userId,
      );
    }

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

    // Also soft delete the associated account
    await this.accountsService.remove(customer.receivableAccountId);
  }

  /**
   * Get customer's current balance from general ledger
   */
  async getBalance(id: string): Promise<{
    customerId: string;
    customerName: string;
    accountCode: string;
    balance: number;
    balanceType: 'DR' | 'CR';
  }> {
    const customer = await this.findOne(id);

    const accountBalance = await this.generalLedgerService.getAccountBalance(customer.receivableAccountId);

    return {
      customerId: customer.id,
      customerName: customer.name,
      accountCode: customer.receivableAccount.code,
      balance: accountBalance.currentBalance,
      balanceType: accountBalance.balanceType,
    };
  }

  /**
   * Generate the next customer code (CUST-0001, CUST-0002, etc.)
   */
  private async getNextCustomerCode(): Promise<string> {
    const lastCustomer = await this.customerRepository.findOne({
      order: { code: 'DESC' },
    });

    if (!lastCustomer) {
      return 'CUST-0001';
    }

    const lastNumber = parseInt(lastCustomer.code.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Generate account code from customer code
   * CUST-0001 → 02-0001
   * CUST-0042 → 02-0042
   */
  private generateAccountCode(customerCode: string): string {
    const number = customerCode.split('-')[1];
    return `02-${number}`;
  }

  /**
   * Get or create the "Customers" parent account (code: 02)
   */
  private async getCustomersParentAccountId(userId: string): Promise<string> {
    // Try to find existing "Customers" parent account
    let parentAccount = await this.accountsService.findByCode('02');

    if (!parentAccount) {
      // Create the parent account if it doesn't exist
      parentAccount = await this.accountsService.create(
        {
          code: '02',
          name: 'Customers',
          accountType: AccountType.CONTROL,
          nature: AccountNature.DEBIT,
          category: AccountCategory.CUSTOMER,
          openingBalance: 0,
          isActive: true,
        },
        userId,
      );
    }

    return parentAccount.id;
  }
}

