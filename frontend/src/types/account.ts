export enum AccountType {
  CONTROL = 'CONTROL',
  SUB_CONTROL = 'SUB_CONTROL',
  DETAIL = 'DETAIL',
}

export enum AccountNature {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum AccountCategory {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum AccountSubCategory {
  CURRENT_ASSET = 'CURRENT_ASSET',
  NON_CURRENT_ASSET = 'NON_CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  INTANGIBLE_ASSET = 'INTANGIBLE_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  NON_CURRENT_LIABILITY = 'NON_CURRENT_LIABILITY',
  SHARE_CAPITAL = 'SHARE_CAPITAL',
  RETAINED_EARNINGS = 'RETAINED_EARNINGS',
  RESERVES = 'RESERVES',
  OPERATING_REVENUE = 'OPERATING_REVENUE',
  NON_OPERATING_REVENUE = 'NON_OPERATING_REVENUE',
  COST_OF_GOODS_SOLD = 'COST_OF_GOODS_SOLD',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  ADMINISTRATIVE_EXPENSE = 'ADMINISTRATIVE_EXPENSE',
  FINANCIAL_EXPENSE = 'FINANCIAL_EXPENSE',
}

export enum FinancialStatement {
  BALANCE_SHEET = 'BALANCE_SHEET',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  CASH_FLOW_STATEMENT = 'CASH_FLOW_STATEMENT',
  CHANGES_IN_EQUITY = 'CHANGES_IN_EQUITY',
}

export interface Account {
  id: string;
  code: string;
  name: string;
  parentAccountId: string | null;
  accountType: AccountType;
  nature: AccountNature;
  category: AccountCategory;
  
  // New Phase 1 fields
  subCategory: AccountSubCategory | null;
  financialStatement: FinancialStatement | null;
  statementSection: string | null;
  displayOrder: number;
  
  // Behavior flags
  isCashAccount: boolean;
  isBankAccount: boolean;
  isDepreciable: boolean;
  requireCostCenter: boolean;
  requireProject: boolean;
  allowDirectPosting: boolean;
  
  isActive: boolean;
  isSystem: boolean;
  openingBalance: number;
  openingDate: string | null;
  creditLimit: number | null;
  creditDays: number | null;
  
  // Contact details
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  contactName: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  ntn: string | null;
  gst: string | null;
  
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  
  // Hierarchical properties
  parent?: Account | null;
  children?: Account[];
  level?: number;
  path?: string;
  currentBalance?: number;
}

export interface CreateAccountDto {
  code?: string;
  name: string;
  parentAccountId?: string | null;
  accountType: AccountType;
  nature: AccountNature;
  category: AccountCategory;
  
  // New Phase 1 fields
  subCategory?: AccountSubCategory | null;
  financialStatement?: FinancialStatement | null;
  statementSection?: string | null;
  displayOrder?: number;
  
  // Behavior flags
  isCashAccount?: boolean;
  isBankAccount?: boolean;
  isDepreciable?: boolean;
  requireCostCenter?: boolean;
  requireProject?: boolean;
  allowDirectPosting?: boolean;
  
  isActive?: boolean;
  openingBalance?: number;
  openingDate?: string;
  creditLimit?: number;
  creditDays?: number;
  
  // Contact details
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  ntn?: string;
  gst?: string;
  
  metadata?: Record<string, any>;
}

export interface UpdateAccountDto extends Partial<Omit<CreateAccountDto, 'code'>> {}

export interface QueryAccountsDto {
  search?: string;
  accountType?: AccountType;
  nature?: AccountNature;
  category?: AccountCategory;
  parentAccountId?: string;
  rootOnly?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AccountsResponse {
  data: Account[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

