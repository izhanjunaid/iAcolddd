import api from './api';
import type { GoodsReceiptNote, CreateGoodsReceiptNoteDto } from '../types/goods-receipt-note';

export const goodsReceiptNotesService = {
    create: async (data: CreateGoodsReceiptNoteDto): Promise<GoodsReceiptNote> => {
        const response = await api.post('/goods-receipt-notes', data);
        return response.data;
    },

    getAll: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        vendorId?: string;
        purchaseOrderId?: string;
    }): Promise<{
        items: GoodsReceiptNote[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> => {
        const response = await api.get('/goods-receipt-notes', { params });
        return response.data;
    },

    getById: async (id: string): Promise<GoodsReceiptNote> => {
        const response = await api.get(`/goods-receipt-notes/${id}`);
        return response.data;
    },

    complete: async (id: string): Promise<GoodsReceiptNote> => {
        const response = await api.patch(`/goods-receipt-notes/${id}/complete`);
        return response.data;
    },

    cancel: async (id: string): Promise<GoodsReceiptNote> => {
        const response = await api.patch(`/goods-receipt-notes/${id}/cancel`);
        return response.data;
    },
};

export default goodsReceiptNotesService;
