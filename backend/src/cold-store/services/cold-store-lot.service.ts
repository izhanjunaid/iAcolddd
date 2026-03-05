import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ColdStoreLot,
  ColdStoreLotStatus,
} from '../entities/cold-store-lot.entity';
import {
  RentalBillingCycle,
  RentalCycleStatus,
} from '../entities/rental-billing-cycle.entity';
import {
  RentalBillingService,
  RentalChargeBreakdown,
} from './rental-billing.service';

@Injectable()
export class ColdStoreLotService {
  private readonly logger = new Logger(ColdStoreLotService.name);

  constructor(
    @InjectRepository(ColdStoreLot)
    private readonly lotRepo: Repository<ColdStoreLot>,
    @InjectRepository(RentalBillingCycle)
    private readonly cycleRepo: Repository<RentalBillingCycle>,
    private readonly rentalBillingService: RentalBillingService,
  ) {}

  async findAll(filters?: {
    customerId?: string;
    status?: ColdStoreLotStatus;
    chamberId?: string;
    commodity?: string;
  }): Promise<ColdStoreLot[]> {
    const qb = this.lotRepo
      .createQueryBuilder('lot')
      .leftJoinAndSelect('lot.customer', 'customer')
      .leftJoinAndSelect('lot.chamber', 'chamber')
      .orderBy('lot.inwardDate', 'DESC');

    if (filters?.customerId)
      qb.andWhere('lot.customerId = :cid', { cid: filters.customerId });
    if (filters?.status)
      qb.andWhere('lot.status = :status', { status: filters.status });
    if (filters?.chamberId)
      qb.andWhere('lot.chamberId = :cid', { cid: filters.chamberId });
    if (filters?.commodity)
      qb.andWhere('lot.commodity ILIKE :c', { c: `%${filters.commodity}%` });

    return qb.getMany();
  }

  async findOne(id: string): Promise<ColdStoreLot> {
    const lot = await this.lotRepo.findOne({
      where: { id },
      relations: ['customer', 'chamber'],
    });
    if (!lot) throw new NotFoundException(`Lot ${id} not found`);
    return lot;
  }

  async findByLotNumber(lotNumber: string): Promise<ColdStoreLot> {
    const lot = await this.lotRepo.findOne({
      where: { lotNumber },
      relations: ['customer', 'chamber'],
    });
    if (!lot) throw new NotFoundException(`Lot ${lotNumber} not found`);
    return lot;
  }

  /**
   * Get a lot with its current accrued charges (live calculation).
   */
  async getLotWithAccruedCharges(id: string): Promise<{
    lot: ColdStoreLot;
    accruedCharges: RentalChargeBreakdown | null;
    billingCycles: RentalBillingCycle[];
  }> {
    const lot = await this.findOne(id);
    const billingCycles = await this.rentalBillingService.getCyclesForLot(id);

    let accruedCharges: RentalChargeBreakdown | null = null;
    if (
      lot.status === ColdStoreLotStatus.IN_STORAGE ||
      lot.status === ColdStoreLotStatus.PARTIALLY_RELEASED
    ) {
      try {
        accruedCharges = await this.rentalBillingService.calculateChargesForLot(
          lot,
          new Date(),
          0,
          0,
          true,
          false,
        );
      } catch (e) {
        this.logger.warn(
          `Could not calculate accrued charges for lot ${lot.lotNumber}: ${e.message}`,
        );
      }
    }

    return { lot, accruedCharges, billingCycles };
  }

  /**
   * Dashboard summary: all active lots with accrued charges.
   */
  async getActiveLotsSummary(): Promise<{
    totalLots: number;
    totalBagsInStorage: number;
    totalWeightKg: number;
    activeCycles: RentalBillingCycle[];
  }> {
    const activeLots = await this.lotRepo.find({
      where: [
        { status: ColdStoreLotStatus.IN_STORAGE },
        { status: ColdStoreLotStatus.PARTIALLY_RELEASED },
      ],
    });

    const totalBagsInStorage = activeLots.reduce(
      (sum, l) => sum + (l.bagsIn - l.bagsOut),
      0,
    );
    const totalWeightKg = activeLots.reduce(
      (sum, l) => sum + Number(l.netWeightKg),
      0,
    );
    const activeCycles = await this.rentalBillingService.getAllActiveCycles();

    return {
      totalLots: activeLots.length,
      totalBagsInStorage,
      totalWeightKg,
      activeCycles,
    };
  }
}
