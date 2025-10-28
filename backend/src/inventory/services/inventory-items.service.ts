import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto, 
  QueryInventoryItemsDto 
} from '../dto';
import { InventoryItemNotFoundException } from '../../common/exceptions/inventory.exception';

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
  ) {}

  async create(createDto: CreateInventoryItemDto, userId: string): Promise<InventoryItem> {
    // Check if SKU already exists
    const existingItem = await this.inventoryItemRepository.findOne({
      where: { sku: createDto.sku },
    });

    if (existingItem) {
      throw new BadRequestException(`Item with SKU '${createDto.sku}' already exists`);
    }

    // Validate temperature range if both min and max are provided
    if (createDto.minTemperature !== undefined && 
        createDto.maxTemperature !== undefined && 
        createDto.minTemperature > createDto.maxTemperature) {
      throw new BadRequestException('Minimum temperature cannot be greater than maximum temperature');
    }

    const inventoryItem = this.inventoryItemRepository.create({
      ...createDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return await this.inventoryItemRepository.save(inventoryItem);
  }

  async findAll(queryDto: QueryInventoryItemsDto): Promise<{
    items: InventoryItem[];
    total: number;
    totalPages: number;
  }> {
    const {
      sku,
      name,
      category,
      unitOfMeasure,
      isPerishable,
      isActive,
      limit = 50,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = queryDto;

    const queryBuilder = this.inventoryItemRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.createdByUser', 'createdByUser')
      .leftJoinAndSelect('item.updatedByUser', 'updatedByUser');

    // Apply filters
    if (sku) {
      queryBuilder.andWhere('item.sku ILIKE :sku', { sku: `%${sku}%` });
    }

    if (name) {
      queryBuilder.andWhere('item.name ILIKE :name', { name: `%${name}%` });
    }

    if (category) {
      queryBuilder.andWhere('item.category ILIKE :category', { category: `%${category}%` });
    }

    if (unitOfMeasure) {
      queryBuilder.andWhere('item.unitOfMeasure = :unitOfMeasure', { unitOfMeasure });
    }

    if (isPerishable !== undefined) {
      queryBuilder.andWhere('item.isPerishable = :isPerishable', { isPerishable });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('item.isActive = :isActive', { isActive });
    }

    // Apply sorting
    const allowedSortFields = [
      'sku', 'name', 'category', 'unitOfMeasure', 'standardCost', 
      'lastCost', 'createdAt', 'updatedAt'
    ];
    
    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`item.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('item.name', 'ASC');
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
    };
  }

  async findOne(id: string): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'updatedByUser'],
    });

    if (!inventoryItem) {
      throw new InventoryItemNotFoundException(id);
    }

    return inventoryItem;
  }

  async findBySku(sku: string): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: { sku },
      relations: ['createdByUser', 'updatedByUser'],
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with SKU '${sku}' not found`);
    }

    return inventoryItem;
  }

  async update(id: string, updateDto: UpdateInventoryItemDto, userId: string): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);

    // Validate temperature range if both min and max are provided
    const minTemp = updateDto.minTemperature ?? inventoryItem.minTemperature;
    const maxTemp = updateDto.maxTemperature ?? inventoryItem.maxTemperature;
    
    if (minTemp !== null && maxTemp !== null && minTemp > maxTemp) {
      throw new BadRequestException('Minimum temperature cannot be greater than maximum temperature');
    }

    // Update the item
    Object.assign(inventoryItem, updateDto);
    inventoryItem.updatedBy = userId;
    inventoryItem.updatedAt = new Date();

    return await this.inventoryItemRepository.save(inventoryItem);
  }

  async remove(id: string): Promise<void> {
    const inventoryItem = await this.findOne(id);

    // Check if item has any transactions (we might want to prevent deletion)
    // This will be implemented when we have the transactions service
    
    // For now, we'll do a soft delete by setting isActive to false
    inventoryItem.isActive = false;
    await this.inventoryItemRepository.save(inventoryItem);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .select('DISTINCT item.category', 'category')
      .where('item.category IS NOT NULL')
      .andWhere('item.isActive = :isActive', { isActive: true })
      .orderBy('item.category', 'ASC')
      .getRawMany();

    return result.map(row => row.category);
  }

  async getStats(): Promise<{
    totalItems: number;
    activeItems: number;
    perishableItems: number;
    categories: number;
  }> {
    const [totalItems, activeItems, perishableItems, categoriesResult] = await Promise.all([
      this.inventoryItemRepository.count(),
      this.inventoryItemRepository.count({ where: { isActive: true } }),
      this.inventoryItemRepository.count({ 
        where: { isActive: true, isPerishable: true } 
      }),
      this.inventoryItemRepository
        .createQueryBuilder('item')
        .select('COUNT(DISTINCT item.category)', 'count')
        .where('item.category IS NOT NULL')
        .andWhere('item.isActive = :isActive', { isActive: true })
        .getRawOne(),
    ]);

    return {
      totalItems,
      activeItems,
      perishableItems,
      categories: parseInt(categoriesResult?.count || '0'),
    };
  }

  async bulkUpdateStandardCost(updates: Array<{ id: string; standardCost: number }>, userId: string): Promise<void> {
    const queryRunner = this.inventoryItemRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        await queryRunner.manager.update(InventoryItem, update.id, {
          standardCost: update.standardCost,
          updatedBy: userId,
          updatedAt: new Date(),
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

