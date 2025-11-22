import api from './api';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  FinancialAnalysis,
  BalanceSheetRequest,
  IncomeStatementRequest,
  CashFlowStatementRequest,
  FinancialAnalysisRequest,
} from '../types/financialStatements';

export const financialStatementsService = {
  /**
   * Generate Balance Sheet
   */
  async generateBalanceSheet(
    request: BalanceSheetRequest,
  ): Promise<BalanceSheet> {
    const response = await api.post(
      '/financial-statements/balance-sheet/generate',
      request,
    );
    return response.data;
  },

  /**
   * Generate Income Statement (Profit & Loss)
   */
  async generateIncomeStatement(
    request: IncomeStatementRequest,
  ): Promise<IncomeStatement> {
    const response = await api.post(
      '/financial-statements/income-statement/generate',
      request,
    );
    return response.data;
  },

  /**
   * Generate Cash Flow Statement
   */
  async generateCashFlowStatement(
    request: CashFlowStatementRequest,
  ): Promise<CashFlowStatement> {
    const response = await api.post(
      '/financial-statements/cash-flow/generate',
      request,
    );
    return response.data;
  },

  /**
   * Perform Financial Analysis
   */
  async performFinancialAnalysis(
    request: FinancialAnalysisRequest,
  ): Promise<FinancialAnalysis> {
    const response = await api.post(
      '/financial-statements/analysis/perform',
      request,
    );
    return response.data;
  },

  /**
   * Export Balance Sheet as PDF
   */
  async exportBalanceSheetPdf(request: BalanceSheetRequest): Promise<void> {
    const response = await api.post(
      '/financial-statements/balance-sheet/export/pdf',
      request,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export Income Statement as PDF
   */
  async exportIncomeStatementPdf(request: IncomeStatementRequest): Promise<void> {
    const response = await api.post(
      '/financial-statements/income-statement/export/pdf',
      request,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `income-statement-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export Cash Flow Statement as PDF
   */
  async exportCashFlowPdf(request: CashFlowStatementRequest): Promise<void> {
    const response = await api.post(
      '/financial-statements/cash-flow/export/pdf',
      request,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cash-flow-statement-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export Financial Analysis as PDF
   */
  async exportFinancialAnalysisPdf(request: FinancialAnalysisRequest): Promise<void> {
    const response = await api.post(
      '/financial-statements/analysis/export/pdf',
      request,
      { responseType: 'blob' },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
