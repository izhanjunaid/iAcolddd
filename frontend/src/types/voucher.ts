export enum VoucherType {
  JOURNAL = 'JOURNAL',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  CONTRA = 'CONTRA',
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  CREDIT_NOTE = 'CREDIT_NOTE',
}

export enum PaymentMode {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  ONLINE_TRANSFER = 'ONLINE_TRANSFER',
  BANK_DRAFT = 'BANK_DRAFT',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
}

export interface VoucherLineItem {
  id?: string;
  accountCode: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  lineNumber: number;
  metadata?: Record<string, any>;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  voucherDate: string; // ISO date string
  description?: string;
  
  // Payment/Receipt specific
  paymentMode?: PaymentMode;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  
  // Reference
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  
  totalAmount: number;
  isPosted: boolean;
  postedAt?: string;
  postedBy?: {
    id: string;
    username: string;
    fullName: string;
  };
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    username: string;
    fullName: string;
  };
  
  // Line items
  details: VoucherLineItem[];
}

export interface CreateVoucherDto {
  voucherType: VoucherType;
  voucherDate: string;
  description?: string;
  paymentMode?: PaymentMode;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  details: VoucherLineItem[];
}

export interface UpdateVoucherDto {
  voucherDate?: string;
  description?: string;
  paymentMode?: PaymentMode;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  details?: VoucherLineItem[];
}

export interface VoucherFilters {
  voucherType?: VoucherType;
  fromDate?: string;
  toDate?: string;
  isPosted?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface VouchersResponse {
  data: Voucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// General Ledger Types
export interface AccountBalance {
  accountCode: string;
  accountName: string;
  nature: 'DEBIT' | 'CREDIT';
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  balanceType: 'DR' | 'CR';
}

export interface AccountLedgerEntry {
  date: string;
  voucherNumber: string;
  voucherId: string;
  voucherType: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountLedger {
  account: {
    code: string;
    name: string;
    nature: string;
  };
  openingBalance: AccountBalance;
  entries: AccountLedgerEntry[];
  closingBalance: AccountBalance;
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  category: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  asOfDate: string;
  accounts: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

