import api from './api';
import type {
  Voucher,
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherFilters,
  VouchersResponse,
  VoucherType,
} from '../types/voucher';

export const vouchersService = {
  /**
   * Create a new voucher
   */
  async createVoucher(data: CreateVoucherDto): Promise<Voucher> {
    const response = await api.post('/vouchers', data);
    return response.data;
  },

  /**
   * Get list of vouchers with filters
   */
  async getVouchers(filters?: VoucherFilters): Promise<VouchersResponse> {
    const response = await api.get('/vouchers', { params: filters });
    return response.data;
  },

  /**
   * Get single voucher by ID
   */
  async getVoucher(id: string): Promise<Voucher> {
    const response = await api.get(`/vouchers/${id}`);
    return response.data;
  },

  /**
   * Update voucher (draft only)
   */
  async updateVoucher(id: string, data: UpdateVoucherDto): Promise<Voucher> {
    const response = await api.patch(`/vouchers/${id}`, data);
    return response.data;
  },

  /**
   * Delete voucher (draft only)
   */
  async deleteVoucher(id: string): Promise<void> {
    await api.delete(`/vouchers/${id}`);
  },

  /**
   * Post voucher (mark as final)
   */
  async postVoucher(id: string): Promise<Voucher> {
    const response = await api.post(`/vouchers/${id}/post`);
    return response.data;
  },

  /**
   * Unpost voucher (admin only)
   */
  async unpostVoucher(id: string): Promise<Voucher> {
    const response = await api.post(`/vouchers/${id}/unpost`);
    return response.data;
  },

  /**
   * Get next voucher number for a type
   */
  async getNextVoucherNumber(type: VoucherType): Promise<string> {
    const response = await api.get(`/vouchers/next-number/${type}`);
    return response.data;
  },
};

