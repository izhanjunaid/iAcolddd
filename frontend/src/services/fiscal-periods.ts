import api from './api';
import type {
  FiscalYear,
  FiscalPeriod,
  CreateFiscalYearDto,
  CloseFiscalPeriodDto,
  QueryFiscalPeriodsDto,
  FiscalPeriodsResponse,
} from '../types/fiscal-period';

export const fiscalPeriodsApi = {
  // Create a fiscal year
  createFiscalYear: async (data: CreateFiscalYearDto): Promise<FiscalYear> => {
    const response = await api.post('/fiscal-periods/years', data);
    return response.data;
  },

  // Get all fiscal years
  getFiscalYears: async (params?: QueryFiscalPeriodsDto): Promise<FiscalPeriodsResponse> => {
    const response = await api.get('/fiscal-periods/years', { params });
    return response.data;
  },

  // Get a fiscal year by ID
  getFiscalYearById: async (id: string): Promise<FiscalYear> => {
    const response = await api.get(`/fiscal-periods/years/${id}`);
    return response.data;
  },

  // Get a fiscal period by ID
  getFiscalPeriodById: async (id: string): Promise<FiscalPeriod> => {
    const response = await api.get(`/fiscal-periods/periods/${id}`);
    return response.data;
  },

  // Get current fiscal period
  getCurrentPeriod: async (): Promise<FiscalPeriod | null> => {
    const response = await api.get('/fiscal-periods/current');
    return response.data;
  },

  // Close a fiscal period
  closePeriod: async (data: CloseFiscalPeriodDto): Promise<FiscalPeriod> => {
    const response = await api.post('/fiscal-periods/periods/close', data);
    return response.data;
  },

  // Reopen a fiscal period
  reopenPeriod: async (periodId: string): Promise<FiscalPeriod> => {
    const response = await api.post(`/fiscal-periods/periods/${periodId}/reopen`);
    return response.data;
  },
};

