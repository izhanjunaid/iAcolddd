export enum VoucherType {
  JOURNAL = 'JOURNAL',           // JV - General Journal Entry
  PAYMENT = 'PAYMENT',           // PV - Cash/Bank Payment
  RECEIPT = 'RECEIPT',           // RV - Cash/Bank Receipt
  CONTRA = 'CONTRA',             // CV - Cash to Bank or Bank to Cash
  SALES = 'SALES',               // SI - Sales Invoice (future)
  PURCHASE = 'PURCHASE',         // PI - Purchase Invoice (future)
  DEBIT_NOTE = 'DEBIT_NOTE',     // DN - Debit Note (future)
  CREDIT_NOTE = 'CREDIT_NOTE',   // CN - Credit Note (future)
}

// Helper to get voucher prefix for number generation
export function getVoucherPrefix(type: VoucherType): string {
  const prefixMap: Record<VoucherType, string> = {
    [VoucherType.JOURNAL]: 'JV',
    [VoucherType.PAYMENT]: 'PV',
    [VoucherType.RECEIPT]: 'RV',
    [VoucherType.CONTRA]: 'CV',
    [VoucherType.SALES]: 'SI',
    [VoucherType.PURCHASE]: 'PI',
    [VoucherType.DEBIT_NOTE]: 'DN',
    [VoucherType.CREDIT_NOTE]: 'CN',
  };
  return prefixMap[type];
}

