export enum InventoryReferenceType {
  GRN = 'GRN',                    // Goods Receipt Note
  GDN = 'GDN',                    // Goods Dispatch Note
  TRANSFER = 'TRANSFER',          // Stock Transfer
  ADJUSTMENT = 'ADJUSTMENT',      // Stock Adjustment
  PURCHASE_ORDER = 'PURCHASE_ORDER', // Purchase Order
  SALES_ORDER = 'SALES_ORDER',    // Sales Order
  PHYSICAL_COUNT = 'PHYSICAL_COUNT', // Physical Stock Count
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT', // System-generated adjustments
}

