export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceType {
  STORAGE = 'STORAGE',
  SERVICE = 'SERVICE',
  MIXED = 'MIXED',
}

export interface InvoiceLineItem {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  };

  // Dates
  issueDate: string;
  dueDate: string;
  paidDate?: string;

  // Storage details (if applicable)
  weight?: number;
  daysStored?: number;
  ratePerKgPerDay?: number;
  storageDateIn?: string;
  storageDateOut?: string;

  // Financial amounts
  storageCharges: number;
  labourCharges: number;
  loadingCharges: number;
  subtotal: number;
  gstAmount: number;
  gstRate: number;
  whtAmount: number;
  whtRate: number;
  totalAmount: number;

  // Payment tracking
  amountPaid: number;
  balanceDue: number;
  paymentTermsDays: number;

  // Additional info
  referenceNumber?: string;
  notes?: string;
  breakdown?: {
    storageCalculation?: string;
    labourCalculation?: string;
    taxCalculation?: string;
  };

  // Line items
  lineItems?: InvoiceLineItem[];

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateInvoiceFromBillingDto {
  customerId: string;
  billingData: {
    weight: number;
    dateIn: string;
    dateOut?: string;
    daysStored?: number;
    ratePerKgPerDay?: number;
    labourCharges?: number;
    loadingCharges?: number;
    applyGST?: boolean;
    applyWHT?: boolean;
  };
  issueDate?: string;
  paymentTermsDays?: number;
  referenceNumber?: string;
  notes?: string;
  autoSend?: boolean;
}

export interface UpdateInvoiceDto {
  status?: InvoiceStatus;
  dueDate?: string;
  paidDate?: string;
  amountPaid?: number;
  notes?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface InvoiceStatistics {
  count: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  amount: {
    total: number;
    paid: number;
    outstanding: number;
  };
}
