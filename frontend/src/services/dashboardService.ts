import { api } from './api';

// ── Types ──

export interface DashboardKPIs {
    totalRevenue: number;
    totalReceivables: number;
    totalPayables: number;
    totalInventoryValue: number;
    overdueInvoices: number;
    overdueBills: number;
    pendingInvoices: number;
    stockItems: number;
    lowStockItems: number;
}

export interface MonthlyTrend {
    month: string;
    revenue: number;
    expenses: number;
}

export interface ActivityItem {
    type: 'invoice' | 'bill' | 'inventory';
    description: string;
    amount: number | null;
    date: string;
    reference: string;
}

export interface AlertItem {
    level: 'error' | 'warning' | 'info';
    message: string;
    count: number;
    link: string;
}

// ── Service ──

export const dashboardService = {
    async getKPIs(): Promise<DashboardKPIs> {
        const res = await api.get('/dashboard/kpis');
        return res.data;
    },

    async getMonthlyTrends(): Promise<MonthlyTrend[]> {
        const res = await api.get('/dashboard/trends');
        return res.data;
    },

    async getRecentActivity(): Promise<ActivityItem[]> {
        const res = await api.get('/dashboard/activity');
        return res.data;
    },

    async getAlerts(): Promise<AlertItem[]> {
        const res = await api.get('/dashboard/alerts');
        return res.data;
    },
};
