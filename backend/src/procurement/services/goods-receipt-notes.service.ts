import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GoodsReceiptNote } from '../entities/goods-receipt-note.entity';
import { GoodsReceiptNoteItem } from '../entities/goods-receipt-note-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { CreateGoodsReceiptNoteDto } from '../dto/create-goods-receipt-note.dto';
import { GrnStatus } from '../enums/grn-status.enum';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';
import { SequencesService } from '../../sequences/sequences.service';
import { InventoryTransactionsService } from '../../inventory/services/inventory-transactions.service';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { InventoryReferenceType } from '../../common/enums/inventory-reference-type.enum';

@Injectable()
export class GoodsReceiptNotesService {
  constructor(
    @InjectRepository(GoodsReceiptNote)
    private readonly grnRepository: Repository<GoodsReceiptNote>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(InventoryItem)
    private readonly itemRepository: Repository<InventoryItem>,
    private readonly sequencesService: SequencesService,
    private readonly inventoryTransactionsService: InventoryTransactionsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a GRN in DRAFT status from a Purchase Order
   */
  async create(dto: CreateGoodsReceiptNoteDto, userId: string) {
    // Validate PO exists and is in a receivable state
    const po = await this.poRepository.findOne({
      where: { id: dto.purchaseOrderId },
      relations: ['items', 'vendor'],
    });
    if (!po) {
      throw new NotFoundException(
        `Purchase Order ${dto.purchaseOrderId} not found`,
      );
    }
    if (
      ![
        PurchaseOrderStatus.ISSUED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
      ].includes(po.status)
    ) {
      throw new BadRequestException(
        `Cannot create GRN for PO in ${po.status} status. PO must be ISSUED or PARTIALLY_RECEIVED.`,
      );
    }

    // Validate each item belongs to the PO
    let grnTotal = 0;
    const processedItems: Partial<GoodsReceiptNoteItem>[] = [];

    for (const itemDto of dto.items) {
      const poItem = po.items.find((i) => i.id === itemDto.purchaseOrderItemId);
      if (!poItem) {
        throw new BadRequestException(
          `PO Item ${itemDto.purchaseOrderItemId} not found in PO ${po.poNumber}`,
        );
      }

      // Validate item exists
      const inventoryItem = await this.itemRepository.findOne({
        where: { id: itemDto.itemId },
      });
      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${itemDto.itemId} not found`,
        );
      }

      const lineTotal = itemDto.receivedQuantity * itemDto.unitPrice;
      grnTotal += lineTotal;

      processedItems.push({
        purchaseOrderItemId: itemDto.purchaseOrderItemId,
        itemId: itemDto.itemId,
        description: itemDto.description || inventoryItem.name,
        orderedQuantity: itemDto.orderedQuantity,
        receivedQuantity: itemDto.receivedQuantity,
        unitPrice: itemDto.unitPrice,
        totalAmount: lineTotal,
        warehouseId: itemDto.warehouseId,
        roomId: itemDto.roomId,
        lotNumber: itemDto.lotNumber,
        expiryDate: itemDto.expiryDate
          ? new Date(itemDto.expiryDate)
          : undefined,
      });
    }

    // Generate GRN number
    const grnNumber = await this.sequencesService.generateSequenceNumber('GRN');

    // Create GRN
    const grn = this.grnRepository.create({
      grnNumber,
      purchaseOrderId: dto.purchaseOrderId,
      vendorId: po.vendorId,
      receiptDate: new Date(dto.receiptDate),
      notes: dto.notes,
      status: GrnStatus.DRAFT,
      totalAmount: grnTotal,
      createdById: userId,
      updatedById: userId,
      items: processedItems as GoodsReceiptNoteItem[],
    });

    return await this.grnRepository.save(grn);
  }

  /**
   * Complete a DRAFT GRN — creates inventory RECEIPT transactions and updates PO status
   */
  async complete(id: string, userId: string) {
    const grn = await this.grnRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.item',
        'purchaseOrder',
        'purchaseOrder.items',
      ],
    });
    if (!grn) {
      throw new NotFoundException(`GRN ${id} not found`);
    }
    if (grn.status !== GrnStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT GRNs can be completed. Current status: ${grn.status}`,
      );
    }

    // Use a transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create inventory RECEIPT transactions for each GRN item
      for (const grnItem of grn.items) {
        if (grnItem.receivedQuantity <= 0) continue;

        const inventoryItem =
          grnItem.item ||
          (await this.itemRepository.findOne({
            where: { id: grnItem.itemId },
          }));

        await this.inventoryTransactionsService.processTransaction(
          {
            transactionType: InventoryTransactionType.RECEIPT,
            transactionDate: new Date(grn.receiptDate)
              .toISOString()
              .split('T')[0],
            referenceType: InventoryReferenceType.GRN,
            referenceId: grn.id,
            referenceNumber: grn.grnNumber,
            itemId: grnItem.itemId,
            warehouseId: grnItem.warehouseId,
            roomId: grnItem.roomId,
            quantity: grnItem.receivedQuantity,
            unitOfMeasure: inventoryItem.unitOfMeasure,
            unitCost: grnItem.unitPrice,
            lotNumber: grnItem.lotNumber,
            expiryDate: grnItem.expiryDate
              ? new Date(grnItem.expiryDate).toISOString()
              : undefined,
            notes: `GRN ${grn.grnNumber} - Item: ${grnItem.description}`,
          },
          userId,
          queryRunner.manager,
        );
      }

      // 2. Update GRN status to COMPLETED
      grn.status = GrnStatus.COMPLETED;
      grn.updatedById = userId;
      await queryRunner.manager.save(grn);

      // 3. Determine PO status based on received quantities
      await this.updatePurchaseOrderStatus(
        grn.purchaseOrder,
        userId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate total received quantities for a PO across all completed GRNs
   * and update PO status accordingly
   */
  private async updatePurchaseOrderStatus(
    po: PurchaseOrder,
    userId: string,
    manager: any,
  ) {
    // Get all completed GRN items for this PO
    const completedGrnItems = await manager
      .createQueryBuilder(GoodsReceiptNote, 'grn')
      .innerJoinAndSelect('grn.items', 'grnItem')
      .where('grn.purchaseOrderId = :poId', { poId: po.id })
      .andWhere('grn.status = :status', { status: GrnStatus.COMPLETED })
      .getMany();

    // Sum received quantities per PO item
    const receivedByPoItem: Record<string, number> = {};
    for (const grn of completedGrnItems) {
      for (const item of grn.items) {
        const key = item.purchaseOrderItemId;
        receivedByPoItem[key] =
          (receivedByPoItem[key] || 0) + parseFloat(item.receivedQuantity);
      }
    }

    // Compare with ordered quantities
    let allFullyReceived = true;
    let anyReceived = false;

    for (const poItem of po.items) {
      const received = receivedByPoItem[poItem.id] || 0;
      const ordered = parseFloat(poItem.quantity as any);
      if (received > 0) anyReceived = true;
      if (received < ordered) allFullyReceived = false;
    }

    // Update PO status
    let newStatus: PurchaseOrderStatus;
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (anyReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    } else {
      return; // No change
    }

    po.status = newStatus;
    po.updatedById = userId;
    await manager.save(po);
  }

  /**
   * Cancel a DRAFT GRN
   */
  async cancel(id: string, userId: string) {
    const grn = await this.findOne(id);
    if (grn.status !== GrnStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT GRNs can be cancelled. Current status: ${grn.status}`,
      );
    }

    grn.status = GrnStatus.CANCELLED;
    grn.updatedById = userId;
    return await this.grnRepository.save(grn);
  }

  /**
   * List GRNs with filters and pagination
   */
  async findAll(query: any) {
    const { page = 1, limit = 10, status, vendorId, purchaseOrderId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.grnRepository
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.vendor', 'vendor')
      .leftJoinAndSelect('grn.purchaseOrder', 'po')
      .skip(skip)
      .take(limit)
      .orderBy('grn.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('grn.status = :status', { status });
    }
    if (vendorId) {
      queryBuilder.andWhere('grn.vendorId = :vendorId', { vendorId });
    }
    if (purchaseOrderId) {
      queryBuilder.andWhere('grn.purchaseOrderId = :purchaseOrderId', {
        purchaseOrderId,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get GRN details with items
   */
  async findOne(id: string) {
    const grn = await this.grnRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.item',
        'items.purchaseOrderItem',
        'vendor',
        'purchaseOrder',
      ],
    });

    if (!grn) {
      throw new NotFoundException(`GRN ${id} not found`);
    }

    return grn;
  }
}
