import api from './api';

export interface BankStatement {
    id: string;
    accountId: string;
    statementDate: string;
    reference: string;
    totalDebits: number;
    totalCredits: number;
    openingBalance: number;
    closingBalance: number;
    status: 'DRAFT' | 'IMPORTED' | 'RECONCILED';
    createdAt: string;
}

export interface BankStatementLine {
    id: string;
    statementId: string;
    transactionDate: string;
    description: string;
    reference: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    isReconciled: boolean;
    matchedVoucherId?: string;
}

export interface CreateStatementDto {
    accountId: string;
    statementDate: string;
    reference: string;
    openingBalance: number;
    closingBalance: number;
}

export interface ReconciliationStatus {
    statement: BankStatement;
    totalLines: number;
    reconciledLines: number;
    unreconciledLines: number;
    reconciledAmount: number;
    unreconciledAmount: number;
    lines: BankStatementLine[];
}

export const bankReconciliationService = {
    createStatement: async (data: CreateStatementDto) => {
        const response = await api.post<BankStatement>('/bank-reconciliation/statements', data);
        return response.data;
    },

    uploadStatementLines: async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<BankStatementLine[]>(`/bank-reconciliation/statements/${id}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    addLines: async (id: string, lines: Partial<BankStatementLine>[]) => {
        const response = await api.post<BankStatementLine[]>(`/bank-reconciliation/statements/${id}/lines`, lines);
        return response.data;
    },

    autoMatch: async (id: string) => {
        const response = await api.post<{ matchedCount: number }>(`/bank-reconciliation/statements/${id}/auto-match`);
        return response.data;
    },

    getStatus: async (id: string) => {
        const response = await api.get<ReconciliationStatus>(`/bank-reconciliation/statements/${id}/status`);
        return response.data;
    },
};
