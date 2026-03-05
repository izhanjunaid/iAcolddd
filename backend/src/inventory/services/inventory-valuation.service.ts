import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryBalance } from '../entities/inventory-balance.entity';
import { InventoryCostLayer } from '../entities/inventory-cost-layer.entity';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryValuationService {
  constructor(
    @InjectRepository(InventoryBalance)
    private readonly balanceRepository: Repository<InventoryBalance>,
    @InjectRepository(InventoryCostLayer)
    private readonly costLayerRepository: Repository<InventoryCostLayer>,
    private readonly dataSource: DataSource,
  ) {}

  private toDecimal(value: any): any {
    return new Decimal(value || 0);
  }

  /**
   * Get valuation summary, optionally filtered by warehouse or item
   */
  async getValuationSummary(warehouseId?: string, itemId?: string) {
    const query = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.item', 'item')
      .leftJoinAndSelect('balance.warehouse', 'warehouse')
      .where('balance.quantityOnHand > 0');

    if (warehouseId) {
      query.andWhere('balance.warehouseId = :warehouseId', { warehouseId });
    }
    if (itemId) {
      query.andWhere('balance.itemId = :itemId', { itemId });
    }

    const balances = await query.getMany();

    let totalValue = new Decimal(0);
    const itemSummaries: any[] = [];

    for (const balance of balances) {
      const val = this.toDecimal(balance.totalValue);
      totalValue = totalValue.plus(val);

      itemSummaries.push({
        itemId: balance.itemId,
        itemName: (balance as any).item?.name,
        sku: (balance as any).item?.sku,
        category: (balance as any).item?.category,
        unitOfMeasure: (balance as any).item?.unitOfMeasure,
        warehouseId: balance.warehouseId,
        warehouseName: (balance as any).warehouse?.name,
        quantity: Number(balance.quantityOnHand),
        totalValue: val.toNumber(),
        averageCost: Number(balance.weightedAverageCost),
      });
    }

    return {
      totalInventoryValue: totalValue.toNumber(),
      itemCount: balances.length,
      details: itemSummaries,
    };
  }

  /**
   * Audit: Verify if InventoryBalance matches sum of FIFO Cost Layers
   * specific to an Item/Warehouse combo.
   */
  async validateInventoryIntegrity(warehouseId?: string) {
    // 1. Get all balances
    const balanceQuery = this.balanceRepository
      .createQueryBuilder('balance')
      .where('balance.quantityOnHand > 0');

    if (warehouseId) {
      balanceQuery.andWhere('balance.warehouseId = :warehouseId', {
        warehouseId,
      });
    }
    const balances = await balanceQuery.getMany();

    const discrepancies: any[] = [];

    for (const balance of balances) {
      // 2. Sum up cost layers for this specific balance key
      const { layerQty, layerValue } = await this.getLayerSum(
        balance.itemId,
        balance.warehouseId,
        balance.roomId,
        balance.customerId,
      );

      const balanceQty = this.toDecimal(balance.quantityOnHand);
      const balanceVal = this.toDecimal(balance.totalValue);

      const qtyDiff = balanceQty.minus(layerQty);
      const valDiff = balanceVal.minus(layerValue);

      // Check if diff is significant (ignore floating point dust < 0.01)
      if (!qtyDiff.abs().lt(0.001) || !valDiff.abs().lt(0.01)) {
        discrepancies.push({
          itemId: balance.itemId,
          warehouseId: balance.warehouseId,
          balance: {
            qty: balanceQty.toNumber(),
            value: balanceVal.toNumber(),
          },
          layers: {
            qty: layerQty.toNumber(),
            value: layerValue.toNumber(),
          },
          difference: {
            qty: qtyDiff.toNumber(),
            value: valDiff.toNumber(),
          },
        });
      }
    }

    return {
      passed: discrepancies.length === 0,
      checkedCount: balances.length,
      discrepancies,
    };
  }

  private async getLayerSum(
    itemId: string,
    warehouseId: string,
    roomId?: string,
    customerId?: string,
  ) {
    const query = this.costLayerRepository
      .createQueryBuilder('layer')
      .where('layer.itemId = :itemId', { itemId })
      .andWhere('layer.warehouseId = :warehouseId', { warehouseId })
      .andWhere('layer.remainingQuantity > 0')
      .andWhere('layer.isFullyConsumed = false');

    if (roomId) query.andWhere('layer.roomId = :roomId', { roomId });
    if (customerId)
      query.andWhere('layer.customerId = :customerId', { customerId });
    else query.andWhere('layer.customerId IS NULL');

    const layers = await query.getMany();

    let layerQty = new Decimal(0);
    let layerValue = new Decimal(0);

    for (const layer of layers) {
      const q = this.toDecimal(layer.remainingQuantity);
      const c = this.toDecimal(layer.unitCost);
      layerQty = layerQty.plus(q);
      layerValue = layerValue.plus(q.mul(c));
    }

    return { layerQty, layerValue };
  }
}
