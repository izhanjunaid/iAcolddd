import { api } from './api';
import type { Vendor } from '../types/vendor';

export enum PurchaseOrderStatus {
    DRAFT = 'DRAFT',
    ISSUED = 'ISSUED',
    PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
    RECEIVED = 'RECEIVED',
    CLOSED = 'CLOSED',
    CANCELLED = 'CANCELLED',
}

export interface PurchaseOrderItem {
    id: string;
    itemId: string;
    item?: { id: string; name: string; sku: string; unitOfMeasure: string };
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    vendorId: string;
    vendor?: Vendor;
    orderDate: string;
    expectedDeliveryDate?: string;
    status: PurchaseOrderStatus;
    totalAmount: number;
    notes?: string;
    items: PurchaseOrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreatePurchaseOrderItemDto {
    itemId: string;
    quantity: number;
    unitPrice: number;
    description?: string;
}

export interface CreatePurchaseOrderDto {
    vendorId: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    notes?: string;
    items: CreatePurchaseOrderItemDto[];
}

export const purchaseOrdersService = {
    async getPurchaseOrders(params?: { page?: number; limit?: number; status?: string; vendorId?: string }) {
        const response = await api.get<{
            items: PurchaseOrder[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>('/purchase-orders', { params });
        return response.data;
    },

    async getPurchaseOrder(id: string) {
        const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
        return response.data;
    },

    async createPurchaseOrder(data: CreatePurchaseOrderDto) {
        const response = await api.post<PurchaseOrder>('/purchase-orders', data);
        return response.data;
    },

    async updateStatus(id: string, status: PurchaseOrderStatus) {
        const response = await api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
        return response.data;
    },
};
