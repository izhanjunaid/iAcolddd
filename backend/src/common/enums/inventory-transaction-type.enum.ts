export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT', // Goods coming in (GRN)
  ISSUE = 'ISSUE', // Goods going out (GDN)
  TRANSFER = 'TRANSFER', // Moving between locations
  ADJUSTMENT = 'ADJUSTMENT', // Stock adjustments (gains/losses)
  SALES_RETURN = 'SALES_RETURN', // Goods returned by customer
  CONSUMPTION = 'CONSUMPTION', // Internal consumption
}
