import { Injectable, Logger } from '@nestjs/common';
import { BalanceSheetService } from './balance-sheet.service';
import { IncomeStatementService } from './income-statement.service';
import { CashFlowService } from './cash-flow.service';
import { FinancialAnalysis } from '../interfaces/financial-statement.interface';
import { FinancialAnalysisRequestDto } from '../dto/statement-request.dto';

@Injectable()
export class FinancialAnalysisService {
  private readonly logger = new Logger(FinancialAnalysisService.name);

  constructor(
    private readonly balanceSheetService: BalanceSheetService,
    private readonly incomeStatementService: IncomeStatementService,
    private readonly cashFlowService: CashFlowService,
  ) {}

  /**
   * Perform comprehensive financial analysis including all major ratios
   */
  async performFinancialAnalysis(
    dto: FinancialAnalysisRequestDto,
  ): Promise<FinancialAnalysis> {
    this.logger.log(`Performing financial analysis for period ${dto.periodStart} to ${dto.periodEnd}`);

    // Generate all three financial statements
    const balanceSheet = await this.balanceSheetService.generateBalanceSheet({
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      includeMetrics: true,
      postedOnly: true,
    });

    const incomeStatement = await this.incomeStatementService.generateIncomeStatement({
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      multiStep: true,
      includeEbitda: true,
      includeMargins: true,
      sharesOutstanding: dto.sharesOutstanding,
      postedOnly: true,
    });

    const cashFlow = await this.cashFlowService.generateCashFlowStatement({
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      includeMetrics: true,
      postedOnly: true,
    });

    // Extract key figures
    const totalAssets = balanceSheet.assets.totalAssets;
    const totalLiabilities = balanceSheet.liabilities.totalLiabilities;
    const totalEquity = balanceSheet.equity.totalEquity;
    const currentAssets = balanceSheet.assets.currentAssets.subtotal;
    const currentLiabilities = balanceSheet.liabilities.currentLiabilities.subtotal;
    const inventory = this.getInventoryFromBalanceSheet(balanceSheet);

    const totalRevenue = incomeStatement.revenue.totalRevenue;
    const netIncome = incomeStatement.netIncome.amount;
    const operatingIncome = incomeStatement.operatingIncome.amount;

    // Calculate all financial ratios
    const liquidity = this.calculateLiquidityRatios({
      currentAssets,
      currentLiabilities,
      inventory,
      cashAndEquivalents: this.getCashFromBalanceSheet(balanceSheet),
    });

    const profitability = this.calculateProfitabilityRatios({
      totalRevenue,
      grossProfit: incomeStatement.grossProfit.amount,
      operatingIncome,
      netIncome,
      totalAssets,
      totalEquity,
    });

    const efficiency = this.calculateEfficiencyRatios({
      totalRevenue: dto.annualRevenue || totalRevenue,
      totalAssets,
      inventory,
      accountsReceivable: this.getAccountsReceivableFromBalanceSheet(balanceSheet),
      accountsPayable: this.getAccountsPayableFromBalanceSheet(balanceSheet),
    });

    const solvency = this.calculateSolvencyRatios({
      totalAssets,
      totalLiabilities,
      totalEquity,
      operatingIncome,
      interestExpense: this.getInterestExpenseFromIncomeStatement(incomeStatement),
    });

    // Calculate trends if requested and we have previous period data
    let trends: FinancialAnalysis['trends'];
    if (dto.includeTrends && incomeStatement.isComparative) {
      trends = {
        revenueGrowth: this.calculateGrowthRate(
          incomeStatement.revenue.previousTotalRevenue || 0,
          totalRevenue,
        ),
        profitGrowth: this.calculateGrowthRate(
          incomeStatement.netIncome.previousAmount || 0,
          netIncome,
        ),
        assetGrowth: this.calculateGrowthRate(
          balanceSheet.assets.previousTotalAssets || 0,
          totalAssets,
        ),
      };
    }

    const analysis: FinancialAnalysis = {
      period: {
        start: dto.periodStart,
        end: dto.periodEnd,
      },
      liquidity,
      profitability,
      efficiency,
      solvency,
      trends,
    };

    this.logger.log('Financial analysis completed successfully');
    return analysis;
  }

  /**
   * Calculate liquidity ratios
   */
  private calculateLiquidityRatios(data: {
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
    cashAndEquivalents: number;
  }): FinancialAnalysis['liquidity'] {
    const { currentAssets, currentLiabilities, inventory, cashAndEquivalents } = data;

    // Current Ratio = Current Assets / Current Liabilities
    const currentRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    // Quick Ratio (Acid-Test) = (Current Assets - Inventory) / Current Liabilities
    const quickRatio =
      currentLiabilities > 0
        ? (currentAssets - inventory) / currentLiabilities
        : 0;

    // Cash Ratio = Cash & Cash Equivalents / Current Liabilities
    const cashRatio =
      currentLiabilities > 0 ? cashAndEquivalents / currentLiabilities : 0;

    // Working Capital = Current Assets - Current Liabilities
    const workingCapital = currentAssets - currentLiabilities;

    return {
      currentRatio: this.round(currentRatio, 2),
      quickRatio: this.round(quickRatio, 2),
      cashRatio: this.round(cashRatio, 2),
      workingCapital: this.round(workingCapital, 2),
    };
  }

  /**
   * Calculate profitability ratios
   */
  private calculateProfitabilityRatios(data: {
    totalRevenue: number;
    grossProfit: number;
    operatingIncome: number;
    netIncome: number;
    totalAssets: number;
    totalEquity: number;
  }): FinancialAnalysis['profitability'] {
    const {
      totalRevenue,
      grossProfit,
      operatingIncome,
      netIncome,
      totalAssets,
      totalEquity,
    } = data;

    // Gross Profit Margin = (Gross Profit / Revenue) * 100
    const grossProfitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Operating Margin = (Operating Income / Revenue) * 100
    const operatingMargin =
      totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

    // Net Profit Margin = (Net Income / Revenue) * 100
    const netProfitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Return on Assets (ROA) = (Net Income / Total Assets) * 100
    const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;

    // Return on Equity (ROE) = (Net Income / Total Equity) * 100
    const returnOnEquity = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;

    // Return on Investment (ROI) = (Net Income / (Total Assets - Current Liabilities)) * 100
    const returnOnInvestment = returnOnAssets; // Simplified

    return {
      grossProfitMargin: this.round(grossProfitMargin, 2),
      operatingMargin: this.round(operatingMargin, 2),
      netProfitMargin: this.round(netProfitMargin, 2),
      returnOnAssets: this.round(returnOnAssets, 2),
      returnOnEquity: this.round(returnOnEquity, 2),
      returnOnInvestment: this.round(returnOnInvestment, 2),
    };
  }

  /**
   * Calculate efficiency ratios
   */
  private calculateEfficiencyRatios(data: {
    totalRevenue: number;
    totalAssets: number;
    inventory: number;
    accountsReceivable: number;
    accountsPayable: number;
  }): FinancialAnalysis['efficiency'] {
    const {
      totalRevenue,
      totalAssets,
      inventory,
      accountsReceivable,
      accountsPayable,
    } = data;

    // Asset Turnover = Revenue / Total Assets
    const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;

    // Inventory Turnover = Cost of Goods Sold / Average Inventory
    // Simplified: Revenue / Inventory (would need COGS for accuracy)
    const inventoryTurnover = inventory > 0 ? totalRevenue / inventory : undefined;

    // Receivables Turnover = Revenue / Average Accounts Receivable
    const receivablesTurnover =
      accountsReceivable > 0 ? totalRevenue / accountsReceivable : undefined;

    // Payables Turnover = Purchases / Average Accounts Payable
    // Simplified: Revenue / Accounts Payable
    const payablesTurnover =
      accountsPayable > 0 ? totalRevenue / accountsPayable : undefined;

    return {
      assetTurnover: this.round(assetTurnover, 2),
      inventoryTurnover: inventoryTurnover
        ? this.round(inventoryTurnover, 2)
        : undefined,
      receivablesTurnover: receivablesTurnover
        ? this.round(receivablesTurnover, 2)
        : undefined,
      payablesTurnover: payablesTurnover
        ? this.round(payablesTurnover, 2)
        : undefined,
    };
  }

  /**
   * Calculate solvency ratios
   */
  private calculateSolvencyRatios(data: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    operatingIncome: number;
    interestExpense: number;
  }): FinancialAnalysis['solvency'] {
    const {
      totalAssets,
      totalLiabilities,
      totalEquity,
      operatingIncome,
      interestExpense,
    } = data;

    // Debt to Assets Ratio = Total Liabilities / Total Assets
    const debtToAssets =
      totalAssets > 0 ? totalLiabilities / totalAssets : 0;

    // Debt to Equity Ratio = Total Liabilities / Total Equity
    const debtToEquity =
      totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    // Equity Ratio = Total Equity / Total Assets
    const equityRatio = totalAssets > 0 ? totalEquity / totalAssets : 0;

    // Interest Coverage Ratio = Operating Income / Interest Expense
    const interestCoverage =
      interestExpense > 0 ? operatingIncome / interestExpense : undefined;

    return {
      debtToAssets: this.round(debtToAssets, 2),
      debtToEquity: this.round(debtToEquity, 2),
      equityRatio: this.round(equityRatio, 2),
      interestCoverage: interestCoverage
        ? this.round(interestCoverage, 2)
        : undefined,
    };
  }

  /**
   * Calculate growth rate between two periods
   */
  private calculateGrowthRate(
    previousValue: number,
    currentValue: number,
  ): number {
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  }

  /**
   * Helper: Extract inventory value from balance sheet
   */
  private getInventoryFromBalanceSheet(balanceSheet: any): number {
    const inventoryItem = balanceSheet.assets.currentAssets.lineItems.find(
      (item: any) => item.code === 'CA-INV',
    );
    return inventoryItem?.amount || 0;
  }

  /**
   * Helper: Extract cash value from balance sheet
   */
  private getCashFromBalanceSheet(balanceSheet: any): number {
    const cashItem = balanceSheet.assets.currentAssets.lineItems.find(
      (item: any) => item.code === 'CA-CASH',
    );
    return cashItem?.amount || 0;
  }

  /**
   * Helper: Extract accounts receivable from balance sheet
   */
  private getAccountsReceivableFromBalanceSheet(balanceSheet: any): number {
    const arItem = balanceSheet.assets.currentAssets.lineItems.find(
      (item: any) => item.code === 'CA-AR',
    );
    return arItem?.amount || 0;
  }

  /**
   * Helper: Extract accounts payable from balance sheet
   */
  private getAccountsPayableFromBalanceSheet(balanceSheet: any): number {
    const apItem = balanceSheet.liabilities.currentLiabilities.lineItems.find(
      (item: any) => item.code === 'CL-AP',
    );
    return apItem?.amount || 0;
  }

  /**
   * Helper: Extract interest expense from income statement
   */
  private getInterestExpenseFromIncomeStatement(incomeStatement: any): number {
    return incomeStatement.otherExpenses.financial.subtotal || 0;
  }

  /**
   * Helper: Round to specified decimal places
   */
  private round(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}
