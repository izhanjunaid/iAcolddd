import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCostLayer } from '../entities/inventory-cost-layer.entity';
import { 
  FIFOCalculationResult, 
  FIFOCostBreakdown,
  CostLayer
} from '../../common/interfaces/inventory.interface';
import { 
  InsufficientStockException, 
  FIFOCalculationException 
} from '../../common/exceptions/inventory.exception';

@Injectable()
export class FIFOCostingService {
  constructor(
    @InjectRepository(InventoryCostLayer)
    private readonly costLayerRepository: Repository<InventoryCostLayer>,
  ) {}

  /**
   * Calculate FIFO cost for issuing inventory
   * @param itemId - ID of the inventory item
   * @param customerId - ID of the customer (optional)
   * @param warehouseId - ID of the warehouse
   * @param quantityToIssue - Quantity to be issued
   * @param lotNumber - Lot number filter (optional)
   * @param manager - Database transaction manager (optional)
   * @returns FIFO calculation result
   */
  async calculateFIFOCost(
    itemId: string,
    customerId: string | undefined,
    warehouseId: string,
    quantityToIssue: number,
    lotNumber?: string,
    manager?: any
  ): Promise<FIFOCalculationResult> {
    const repository = manager ? manager.getRepository(InventoryCostLayer) : this.costLayerRepository;

    // Get available cost layers sorted by FIFO order (oldest first)
    const layers = await this.getAvailableCostLayers(
      itemId,
      customerId,
      warehouseId,
      lotNumber,
      repository
    );

    if (layers.length === 0) {
      throw new InsufficientStockException(
        `No cost layers available for item ${itemId} at warehouse ${warehouseId}`
      );
    }

    // Calculate total available quantity
    const totalAvailable = layers.reduce((sum, layer) => sum + layer.remainingQuantity, 0);

    if (totalAvailable < quantityToIssue) {
      throw new InsufficientStockException(
        `Insufficient stock. Required: ${quantityToIssue}, Available: ${totalAvailable}`
      );
    }

    let remainingToIssue = quantityToIssue;
    let totalCost = 0;
    const costBreakdown: FIFOCostBreakdown[] = [];

    // Consume from oldest layers first (FIFO)
    for (const layer of layers) {
      if (remainingToIssue <= 0) break;

      const quantityFromThisLayer = Math.min(remainingToIssue, layer.remainingQuantity);
      const costFromThisLayer = quantityFromThisLayer * layer.unitCost;

      costBreakdown.push({
        layerId: layer.id,
        quantityUsed: quantityFromThisLayer,
        unitCost: layer.unitCost,
        totalCost: costFromThisLayer,
        receiptDate: layer.receiptDate,
        lotNumber: layer.lotNumber,
      });

      totalCost += costFromThisLayer;
      remainingToIssue -= quantityFromThisLayer;
    }

    // Validate calculation
    if (remainingToIssue > 0) {
      throw new FIFOCalculationException(
        `FIFO calculation failed. Still need ${remainingToIssue} units`
      );
    }

    const averageCost = quantityToIssue > 0 ? totalCost / quantityToIssue : 0;

    return {
      totalCost,
      averageCost,
      costBreakdown,
      remainingQuantity: 0, // All quantity was allocated
    };
  }

  /**
   * Consume cost layers based on FIFO calculation
   * @param costBreakdown - Result from FIFO calculation
   * @param manager - Database transaction manager
   */
  async consumeCostLayers(
    costBreakdown: FIFOCostBreakdown[],
    manager: any
  ): Promise<void> {
    const repository = manager.getRepository(InventoryCostLayer);

    for (const breakdown of costBreakdown) {
      const layer = await repository.findOne({
        where: { id: breakdown.layerId },
      });

      if (!layer) {
        throw new FIFOCalculationException(
          `Cost layer ${breakdown.layerId} not found during consumption`
        );
      }

      // Update remaining quantity
      layer.remainingQuantity -= breakdown.quantityUsed;

      // Mark as fully consumed if no quantity remains
      if (layer.remainingQuantity <= 0) {
        layer.remainingQuantity = 0;
        layer.isFullyConsumed = true;
      }

      await repository.save(layer);
    }
  }

  /**
   * Transfer cost layers from one location to another (for transfers)
   * @param costBreakdown - Cost breakdown from source location
   * @param toWarehouseId - Destination warehouse ID
   * @param toRoomId - Destination room ID (optional)
   * @param manager - Database transaction manager
   */
  async transferCostLayers(
    costBreakdown: FIFOCostBreakdown[],
    toWarehouseId: string,
    toRoomId?: string,
    manager?: any
  ): Promise<void> {
    const repository = manager.getRepository(InventoryCostLayer);

    for (const breakdown of costBreakdown) {
      const sourceLayer = await repository.findOne({
        where: { id: breakdown.layerId },
      });

      if (!sourceLayer) {
        continue; // Layer might have been fully consumed
      }

      // Check if we need to create a new layer at destination or update existing
      const existingDestinationLayer = await repository.findOne({
        where: {
          itemId: sourceLayer.itemId,
          customerId: sourceLayer.customerId,
          warehouseId: toWarehouseId,
          roomId: toRoomId,
          lotNumber: sourceLayer.lotNumber,
          receiptDate: sourceLayer.receiptDate,
          unitCost: sourceLayer.unitCost,
        },
      });

      if (existingDestinationLayer) {
        // Update existing layer
        existingDestinationLayer.remainingQuantity += breakdown.quantityUsed;
        existingDestinationLayer.originalQuantity += breakdown.quantityUsed;
        existingDestinationLayer.isFullyConsumed = false;
        await repository.save(existingDestinationLayer);
      } else {
        // Create new layer at destination
        const newLayer = repository.create({
          itemId: sourceLayer.itemId,
          customerId: sourceLayer.customerId,
          warehouseId: toWarehouseId,
          roomId: toRoomId,
          lotNumber: sourceLayer.lotNumber,
          receiptDate: sourceLayer.receiptDate,
          receiptReference: sourceLayer.receiptReference,
          receiptTransactionId: sourceLayer.receiptTransactionId,
          originalQuantity: breakdown.quantityUsed,
          remainingQuantity: breakdown.quantityUsed,
          unitCost: sourceLayer.unitCost,
          isFullyConsumed: false,
        });
        await repository.save(newLayer);
      }

      // Update source layer
      sourceLayer.remainingQuantity -= breakdown.quantityUsed;
      if (sourceLayer.remainingQuantity <= 0) {
        sourceLayer.remainingQuantity = 0;
        sourceLayer.isFullyConsumed = true;
      }
      await repository.save(sourceLayer);
    }
  }

  /**
   * Get available cost layers for FIFO calculation
   * @param itemId - Inventory item ID
   * @param customerId - Customer ID (optional)
   * @param warehouseId - Warehouse ID
   * @param lotNumber - Lot number filter (optional)
   * @param repository - Repository instance
   * @returns Array of available cost layers
   */
  private async getAvailableCostLayers(
    itemId: string,
    customerId: string | undefined,
    warehouseId: string,
    lotNumber?: string,
    repository?: any
  ): Promise<CostLayer[]> {
    const repo = repository || this.costLayerRepository;

    const queryBuilder = repo.createQueryBuilder('layer')
      .where('layer.itemId = :itemId', { itemId })
      .andWhere('layer.warehouseId = :warehouseId', { warehouseId })
      .andWhere('layer.remainingQuantity > 0')
      .andWhere('layer.isFullyConsumed = false');

    if (customerId) {
      queryBuilder.andWhere('layer.customerId = :customerId', { customerId });
    } else {
      queryBuilder.andWhere('layer.customerId IS NULL');
    }

    if (lotNumber) {
      queryBuilder.andWhere('layer.lotNumber = :lotNumber', { lotNumber });
    }

    // FIFO ordering: oldest receipts first
    queryBuilder
      .orderBy('layer.receiptDate', 'ASC')
      .addOrderBy('layer.createdAt', 'ASC');

    const layers = await queryBuilder.getMany();

    return layers.map(layer => ({
      id: layer.id,
      itemId: layer.itemId,
      customerId: layer.customerId,
      warehouseId: layer.warehouseId,
      roomId: layer.roomId,
      lotNumber: layer.lotNumber,
      receiptDate: layer.receiptDate,
      receiptReference: layer.receiptReference,
      originalQuantity: layer.originalQuantity,
      remainingQuantity: layer.remainingQuantity,
      unitCost: layer.unitCost,
      isFullyConsumed: layer.isFullyConsumed,
    }));
  }

  /**
   * Get current stock valuation using FIFO method
   * @param itemId - Inventory item ID
   * @param customerId - Customer ID (optional)
   * @param warehouseId - Warehouse ID (optional)
   * @param asOfDate - Valuation date (optional, defaults to current date)
   * @returns Stock valuation details
   */
  async getStockValuation(
    itemId?: string,
    customerId?: string,
    warehouseId?: string,
    asOfDate?: Date
  ): Promise<{
    totalQuantity: number;
    totalValue: number;
    averageCost: number;
    layerCount: number;
    oldestReceiptDate?: Date;
    newestReceiptDate?: Date;
  }> {
    const queryBuilder = this.costLayerRepository.createQueryBuilder('layer')
      .where('layer.remainingQuantity > 0')
      .andWhere('layer.isFullyConsumed = false');

    if (itemId) {
      queryBuilder.andWhere('layer.itemId = :itemId', { itemId });
    }

    if (customerId) {
      queryBuilder.andWhere('layer.customerId = :customerId', { customerId });
    } else if (customerId === null) {
      queryBuilder.andWhere('layer.customerId IS NULL');
    }

    if (warehouseId) {
      queryBuilder.andWhere('layer.warehouseId = :warehouseId', { warehouseId });
    }

    if (asOfDate) {
      queryBuilder.andWhere('layer.receiptDate <= :asOfDate', { asOfDate });
    }

    const layers = await queryBuilder.getMany();

    if (layers.length === 0) {
      return {
        totalQuantity: 0,
        totalValue: 0,
        averageCost: 0,
        layerCount: 0,
      };
    }

    const totalQuantity = layers.reduce((sum, layer) => sum + layer.remainingQuantity, 0);
    const totalValue = layers.reduce((sum, layer) => sum + (layer.remainingQuantity * layer.unitCost), 0);
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    const receiptDates = layers.map(layer => layer.receiptDate).sort((a, b) => a.getTime() - b.getTime());

    return {
      totalQuantity,
      totalValue,
      averageCost,
      layerCount: layers.length,
      oldestReceiptDate: receiptDates[0],
      newestReceiptDate: receiptDates[receiptDates.length - 1],
    };
  }

  /**
   * Clean up fully consumed cost layers (housekeeping)
   * @param olderThanDays - Remove layers fully consumed more than X days ago
   * @returns Number of layers cleaned up
   */
  async cleanupConsumedLayers(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.costLayerRepository
      .createQueryBuilder()
      .delete()
      .where('isFullyConsumed = true')
      .andWhere('remainingQuantity = 0')
      .andWhere('updatedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Validate cost layer integrity
   * @param itemId - Item ID to validate (optional)
   * @returns Validation results
   */
  async validateCostLayerIntegrity(itemId?: string): Promise<{
    isValid: boolean;
    issues: string[];
    layersChecked: number;
  }> {
    const issues: string[] = [];
    
    const queryBuilder = this.costLayerRepository.createQueryBuilder('layer');
    
    if (itemId) {
      queryBuilder.where('layer.itemId = :itemId', { itemId });
    }

    const layers = await queryBuilder.getMany();

    for (const layer of layers) {
      // Check for negative remaining quantity
      if (layer.remainingQuantity < 0) {
        issues.push(`Layer ${layer.id}: Negative remaining quantity (${layer.remainingQuantity})`);
      }

      // Check if remaining quantity exceeds original quantity
      if (layer.remainingQuantity > layer.originalQuantity) {
        issues.push(`Layer ${layer.id}: Remaining quantity (${layer.remainingQuantity}) exceeds original (${layer.originalQuantity})`);
      }

      // Check consistency of isFullyConsumed flag
      if (layer.isFullyConsumed && layer.remainingQuantity > 0) {
        issues.push(`Layer ${layer.id}: Marked as fully consumed but has remaining quantity (${layer.remainingQuantity})`);
      }

      if (!layer.isFullyConsumed && layer.remainingQuantity === 0) {
        issues.push(`Layer ${layer.id}: Has zero remaining quantity but not marked as fully consumed`);
      }

      // Check for negative unit cost
      if (layer.unitCost < 0) {
        issues.push(`Layer ${layer.id}: Negative unit cost (${layer.unitCost})`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      layersChecked: layers.length,
    };
  }
}

