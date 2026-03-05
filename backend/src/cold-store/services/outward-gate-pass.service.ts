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
  OutwardGatePass,
  GatePassStatus,
} from '../entities/outward-gate-pass.entity';
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
} from '../entities/bardana-record.entity';
import {
  Invoice,
  InvoiceStatus,
  InvoiceType,
} from '../../invoices/entities/invoice.entity';
import { InvoiceLineItem } from '../../invoices/entities/invoice-line-item.entity';
import { CreateOutwardGatePassDto } from '../dto/create-outward-gate-pass.dto';
import { RentalBillingService } from './rental-billing.service';
import { SequencesService } from '../../sequences/sequences.service';

@Injectable()
export class OutwardGatePassService {
  private readonly logger = new Logger(OutwardGatePassService.name);

  constructor(
    @InjectRepository(OutwardGatePass)
    private readonly outwardRepo: Repository<OutwardGatePass>,
    @InjectRepository(ColdStoreLot)
    private readonly lotRepo: Repository<ColdStoreLot>,
    @InjectRepository(RentalBillingCycle)
    private readonly cycleRepo: Repository<RentalBillingCycle>,
    @InjectRepository(KandariRecord)
    private readonly kandariRepo: Repository<KandariRecord>,
    @InjectRepository(BardanaRecord)
    private readonly bardanaRepo: Repository<BardanaRecord>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepo: Repository<InvoiceLineItem>,
    private readonly rentalBillingService: RentalBillingService,
    private readonly sequencesService: SequencesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create an Outward Gate Pass in DRAFT status.
   * Validates that the lot exists, is active, and has enough bags.
   */
  async create(
    dto: CreateOutwardGatePassDto,
    userId: string,
  ): Promise<OutwardGatePass> {
    const lot = await this.lotRepo.findOne({ where: { id: dto.lotId } });
    if (!lot) throw new NotFoundException(`Lot ${dto.lotId} not found`);

    if (lot.status === ColdStoreLotStatus.RELEASED) {
      throw new ConflictException(
        `Lot ${lot.lotNumber} is already fully released`,
      );
    }
    if (lot.status === ColdStoreLotStatus.CANCELLED) {
      throw new ConflictException(`Lot ${lot.lotNumber} is cancelled`);
    }

    const bagsBalance = lot.bagsIn - lot.bagsOut;
    if (dto.bagsReleased > bagsBalance) {
      throw new BadRequestException(
        `Cannot release ${dto.bagsReleased} bags — only ${bagsBalance} bags remain in lot ${lot.lotNumber}`,
      );
    }

    const netWeightKg = dto.grossWeightKg - dto.tareWeightKg;
    if (netWeightKg < 0) {
      throw new BadRequestException(
        'Net weight cannot be negative (gross < tare)',
      );
    }

    const gatePassNumber =
      await this.sequencesService.generateSequenceNumber('GPO');

    const gatePass = this.outwardRepo.create({
      gatePassNumber,
      lotId: dto.lotId,
      customerId: lot.customerId,
      vehicleNumber: dto.vehicleNumber,
      driverName: dto.driverName,
      bagsReleased: dto.bagsReleased,
      grossWeightKg: dto.grossWeightKg,
      tareWeightKg: dto.tareWeightKg,
      netWeightKg,
      outwardDate: new Date(dto.outwardDate),
      status: GatePassStatus.DRAFT,
      createdBy: userId,
      notes: dto.notes,
    });

    const saved = await this.outwardRepo.save(gatePass);
    this.logger.log(
      `Created Outward Gate Pass ${saved.gatePassNumber} for lot ${lot.lotNumber}`,
    );
    return saved;
  }

  /**
   * Approve an Outward Gate Pass.
   *
   * ATOMIC TRANSACTION (all-or-nothing):
   *   1. Calculate rental charges up to outward date
   *   2. Close the active RentalBillingCycle
   *   3. Generate AR Invoice (STORAGE type)
   *   4. Create Kandari (outward weighing) record
   *   5. Create Bardana (bag return) record
   *   6. Update lot: increment bags_out, update status
   *   7. Mark gate pass APPROVED, link invoice
   */
  async approve(id: string, userId: string): Promise<OutwardGatePass> {
    const gatePass = await this.outwardRepo.findOne({ where: { id } });
    if (!gatePass) throw new NotFoundException(`Gate pass ${id} not found`);
    if (gatePass.status !== GatePassStatus.DRAFT) {
      throw new ConflictException(`Gate pass is already ${gatePass.status}`);
    }

    const lot = await this.lotRepo.findOne({ where: { id: gatePass.lotId } });
    if (!lot) throw new NotFoundException(`Lot ${gatePass.lotId} not found`);

    // Calculate charges BEFORE entering transaction (read-only, safe)
    const charges = await this.rentalBillingService.calculateChargesForLot(
      lot,
      gatePass.outwardDate,
      0, // handling out — passed from DTO if needed
      0, // other charges
      true, // apply GST
      false, // WHT — can be enabled per customer
      gatePass.bagsReleased, // quantityToBill - exact outward quantity
    );

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Find and close active billing cycle
      const activeCycle = await manager.findOne(RentalBillingCycle, {
        where: { lotId: lot.id, status: RentalCycleStatus.ACTIVE },
      });

      // 2. Generate invoice number
      const invoiceNumber =
        await this.sequencesService.generateSequenceNumber('INV');
      const issueDate = gatePass.outwardDate;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // 3. Build invoice line items
      const lineItems: Partial<InvoiceLineItem>[] = [];
      let lineNum = 1;

      if (charges.billingUnit === BillingUnitType.PER_BAG) {
        lineItems.push({
          lineNumber: lineNum++,
          description: `Cold Storage Rental — ${lot.commodity} (${lot.lotNumber}) | ${charges.bagsBilled} bags × PKR ${charges.rateApplied}/bag (seasonal)`,
          quantity: charges.bagsBilled ?? 0,
          unitPrice: charges.rateApplied,
          lineTotal: charges.storageCharges,
          taxRate: 0,
          taxAmount: 0,
        });
      } else {
        lineItems.push({
          lineNumber: lineNum++,
          description: `Cold Storage Rental — ${lot.commodity} (${lot.lotNumber}) | ${charges.weightBilledKg} kg × PKR ${charges.rateApplied}/kg/day × ${charges.daysStored} days`,
          quantity: charges.weightBilledKg ?? 0,
          unitPrice: charges.rateApplied * charges.daysStored,
          lineTotal: charges.storageCharges,
          taxRate: 0,
          taxAmount: 0,
        });
      }

      if (charges.handlingChargesOut > 0) {
        lineItems.push({
          lineNumber: lineNum++,
          description: 'Handling / Labour Charges (Outward)',
          quantity: 1,
          unitPrice: charges.handlingChargesOut,
          lineTotal: charges.handlingChargesOut,
          taxRate: 0,
          taxAmount: 0,
        });
      }

      if (charges.otherCharges > 0) {
        lineItems.push({
          lineNumber: lineNum++,
          description: 'Other Charges',
          quantity: 1,
          unitPrice: charges.otherCharges,
          lineTotal: charges.otherCharges,
          taxRate: 0,
          taxAmount: 0,
        });
      }

      if (charges.gstAmount > 0) {
        lineItems.push({
          lineNumber: lineNum++,
          description: `GST @ 18%`,
          quantity: 1,
          unitPrice: charges.gstAmount,
          lineTotal: charges.gstAmount,
          taxRate: 18,
          taxAmount: charges.gstAmount,
        });
      }

      // 4. Save invoice
      const invoice = manager.create(Invoice, {
        invoiceNumber,
        invoiceType: InvoiceType.STORAGE,
        status: InvoiceStatus.DRAFT,
        customerId: lot.customerId,
        issueDate,
        dueDate,
        daysStored: charges.daysStored,
        ratePerKgPerDay:
          lot.billingUnit === BillingUnitType.PER_KG
            ? lot.ratePerKgPerDay
            : null,
        storageDateIn: lot.billingStartDate,
        storageDateOut: gatePass.outwardDate,
        storageCharges: charges.storageCharges,
        labourCharges: 0,
        loadingCharges: charges.handlingChargesOut,
        subtotal: charges.subtotal,
        gstAmount: charges.gstAmount,
        gstRate: charges.gstAmount > 0 ? 18 : 0,
        whtAmount: charges.whtAmount,
        whtRate: charges.whtAmount > 0 ? 4.5 : 0,
        totalAmount: charges.totalAmount,
        amountPaid: 0,
        balanceDue: charges.totalAmount,
        referenceNumber: gatePass.gatePassNumber,
        notes: `Auto-generated from Outward Gate Pass ${gatePass.gatePassNumber} | Lot: ${lot.lotNumber}`,
        breakdown: {
          storageCalculation: charges.formula,
          taxCalculation: `GST: PKR ${charges.gstAmount} | WHT: PKR ${charges.whtAmount} | Total: PKR ${charges.totalAmount}`,
        },
        createdBy: userId,
      });

      const savedInvoice = await manager.save(Invoice, invoice);

      // Save line items
      for (const li of lineItems) {
        const lineItem = manager.create(InvoiceLineItem, {
          ...li,
          invoice: savedInvoice,
        });
        await manager.save(InvoiceLineItem, lineItem);
      }

      // 5. Update/Close billing cycle
      if (activeCycle) {
        activeCycle.daysStored = charges.daysStored;
        // Accumulate financial fields across partial outwards
        activeCycle.bagsBilled =
          (activeCycle.bagsBilled ?? 0) + (charges.bagsBilled ?? 0);
        activeCycle.weightBilledKg =
          Number(activeCycle.weightBilledKg ?? 0) +
          Number(charges.weightBilledKg ?? 0);
        activeCycle.rateApplied = charges.rateApplied;
        activeCycle.storageCharges =
          Number(activeCycle.storageCharges ?? 0) + charges.storageCharges;
        activeCycle.handlingChargesOut =
          Number(activeCycle.handlingChargesOut ?? 0) +
          charges.handlingChargesOut;
        activeCycle.otherCharges =
          Number(activeCycle.otherCharges ?? 0) + charges.otherCharges;
        activeCycle.subtotal =
          Number(activeCycle.subtotal ?? 0) + charges.subtotal;
        activeCycle.gstAmount =
          Number(activeCycle.gstAmount ?? 0) + charges.gstAmount;
        activeCycle.whtAmount =
          Number(activeCycle.whtAmount ?? 0) + charges.whtAmount;
        activeCycle.totalAmount =
          Number(activeCycle.totalAmount ?? 0) + charges.totalAmount;
        // Append to arrays (supports multiple partial invoices)
        activeCycle.invoiceIds = [
          ...(activeCycle.invoiceIds || []),
          savedInvoice.id,
        ];
        activeCycle.outwardGatePassIds = [
          ...(activeCycle.outwardGatePassIds || []),
          gatePass.id,
        ];

        // Accumulate billed quantity for partial billing
        activeCycle.billedQuantity =
          (activeCycle.billedQuantity || 0) + gatePass.bagsReleased;

        // Calculate remaining bags to decide if cycle should be closed
        const newBagsOut = (lot.bagsOut ?? 0) + gatePass.bagsReleased;
        const remainingBags = lot.bagsIn - newBagsOut;

        if (remainingBags <= 0) {
          activeCycle.billingEndDate = gatePass.outwardDate;
          activeCycle.status = RentalCycleStatus.INVOICED;
        } else {
          activeCycle.status = RentalCycleStatus.ACTIVE; // Keep it open for remaining stock
        }

        await manager.save(RentalBillingCycle, activeCycle);
      }

      // 6. Create Kandari (outward weighing) record
      const kandari = manager.create(KandariRecord, {
        lotId: lot.id,
        recordType: KandariRecordType.OUTWARD,
        weighDate: gatePass.outwardDate,
        grossWeightKg: gatePass.grossWeightKg,
        tareWeightKg: gatePass.tareWeightKg,
        netWeightKg: gatePass.netWeightKg,
        bagsWeighed: gatePass.bagsReleased,
        createdBy: userId,
      });
      await manager.save(KandariRecord, kandari);

      // 7. Create Bardana (bag return) record
      const bardana = manager.create(BardanaRecord, {
        lotId: lot.id,
        recordType: BardanaRecordType.RETURNED,
        recordDate: gatePass.outwardDate,
        bagsCount: gatePass.bagsReleased,
        createdBy: userId,
      });
      await manager.save(BardanaRecord, bardana);

      // 8. Update lot
      lot.bagsOut = (lot.bagsOut ?? 0) + gatePass.bagsReleased;
      const newBalance = lot.bagsIn - lot.bagsOut;
      lot.status =
        newBalance <= 0
          ? ColdStoreLotStatus.RELEASED
          : ColdStoreLotStatus.PARTIALLY_RELEASED;
      if (newBalance <= 0) lot.outwardDate = gatePass.outwardDate;
      lot.updatedBy = userId;
      await manager.save(ColdStoreLot, lot);

      // 9. Mark gate pass approved
      gatePass.status = GatePassStatus.APPROVED;
      gatePass.invoiceId = savedInvoice.id;
      gatePass.approvedBy = userId;
      gatePass.approvedAt = new Date();
      const savedPass = await manager.save(OutwardGatePass, gatePass);

      this.logger.log(
        `Approved GPO ${savedPass.gatePassNumber} → Invoice ${invoiceNumber} (PKR ${charges.totalAmount}) | Lot ${lot.lotNumber} → ${lot.status}`,
      );
      return savedPass;
    });
  }

  async findAll(filters?: {
    lotId?: string;
    status?: GatePassStatus;
  }): Promise<OutwardGatePass[]> {
    const qb = this.outwardRepo
      .createQueryBuilder('gp')
      .leftJoinAndSelect('gp.lot', 'lot')
      .leftJoinAndSelect('gp.customer', 'customer')
      .orderBy('gp.createdAt', 'DESC');

    if (filters?.lotId)
      qb.andWhere('gp.lotId = :lotId', { lotId: filters.lotId });
    if (filters?.status)
      qb.andWhere('gp.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async findOne(id: string): Promise<OutwardGatePass> {
    const gp = await this.outwardRepo.findOne({
      where: { id },
      relations: ['lot', 'customer'],
    });
    if (!gp) throw new NotFoundException(`Outward gate pass ${id} not found`);
    return gp;
  }

  async cancel(id: string, userId: string): Promise<OutwardGatePass> {
    const gp = await this.outwardRepo.findOne({ where: { id } });
    if (!gp) throw new NotFoundException(`Gate pass ${id} not found`);
    if (gp.status !== GatePassStatus.DRAFT) {
      throw new ConflictException(`Only DRAFT gate passes can be cancelled`);
    }
    gp.status = GatePassStatus.CANCELLED;
    gp.approvedBy = userId;
    gp.approvedAt = new Date();
    return this.outwardRepo.save(gp);
  }
}
