import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';
import { Account } from '../accounts/entities/account.entity';
import { AccountCategory } from '../common/enums/account-category.enum';

export interface IncomeStatementLineItem {
  accountCode: string;
  accountName: string;
  currentPeriod: number;
  previousPeriod?: number;
  variance?: number;
  variancePercent?: number;
}

export interface IncomeStatement {
  companyName: string;
  reportTitle: string;
  period: {
    fromDate: Date;
    toDate: Date;
    periodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  };
  revenue: {
    totalRevenue: number;
    lineItems: IncomeStatementLineItem[];
  };
  expenses: {
    totalExpenses: number;
    lineItems: IncomeStatementLineItem[];
  };
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  previousPeriodNetIncome?: number;
  netIncomeVariance?: number;
  netIncomeVariancePercent?: number;
}

export interface IncomeStatementComparison {
  current: IncomeStatement;
  previous: IncomeStatement;
  variance: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
  variancePercent: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

@Injectable()
export class IncomeStatementService {
  constructor(
    @InjectRepository(VoucherMaster)
    private readonly voucherMasterRepository: Repository<VoucherMaster>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  /**
   * Generate Income Statement for a specific period
   */
  async generateIncomeStatement(
    fromDate: Date,
    toDate: Date,
    companyName: string = 'Company Name',
  ): Promise<IncomeStatement> {
    // Get all revenue accounts
    const revenueAccounts = await this.getAccountsByCategory(
      AccountCategory.REVENUE,
      fromDate,
      toDate,
    );

    // Get all expense accounts
    const expenseAccounts = await this.getAccountsByCategory(
      AccountCategory.EXPENSE,
      fromDate,
      toDate,
    );

    // Calculate totals
    const totalRevenue = revenueAccounts.reduce(
      (sum, account) => sum + account.currentPeriod,
      0,
    );

    const totalExpenses = expenseAccounts.reduce(
      (sum, account) => sum + account.currentPeriod,
      0,
    );

    const grossProfit = totalRevenue;
    const operatingIncome = totalRevenue - totalExpenses;
    const netIncome = operatingIncome; // Assuming no other income/expenses for now

    return {
      companyName,
      reportTitle: 'Income Statement',
      period: {
        fromDate,
        toDate,
        periodType: this.determinePeriodType(fromDate, toDate),
      },
      revenue: {
        totalRevenue,
        lineItems: revenueAccounts,
      },
      expenses: {
        totalExpenses,
        lineItems: expenseAccounts,
      },
      grossProfit,
      operatingIncome,
      netIncome,
    };
  }

  /**
   * Generate Income Statement with comparison to previous period
   */
  async generateIncomeStatementWithComparison(
    fromDate: Date,
    toDate: Date,
    companyName: string = 'Company Name',
  ): Promise<IncomeStatementComparison> {
    // Calculate previous period dates
    const periodLength = toDate.getTime() - fromDate.getTime();
    const previousToDate = new Date(fromDate.getTime() - 1);
    const previousFromDate = new Date(previousToDate.getTime() - periodLength);

    // Generate current and previous period statements
    const [current, previous] = await Promise.all([
      this.generateIncomeStatement(fromDate, toDate, companyName),
      this.generateIncomeStatement(
        previousFromDate,
        previousToDate,
        companyName,
      ),
    ]);

    // Calculate variances
    const revenueVariance = current.revenue.totalRevenue - previous.revenue.totalRevenue;
    const expensesVariance = current.expenses.totalExpenses - previous.expenses.totalExpenses;
    const netIncomeVariance = current.netIncome - previous.netIncome;

    return {
      current,
      previous,
      variance: {
        revenue: revenueVariance,
        expenses: expensesVariance,
        netIncome: netIncomeVariance,
      },
      variancePercent: {
        revenue: previous.revenue.totalRevenue !== 0 
          ? (revenueVariance / previous.revenue.totalRevenue) * 100 
          : 0,
        expenses: previous.expenses.totalExpenses !== 0 
          ? (expensesVariance / previous.expenses.totalExpenses) * 100 
          : 0,
        netIncome: previous.netIncome !== 0 
          ? (netIncomeVariance / previous.netIncome) * 100 
          : 0,
      },
    };
  }

  /**
   * Get detailed revenue breakdown by account
   */
  async getRevenueBreakdown(
    fromDate: Date,
    toDate: Date,
  ): Promise<IncomeStatementLineItem[]> {
    return this.getAccountsByCategory(AccountCategory.REVENUE, fromDate, toDate);
  }

  /**
   * Get detailed expense breakdown by account
   */
  async getExpenseBreakdown(
    fromDate: Date,
    toDate: Date,
  ): Promise<IncomeStatementLineItem[]> {
    return this.getAccountsByCategory(AccountCategory.EXPENSE, fromDate, toDate);
  }

  /**
   * Get monthly income statement for the year
   */
  async getMonthlyIncomeStatements(
    year: number,
    companyName: string = 'Company Name',
  ): Promise<IncomeStatement[]> {
    const statements: IncomeStatement[] = [];

    for (let month = 1; month <= 12; month++) {
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month, 0); // Last day of the month

      const statement = await this.generateIncomeStatement(
        fromDate,
        toDate,
        companyName,
      );

      statements.push(statement);
    }

    return statements;
  }

  /**
   * Get quarterly income statements for the year
   */
  async getQuarterlyIncomeStatements(
    year: number,
    companyName: string = 'Company Name',
  ): Promise<IncomeStatement[]> {
    const statements: IncomeStatement[] = [];

    for (let quarter = 1; quarter <= 4; quarter++) {
      const startMonth = (quarter - 1) * 3;
      const fromDate = new Date(year, startMonth, 1);
      const toDate = new Date(year, startMonth + 3, 0); // Last day of the quarter

      const statement = await this.generateIncomeStatement(
        fromDate,
        toDate,
        companyName,
      );

      statements.push(statement);
    }

    return statements;
  }

  /**
   * Get accounts by category with period balances
   */
  private async getAccountsByCategory(
    category: AccountCategory,
    fromDate: Date,
    toDate: Date,
  ): Promise<IncomeStatementLineItem[]> {
    // Get all accounts in the category
    const accounts = await this.accountRepository.find({
      where: {
        category,
        accountType: 'DETAIL', // Only detail accounts for income statement
        isActive: true,
        deletedAt: null as any,
      },
      order: { code: 'ASC' },
    });

    const lineItems: IncomeStatementLineItem[] = [];

    for (const account of accounts) {
      // Calculate balance for the period
      const balance = await this.getAccountPeriodBalance(
        account.code,
        fromDate,
        toDate,
      );

      // Only include accounts with activity
      if (balance !== 0) {
        lineItems.push({
          accountCode: account.code,
          accountName: account.name,
          currentPeriod: Math.abs(balance),
        });
      }
    }

    return lineItems;
  }

  /**
   * Get account balance for a specific period
   */
  private async getAccountPeriodBalance(
    accountCode: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .andWhere('voucher.voucher_date >= :fromDate', { fromDate })
      .andWhere('voucher.voucher_date <= :toDate', { toDate })
      .getRawOne();

    const totalDebits = Number(result?.totalDebits || 0);
    const totalCredits = Number(result?.totalCredits || 0);

    // For revenue accounts (credit nature), return credit - debit
    // For expense accounts (debit nature), return debit - credit
    const account = await this.accountRepository.findOne({
      where: { code: accountCode },
    });

    if (!account) return 0;

    return account.nature === 'CREDIT' 
      ? totalCredits - totalDebits 
      : totalDebits - totalCredits;
  }

  /**
   * Determine period type based on date range
   */
  private determinePeriodType(fromDate: Date, toDate: Date): 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM' {
    const diffInDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= 31) return 'MONTHLY';
    if (diffInDays <= 93) return 'QUARTERLY';
    if (diffInDays <= 366) return 'YEARLY';
    return 'CUSTOM';
  }
}