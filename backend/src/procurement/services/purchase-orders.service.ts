import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';
import { SequencesService } from '../../sequences/sequences.service';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(InventoryItem)
    private readonly itemRepository: Repository<InventoryItem>,
    private readonly sequencesService: SequencesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPoDto: CreatePurchaseOrderDto, userId: string) {
    const { vendorId, items, orderDate, expectedDeliveryDate, notes } =
      createPoDto;

    // Validate Vendor
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Validate Items and Calculate Totals
    let poTotal = 0;
    const processedItems: Partial<PurchaseOrderItem>[] = [];

    for (const itemDto of items) {
      const inventoryItem = await this.itemRepository.findOne({
        where: { id: itemDto.itemId },
      });
      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory Item with ID ${itemDto.itemId} not found`,
        );
      }

      const lineTotal = itemDto.quantity * itemDto.unitPrice;
      poTotal += lineTotal;

      processedItems.push({
        itemId: itemDto.itemId,
        description: itemDto.description || inventoryItem.name, // Fallback to item name
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        totalAmount: lineTotal,
      });
    }

    // Generate PO Number
    const poNumber = await this.sequencesService.generateSequenceNumber('PO');

    // Create PO
    const po = this.poRepository.create({
      poNumber,
      vendorId,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate)
        : undefined,
      notes,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount: poTotal,
      createdById: userId,
      updatedById: userId,
      items: processedItems as PurchaseOrderItem[], // Cast to satisfy TypeORM
    });

    return await this.poRepository.save(po);
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, status, vendorId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .skip(skip)
      .take(limit)
      .orderBy('po.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('po.status = :status', { status });
    }

    if (vendorId) {
      queryBuilder.andWhere('po.vendorId = :vendorId', { vendorId });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: ['items', 'vendor', 'items.item'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  async updateStatus(id: string, status: PurchaseOrderStatus, userId: string) {
    const po = await this.findOne(id);

    // Basic state transition validation (can be expanded)
    if (
      po.status === PurchaseOrderStatus.CANCELLED ||
      po.status === PurchaseOrderStatus.CLOSED
    ) {
      throw new BadRequestException(
        `Cannot update status of a ${po.status} Purchase Order`,
      );
    }

    po.status = status;
    po.updatedById = userId;

    return await this.poRepository.save(po);
  }
}
