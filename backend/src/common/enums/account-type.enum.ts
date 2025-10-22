export enum AccountType {
  CONTROL = 'CONTROL', // Parent accounts (e.g., Assets)
  SUB_CONTROL = 'SUB_CONTROL', // Sub-parent (e.g., Current Assets)
  DETAIL = 'DETAIL', // Leaf accounts (transactional)
}

