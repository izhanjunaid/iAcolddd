// Inventory API Services

import { api } from './api';
// Temporary inline types to fix import issues
enum UnitOfMeasure {
  KG = 'KG',
  GRAM = 'GRAM',
  TON = 'TON',
  POUND = 'POUND',
  PIECE = 'PIECE',
}

enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE', 
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

interface CreateInventoryItemDto {
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

interface UpdateInventoryItemDto {
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

interface QueryInventoryItemsDto {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  isPerishable?: boolean;
}

interface InventoryItem {
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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Simplified versions for other needed types
interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  transactionType: InventoryTransactionType;
  transactionDate: string;
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  notes?: string;
}

interface CreateInventoryTransactionDto {
  itemId: string;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
}

interface QueryInventoryTransactionsDto {
  page?: number;
  limit?: number;
  itemId?: string;
  customerId?: string;
  warehouseId?: string;
  transactionType?: InventoryTransactionType;
  startDate?: string;
  endDate?: string;
}

interface InventoryBalance {
  id: string;
  itemId: string;
  item?: InventoryItem;
  customerId?: string;
  warehouseId: string;
  roomId?: string;
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

interface QueryInventoryBalancesDto {
  page?: number;
  limit?: number;
  itemId?: string;
  customerId?: string;
  warehouseId?: string;
  roomId?: string;
  lotNumber?: string;
  onlyWithStock?: boolean;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

interface Room {
  id: string;
  warehouseId: string;
  warehouse?: Warehouse;
  code: string;
  name: string;
  temperatureRange?: string;
  capacityTons?: number;
  isActive: boolean;
}

// Inventory Items API
export const inventoryItemsApi = {
  // Get all inventory items with pagination and filtering
  getItems: async (params?: QueryInventoryItemsDto): Promise<{ data: InventoryItem[], total: number }> => {
    const response = await api.get('/inventory/items', { params });
    return response.data;
  },

  // Get single inventory item by ID
  getItem: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  },

  // Create new inventory item
  createItem: async (data: CreateInventoryItemDto): Promise<InventoryItem> => {
    const response = await api.post('/inventory/items', data);
    return response.data;
  },

  // Update inventory item
  updateItem: async (id: string, data: UpdateInventoryItemDto): Promise<InventoryItem> => {
    const response = await api.patch(`/inventory/items/${id}`, data);
    return response.data;
  },

  // Delete inventory item
  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/items/${id}`);
  },
};

// Inventory Transactions API
export const inventoryTransactionsApi = {
  // Get all inventory transactions
  getTransactions: async (params?: QueryInventoryTransactionsDto): Promise<PaginatedResponse<InventoryTransaction>> => {
    const response = await api.get('/inventory/transactions', { params });
    return response.data;
  },

  // Get single transaction by ID
  getTransaction: async (id: string): Promise<InventoryTransaction> => {
    const response = await api.get(`/inventory/transactions/${id}`);
    return response.data;
  },

  // Process goods receipt
  processReceipt: async (data: CreateInventoryTransactionDto): Promise<InventoryTransaction> => {
    const response = await api.post('/inventory/transactions/receipt', data);
    return response.data;
  },

  // Process goods issue
  processIssue: async (data: CreateInventoryTransactionDto): Promise<InventoryTransaction> => {
    const response = await api.post('/inventory/transactions/issue', data);
    return response.data;
  },

  // Process transfer between locations
  processTransfer: async (data: CreateInventoryTransactionDto): Promise<InventoryTransaction> => {
    const response = await api.post('/inventory/transactions/transfer', data);
    return response.data;
  },

  // Process stock adjustment
  processAdjustment: async (data: CreateInventoryTransactionDto): Promise<InventoryTransaction> => {
    const response = await api.post('/inventory/transactions/adjustment', data);
    return response.data;
  },

  // Post transaction to GL
  postToGL: async (id: string): Promise<any> => {
    const response = await api.post(`/inventory/transactions/${id}/post-to-gl`);
    return response.data;
  },

  // Reverse GL posting
  reverseGL: async (id: string): Promise<any> => {
    const response = await api.post(`/inventory/transactions/${id}/reverse-gl`);
    return response.data;
  },
};

// Inventory Balances API
export const inventoryBalancesApi = {
  // Get current inventory balances
  getBalances: async (params?: QueryInventoryBalancesDto): Promise<PaginatedResponse<InventoryBalance>> => {
    const response = await api.get('/inventory/balances', { params });
    return response.data;
  },

  // Get balance for specific item/location
  getBalance: async (id: string): Promise<InventoryBalance> => {
    const response = await api.get(`/inventory/balances/${id}`);
    return response.data;
  },
};

// Inventory Reports API
export const inventoryReportsApi = {
  // Stock movement report
  getStockMovementReport: async (params: StockMovementReportDto): Promise<StockMovementSummary[]> => {
    const response = await api.get('/inventory/reports/stock-movement', { params });
    return response.data;
  },

  // Inventory valuation report
  getInventoryValuationReport: async (params: InventoryValuationReportDto): Promise<InventoryValuationSummary[]> => {
    const response = await api.get('/inventory/reports/inventory-valuation', { params });
    return response.data;
  },

  // Cost layers report (FIFO details)
  getCostLayersReport: async (itemId: string, warehouseId?: string): Promise<InventoryCostLayer[]> => {
    const params = warehouseId ? { warehouseId } : {};
    const response = await api.get(`/inventory/reports/cost-layers/${itemId}`, { params });
    return response.data;
  },

  // Slow moving stock report
  getSlowMovingStockReport: async (days: number = 90): Promise<InventoryValuationSummary[]> => {
    const response = await api.get('/inventory/reports/slow-moving', { params: { days } });
    return response.data;
  },

  // Stock below reorder level
  getStockBelowReorderReport: async (): Promise<InventoryValuationSummary[]> => {
    const response = await api.get('/inventory/reports/reorder-level');
    return response.data;
  },
};

// Warehouses API (supporting data)
export const warehousesApi = {
  // Get all warehouses
  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get('/warehouses');
    return response.data;
  },

  // Get warehouse by ID
  getWarehouse: async (id: string): Promise<Warehouse> => {
    const response = await api.get(`/warehouses/${id}`);
    return response.data;
  },
};

// Rooms API (supporting data)
export const roomsApi = {
  // Get all rooms
  getRooms: async (warehouseId?: string): Promise<Room[]> => {
    const params = warehouseId ? { warehouseId } : {};
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  // Get room by ID
  getRoom: async (id: string): Promise<Room> => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },
};

// Combined inventory service object
export const inventoryService = {
  items: inventoryItemsApi,
  transactions: inventoryTransactionsApi,
  balances: inventoryBalancesApi,
  reports: inventoryReportsApi,
  warehouses: warehousesApi,
  rooms: roomsApi,
};

export default inventoryService;
