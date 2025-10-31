import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { TaxRate, TaxConfiguration } from './entities';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  QueryTaxRatesDto,
  CalculateTaxDto,
  CalculateInvoiceTaxDto,
  TaxCalculationResult,
  InvoiceTaxCalculationResult,
} from './dto';
import { TaxType } from '../common/enums/tax-type.enum';
import { TaxApplicability, TaxEntityType } from '../common/enums/tax-applicability.enum';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
    @InjectRepository(TaxConfiguration)
    private readonly taxConfigRepository: Repository<TaxConfiguration>,
  ) {}

  // ==========================================
  // TAX RATE MANAGEMENT
  // ==========================================

  async createTaxRate(createDto: CreateTaxRateDto, userId: string): Promise<TaxRate> {
    // Check if default rate already exists for this tax type
    if (createDto.isDefault) {
      const existingDefault = await this.taxRateRepository.findOne({
        where: {
          taxType: createDto.taxType,
          isDefault: true,
        },
      });

      if (existingDefault) {
        throw new ConflictException(
          `A default rate already exists for ${createDto.taxType}. ` +
          `Please unset the existing default first.`
        );
      }
    }

    // Validate dates
    if (createDto.effectiveTo && new Date(createDto.effectiveTo) < new Date(createDto.effectiveFrom)) {
      throw new BadRequestException('Effective to date must be after effective from date');
    }

    const taxRate = this.taxRateRepository.create({
      ...createDto,
      createdById: userId,
      updatedById: userId,
    });

    return await this.taxRateRepository.save(taxRate);
  }

  async findAllTaxRates(query: QueryTaxRatesDto): Promise<{
    data: TaxRate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, taxType, applicability, isActive, search } = query;

    const queryBuilder = this.taxRateRepository
      .createQueryBuilder('tr')
      .leftJoinAndSelect('tr.createdBy', 'creator')
      .leftJoinAndSelect('tr.updatedBy', 'updater');

    // Apply filters
    if (taxType) {
      queryBuilder.andWhere('tr.taxType = :taxType', { taxType });
    }

    if (applicability) {
      queryBuilder.andWhere('tr.applicability = :applicability', { applicability });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('tr.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(tr.name ILIKE :search OR tr.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Order by tax type and rate
    queryBuilder.orderBy('tr.taxType', 'ASC').addOrderBy('tr.rate', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneTaxRate(id: string): Promise<TaxRate> {
    const taxRate = await this.taxRateRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID ${id} not found`);
    }

    return taxRate;
  }

  async updateTaxRate(id: string, updateDto: UpdateTaxRateDto, userId: string): Promise<TaxRate> {
    const taxRate = await this.findOneTaxRate(id);

    // Check default constraint if changing to default
    if (updateDto.isDefault && !taxRate.isDefault) {
      const existingDefault = await this.taxRateRepository.findOne({
        where: {
          taxType: taxRate.taxType,
          isDefault: true,
        },
      });

      if (existingDefault && existingDefault.id !== id) {
        throw new ConflictException(
          `Another default rate exists for ${taxRate.taxType}. ` +
          `Please unset it first.`
        );
      }
    }

    Object.assign(taxRate, updateDto, { updatedById: userId });
    return await this.taxRateRepository.save(taxRate);
  }

  async deleteTaxRate(id: string): Promise<void> {
    const taxRate = await this.findOneTaxRate(id);

    // Check if tax rate is used in configurations
    const configCount = await this.taxConfigRepository.count({
      where: { taxRateId: id },
    });

    if (configCount > 0) {
      throw new BadRequestException(
        `Cannot delete tax rate. It is used in ${configCount} configuration(s).`
      );
    }

    await this.taxRateRepository.remove(taxRate);
  }

  // ==========================================
  // TAX CALCULATION LOGIC
  // ==========================================

  /**
   * Calculate tax for a given amount and tax type
   */
  async calculateTax(dto: CalculateTaxDto): Promise<TaxCalculationResult> {
    const { amount, taxType, customerId, productId, transactionType } = dto;

    // 1. Check if customer/product is tax-exempt
    const exemptionStatus = await this.checkTaxExemption(
      taxType,
      customerId,
      productId
    );

    if (exemptionStatus.isExempt) {
      return {
        taxType,
        taxRate: 0,
        taxableAmount: amount,
        taxAmount: 0,
        isExempt: true,
        exemptionReason: exemptionStatus.reason,
      };
    }

    // 2. Get applicable tax rate
    const taxRate = await this.getApplicableTaxRate(
      taxType,
      customerId,
      productId,
      transactionType
    );

    if (!taxRate) {
      throw new NotFoundException(
        `No applicable tax rate found for ${taxType}`
      );
    }

    // 3. Calculate tax amount
    const taxAmount = (amount * taxRate.rate) / 100;

    return {
      taxType,
      taxRate: Number(taxRate.rate),
      taxableAmount: amount,
      taxAmount: Number(taxAmount.toFixed(2)),
      isExempt: false,
      appliedRate: {
        id: taxRate.id,
        name: taxRate.name,
        rate: Number(taxRate.rate),
      },
    };
  }

  /**
   * Calculate all taxes for an invoice
   */
  async calculateInvoiceTaxes(dto: CalculateInvoiceTaxDto): Promise<InvoiceTaxCalculationResult> {
    const { subtotal, customerId, items = [] } = dto;

    const taxBreakdown: TaxCalculationResult[] = [];
    let gstAmount = 0;
    let whtAmount = 0;
    let incomeTaxAmount = 0;

    // Calculate GST
    const gstResult = await this.calculateTax({
      amount: subtotal,
      taxType: TaxType.GST,
      customerId,
    });
    taxBreakdown.push(gstResult);
    gstAmount = gstResult.taxAmount;

    // Calculate WHT (if applicable)
    try {
      const whtResult = await this.calculateTax({
        amount: subtotal,
        taxType: TaxType.WHT,
        customerId,
      });
      taxBreakdown.push(whtResult);
      whtAmount = whtResult.taxAmount;
    } catch (error) {
      // WHT might not be applicable, continue
    }

    // Calculate total tax and grand total
    const totalTaxAmount = gstAmount - whtAmount + incomeTaxAmount;
    const grandTotal = subtotal + totalTaxAmount;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      whtAmount: Number(whtAmount.toFixed(2)),
      incomeTaxAmount: Number(incomeTaxAmount.toFixed(2)),
      totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      taxBreakdown,
    };
  }

  /**
   * Get applicable tax rate based on various criteria
   */
  private async getApplicableTaxRate(
    taxType: TaxType,
    customerId?: string,
    productId?: string,
    transactionType?: string
  ): Promise<TaxRate | null> {
    const today = new Date();

    // 1. Check for customer-specific rate
    if (customerId) {
      const customerConfig = await this.taxConfigRepository.findOne({
        where: {
          entityType: TaxEntityType.CUSTOMER,
          entityId: customerId,
        },
        relations: ['taxRate'],
      });

      if (customerConfig && customerConfig.taxRate.taxType === taxType) {
        return customerConfig.taxRate;
      }
    }

    // 2. Check for product-specific rate
    if (productId) {
      const productConfig = await this.taxConfigRepository.findOne({
        where: {
          entityType: TaxEntityType.PRODUCT,
          entityId: productId,
        },
        relations: ['taxRate'],
      });

      if (productConfig && productConfig.taxRate.taxType === taxType) {
        return productConfig.taxRate;
      }
    }

    // 3. Get default rate for this tax type
    const defaultRate = await this.taxRateRepository.findOne({
      where: {
        taxType,
        isActive: true,
        isDefault: true,
        effectiveFrom: LessThanOrEqual(today),
        effectiveTo: Or(MoreThanOrEqual(today), IsNull()),
      },
    });

    return defaultRate;
  }

  /**
   * Check if entity is tax-exempt
   */
  private async checkTaxExemption(
    taxType: TaxType,
    customerId?: string,
    productId?: string
  ): Promise<{ isExempt: boolean; reason?: string }> {
    const today = new Date();

    // Check customer exemption
    if (customerId) {
      const customerExemption = await this.taxConfigRepository.findOne({
        where: {
          entityType: TaxEntityType.CUSTOMER,
          entityId: customerId,
          isExempt: true,
        },
        relations: ['taxRate'],
      });

      if (
        customerExemption &&
        customerExemption.taxRate.taxType === taxType &&
        (!customerExemption.exemptionValidTo ||
          new Date(customerExemption.exemptionValidTo) >= today)
      ) {
        return {
          isExempt: true,
          reason: customerExemption.exemptionReason || 'Customer is tax-exempt',
        };
      }
    }

    // Check product exemption
    if (productId) {
      const productExemption = await this.taxConfigRepository.findOne({
        where: {
          entityType: TaxEntityType.PRODUCT,
          entityId: productId,
          isExempt: true,
        },
        relations: ['taxRate'],
      });

      if (
        productExemption &&
        productExemption.taxRate.taxType === taxType &&
        (!productExemption.exemptionValidTo ||
          new Date(productExemption.exemptionValidTo) >= today)
      ) {
        return {
          isExempt: true,
          reason: productExemption.exemptionReason || 'Product is tax-exempt',
        };
      }
    }

    return { isExempt: false };
  }

  // ==========================================
  // TAX CONFIGURATION MANAGEMENT
  // ==========================================

  async createTaxConfiguration(dto: any, userId: string): Promise<TaxConfiguration> {
    // Validate tax rate exists
    const taxRate = await this.findOneTaxRate(dto.taxRateId);

    const config = this.taxConfigRepository.create(dto);
    return await this.taxConfigRepository.save(config) as any as TaxConfiguration;
  }

  async findTaxConfigurationsForEntity(
    entityType: TaxEntityType,
    entityId: string
  ): Promise<TaxConfiguration[]> {
    return await this.taxConfigRepository.find({
      where: { entityType, entityId },
      relations: ['taxRate'],
    });
  }

  async deleteTaxConfiguration(id: string): Promise<void> {
    const config = await this.taxConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Tax configuration with ID ${id} not found`);
    }
    await this.taxConfigRepository.remove(config);
  }
}
