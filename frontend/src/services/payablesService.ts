import { api } from './api';
import type { Vendor } from '../types/vendor';

export interface ApBill {
    id: string;
    vendorId: string;
    billNumber: string;
    vendorInvoiceNumber?: string;
    billDate: string;
    dueDate: string;
    totalAmount: number;
    balanceDue: number;
    amountPaid: number;
    status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
    notes?: string;
    lines: ApBillLine[];
}

export interface ApBillLine {
    id: string;
    expenseAccountId: string;
    description: string;
    amount: number;
    taxAmount: number;
    costCenterId?: string;
}

export interface CreateBillDto {
    vendorId: string;
    billNumber: string;
    vendorInvoiceNumber?: string;
    billDate: Date;
    dueDate: Date;
    notes?: string;
    lines: {
        expenseAccountId: string;
        description: string;
        amount: number;
        taxAmount?: number;
        costCenterId?: string;
    }[];
}

export interface ApPayment {
    id: string;
    paymentNumber: string;
    vendorId: string;
    vendor?: Vendor;
    paymentDate: string;
    paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'CREDIT_CARD';
    referenceNumber?: string;
    amount: number;
    notes?: string;
    glVoucherId?: string;
    bankAccountId?: string;
    bankAccount?: { id: string; name: string; code: string };
    createdAt: string;
}

export interface CreateApPaymentDto {
    vendorId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    referenceNumber?: string;
    bankAccountId?: string;
    notes?: string;
    applications?: { billId: string; amountApplied: number }[];
}

export interface ApplyPaymentDto {
    billId: string;
    amountToApply: number;
}

export const payablesService = {
    async getBills() {
        const response = await api.get<ApBill[]>('/payables/bills');
        return response.data;
    },

    async getBill(id: string) {
        const response = await api.get<ApBill>(`/payables/bills/${id}`);
        return response.data;
    },

    async createBill(data: CreateBillDto) {
        const response = await api.post<ApBill>('/payables/bills', data);
        return response.data;
    },

    async getPayments() {
        const response = await api.get<ApPayment[]>('/ap-payments');
        return response.data;
    },

    async getPayment(id: string) {
        const response = await api.get<ApPayment>(`/ap-payments/${id}`);
        return response.data;
    },

    async recordPayment(data: CreateApPaymentDto) {
        // Separate applications from creation data
        const { applications, ...createData } = data;

        // 1. Create Payment
        const response = await api.post<ApPayment>('/ap-payments', createData);
        const payment = response.data;

        // 2. Apply Payment if applications exist
        if (applications && applications.length > 0) {
            for (const app of applications) {
                await api.post(`/ap-payments/${payment.id}/apply`, {
                    billId: app.billId,
                    amountToApply: app.amountApplied
                });
            }
        }

        return payment;
    },

    async applyPayment(paymentId: string, data: ApplyPaymentDto) {
        const response = await api.post(`/ap-payments/${paymentId}/apply`, data);
        return response.data;
    }
};

export interface ApPaymentApplicationDto {
    billId: string;
    amountApplied: number;
}


export interface RecordPaymentDto {
    vendorId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'CREDIT_CARD';
    referenceNumber?: string;
    bankAccountId?: string;
    notes?: string;
    applications?: ApPaymentApplicationDto[];
}
