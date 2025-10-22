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

export interface Account {
  id: string;
  code: string;
  name: string;
  parentAccountId: string | null;
  accountType: AccountType;
  nature: AccountNature;
  category: AccountCategory;
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

