import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ColdStoreLot,
  ColdStoreLotStatus,
  BillingUnitType,
} from '../entities/cold-store-lot.entity';
import {
  RentalBillingCycle,
  RentalCycleStatus,
} from '../entities/rental-billing-cycle.entity';
import { TaxService } from '../../tax/tax.service';
import { TaxType } from '../../common/enums/tax-type.enum';

export interface RentalChargeBreakdown {
  billingUnit: BillingUnitType;
  billingStartDate: Date;
  billingEndDate: Date;
  daysStored: number;
  bagsBilled?: number;
  weightBilledKg?: number;
  rateApplied: number;
  storageCharges: number;
  handlingChargesIn: number;
  handlingChargesOut: number;
  otherCharges: number;
  subtotal: number;
  gstAmount: number;
  whtAmount: number;
  totalAmount: number;
  formula: string;
}

@Injectable()
export class RentalBillingService {
  private readonly logger = new Logger(RentalBillingService.name);

  constructor(
    @InjectRepository(ColdStoreLot)
    private readonly lotRepo: Repository<ColdStoreLot>,
    @InjectRepository(RentalBillingCycle)
    private readonly cycleRepo: Repository<RentalBillingCycle>,
    private readonly taxService: TaxService,
  ) {}

  /**
   * Calculate rental charges for a lot up to a given date.
   * Supports both PER_BAG (seasonal) and PER_KG (daily) billing modes.
   *
   * PER_BAG formula:  storage_charges = rate_per_bag × bags_in
   *   (one-time seasonal charge — days don't matter)
   *
   * PER_KG formula:   storage_charges = rate_per_kg_per_day × net_weight_kg × days_stored
   *   (daily accrual — minimum 1 day)
   */
  async calculateChargesForLot(
    lot: ColdStoreLot,
    toDate: Date,
    handlingChargesOut: number = 0,
    otherCharges: number = 0,
    applyGst: boolean = true,
    applyWht: boolean = false,
    quantityToBill?: number,
  ): Promise<RentalChargeBreakdown> {
    const billingStart = new Date(lot.billingStartDate);
    const billingEnd = new Date(toDate);

    const daysStored = this.calculateDaysStored(billingStart, billingEnd);

    let storageCharges = 0;
    let rateApplied = 0;
    let bagsBilled: number | undefined;
    let weightBilledKg: number | undefined;
    let formula: string;

    if (lot.billingUnit === BillingUnitType.PER_BAG) {
      // Seasonal: one-time charge regardless of duration
      if (!lot.ratePerBagPerSeason || lot.ratePerBagPerSeason <= 0) {
        throw new BadRequestException(
          `Lot ${lot.lotNumber} has no rate_per_bag_per_season configured`,
        );
      }
      rateApplied = Number(lot.ratePerBagPerSeason);
      bagsBilled = quantityToBill !== undefined ? quantityToBill : lot.bagsIn;
      storageCharges = rateApplied * bagsBilled;
      formula = `PKR ${rateApplied}/bag × ${bagsBilled} bags = PKR ${storageCharges.toFixed(2)}`;
    } else {
      // Daily weight-based
      if (!lot.ratePerKgPerDay || lot.ratePerKgPerDay <= 0) {
        throw new BadRequestException(
          `Lot ${lot.lotNumber} has no rate_per_kg_per_day configured`,
        );
      }
      rateApplied = Number(lot.ratePerKgPerDay);

      // If partial quantity specified, calculate proportional weight
      if (quantityToBill !== undefined && lot.bagsIn > 0) {
        weightBilledKg =
          (quantityToBill / lot.bagsIn) * Number(lot.netWeightKg);
      } else {
        weightBilledKg = Number(lot.netWeightKg);
      }
      // Round weight to 3 decimal places
      weightBilledKg = Math.round(weightBilledKg * 1000) / 1000;

      storageCharges = rateApplied * weightBilledKg * daysStored;
      formula = `PKR ${rateApplied}/kg/day × ${weightBilledKg} kg × ${daysStored} days = PKR ${storageCharges.toFixed(2)}`;
    }

    const subtotal = storageCharges + handlingChargesOut + otherCharges;

    let gstAmount = 0;
    let whtAmount = 0;

    if (applyGst) {
      try {
        const gstResult = await this.taxService.calculateTax({
          amount: subtotal,
          taxType: TaxType.GST,
          customerId: lot.customerId,
        });
        gstAmount = gstResult.taxAmount;
      } catch (error) {
        this.logger.warn(
          `Could not calculate GST for lot ${lot.lotNumber}: ${error.message}`,
        );
        // fallback if not configured, or let it throw if strict compliance
      }
    }

    if (applyWht) {
      try {
        const whtResult = await this.taxService.calculateTax({
          amount: subtotal,
          taxType: TaxType.WHT,
          customerId: lot.customerId,
        });
        whtAmount = whtResult.taxAmount;
      } catch (error) {
        this.logger.warn(
          `Could not calculate WHT for lot ${lot.lotNumber}: ${error.message}`,
        );
      }
    }

    const totalAmount = this.round2(subtotal + gstAmount - whtAmount);

    this.logger.log(
      `Billing for lot ${lot.lotNumber}: ${formula} | Total: PKR ${totalAmount}`,
    );

    return {
      billingUnit: lot.billingUnit,
      billingStartDate: billingStart,
      billingEndDate: billingEnd,
      daysStored,
      bagsBilled,
      weightBilledKg,
      rateApplied,
      storageCharges: this.round2(storageCharges),
      handlingChargesIn: 0, // captured at inward time
      handlingChargesOut: this.round2(handlingChargesOut),
      otherCharges: this.round2(otherCharges),
      subtotal: this.round2(subtotal),
      gstAmount,
      whtAmount,
      totalAmount,
      formula,
    };
  }

  /**
   * Get the active billing cycle for a lot.
   */
  async getActiveCycle(lotId: string): Promise<RentalBillingCycle | null> {
    return this.cycleRepo.findOne({
      where: { lotId, status: RentalCycleStatus.ACTIVE },
    });
  }

  /**
   * Get all billing cycles for a lot.
   */
  async getCyclesForLot(lotId: string): Promise<RentalBillingCycle[]> {
    return this.cycleRepo.find({
      where: { lotId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all active billing cycles (for dashboard / accrual view).
   */
  async getAllActiveCycles(): Promise<RentalBillingCycle[]> {
    return this.cycleRepo.find({
      where: { status: RentalCycleStatus.ACTIVE },
      relations: ['lot', 'customer'],
      order: { billingStartDate: 'ASC' },
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Days stored: always round up, minimum 1 day.
   */
  private calculateDaysStored(from: Date, to: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = to.getTime() - from.getTime();
    return Math.max(1, Math.ceil(diff / msPerDay));
  }

  private round2(val: number): number {
    return Math.round(val * 100) / 100;
  }
}
