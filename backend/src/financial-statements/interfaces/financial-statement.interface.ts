import { AccountCategory, AccountSubCategory } from '../../common/enums';

/**
 * Base interface for all financial statements
 */
export interface BaseFinancialStatement {
  /** Statement generation date */
  generatedAt: Date;

  /** Reporting period start date */
  periodStart: Date;

  /** Reporting period end date */
  periodEnd: Date;

  /** Company/organization name */
  companyName?: string;

  /** Statement title */
  title: string;

  /** Is this a comparative statement? */
  isComparative: boolean;
}

/**
 * Line item in a financial statement
 */
export interface StatementLineItem {
  /** Line item code/identifier */
  code: string;

  /** Display label */
  label: string;

  /** Calculated amount */
  amount: number;

  /** Previous period amount (for comparative statements) */
  previousAmount?: number;

  /** Variance from previous period */
  variance?: number;

  /** Variance percentage */
  variancePercent?: number;

  /** Display level (0 = main heading, 1 = subheading, 2 = detail) */
  level: number;

  /** Is this a total/subtotal line? */
  isTotal: boolean;

  /** Is this item bold/emphasized? */
  isBold: boolean;

  /** Is this a calculation/formula result? */
  isCalculated: boolean;

  /** Accounts included in this line */
  accountCodes?: string[];

  /** Notes/annotations */
  notes?: string;
}

/**
 * Section in a financial statement
 */
export interface StatementSection {
  /** Section identifier */
  id: string;

  /** Section title */
  title: string;

  /** Line items in this section */
  lineItems: StatementLineItem[];

  /** Section subtotal */
  subtotal: number;

  /** Previous period subtotal */
  previousSubtotal?: number;

  /** Display order */
  order: number;
}

/**
 * Balance Sheet specific interfaces
 */
export interface BalanceSheet extends BaseFinancialStatement {
  title: 'Balance Sheet' | 'Statement of Financial Position';

  /** Assets section */
  assets: {
    currentAssets: StatementSection;
    nonCurrentAssets: StatementSection;
    totalAssets: number;
    previousTotalAssets?: number;
  };

  /** Liabilities section */
  liabilities: {
    currentLiabilities: StatementSection;
    nonCurrentLiabilities: StatementSection;
    totalLiabilities: number;
    previousTotalLiabilities?: number;
  };

  /** Equity section */
  equity: {
    shareCapital: StatementSection;
    reserves: StatementSection;
    retainedEarnings: number;
    currentYearProfit: number;
    totalEquity: number;
    previousTotalEquity?: number;
  };

  /** Financial metrics */
  metrics: {
    workingCapital: number;
    currentRatio: number;
    quickRatio: number;
    debtToEquityRatio: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };

  /** Verification */
  isBalanced: boolean;
  balanceDifference?: number;
}

/**
 * Income Statement (Profit & Loss) specific interfaces
 */
export interface IncomeStatement extends BaseFinancialStatement {
  title: 'Income Statement' | 'Profit & Loss Statement';

  /** Revenue section */
  revenue: {
    operatingRevenue: StatementSection;
    otherIncome: StatementSection;
    totalRevenue: number;
    previousTotalRevenue?: number;
  };

  /** Cost of Goods Sold */
  costOfGoodsSold: {
    items: StatementLineItem[];
    total: number;
    previousTotal?: number;
  };

  /** Gross Profit */
  grossProfit: {
    amount: number;
    previousAmount?: number;
    margin: number; // Gross Profit Margin %
    previousMargin?: number;
  };

  /** Operating Expenses */
  operatingExpenses: {
    administrative: StatementSection;
    selling: StatementSection;
    general: StatementSection;
    totalOperating: number;
    previousTotalOperating?: number;
  };

  /** Operating Income (EBIT) */
  operatingIncome: {
    amount: number;
    previousAmount?: number;
    margin: number; // Operating Margin %
  };

  /** Other Expenses */
  otherExpenses: {
    financial: StatementSection;
    other: StatementSection;
    total: number;
    previousTotal?: number;
  };

  /** EBITDA */
  ebitda: {
    amount: number;
    previousAmount?: number;
    margin: number;
  };

  /** Tax */
  tax: {
    taxableIncome: number;
    taxRate: number;
    taxAmount: number;
    previousTaxAmount?: number;
  };

  /** Net Income */
  netIncome: {
    amount: number;
    previousAmount?: number;
    margin: number; // Net Profit Margin %
    previousMargin?: number;
    earningsPerShare?: number; // If applicable
  };

  /** Performance metrics */
  metrics: {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnSales: number;
    expenseRatio: number;
  };
}

/**
 * Cash Flow Statement specific interfaces
 */
export interface CashFlowStatement extends BaseFinancialStatement {
  title: 'Cash Flow Statement';

  /** Operating Activities (Indirect Method) */
  operatingActivities: {
    netIncome: number;
    adjustments: StatementLineItem[]; // Depreciation, Amortization, etc.
    workingCapitalChanges: StatementLineItem[]; // Changes in AR, AP, Inventory, etc.
    netCashFromOperating: number;
    previousNetCashFromOperating?: number;
  };

  /** Investing Activities */
  investingActivities: {
    items: StatementLineItem[]; // Purchase/Sale of fixed assets, investments
    netCashFromInvesting: number;
    previousNetCashFromInvesting?: number;
  };

  /** Financing Activities */
  financingActivities: {
    items: StatementLineItem[]; // Loans, equity, dividends
    netCashFromFinancing: number;
    previousNetCashFromFinancing?: number;
  };

  /** Cash Summary */
  cashSummary: {
    netCashChange: number;
    cashBeginning: number;
    cashEnding: number;
    previousCashEnding?: number;
  };

  /** Metrics */
  metrics: {
    operatingCashFlowRatio: number;
    freeCashFlow: number;
    cashFlowMargin: number;
  };
}

/**
 * Changes in Equity Statement
 */
export interface ChangesInEquity extends BaseFinancialStatement {
  title: 'Statement of Changes in Equity';

  /** Opening balances */
  openingBalances: {
    shareCapital: number;
    reserves: number;
    retainedEarnings: number;
    total: number;
  };

  /** Changes during period */
  changes: {
    profitForYear: number;
    dividendsPaid: number;
    newShareCapital: number;
    reserveTransfers: number;
    other: StatementLineItem[];
  };

  /** Closing balances */
  closingBalances: {
    shareCapital: number;
    reserves: number;
    retainedEarnings: number;
    total: number;
  };
}

/**
 * Period comparison options
 */
export interface PeriodComparison {
  /** Current period start */
  currentPeriodStart: Date;

  /** Current period end */
  currentPeriodEnd: Date;

  /** Previous period start */
  previousPeriodStart?: Date;

  /** Previous period end */
  previousPeriodEnd?: Date;

  /** Comparison type */
  comparisonType: 'none' | 'prior-period' | 'prior-year' | 'budget';
}

/**
 * Financial analysis result
 */
export interface FinancialAnalysis {
  /** Period analyzed */
  period: {
    start: Date;
    end: Date;
  };

  /** Liquidity ratios */
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };

  /** Profitability ratios */
  profitability: {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
    returnOnInvestment: number;
  };

  /** Efficiency ratios */
  efficiency: {
    assetTurnover: number;
    inventoryTurnover?: number;
    receivablesTurnover?: number;
    payablesTurnover?: number;
  };

  /** Solvency ratios */
  solvency: {
    debtToAssets: number;
    debtToEquity: number;
    equityRatio: number;
    interestCoverage?: number;
  };

  /** Trend analysis */
  trends?: {
    revenueGrowth: number;
    profitGrowth: number;
    assetGrowth: number;
  };
}
