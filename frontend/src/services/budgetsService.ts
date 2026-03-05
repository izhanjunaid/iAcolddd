import api from './api';

export interface Budget {
    id: string;
    fiscalYearId: string;
    accountCode: string;
    periodMonth: number;
    budgetedAmount: number;
    revisedAmount?: number;
    notes?: string;
    costCenterId?: string;
}

export interface BudgetVsActualRow {
    accountCode: string;
    accountName: string;
    month: number;
    budgetedAmount: number;
    revisedAmount: number | null;
    actualAmount: number;
    variance: number;
    variancePercent: number;
}

export const budgetsApi = {
    getByFiscalYear: async (fiscalYearId: string): Promise<Budget[]> => {
        const res = await api.get(`/budgets/${fiscalYearId}`);
        return res.data;
    },

    upsert: async (
        fiscalYearId: string,
        data: {
            accountCode: string;
            entries: Array<{ month: number; amount: number; notes?: string }>;
            costCenterId?: string;
        },
    ): Promise<Budget[]> => {
        const res = await api.post(`/budgets/${fiscalYearId}`, data);
        return res.data;
    },

    getBudgetVsActual: async (fiscalYearId: string, costCenterId?: string): Promise<BudgetVsActualRow[]> => {
        const params = costCenterId ? { costCenterId } : {};
        const res = await api.get(`/budgets/${fiscalYearId}/vs-actual`, { params });
        return res.data;
    },
};
