export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',       // Goods coming in (GRN)
  ISSUE = 'ISSUE',           // Goods going out (GDN)
  TRANSFER = 'TRANSFER',     // Moving between locations
  ADJUSTMENT = 'ADJUSTMENT', // Stock adjustments (gains/losses)
}

