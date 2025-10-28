import api from './api';
import type {
  CostCenter,
  CreateCostCenterDto,
  UpdateCostCenterDto,
  QueryCostCentersDto,
  CostCentersResponse,
} from '../types/cost-center';

export const costCentersApi = {
  // Create a cost center
  create: async (data: CreateCostCenterDto): Promise<CostCenter> => {
    const response = await api.post('/cost-centers', data);
    return response.data;
  },

  // Get all cost centers
  getAll: async (params?: QueryCostCentersDto): Promise<CostCentersResponse> => {
    const response = await api.get('/cost-centers', { params });
    return response.data;
  },

  // Get cost centers tree
  getTree: async (): Promise<CostCenter[]> => {
    const response = await api.get('/cost-centers/tree');
    return response.data;
  },

  // Get a cost center by ID
  getById: async (id: string): Promise<CostCenter> => {
    const response = await api.get(`/cost-centers/${id}`);
    return response.data;
  },

  // Get ancestors of a cost center
  getAncestors: async (id: string): Promise<CostCenter[]> => {
    const response = await api.get(`/cost-centers/${id}/ancestors`);
    return response.data;
  },

  // Get descendants of a cost center
  getDescendants: async (id: string): Promise<CostCenter[]> => {
    const response = await api.get(`/cost-centers/${id}/descendants`);
    return response.data;
  },

  // Update a cost center
  update: async (id: string, data: UpdateCostCenterDto): Promise<CostCenter> => {
    const response = await api.patch(`/cost-centers/${id}`, data);
    return response.data;
  },

  // Delete a cost center
  delete: async (id: string): Promise<void> => {
    await api.delete(`/cost-centers/${id}`);
  },
};

