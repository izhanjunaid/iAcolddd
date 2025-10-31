export enum TaxType {
  GST = 'GST',
  WHT = 'WHT',
  INCOME_TAX = 'INCOME_TAX',
  PROVINCIAL_TAX = 'PROVINCIAL_TAX',
  CUSTOM_DUTY = 'CUSTOM_DUTY',
  EXCISE_DUTY = 'EXCISE_DUTY',
}

export enum TaxApplicability {
  ALL = 'ALL',
  REGISTERED = 'REGISTERED',
  UNREGISTERED = 'UNREGISTERED',
  COMPANY = 'COMPANY',
  INDIVIDUAL = 'INDIVIDUAL',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  LOCAL = 'LOCAL',
}

export enum TaxEntityType {
  CUSTOMER = 'CUSTOMER',
  PRODUCT = 'PRODUCT',
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY',
  TRANSACTION = 'TRANSACTION',
}

export interface TaxRate {
  id: string;
  name: string;
  description: string | null;
  taxType: TaxType;
  applicability: TaxApplicability;
  rate: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  liabilityAccountCode: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
  createdBy?: {
    id: string;
    username: string;
    fullName: string;
  };
  updatedBy?: {
    id: string;
    username: string;
    fullName: string;
  };
}

export interface CreateTaxRateDto {
  name: string;
  description?: string;
  taxType: TaxType;
  applicability: TaxApplicability;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
  isDefault?: boolean;
  liabilityAccountCode?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTaxRateDto extends Partial<CreateTaxRateDto> {}

export interface QueryTaxRatesDto {
  page?: number;
  limit?: number;
  taxType?: TaxType;
  applicability?: TaxApplicability;
  isActive?: boolean;
  search?: string;
}

export interface TaxRatesResponse {
  data: TaxRate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaxCalculationRequest {
  amount: number;
  taxType: TaxType;
  customerId?: string;
  productId?: string;
  transactionType?: string;
}

export interface TaxCalculationResult {
  taxType: TaxType;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  isExempt: boolean;
  exemptionReason?: string;
  appliedRate?: {
    id: string;
    name: string;
    rate: number;
  };
}

export interface InvoiceTaxCalculationRequest {
  subtotal: number;
  customerId?: string;
  items?: Array<{
    productId: string;
    amount: number;
  }>;
}

export interface InvoiceTaxCalculationResult {
  subtotal: number;
  gstAmount: number;
  whtAmount: number;
  incomeTaxAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  taxBreakdown: TaxCalculationResult[];
}

export interface TaxConfiguration {
  id: string;
  entityType: TaxEntityType;
  entityId: string;
  taxRateId: string;
  taxRate?: TaxRate;
  isExempt: boolean;
  exemptionReason: string | null;
  exemptionCertificateNumber: string | null;
  exemptionValidFrom: string | null;
  exemptionValidTo: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxConfigurationDto {
  entityType: TaxEntityType;
  entityId: string;
  taxRateId: string;
  isExempt: boolean;
  exemptionReason?: string;
  exemptionCertificateNumber?: string;
  exemptionValidFrom?: string;
  exemptionValidTo?: string;
  metadata?: Record<string, any>;
}
