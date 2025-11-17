import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherDetail } from '../../vouchers/entities';
import { AccountCategory, AccountSubCategory } from '../../common/enums';
import {
  IncomeStatement,
  StatementSection,
  StatementLineItem,
} from '../interfaces/financial-statement.interface';
import { IncomeStatementRequestDto } from '../dto/statement-request.dto';

@Injectable()
export class IncomeStatementService {
  private readonly logger = new Logger(IncomeStatementService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
  ) {}

  /**
   * Generate Income Statement (Profit & Loss Statement)
   * Multi-step format with detailed breakdowns
   */
  async generateIncomeStatement(dto: IncomeStatementRequestDto): Promise<IncomeStatement> {
    this.logger.log(
      `Generating Income Statement from ${dto.periodStart} to ${dto.periodEnd}`,
    );

    const companyName = dto.companyName || 'Your Company Name';

    // Get account balances for the period
    const accounts = await this.getAccountBalancesForPeriod(
      dto.periodStart,
      dto.periodEnd,
      dto.postedOnly !== false,
    );

    // Build revenue section
    const revenue = await this.buildRevenueSection(accounts, dto);

    // Build Cost of Goods Sold section
    const costOfGoodsSold = await this.buildCostOfGoodsSoldSection(accounts, dto);

    // Calculate Gross Profit
    const grossProfit = {
      amount: revenue.totalRevenue - costOfGoodsSold.total,
      previousAmount: dto.includeComparison
        ? (revenue.previousTotalRevenue || 0) - (costOfGoodsSold.previousTotal || 0)
        : undefined,
      margin: revenue.totalRevenue > 0
        ? ((revenue.totalRevenue - costOfGoodsSold.total) / revenue.totalRevenue) * 100
        : 0,
      previousMargin: undefined,
    };

    if (dto.includeComparison && revenue.previousTotalRevenue) {
      grossProfit.previousMargin =
        revenue.previousTotalRevenue > 0
          ? ((revenue.previousTotalRevenue - (costOfGoodsSold.previousTotal || 0)) /
              revenue.previousTotalRevenue) *
            100
          : 0;
    }

    // Build Operating Expenses section
    const operatingExpenses = await this.buildOperatingExpensesSection(accounts, dto);

    // Calculate Operating Income (EBIT - Earnings Before Interest & Tax)
    const operatingIncome = {
      amount: grossProfit.amount - operatingExpenses.totalOperating,
      previousAmount: dto.includeComparison
        ? (grossProfit.previousAmount || 0) - (operatingExpenses.previousTotalOperating || 0)
        : undefined,
      margin: revenue.totalRevenue > 0
        ? ((grossProfit.amount - operatingExpenses.totalOperating) / revenue.totalRevenue) *
          100
        : 0,
    };

    // Build Other Expenses section (Financial expenses, etc.)
    const otherExpenses = await this.buildOtherExpensesSection(accounts, dto);

    // Calculate EBITDA if requested
    let ebitda: IncomeStatement['ebitda'] = {
      amount: 0,
      margin: 0,
    };

    if (dto.includeEbitda !== false) {
      const depreciation = await this.getDepreciationExpense(dto.periodStart, dto.periodEnd);
      const amortization = await this.getAmortizationExpense(dto.periodStart, dto.periodEnd);

      ebitda = {
        amount: operatingIncome.amount + depreciation + amortization,
        previousAmount: dto.includeComparison
          ? (operatingIncome.previousAmount || 0)
          : undefined,
        margin: revenue.totalRevenue > 0
          ? ((operatingIncome.amount + depreciation + amortization) / revenue.totalRevenue) *
            100
          : 0,
      };
    }

    // Calculate income before tax
    const incomeBeforeTax = operatingIncome.amount - otherExpenses.total;

    // Calculate tax
    const taxRate = dto.taxRate || 0;
    const taxAmount = taxRate > 0 ? (incomeBeforeTax * taxRate) / 100 : 0;

    const tax = {
      taxableIncome: incomeBeforeTax,
      taxRate,
      taxAmount,
      previousTaxAmount: dto.includeComparison ? 0 : undefined,
    };

    // Calculate Net Income
    const netIncomeAmount = incomeBeforeTax - taxAmount;
    const netIncome = {
      amount: netIncomeAmount,
      previousAmount: dto.includeComparison ? 0 : undefined,
      margin: revenue.totalRevenue > 0 ? (netIncomeAmount / revenue.totalRevenue) * 100 : 0,
      previousMargin: undefined,
      earningsPerShare: dto.sharesOutstanding
        ? netIncomeAmount / dto.sharesOutstanding
        : undefined,
    };

    // Calculate performance metrics
    const metrics = dto.includeMargins !== false
      ? {
          grossProfitMargin: grossProfit.margin,
          operatingMargin: operatingIncome.margin,
          netProfitMargin: netIncome.margin,
          returnOnSales: netIncome.margin,
          expenseRatio: revenue.totalRevenue > 0
            ? (operatingExpenses.totalOperating / revenue.totalRevenue) * 100
            : 0,
        }
      : {
          grossProfitMargin: 0,
          operatingMargin: 0,
          netProfitMargin: 0,
          returnOnSales: 0,
          expenseRatio: 0,
        };

    const incomeStatement: IncomeStatement = {
      title: 'Income Statement',
      generatedAt: new Date(),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      companyName,
      isComparative: dto.includeComparison || false,
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherExpenses,
      ebitda,
      tax,
      netIncome,
      metrics,
    };

    this.logger.log(
      `Income Statement generated successfully. Net Income: ${netIncomeAmount.toFixed(2)}`,
    );
    return incomeStatement;
  }

  /**
   * Get account balances for a specific period
   */
  private async getAccountBalancesForPeriod(
    periodStart: Date,
    periodEnd: Date,
    postedOnly: boolean,
  ): Promise<Map<string, { account: Account; debit: number; credit: number; net: number }>> {
    // Get all revenue and expense accounts
    const accounts = await this.accountRepository.find({
      where: [
        { category: AccountCategory.REVENUE, deletedAt: null as any },
        { category: AccountCategory.EXPENSE, deletedAt: null as any },
      ],
      order: { code: 'ASC' },
    });

    const accountBalances = new Map();

    for (const account of accounts) {
      const balance = await this.calculateAccountPeriodActivity(
        account,
        periodStart,
        periodEnd,
        postedOnly,
      );

      accountBalances.set(account.code, {
        account,
        debit: balance.debit,
        credit: balance.credit,
        net: balance.net,
      });
    }

    return accountBalances;
  }

  /**
   * Calculate account activity for a specific period
   */
  private async calculateAccountPeriodActivity(
    account: Account,
    periodStart: Date,
    periodEnd: Date,
    postedOnly: boolean,
  ): Promise<{ debit: number; credit: number; net: number }> {
    const query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode: account.code })
      .andWhere('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.deleted_at IS NULL');

    if (postedOnly) {
      query.andWhere('voucher.is_posted = :isPosted', { isPosted: true });
    }

    const result = await query.getRawOne();

    const debit = Number(result?.totalDebits || 0);
    const credit = Number(result?.totalCredits || 0);

    // For revenue (credit nature): net = credit - debit
    // For expenses (debit nature): net = debit - credit
    const net =
      account.category === AccountCategory.REVENUE ? credit - debit : debit - credit;

    return { debit, credit, net };
  }

  /**
   * Build Revenue section
   */
  private async buildRevenueSection(
    accounts: Map<string, any>,
    dto: IncomeStatementRequestDto,
  ): Promise<IncomeStatement['revenue']> {
    const revenueAccounts = Array.from(accounts.values()).filter(
      (item) => item.account.category === AccountCategory.REVENUE,
    );

    // Operating Revenue
    const operatingRevenueAccounts = revenueAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.OPERATING_REVENUE,
    );

    const operatingItems: StatementLineItem[] = operatingRevenueAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const operatingTotal = operatingRevenueAccounts.reduce(
      (sum, item) => sum + item.net,
      0,
    );

    // Other Income
    const otherIncomeAccounts = revenueAccounts.filter(
      (item) =>
        item.account.subCategory === AccountSubCategory.OTHER_INCOME ||
        item.account.subCategory === null,
    );

    const otherItems: StatementLineItem[] = otherIncomeAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const otherTotal = otherIncomeAccounts.reduce((sum, item) => sum + item.net, 0);

    return {
      operatingRevenue: {
        id: 'operating-revenue',
        title: 'Operating Revenue',
        lineItems: operatingItems,
        subtotal: operatingTotal,
        order: 1,
      },
      otherIncome: {
        id: 'other-income',
        title: 'Other Income',
        lineItems: otherItems,
        subtotal: otherTotal,
        order: 2,
      },
      totalRevenue: operatingTotal + otherTotal,
    };
  }

  /**
   * Build Cost of Goods Sold section
   */
  private async buildCostOfGoodsSoldSection(
    accounts: Map<string, any>,
    dto: IncomeStatementRequestDto,
  ): Promise<IncomeStatement['costOfGoodsSold']> {
    const cogsAccounts = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.EXPENSE &&
        item.account.subCategory === AccountSubCategory.COST_OF_GOODS_SOLD,
    );

    const items: StatementLineItem[] = cogsAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const total = cogsAccounts.reduce((sum, item) => sum + item.net, 0);

    return {
      items,
      total,
    };
  }

  /**
   * Build Operating Expenses section
   */
  private async buildOperatingExpensesSection(
    accounts: Map<string, any>,
    dto: IncomeStatementRequestDto,
  ): Promise<IncomeStatement['operatingExpenses']> {
    const expenseAccounts = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.EXPENSE &&
        item.account.subCategory !== AccountSubCategory.COST_OF_GOODS_SOLD &&
        item.account.subCategory !== AccountSubCategory.FINANCIAL_EXPENSE,
    );

    // Administrative Expenses
    const adminAccounts = expenseAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.ADMINISTRATIVE_EXPENSE,
    );

    const adminItems: StatementLineItem[] = adminAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const adminTotal = adminAccounts.reduce((sum, item) => sum + item.net, 0);

    // Selling/Operating Expenses
    const operatingAccounts = expenseAccounts.filter(
      (item) =>
        item.account.subCategory === AccountSubCategory.OPERATING_EXPENSE ||
        item.account.subCategory === null,
    );

    const operatingItems: StatementLineItem[] = operatingAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const operatingTotal = operatingAccounts.reduce((sum, item) => sum + item.net, 0);

    // General Expenses (Other operating expenses)
    const otherOperatingAccounts = expenseAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.OTHER_EXPENSE,
    );

    const generalItems: StatementLineItem[] = otherOperatingAccounts.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const generalTotal = otherOperatingAccounts.reduce((sum, item) => sum + item.net, 0);

    return {
      administrative: {
        id: 'admin-expenses',
        title: 'Administrative Expenses',
        lineItems: adminItems,
        subtotal: adminTotal,
        order: 1,
      },
      selling: {
        id: 'selling-expenses',
        title: 'Operating/Selling Expenses',
        lineItems: operatingItems,
        subtotal: operatingTotal,
        order: 2,
      },
      general: {
        id: 'general-expenses',
        title: 'General Expenses',
        lineItems: generalItems,
        subtotal: generalTotal,
        order: 3,
      },
      totalOperating: adminTotal + operatingTotal + generalTotal,
    };
  }

  /**
   * Build Other Expenses section (Financial, etc.)
   */
  private async buildOtherExpensesSection(
    accounts: Map<string, any>,
    dto: IncomeStatementRequestDto,
  ): Promise<IncomeStatement['otherExpenses']> {
    const financialExpenses = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.EXPENSE &&
        item.account.subCategory === AccountSubCategory.FINANCIAL_EXPENSE,
    );

    const financialItems: StatementLineItem[] = financialExpenses.map((item) => ({
      code: item.account.code,
      label: item.account.name,
      amount: item.net,
      level: 1,
      isTotal: false,
      isBold: false,
      isCalculated: false,
      accountCodes: [item.account.code],
    }));

    const financialTotal = financialExpenses.reduce((sum, item) => sum + item.net, 0);

    return {
      financial: {
        id: 'financial-expenses',
        title: 'Financial Expenses',
        lineItems: financialItems,
        subtotal: financialTotal,
        order: 1,
      },
      other: {
        id: 'other-non-operating',
        title: 'Other Non-Operating Expenses',
        lineItems: [],
        subtotal: 0,
        order: 2,
      },
      total: financialTotal,
    };
  }

  /**
   * Get depreciation expense for EBITDA calculation
   */
  private async getDepreciationExpense(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Look for accounts with "depreciation" in the name
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .leftJoin('detail.account', 'account')
      .select('SUM(detail.debit_amount) - SUM(detail.credit_amount)', 'total')
      .where('account.name ILIKE :pattern', { pattern: '%depreciation%' })
      .andWhere('account.category = :category', { category: AccountCategory.EXPENSE })
      .andWhere('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Get amortization expense for EBITDA calculation
   */
  private async getAmortizationExpense(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Look for accounts with "amortization" in the name
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .leftJoin('detail.account', 'account')
      .select('SUM(detail.debit_amount) - SUM(detail.credit_amount)', 'total')
      .where('account.name ILIKE :pattern', { pattern: '%amortization%' })
      .andWhere('account.category = :category', { category: AccountCategory.EXPENSE })
      .andWhere('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .getRawOne();

    return Number(result?.total || 0);
  }
}
