export interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  creditLimit: number;
  creditDays: number;
  graceDays: number;
  taxId: string | null;
  gstNumber: string | null;
  receivableAccountId: string;
  receivableAccount?: {
    id: string;
    code: string;
    name: string;
  };
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  deletedAt: string | null;
}

export interface CreateCustomerDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  creditLimit?: number;
  creditDays?: number;
  graceDays?: number;
  taxId?: string;
  gstNumber?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface QueryCustomersDto {
  search?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  accountCode: string;
  balance: number;
  balanceType: 'DR' | 'CR';
}

