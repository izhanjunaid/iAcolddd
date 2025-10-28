// Inventory Management Types for Frontend

// Enums
export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE', 
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum UnitOfMeasure {
  KG = 'KG',
  GRAM = 'GRAM',
  TON = 'TON',
  POUND = 'POUND',
  PALLET = 'PALLET',
  CARTON = 'CARTON',
  BAG = 'BAG',
  SACK = 'SACK',
  LITER = 'LITER',
  ML = 'ML',
  GALLON = 'GALLON',
  PIECE = 'PIECE',
  DOZEN = 'DOZEN',
  CONTAINER = 'CONTAINER',
  TRAY = 'TRAY',
}

export enum InventoryReferenceType {
  GRN = 'GRN',
  GDN = 'GDN', 
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  SALES_ORDER = 'SALES_ORDER',
  PHYSICAL_COUNT = 'PHYSICAL_COUNT',
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT',
}

// Core Entities
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: UnitOfMeasure;
  isPerishable: boolean;
  shelfLifeDays?: number;
  minTemperature?: number;
  maxTemperature?: number;
  standardCost: number;
  lastCost: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  transactionType: InventoryTransactionType;
  transactionDate: string;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  itemId: string;
  item?: InventoryItem;
  customerId?: string;
  customer?: any; // Will be defined when we import Customer type
  warehouseId: string;
  warehouse?: Warehouse;
  roomId?: string;
  room?: Room;
  fromWarehouseId?: string;
  fromRoomId?: string;
  toWarehouseId?: string;
  toRoomId?: string;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  isPostedToGl: boolean;
  glVoucherId?: string;
  fiscalPeriodId?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface InventoryBalance {
  id: string;
  itemId: string;
  item?: InventoryItem;
  customerId?: string;
  customer?: any;
  warehouseId: string;
  warehouse?: Warehouse;
  roomId?: string;
  room?: Room;
  lotNumber?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  weightedAverageCost: number;
  totalValue: number;
  lastMovementDate?: string;
  lastMovementType?: InventoryTransactionType;
  updatedAt: string;
}

export interface InventoryCostLayer {
  id: string;
  itemId: string;
  item?: InventoryItem;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  lotNumber?: string;
  receiptDate: string;
  receiptReference?: string;
  receiptTransactionId?: string;
  originalQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  isFullyConsumed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Room {
  id: string;
  warehouseId: string;
  warehouse?: Warehouse;
  code: string;
  name: string;
  temperatureRange?: string;
  capacityTons?: number;
  isActive: boolean;
  createdAt: string;
}

// DTOs for API calls
export interface CreateInventoryItemDto {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: UnitOfMeasure;
  isPerishable?: boolean;
  shelfLifeDays?: number;
  minTemperature?: number;
  maxTemperature?: number;
  standardCost: number;
  notes?: string;
}

export interface UpdateInventoryItemDto {
  name?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  isPerishable?: boolean;
  shelfLifeDays?: number;
  minTemperature?: number;
  maxTemperature?: number;
  standardCost?: number;
  isActive?: boolean;
}

export interface CreateInventoryTransactionDto {
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
}

// Query DTOs
export interface QueryInventoryItemsDto {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  isPerishable?: boolean;
}

export interface QueryInventoryTransactionsDto {
  page?: number;
  limit?: number;
  itemId?: string;
  customerId?: string;
  warehouseId?: string;
  transactionType?: InventoryTransactionType;
  startDate?: string;
  endDate?: string;
  isPostedToGl?: boolean;
}

export interface QueryInventoryBalancesDto {
  page?: number;
  limit?: number;
  itemId?: string;
  customerId?: string;
  warehouseId?: string;
  roomId?: string;
  lotNumber?: string;
  onlyWithStock?: boolean;
}

// Report DTOs
export interface StockMovementReportDto {
  itemId?: string;
  warehouseId?: string;
  customerId?: string;
  startDate: string;
  endDate: string;
}

export interface InventoryValuationReportDto {
  asOfDate: string;
  warehouseId?: string;
  customerId?: string;
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockMovementSummary {
  itemId: string;
  itemName: string;
  itemSku: string;
  openingBalance: number;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
  closingBalance: number;
  totalValue: number;
  averageCost: number;
}

export interface InventoryValuationSummary {
  itemId: string;
  itemName: string;
  itemSku: string;
  category?: string;
  warehouseName: string;
  quantityOnHand: number;
  unitOfMeasure: UnitOfMeasure;
  averageCost: number;
  totalValue: number;
  lastMovementDate?: string;
}
