import api from './api';
import type {
  Invoice,
  CreateInvoiceFromBillingDto,
  UpdateInvoiceDto,
  InvoiceFilters,
  InvoiceStatistics,
} from '../types/invoice';

export const invoiceService = {
  /**
   * Get all invoices with filters
   */
  async getInvoices(filters?: InvoiceFilters) {
    const response = await api.get<{
      data: Invoice[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/invoices', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string) {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string) {
    const response = await api.get<Invoice>(`/invoices/by-number/${invoiceNumber}`);
    return response.data;
  },

  /**
   * Create invoice from billing calculation
   */
  async createInvoiceFromBilling(dto: CreateInvoiceFromBillingDto) {
    const response = await api.post<Invoice>('/invoices/from-billing', dto);
    return response.data;
  },

  /**
   * Update invoice
   */
  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    const response = await api.put<Invoice>(`/invoices/${id}`, dto);
    return response.data;
  },

  /**
   * Mark invoice as sent
   */
  async markAsSent(id: string) {
    const response = await api.patch<Invoice>(`/invoices/${id}/send`, {});
    return response.data;
  },

  /**
   * Record payment for invoice with Receipt Voucher creation
   */
  async recordPayment(id: string, paymentData: {
    amount: number;
    paymentDate?: string;
    paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER';
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    bankReference?: string;
  }) {
    const response = await api.post<Invoice>(
      `/invoices/${id}/payment`,
      paymentData
    );
    return response.data;
  },

  async createDebitNote(invoiceId: string, data: { amount: number; reason: string }) {
    const response = await api.post(`/invoices/${invoiceId}/debit-note`, data);
    return response.data;
  },

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string) {
    const response = await api.patch<Invoice>(`/invoices/${id}/cancel`, {});
    return response.data;
  },

  async createCreditNote(invoiceId: string, data: { amount: number; reason: string }) {
    const response = await api.post(`/invoices/${invoiceId}/credit-note`, data);
    return response.data;
  },

  /**
   * Get invoice statistics
   */
  async getStatistics(customerId?: string) {
    const response = await api.get<InvoiceStatistics>('/invoices/statistics', {
      params: customerId ? { customerId } : undefined,
    });
    return response.data;
  },

  /**
   * Download invoice PDF
   */
  async downloadPDF(id: string, invoiceNumber: string) {
    const response = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Add miscellaneous charge to invoice (submits for Maker-Checker approval)
   */
  async addMiscCharge(invoiceId: string, data: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    reason?: string;
  }) {
    const response = await api.post(`/invoices/${invoiceId}/add-charge`, data);
    return response.data;
  },
};
