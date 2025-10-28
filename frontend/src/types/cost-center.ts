export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent?: CostCenter | null;
  children?: CostCenter[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  level?: number;
  path?: string;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCostCenterDto {
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface QueryCostCentersDto {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CostCentersResponse {
  data: CostCenter[];
  total: number;
  page: number;
  limit: number;
}

