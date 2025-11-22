/**
 * Financial Statements TypeScript Types
 * Matches backend interfaces
 */

export interface StatementLineItem {
  code: string;
  label: string;
  amount: number;
  previousAmount?: number;
  variance?: number;
  variancePercent?: number;
  level: number;
  isTotal: boolean;
  isBold: boolean;
  isCalculated: boolean;
  accountCodes?: string[];
  notes?: string;
}

export interface StatementSection {
  id: string;
  title: string;
  lineItems: StatementLineItem[];
  subtotal: number;
  previousSubtotal?: number;
  order: number;
}

export interface BaseFinancialStatement {
  generatedAt: Date | string;
  periodStart: Date | string;
  periodEnd: Date | string;
  companyName?: string;
  title: string;
  isComparative: boolean;
}

export interface BalanceSheet extends BaseFinancialStatement {
  title: 'Balance Sheet' | 'Statement of Financial Position';
  assets: {
    currentAssets: StatementSection;
    nonCurrentAssets: StatementSection;
    totalAssets: number;
    previousTotalAssets?: number;
  };
  liabilities: {
    currentLiabilities: StatementSection;
    nonCurrentLiabilities: StatementSection;
    totalLiabilities: number;
    previousTotalLiabilities?: number;
  };
  equity: {
    shareCapital: StatementSection;
    reserves: StatementSection;
    retainedEarnings: number;
    currentYearProfit: number;
    totalEquity: number;
    previousTotalEquity?: number;
  };
  metrics: {
    workingCapital: number;
    currentRatio: number;
    quickRatio: number;
    debtToEquityRatio: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  isBalanced: boolean;
  balanceDifference?: number;
}

export interface IncomeStatement extends BaseFinancialStatement {
  title: 'Income Statement' | 'Profit & Loss Statement';
  revenue: {
    operatingRevenue: StatementSection;
    otherIncome: StatementSection;
    totalRevenue: number;
    previousTotalRevenue?: number;
  };
  costOfGoodsSold: {
    items: StatementLineItem[];
    total: number;
    previousTotal?: number;
  };
  grossProfit: {
    amount: number;
    previousAmount?: number;
    margin: number;
    previousMargin?: number;
  };
  operatingExpenses: {
    administrative: StatementSection;
    selling: StatementSection;
    general: StatementSection;
    totalOperating: number;
    previousTotalOperating?: number;
  };
  operatingIncome: {
    amount: number;
    previousAmount?: number;
    margin: number;
  };
  otherExpenses: {
    financial: StatementSection;
    other: StatementSection;
    total: number;
    previousTotal?: number;
  };
  ebitda: {
    amount: number;
    previousAmount?: number;
    margin: number;
  };
  tax: {
    taxableIncome: number;
    taxRate: number;
    taxAmount: number;
    previousTaxAmount?: number;
  };
  netIncome: {
    amount: number;
    previousAmount?: number;
    margin: number;
    previousMargin?: number;
    earningsPerShare?: number;
  };
  metrics: {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnSales: number;
    expenseRatio: number;
  };
}

export interface CashFlowStatement extends BaseFinancialStatement {
  title: 'Cash Flow Statement';
  operatingActivities: {
    netIncome: number;
    adjustments: StatementLineItem[];
    workingCapitalChanges: StatementLineItem[];
    netCashFromOperating: number;
    previousNetCashFromOperating?: number;
  };
  investingActivities: {
    items: StatementLineItem[];
    netCashFromInvesting: number;
    previousNetCashFromInvesting?: number;
  };
  financingActivities: {
    items: StatementLineItem[];
    netCashFromFinancing: number;
    previousNetCashFromFinancing?: number;
  };
  cashSummary: {
    netCashChange: number;
    cashBeginning: number;
    cashEnding: number;
    previousCashEnding?: number;
  };
  metrics: {
    operatingCashFlowRatio: number;
    freeCashFlow: number;
    cashFlowMargin: number;
  };
}

export interface FinancialAnalysis {
  period: {
    start: Date | string;
    end: Date | string;
  };
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };
  profitability: {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
    returnOnInvestment: number;
  };
  efficiency: {
    assetTurnover: number;
    inventoryTurnover?: number;
    receivablesTurnover?: number;
    payablesTurnover?: number;
  };
  solvency: {
    debtToAssets: number;
    debtToEquity: number;
    equityRatio: number;
    interestCoverage?: number;
  };
  trends?: {
    revenueGrowth: number;
    profitGrowth: number;
    assetGrowth: number;
  };
}

// Request DTOs
export interface BalanceSheetRequest {
  periodStart: string;
  periodEnd: string;
  includeComparison?: boolean;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
  companyName?: string;
  includeMetrics?: boolean;
  detailed?: boolean;
  includeZeroBalances?: boolean;
  postedOnly?: boolean;
}

export interface IncomeStatementRequest {
  periodStart: string;
  periodEnd: string;
  includeComparison?: boolean;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
  companyName?: string;
  multiStep?: boolean;
  includeEbitda?: boolean;
  taxRate?: number;
  sharesOutstanding?: number;
  includeMargins?: boolean;
  postedOnly?: boolean;
}

export interface CashFlowStatementRequest {
  periodStart: string;
  periodEnd: string;
  includeComparison?: boolean;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
  companyName?: string;
  indirectMethod?: boolean;
  includeMetrics?: boolean;
  capitalExpenditure?: number;
  postedOnly?: boolean;
}

export interface FinancialAnalysisRequest {
  periodStart: string;
  periodEnd: string;
  includeTrends?: boolean;
  sharesOutstanding?: number;
  annualRevenue?: number;
}
