export interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedById: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  periods?: FiscalPeriod[];
}

export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  periodNumber: number;
  periodName: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedById: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fiscalYear?: FiscalYear;
}

export interface CreateFiscalYearDto {
  year: number;
  startDate: string;
  endDate: string;
}

export interface CloseFiscalPeriodDto {
  periodId: string;
}

export interface QueryFiscalPeriodsDto {
  year?: number;
  isClosed?: boolean;
  page?: number;
  limit?: number;
}

export interface FiscalPeriodsResponse {
  data: FiscalYear[];
  total: number;
  page: number;
  limit: number;
}

