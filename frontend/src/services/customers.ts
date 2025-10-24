import { api } from './api';
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomersDto,
  CustomersResponse,
  CustomerBalance,
} from '../types/customer';

export const customersService = {
  /**
   * Get all customers with pagination and filtering
   */
  async getCustomers(query: QueryCustomersDto = {}): Promise<CustomersResponse> {
    const response = await api.get<CustomersResponse>('/customers', {
      params: query,
    });
    return response.data;
  },

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: string): Promise<Customer> {
    const response = await api.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer (with AR account)
   */
  async createCustomer(data: CreateCustomerDto): Promise<Customer> {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },

  /**
   * Update a customer
   */
  async updateCustomer(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const response = await api.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a customer (soft delete)
   */
  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  /**
   * Get customer's account balance
   */
  async getCustomerBalance(id: string): Promise<CustomerBalance> {
    const response = await api.get<CustomerBalance>(`/customers/${id}/balance`);
    return response.data;
  },
};

