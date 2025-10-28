import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';
import { UnitOfMeasure } from '../enums/unit-of-measure.enum';

export interface FIFOCalculationResult {
  totalCost: number;
  averageCost: number;
  costBreakdown: FIFOCostBreakdown[];
  remainingQuantity: number;
}

export interface FIFOCostBreakdown {
  layerId: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  receiptDate: Date;
  lotNumber?: string;
}

export interface StockMovement {
  transactionType: InventoryTransactionType;
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  quantity: number;
  quantityChange: number; // The change in quantity (positive or negative)
  unitOfMeasure: UnitOfMeasure;
  unitCost: number;
  totalCost: number;
  transactionDate: Date; // Date of the transaction
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
  manufactureDate?: Date;
  notes?: string;
}

export interface StockBalance {
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  lotNumber?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  weightedAverageCost: number;
  totalValue: number;
  lastMovementDate?: Date;
  lastMovementType?: InventoryTransactionType;
}

export interface CostLayer {
  id: string;
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  lotNumber?: string;
  receiptDate: Date;
  receiptReference?: string;
  originalQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  isFullyConsumed: boolean;
}

export interface InventoryValuation {
  warehouseName: string;
  category: string;
  totalQuantity: number;
  totalValue: number;
  averageCost: number;
}

export interface StockMovementSummary {
  transactionDate: Date;
  transactionType: InventoryTransactionType;
  referenceNumber: string;
  itemSku: string;
  itemName: string;
  customerName?: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  quantityIn: number;
  quantityOut: number;
}

export interface StockAvailability {
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalOnHand: number;
  isAvailable: boolean;
  insufficientStockMessage?: string;
}
