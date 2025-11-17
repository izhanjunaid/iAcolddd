import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { CalculateStorageBillingDto, RateType } from '../dto/calculate-storage-billing.dto';
import { StorageBillingResultDto } from '../dto/storage-billing-result.dto';
import { BillingRateConfiguration } from '../../common/entities/billing-rate-configuration.entity';
import { TaxService } from '../../tax/tax.service';
import { TaxType } from '../../common/enums/tax-type.enum';

@Injectable()
export class StorageBillingService {
  private readonly logger = new Logger(StorageBillingService.name);

  // Fallback rates if database configuration is missing
  private readonly FALLBACK_DAILY_RATE = 2.0;
  private readonly FALLBACK_SEASONAL_RATE = 1.5;
  private readonly FALLBACK_MONTHLY_RATE = 1.2;

  constructor(
    private readonly taxService: TaxService,
    @InjectRepository(BillingRateConfiguration)
    private readonly rateConfigRepository: Repository<BillingRateConfiguration>,
  ) {}

  /**
   * Calculate storage billing charges
   * Formula: Storage Charges = Weight (kg) × Rate (PKR/kg/day) × Days Stored
   */
  async calculateStorageBilling(
    dto: CalculateStorageBillingDto,
  ): Promise<StorageBillingResultDto> {
    this.logger.log(`Calculating storage billing for ${dto.weight} kg from ${dto.dateIn} to ${dto.dateOut}`);

    // Validate dates
    this.validateDates(dto.dateIn, dto.dateOut);

    // Calculate number of days stored (always round up)
    const daysStored = this.calculateDaysStored(dto.dateIn, dto.dateOut);

    // Determine applicable rate
    const ratePerKgPerDay = await this.determineRate(dto, daysStored);

    // Calculate storage charges
    const storageCharges = this.calculateStorageCharges(
      dto.weight,
      ratePerKgPerDay,
      daysStored,
    );

    // Calculate labour and other charges
    const labourCharges = (dto.labourChargesIn || 0) + (dto.labourChargesOut || 0);
    const loadingCharges = dto.loadingCharges || 0;
    const otherCharges = dto.otherCharges || 0;

    // Calculate subtotal
    const subtotal = storageCharges + labourCharges + loadingCharges + otherCharges;

    // Calculate taxes if applicable
    let gstAmount = 0;
    let gstRate = 0;
    let whtAmount = 0;
    let whtRate = 0;

    if (dto.applyGst !== false) {
      const gstCalculation = await this.taxService.calculateTax({
        amount: subtotal,
        taxType: TaxType.GST,
        customerId: dto.customerId,
      });
      gstAmount = gstCalculation.taxAmount;
      gstRate = gstCalculation.taxRate;
    }

    if (dto.applyWht !== false) {
      const whtCalculation = await this.taxService.calculateTax({
        amount: subtotal,
        taxType: TaxType.WHT,
        customerId: dto.customerId,
      });
      whtAmount = whtCalculation.taxAmount;
      whtRate = whtCalculation.taxRate;
    }

    // Calculate total (GST is added, WHT is deducted)
    const totalAmount = subtotal + gstAmount - whtAmount;

    // Build calculation breakdown for transparency
    const breakdown = {
      storageCalculation: `${dto.weight} kg × PKR ${ratePerKgPerDay}/kg/day × ${daysStored} days = PKR ${storageCharges.toLocaleString()}`,
      labourCalculation: `Labour In: PKR ${dto.labourChargesIn || 0} + Labour Out: PKR ${dto.labourChargesOut || 0} + Loading: PKR ${loadingCharges} + Other: PKR ${otherCharges} = PKR ${(labourCharges + loadingCharges + otherCharges).toLocaleString()}`,
      taxCalculation: `Subtotal: PKR ${subtotal.toLocaleString()} + GST (${gstRate}%): PKR ${gstAmount.toLocaleString()} - WHT (${whtRate}%): PKR ${whtAmount.toLocaleString()} = PKR ${totalAmount.toLocaleString()}`,
    };

    const result: StorageBillingResultDto = {
      weight: dto.weight,
      daysStored,
      ratePerKgPerDay,
      storageCharges: this.roundToTwoDecimals(storageCharges),
      labourCharges: this.roundToTwoDecimals(labourCharges),
      loadingCharges: this.roundToTwoDecimals(loadingCharges),
      otherCharges: this.roundToTwoDecimals(otherCharges),
      subtotal: this.roundToTwoDecimals(subtotal),
      gstAmount: this.roundToTwoDecimals(gstAmount),
      gstRate,
      whtAmount: this.roundToTwoDecimals(whtAmount),
      whtRate,
      totalAmount: this.roundToTwoDecimals(totalAmount),
      dateIn: dto.dateIn,
      dateOut: dto.dateOut,
      breakdown,
    };

    this.logger.log(`Billing calculation complete: Total = PKR ${totalAmount.toLocaleString()}`);
    return result;
  }

  /**
   * Validate that dates are logical
   */
  private validateDates(dateIn: Date, dateOut: Date): void {
    if (dateOut < dateIn) {
      throw new BadRequestException('Date out cannot be before date in');
    }

    // Check if dates are in the future (optional validation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateIn > today) {
      this.logger.warn(`Date in (${dateIn}) is in the future`);
    }
  }

  /**
   * Calculate number of days stored
   * Always round up (partial day = full day charge)
   * Minimum 1 day even for same-day in/out
   */
  private calculateDaysStored(dateIn: Date, dateOut: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = dateOut.getTime() - dateIn.getTime();
    const diffDays = diffMs / msPerDay;

    // Always round up, minimum 1 day
    return Math.max(1, Math.ceil(diffDays));
  }

  /**
   * Determine applicable rate based on customer, category, or duration
   * Priority: Provided rate > Customer-specific > Category-specific > Duration-based from DB > Fallback
   */
  private async determineRate(dto: CalculateStorageBillingDto, daysStored: number): Promise<number> {
    // If rate explicitly provided, use it
    if (dto.ratePerKgPerDay !== undefined && dto.ratePerKgPerDay > 0) {
      return dto.ratePerKgPerDay;
    }

    const today = new Date();

    // Try to fetch customer-specific rate from database
    if (dto.customerId) {
      const customerRate = await this.findApplicableRate(
        this.getRateTypeString(dto.rateType, daysStored),
        dto.customerId,
        dto.productCategoryId || null,
        today,
      );

      if (customerRate) {
        this.logger.log(`Using customer-specific rate: PKR ${customerRate} for customer ${dto.customerId}`);
        return customerRate;
      }
    }

    // Try to fetch category-specific rate
    if (dto.productCategoryId) {
      const categoryRate = await this.findApplicableRate(
        this.getRateTypeString(dto.rateType, daysStored),
        null,
        dto.productCategoryId || null,
        today,
      );

      if (categoryRate) {
        this.logger.log(`Using category-specific rate: PKR ${categoryRate} for category ${dto.productCategoryId}`);
        return categoryRate;
      }
    }

    // Fetch default rate from database based on rate type
    const rateTypeStr = this.getRateTypeString(dto.rateType, daysStored);
    const defaultRate = await this.findApplicableRate(rateTypeStr, null, null, today);

    if (defaultRate) {
      this.logger.log(`Using default ${rateTypeStr} rate from database: PKR ${defaultRate}`);
      return defaultRate;
    }

    // Fall back to hardcoded rates if database configuration is missing
    this.logger.warn(`No rate configuration found in database, using fallback rates`);
    if (dto.rateType === RateType.SEASONAL || daysStored >= 30) {
      return this.FALLBACK_SEASONAL_RATE;
    } else if (dto.rateType === RateType.MONTHLY || daysStored >= 60) {
      return this.FALLBACK_MONTHLY_RATE;
    } else {
      return this.FALLBACK_DAILY_RATE;
    }
  }

  /**
   * Find applicable rate from database based on filters and effective dates
   */
  private async findApplicableRate(
    rateType: string,
    customerId: string | null,
    productCategoryId: string | null,
    effectiveDate: Date,
  ): Promise<number | null> {
    try {
      const queryBuilder = this.rateConfigRepository
        .createQueryBuilder('rate')
        .where('rate.isActive = :isActive', { isActive: true })
        .andWhere('rate.rateType = :rateType', { rateType })
        .andWhere('rate.effectiveFrom <= :effectiveDate', { effectiveDate })
        .andWhere(
          '(rate.effectiveTo IS NULL OR rate.effectiveTo >= :effectiveDate)',
          { effectiveDate },
        );

      if (customerId) {
        queryBuilder.andWhere('rate.customerId = :customerId', { customerId });
      } else {
        queryBuilder.andWhere('rate.customerId IS NULL');
      }

      if (productCategoryId) {
        queryBuilder.andWhere('rate.productCategoryId = :productCategoryId', { productCategoryId });
      } else {
        queryBuilder.andWhere('rate.productCategoryId IS NULL');
      }

      // Order by most recent effective date
      queryBuilder.orderBy('rate.effectiveFrom', 'DESC').limit(1);

      const rateConfig = await queryBuilder.getOne();

      return rateConfig ? parseFloat(rateConfig.rateValue.toString()) : null;
    } catch (error) {
      this.logger.error(`Error fetching rate configuration: ${error.message}`);
      return null;
    }
  }

  /**
   * Get rate type string based on DTO and days stored
   */
  private getRateTypeString(rateType: RateType | undefined, daysStored: number): string {
    if (rateType === RateType.SEASONAL) return 'seasonal';
    if (rateType === RateType.MONTHLY) return 'monthly';
    if (daysStored >= 60) return 'monthly';
    if (daysStored >= 30) return 'seasonal';
    return 'daily';
  }

  /**
   * Calculate storage charges
   * Formula: Weight × Rate × Days
   */
  private calculateStorageCharges(
    weight: number,
    rate: number,
    days: number,
  ): number {
    return weight * rate * days;
  }

  /**
   * Round to 2 decimal places for currency
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculate seasonal billing (30-day blocks)
   * For future enhancement
   */
  async calculateSeasonalBilling(dto: CalculateStorageBillingDto): Promise<StorageBillingResultDto> {
    const modifiedDto = {
      ...dto,
      rateType: RateType.SEASONAL,
      ratePerKgPerDay: dto.ratePerKgPerDay || this.FALLBACK_SEASONAL_RATE,
    };
    return this.calculateStorageBilling(modifiedDto);
  }

  /**
   * Calculate monthly billing (custom day ranges)
   * For future enhancement
   */
  async calculateMonthlyBilling(dto: CalculateStorageBillingDto): Promise<StorageBillingResultDto> {
    const modifiedDto = {
      ...dto,
      rateType: RateType.MONTHLY,
      ratePerKgPerDay: dto.ratePerKgPerDay || this.FALLBACK_MONTHLY_RATE,
    };
    return this.calculateStorageBilling(modifiedDto);
  }
}
