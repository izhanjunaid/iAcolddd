import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  InwardGatePass,
  GatePassStatus,
} from '../entities/inward-gate-pass.entity';
import {
  ColdStoreLot,
  ColdStoreLotStatus,
  BillingUnitType,
} from '../entities/cold-store-lot.entity';
import {
  RentalBillingCycle,
  RentalCycleStatus,
} from '../entities/rental-billing-cycle.entity';
import {
  KandariRecord,
  KandariRecordType,
} from '../entities/kandari-record.entity';
import {
  BardanaRecord,
  BardanaRecordType,
  BagType,
} from '../entities/bardana-record.entity';
import { CreateInwardGatePassDto } from '../dto/create-inward-gate-pass.dto';
import { SequencesService } from '../../sequences/sequences.service';

@Injectable()
export class InwardGatePassService {
  private readonly logger = new Logger(InwardGatePassService.name);

  constructor(
    @InjectRepository(InwardGatePass)
    private readonly inwardRepo: Repository<InwardGatePass>,
    @InjectRepository(ColdStoreLot)
    private readonly lotRepo: Repository<ColdStoreLot>,
    @InjectRepository(RentalBillingCycle)
    private readonly cycleRepo: Repository<RentalBillingCycle>,
    @InjectRepository(KandariRecord)
    private readonly kandariRepo: Repository<KandariRecord>,
    @InjectRepository(BardanaRecord)
    private readonly bardanaRepo: Repository<BardanaRecord>,
    private readonly sequencesService: SequencesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new Inward Gate Pass in DRAFT status.
   * No lot is created yet — that happens on approval.
   */
  async create(
    dto: CreateInwardGatePassDto,
    userId: string,
  ): Promise<InwardGatePass> {
    this.validateRateForBillingUnit(dto);

    const netWeightKg = dto.grossWeightKg - dto.tareWeightKg;
    if (netWeightKg < 0) {
      throw new BadRequestException(
        'Net weight cannot be negative (gross < tare)',
      );
    }

    const gatePassNumber =
      await this.sequencesService.generateSequenceNumber('GPI');

    const gatePass = this.inwardRepo.create({
      gatePassNumber,
      customerId: dto.customerId,
      commodity: dto.commodity,
      variety: dto.variety,
      chamberId: dto.chamberId,
      vehicleNumber: dto.vehicleNumber,
      driverName: dto.driverName,
      bagsReceived: dto.bagsReceived,
      grossWeightKg: dto.grossWeightKg,
      tareWeightKg: dto.tareWeightKg,
      netWeightKg,
      billingUnit: dto.billingUnit,
      ratePerBagPerSeason: dto.ratePerBagPerSeason,
      ratePerKgPerDay: dto.ratePerKgPerDay,
      inwardDate: new Date(dto.inwardDate),
      status: GatePassStatus.DRAFT,
      createdBy: userId,
    });

    try {
      const saved = await this.inwardRepo.save(gatePass);
      this.logger.log(
        `Created Inward Gate Pass ${saved.gatePassNumber} for customer ${dto.customerId}`,
      );
      return saved;
    } catch (error) {
      require('fs').appendFileSync(
        'C:\\cold-storeIACHA\\error.log',
        `Error: ${error.message}\n${error.stack}\n`,
      );
      this.logger.error(
        `Error creating Inward Gate Pass: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Approve an Inward Gate Pass.
   * ATOMIC TRANSACTION:
   *   1. Mark gate pass as APPROVED
   *   2. Create ColdStoreLot (IN_STORAGE)
   *   3. Create KandariRecord (INWARD weighing)
   *   4. Create BardanaRecord (RECEIVED)
   *   5. Create RentalBillingCycle (ACTIVE)
   *   6. Link lot back to gate pass
   */
  async approve(id: string, userId: string): Promise<InwardGatePass> {
    const gatePass = await this.inwardRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException(`Gate pass ${id} not found`);
    if (gatePass.status !== GatePassStatus.DRAFT) {
      throw new ConflictException(`Gate pass is already ${gatePass.status}`);
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Generate lot number
      const lotNumber =
        await this.sequencesService.generateSequenceNumber('LOT');

      // 2. Create the Lot
      const lot = manager.create(ColdStoreLot, {
        lotNumber,
        customerId: gatePass.customerId,
        commodity: gatePass.commodity,
        variety: gatePass.variety,
        chamberId: gatePass.chamberId,
        bagsIn: gatePass.bagsReceived,
        bagsOut: 0,
        grossWeightKg: gatePass.grossWeightKg,
        tareWeightKg: gatePass.tareWeightKg,
        netWeightKg: gatePass.netWeightKg,
        inwardDate: gatePass.inwardDate,
        billingStartDate: gatePass.inwardDate,
        status: ColdStoreLotStatus.IN_STORAGE,
        billingUnit: gatePass.billingUnit,
        ratePerBagPerSeason: gatePass.ratePerBagPerSeason,
        ratePerKgPerDay: gatePass.ratePerKgPerDay,
        createdBy: userId,
      });
      const savedLot = await manager.save(ColdStoreLot, lot);

      // 3. Create Kandari (weighing) record
      const kandari = manager.create(KandariRecord, {
        lotId: savedLot.id,
        recordType: KandariRecordType.INWARD,
        weighDate: gatePass.inwardDate,
        grossWeightKg: gatePass.grossWeightKg,
        tareWeightKg: gatePass.tareWeightKg,
        netWeightKg: gatePass.netWeightKg,
        bagsWeighed: gatePass.bagsReceived,
        createdBy: userId,
      });
      await manager.save(KandariRecord, kandari);

      // 4. Create Bardana record
      const bardana = manager.create(BardanaRecord, {
        lotId: savedLot.id,
        recordType: BardanaRecordType.RECEIVED,
        recordDate: gatePass.inwardDate,
        bagType: BagType.GUNNY,
        bagsCount: gatePass.bagsReceived,
        createdBy: userId,
      });
      await manager.save(BardanaRecord, bardana);

      // 5. Create Rental Billing Cycle (ACTIVE)
      const cycle = manager.create(RentalBillingCycle, {
        lotId: savedLot.id,
        customerId: gatePass.customerId,
        billingStartDate: gatePass.inwardDate,
        billingUnit: gatePass.billingUnit,
        rateApplied:
          gatePass.billingUnit === BillingUnitType.PER_BAG
            ? gatePass.ratePerBagPerSeason
            : gatePass.ratePerKgPerDay,
        status: RentalCycleStatus.ACTIVE,
      });
      await manager.save(RentalBillingCycle, cycle);

      // 6. Update gate pass: link lot, mark APPROVED
      gatePass.lotId = savedLot.id;
      gatePass.status = GatePassStatus.APPROVED;
      gatePass.approvedBy = userId;
      gatePass.approvedAt = new Date();
      const savedPass = await manager.save(InwardGatePass, gatePass);

      this.logger.log(
        `Approved GPI ${savedPass.gatePassNumber} → Lot ${savedLot.lotNumber} created (${savedLot.billingUnit})`,
      );
      return savedPass;
    });
  }

  async findAll(filters?: {
    customerId?: string;
    status?: GatePassStatus;
  }): Promise<InwardGatePass[]> {
    const qb = this.inwardRepo
      .createQueryBuilder('gp')
      .leftJoinAndSelect('gp.customer', 'customer')
      .leftJoinAndSelect('gp.chamber', 'chamber')
      .leftJoinAndSelect('gp.lot', 'lot')
      .orderBy('gp.createdAt', 'DESC');

    if (filters?.customerId)
      qb.andWhere('gp.customerId = :cid', { cid: filters.customerId });
    if (filters?.status)
      qb.andWhere('gp.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async findOne(id: string): Promise<InwardGatePass> {
    const gp = await this.inwardRepo.findOne({
      where: { id },
      relations: ['customer', 'chamber', 'lot'],
    });
    if (!gp) throw new NotFoundException(`Inward gate pass ${id} not found`);
    return gp;
  }

  async cancel(id: string, userId: string): Promise<InwardGatePass> {
    const gp = await this.inwardRepo.findOne({ where: { id } });
    if (!gp) throw new NotFoundException(`Gate pass ${id} not found`);
    if (gp.status !== GatePassStatus.DRAFT) {
      throw new ConflictException(`Only DRAFT gate passes can be cancelled`);
    }
    gp.status = GatePassStatus.CANCELLED;
    gp.approvedBy = userId;
    gp.approvedAt = new Date();
    return this.inwardRepo.save(gp);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private validateRateForBillingUnit(dto: CreateInwardGatePassDto): void {
    if (
      dto.billingUnit === BillingUnitType.PER_BAG &&
      !dto.ratePerBagPerSeason
    ) {
      throw new BadRequestException(
        'ratePerBagPerSeason is required when billingUnit is PER_BAG',
      );
    }
    if (dto.billingUnit === BillingUnitType.PER_KG && !dto.ratePerKgPerDay) {
      throw new BadRequestException(
        'ratePerKgPerDay is required when billingUnit is PER_KG',
      );
    }
  }
}
