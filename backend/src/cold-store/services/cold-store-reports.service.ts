import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ColdStoreLot,
  ColdStoreLotStatus,
} from '../entities/cold-store-lot.entity';
import { Room } from '../../inventory/entities/room.entity';
import { ColdStoreLotService } from './cold-store-lot.service';

@Injectable()
export class ColdStoreReportsService {
  private readonly logger = new Logger(ColdStoreReportsService.name);

  constructor(
    @InjectRepository(ColdStoreLot)
    private readonly lotRepo: Repository<ColdStoreLot>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    private readonly lotService: ColdStoreLotService,
  ) {}

  /**
   * 1. Space Utilization
   *    Calculates the currently utilized capacity (in KG) vs max capacity for each Chamber (Room).
   */
  async getSpaceUtilization() {
    const rooms = await this.roomRepo.find({ where: { isActive: true } });
    const activeLots = await this.lotRepo.find({
      where: [
        { status: ColdStoreLotStatus.IN_STORAGE },
        { status: ColdStoreLotStatus.PARTIALLY_RELEASED },
      ],
      relations: ['chamber'],
    });

    const utilization = rooms.map((room) => {
      const maxCapacityKg = room.capacityTons
        ? Number(room.capacityTons) * 1000
        : 0;
      const lotsInRoom = activeLots.filter((lot) => lot.chamberId === room.id);
      const utilizedKg = lotsInRoom.reduce(
        (sum, lot) => sum + Number(lot.netWeightKg),
        0,
      );
      const utilizationPercentage =
        maxCapacityKg > 0
          ? Number(((utilizedKg / maxCapacityKg) * 100).toFixed(2))
          : 0;

      return {
        chamberId: room.id,
        chamberCode: room.code,
        chamberName: room.name,
        maxCapacityKg,
        utilizedKg,
        availableKg: Math.max(0, maxCapacityKg - utilizedKg),
        utilizationPercentage,
        activeLotsCount: lotsInRoom.length,
      };
    });

    return {
      totalChambers: rooms.length,
      totalMaxCapacityKg: utilization.reduce((s, u) => s + u.maxCapacityKg, 0),
      totalUtilizedKg: utilization.reduce((s, u) => s + u.utilizedKg, 0),
      chambers: utilization.sort(
        (a, b) => b.utilizationPercentage - a.utilizationPercentage,
      ),
    };
  }

  /**
   * 2. Projected Accrual Revenue
   */
  async getProjectedAccrualRevenue() {
    const activeLots = await this.lotRepo.find({
      where: [
        { status: ColdStoreLotStatus.IN_STORAGE },
        { status: ColdStoreLotStatus.PARTIALLY_RELEASED },
      ],
      relations: ['customer'],
    });

    let totalProjectedSubtotal = 0;
    let totalProjectedGst = 0;
    let totalProjectedWht = 0;
    let totalProjectedTotal = 0;

    const lotsData: any[] = [];

    for (const lot of activeLots) {
      const { accruedCharges } = await this.lotService.getLotWithAccruedCharges(
        lot.id,
      );
      if (accruedCharges) {
        totalProjectedSubtotal += accruedCharges.subtotal;
        totalProjectedGst += accruedCharges.gstAmount;
        totalProjectedWht += accruedCharges.whtAmount;
        totalProjectedTotal += accruedCharges.totalAmount;

        lotsData.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          customerName: lot.customer.name,
          daysStored: accruedCharges.daysStored,
          projectedSubtotal: accruedCharges.subtotal,
          projectedTotalAmount: accruedCharges.totalAmount,
        });
      }
    }

    return {
      summary: {
        totalActiveLots: activeLots.length,
        totalProjectedSubtotal: Number(totalProjectedSubtotal.toFixed(2)),
        totalProjectedGst: Number(totalProjectedGst.toFixed(2)),
        totalProjectedWht: Number(totalProjectedWht.toFixed(2)),
        totalProjectedTotal: Number(totalProjectedTotal.toFixed(2)),
      },
      lots: lotsData.sort((a, b) => b.projectedSubtotal - a.projectedSubtotal),
    };
  }

  /**
   * 3. Customer Stock Aging
   */
  async getCustomerStockAging() {
    const activeLots = await this.lotRepo.find({
      where: [
        { status: ColdStoreLotStatus.IN_STORAGE },
        { status: ColdStoreLotStatus.PARTIALLY_RELEASED },
      ],
      relations: ['customer', 'chamber'],
    });

    const today = new Date().getTime();

    const agingLots = activeLots.map((lot) => {
      const inwardDateMs = new Date(lot.inwardDate).getTime();
      const ageDays = Math.floor((today - inwardDateMs) / (1000 * 3600 * 24));

      let ageBucket = '0-30 days';
      if (ageDays > 30 && ageDays <= 60) ageBucket = '31-60 days';
      else if (ageDays > 60 && ageDays <= 90) ageBucket = '61-90 days';
      else if (ageDays > 90 && ageDays <= 180) ageBucket = '91-180 days';
      else if (ageDays > 180) ageBucket = 'Over 180 days';

      const bagsRemaining = Number(lot.bagsIn) - Number(lot.bagsOut || 0);

      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        customerName: lot.customer?.name || 'Unknown',
        chamberCode: lot.chamber?.code || 'Unassigned',
        commodity: lot.commodity,
        inwardDate: lot.inwardDate,
        ageDays,
        ageBucket,
        bagsRemaining,
      };
    });

    return {
      oldestStockAlerts: agingLots
        .filter((l) => l.ageDays > 90)
        .sort((a, b) => b.ageDays - a.ageDays),
      allAgingLots: agingLots.sort((a, b) => b.ageDays - a.ageDays),
    };
  }
}
