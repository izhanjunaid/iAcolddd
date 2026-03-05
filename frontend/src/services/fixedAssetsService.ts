import api from './api';

export interface FixedAsset {
    id: string;
    assetCode: string;
    name: string;
    description?: string;
    purchaseDate: string;
    purchaseCost: number;
    salvageValue: number;
    usefulLifeMonths: number;
    depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
    decliningRate?: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    status: 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED' | 'INACTIVE';
    assetAccountCode: string;
    depreciationExpenseCode: string;
    accumulatedDepreciationCode: string;
    lastDepreciationDate?: string;
    createdAt: string;
}

export interface CreateFixedAssetDto {
    name: string;
    description?: string;
    purchaseDate: string;
    purchaseCost: number;
    salvageValue: number;
    usefulLifeMonths: number;
    depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
    decliningRate?: number;
    assetAccountCode: string;
    depreciationExpenseCode: string;
    accumulatedDepreciationCode: string;
    costCenterId?: string;
}

export interface DepreciationRunResult {
    periodDate: string;
    assetsProcessed: number;
    totalDepreciation: number;
    voucherId: string;
    voucherNumber: string;
    details: Array<{
        assetCode: string;
        assetName: string;
        depreciationAmount: number;
        newAccumulatedDepreciation: number;
        newNetBookValue: number;
    }>;
}

export const fixedAssetsApi = {
    getAll: async (): Promise<FixedAsset[]> => {
        const res = await api.get('/fixed-assets');
        return res.data;
    },

    getById: async (id: string): Promise<FixedAsset> => {
        const res = await api.get(`/fixed-assets/${id}`);
        return res.data;
    },

    create: async (data: CreateFixedAssetDto): Promise<FixedAsset> => {
        const res = await api.post('/fixed-assets', data);
        return res.data;
    },

    runDepreciation: async (periodEndDate: string): Promise<DepreciationRunResult> => {
        const res = await api.post('/fixed-assets/depreciation/run', { periodEndDate });
        return res.data;
    },
};
