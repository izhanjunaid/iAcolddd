import { api } from './api';
import type { Vendor, CreateVendorDto, UpdateVendorDto } from '../types/vendor';

export const vendorsService = {
    async getVendors() {
        const response = await api.get<Vendor[]>('/vendors');
        return response.data;
    },

    async getVendor(id: string) {
        const response = await api.get<Vendor>(`/vendors/${id}`);
        return response.data;
    },

    async createVendor(data: CreateVendorDto) {
        const response = await api.post<Vendor>('/vendors', data);
        return response.data;
    },

    async updateVendor(id: string, data: UpdateVendorDto) {
        const response = await api.patch<Vendor>(`/vendors/${id}`, data);
        return response.data;
    },

    async deleteVendor(id: string) {
        await api.delete(`/vendors/${id}`);
    }
};
