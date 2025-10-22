import api from './api';
import type {
  AccountBalance,
  AccountLedger,
  TrialBalance,
} from '../types/voucher';

export const generalLedgerService = {
  /**
   * Get current balance for an account
   */
  async getAccountBalance(
    accountCode: string,
    asOfDate?: string,
  ): Promise<AccountBalance> {
    const response = await api.get(
      `/general-ledger/account-balance/${accountCode}`,
      { params: { asOfDate } },
    );
    return response.data;
  },

  /**
   * Get account ledger (all transactions)
   */
  async getAccountLedger(
    accountCode: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<AccountLedger> {
    const response = await api.get(
      `/general-ledger/account-ledger/${accountCode}`,
      { params: { fromDate, toDate } },
    );
    return response.data;
  },

  /**
   * Get trial balance (all accounts with balances)
   */
  async getTrialBalance(asOfDate?: string): Promise<TrialBalance> {
    const response = await api.get('/general-ledger/trial-balance', {
      params: { asOfDate },
    });
    return response.data;
  },

  /**
   * Get category summary (for financial statements)
   */
  async getCategorySummary(asOfDate?: string): Promise<any> {
    const response = await api.get('/general-ledger/category-summary', {
      params: { asOfDate },
    });
    return response.data;
  },
};

