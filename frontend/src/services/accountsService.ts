import { api } from './api';
import type {
  Account,
  CreateAccountDto,
  UpdateAccountDto,
  QueryAccountsDto,
  AccountsResponse,
} from '../types/account';

export const accountsService = {
  // Get all accounts with pagination and filters
  getAccounts: async (params?: QueryAccountsDto): Promise<AccountsResponse> => {
    const response = await api.get<AccountsResponse>('/accounts', { params });
    return response.data;
  },

  // Get account tree (hierarchical structure)
  getAccountTree: async (): Promise<Account[]> => {
    const response = await api.get<Account[]>('/accounts/tree');
    return response.data;
  },

  // Get detail accounts (for transaction selection)
  getDetailAccounts: async (): Promise<Account[]> => {
    const response = await api.get<Account[]>('/accounts/detail');
    return response.data;
  },

  // Get single account by ID
  getAccount: async (id: string): Promise<Account> => {
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  },

  // Get sub-tree starting from specific account
  getSubTree: async (id: string): Promise<Account[]> => {
    const response = await api.get<Account[]>(`/accounts/${id}/tree`);
    return response.data;
  },

  // Create new account
  createAccount: async (data: CreateAccountDto): Promise<Account> => {
    const response = await api.post<Account>('/accounts', data);
    return response.data;
  },

  // Update account
  updateAccount: async (id: string, data: UpdateAccountDto): Promise<Account> => {
    const response = await api.patch<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  // Delete account
  deleteAccount: async (id: string): Promise<void> => {
    await api.delete(`/accounts/${id}`);
  },
};

