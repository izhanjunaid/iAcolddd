import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherDetail } from '../../vouchers/entities';
import { AccountCategory, AccountSubCategory, AccountNature } from '../../common/enums';
import {
  CashFlowStatement,
  StatementLineItem,
} from '../interfaces/financial-statement.interface';
import { CashFlowStatementRequestDto } from '../dto/statement-request.dto';

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
  ) {}

  /**
   * Generate Cash Flow Statement using Indirect Method
   * Starts with Net Income and adjusts for non-cash items and working capital changes
   */
  async generateCashFlowStatement(
    dto: CashFlowStatementRequestDto,
  ): Promise<CashFlowStatement> {
    this.logger.log(
      `Generating Cash Flow Statement from ${dto.periodStart} to ${dto.periodEnd}`,
    );

    const companyName = dto.companyName || 'Your Company Name';

    // 1. Calculate Net Income for the period
    const netIncome = await this.calculateNetIncome(dto.periodStart, dto.periodEnd);

    // 2. Build Operating Activities section (indirect method)
    const operatingActivities = await this.buildOperatingActivitiesSection(
      netIncome,
      dto,
    );

    // 3. Build Investing Activities section
    const investingActivities = await this.buildInvestingActivitiesSection(dto);

    // 4. Build Financing Activities section
    const financingActivities = await this.buildFinancingActivitiesSection(dto);

    // 5. Calculate cash summary
    const netCashChange =
      operatingActivities.netCashFromOperating +
      investingActivities.netCashFromInvesting +
      financingActivities.netCashFromFinancing;

    const cashBeginning = await this.getCashBalance(dto.periodStart);
    const cashEnding = await this.getCashBalance(dto.periodEnd);

    const cashSummary = {
      netCashChange,
      cashBeginning,
      cashEnding,
    };

    // 6. Calculate metrics if requested
    const metrics = dto.includeMetrics !== false
      ? this.calculateCashFlowMetrics({
          operatingCashFlow: operatingActivities.netCashFromOperating,
          netIncome,
          revenue: await this.getRevenue(dto.periodStart, dto.periodEnd),
          capitalExpenditure: dto.capitalExpenditure || 0,
        })
      : {
          operatingCashFlowRatio: 0,
          freeCashFlow: 0,
          cashFlowMargin: 0,
        };

    const cashFlowStatement: CashFlowStatement = {
      title: 'Cash Flow Statement',
      generatedAt: new Date(),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      companyName,
      isComparative: dto.includeComparison || false,
      operatingActivities,
      investingActivities,
      financingActivities,
      cashSummary,
      metrics,
    };

    this.logger.log(
      `Cash Flow Statement generated successfully. Net Change in Cash: ${netCashChange.toFixed(2)}`,
    );
    return cashFlowStatement;
  }

  /**
   * Calculate Net Income for the period
   */
  private async calculateNetIncome(periodStart: Date, periodEnd: Date): Promise<number> {
    // Revenue - Expenses = Net Income
    const query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .leftJoin('detail.account', 'account')
      .select('account.category', 'category')
      .addSelect('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .andWhere('account.category IN (:...categories)', {
        categories: [AccountCategory.REVENUE, AccountCategory.EXPENSE],
      })
      .groupBy('account.category');

    const results = await query.getRawMany();

    let revenue = 0;
    let expenses = 0;

    for (const result of results) {
      if (result.category === AccountCategory.REVENUE) {
        revenue = Number(result.totalCredits || 0) - Number(result.totalDebits || 0);
      } else if (result.category === AccountCategory.EXPENSE) {
        expenses = Number(result.totalDebits || 0) - Number(result.totalCredits || 0);
      }
    }

    return revenue - expenses;
  }

  /**
   * Build Operating Activities section (Indirect Method)
   * Start with Net Income and adjust for non-cash items and working capital changes
   */
  private async buildOperatingActivitiesSection(
    netIncome: number,
    dto: CashFlowStatementRequestDto,
  ): Promise<CashFlowStatement['operatingActivities']> {
    const adjustments: StatementLineItem[] = [];
    let totalAdjustments = 0;

    // 1. Non-cash expenses (add back)
    const depreciation = await this.getDepreciationExpense(dto.periodStart, dto.periodEnd);
    if (depreciation > 0) {
      adjustments.push({
        code: 'OPS-DEP',
        label: 'Add: Depreciation & Amortization',
        amount: depreciation,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: false,
        notes: 'Non-cash expense added back',
      });
      totalAdjustments += depreciation;
    }

    // 2. Changes in working capital
    const workingCapitalChanges: StatementLineItem[] = [];

    // Get period start balances (day before periodStart for comparison)
    const periodStartMinusOne = new Date(dto.periodStart);
    periodStartMinusOne.setDate(periodStartMinusOne.getDate() - 1);

    // Accounts Receivable change
    const arChange = await this.getAccountChange(
      'Receivable',
      periodStartMinusOne,
      dto.periodEnd,
    );
    if (Math.abs(arChange) > 0.01) {
      workingCapitalChanges.push({
        code: 'WC-AR',
        label: arChange < 0 ? 'Decrease in Accounts Receivable' : 'Increase in Accounts Receivable',
        amount: -arChange, // Increase in AR = use of cash (negative)
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        notes: 'Change in working capital',
      });
      totalAdjustments -= arChange;
    }

    // Inventory change
    const inventoryChange = await this.getAccountChange(
      'Inventory',
      periodStartMinusOne,
      dto.periodEnd,
    );
    if (Math.abs(inventoryChange) > 0.01) {
      workingCapitalChanges.push({
        code: 'WC-INV',
        label: inventoryChange < 0 ? 'Decrease in Inventory' : 'Increase in Inventory',
        amount: -inventoryChange, // Increase in inventory = use of cash (negative)
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        notes: 'Change in working capital',
      });
      totalAdjustments -= inventoryChange;
    }

    // Accounts Payable change
    const apChange = await this.getAccountChange(
      'Payable',
      periodStartMinusOne,
      dto.periodEnd,
    );
    if (Math.abs(apChange) > 0.01) {
      workingCapitalChanges.push({
        code: 'WC-AP',
        label: apChange > 0 ? 'Increase in Accounts Payable' : 'Decrease in Accounts Payable',
        amount: apChange, // Increase in AP = source of cash (positive)
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        notes: 'Change in working capital',
      });
      totalAdjustments += apChange;
    }

    const netCashFromOperating = netIncome + totalAdjustments;

    return {
      netIncome,
      adjustments,
      workingCapitalChanges,
      netCashFromOperating,
    };
  }

  /**
   * Build Investing Activities section
   * Purchases and sales of long-term assets
   */
  private async buildInvestingActivitiesSection(
    dto: CashFlowStatementRequestDto,
  ): Promise<CashFlowStatement['investingActivities']> {
    const items: StatementLineItem[] = [];
    let total = 0;

    // Calculate change in fixed assets (PP&E)
    const periodStartMinusOne = new Date(dto.periodStart);
    periodStartMinusOne.setDate(periodStartMinusOne.getDate() - 1);

    const fixedAssetsChange = await this.getFixedAssetsChange(
      periodStartMinusOne,
      dto.periodEnd,
    );

    if (Math.abs(fixedAssetsChange) > 0.01) {
      const label =
        fixedAssetsChange > 0
          ? 'Purchase of Property, Plant & Equipment'
          : 'Sale of Property, Plant & Equipment';

      items.push({
        code: 'INV-PPE',
        label,
        amount: -fixedAssetsChange, // Increase in assets = use of cash (negative)
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        notes: 'Capital expenditure',
      });
      total -= fixedAssetsChange;
    }

    // Calculate change in intangible assets
    const intangiblesChange = await this.getIntangibleAssetsChange(
      periodStartMinusOne,
      dto.periodEnd,
    );

    if (Math.abs(intangiblesChange) > 0.01) {
      items.push({
        code: 'INV-INTANG',
        label: intangiblesChange > 0
          ? 'Purchase of Intangible Assets'
          : 'Sale of Intangible Assets',
        amount: -intangiblesChange,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
      });
      total -= intangiblesChange;
    }

    return {
      items,
      netCashFromInvesting: total,
    };
  }

  /**
   * Build Financing Activities section
   * Changes in equity and long-term debt
   */
  private async buildFinancingActivitiesSection(
    dto: CashFlowStatementRequestDto,
  ): Promise<CashFlowStatement['financingActivities']> {
    const items: StatementLineItem[] = [];
    let total = 0;

    const periodStartMinusOne = new Date(dto.periodStart);
    periodStartMinusOne.setDate(periodStartMinusOne.getDate() - 1);

    // Changes in long-term liabilities (loans)
    const longTermDebtChange = await this.getLongTermDebtChange(
      periodStartMinusOne,
      dto.periodEnd,
    );

    if (Math.abs(longTermDebtChange) > 0.01) {
      items.push({
        code: 'FIN-DEBT',
        label: longTermDebtChange > 0
          ? 'Proceeds from Long-term Borrowings'
          : 'Repayment of Long-term Borrowings',
        amount: longTermDebtChange, // Increase in debt = source of cash (positive)
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
      });
      total += longTermDebtChange;
    }

    // Changes in equity (share capital)
    const equityChange = await this.getEquityChange(
      periodStartMinusOne,
      dto.periodEnd,
    );

    if (Math.abs(equityChange) > 0.01) {
      items.push({
        code: 'FIN-EQUITY',
        label: equityChange > 0
          ? 'Proceeds from Share Capital'
          : 'Payment of Dividends/Share Buyback',
        amount: equityChange,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
      });
      total += equityChange;
    }

    return {
      items,
      netCashFromFinancing: total,
    };
  }

  /**
   * Get cash and cash equivalents balance at a specific date
   */
  private async getCashBalance(asOfDate: Date): Promise<number> {
    const cashAccounts = await this.accountRepository.find({
      where: [
        { isCashAccount: true, deletedAt: null as any },
        { isBankAccount: true, deletedAt: null as any },
      ],
    });

    let total = 0;

    for (const account of cashAccounts) {
      const balance = await this.calculateAccountBalance(account, asOfDate);
      total += balance;
    }

    return total;
  }

  /**
   * Calculate account balance as of a specific date
   */
  private async calculateAccountBalance(
    account: Account,
    asOfDate: Date,
  ): Promise<number> {
    const query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode: account.code })
      .andWhere('voucher.voucher_date <= :asOfDate', { asOfDate })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL');

    const result = await query.getRawOne();

    const totalDebits = Number(result?.totalDebits || 0);
    const totalCredits = Number(result?.totalCredits || 0);
    const openingBalance = Number(account.openingBalance || 0);

    let balance: number;

    if (account.nature === AccountNature.DEBIT) {
      balance = openingBalance + totalDebits - totalCredits;
    } else {
      balance = openingBalance + totalCredits - totalDebits;
    }

    return balance;
  }

  /**
   * Get change in account balance between two dates
   */
  private async getAccountChange(
    accountNamePattern: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const accounts = await this.accountRepository.find({
      where: { deletedAt: null as any },
    });

    const matchingAccounts = accounts.filter((acc) =>
      acc.name.includes(accountNamePattern),
    );

    let startTotal = 0;
    let endTotal = 0;

    for (const account of matchingAccounts) {
      const startBalance = await this.calculateAccountBalance(account, startDate);
      const endBalance = await this.calculateAccountBalance(account, endDate);
      startTotal += startBalance;
      endTotal += endBalance;
    }

    return endTotal - startTotal;
  }

  /**
   * Get change in fixed assets
   */
  private async getFixedAssetsChange(startDate: Date, endDate: Date): Promise<number> {
    const fixedAssets = await this.accountRepository.find({
      where: [
        {
          category: AccountCategory.ASSET,
          subCategory: AccountSubCategory.FIXED_ASSET,
          deletedAt: null as any,
        },
        {
          category: AccountCategory.ASSET,
          subCategory: AccountSubCategory.NON_CURRENT_ASSET,
          deletedAt: null as any,
        },
      ],
    });

    let startTotal = 0;
    let endTotal = 0;

    for (const account of fixedAssets) {
      const startBalance = await this.calculateAccountBalance(account, startDate);
      const endBalance = await this.calculateAccountBalance(account, endDate);
      startTotal += startBalance;
      endTotal += endBalance;
    }

    return endTotal - startTotal;
  }

  /**
   * Get change in intangible assets
   */
  private async getIntangibleAssetsChange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const intangibles = await this.accountRepository.find({
      where: {
        category: AccountCategory.ASSET,
        subCategory: AccountSubCategory.INTANGIBLE_ASSET,
        deletedAt: null as any,
      },
    });

    let startTotal = 0;
    let endTotal = 0;

    for (const account of intangibles) {
      const startBalance = await this.calculateAccountBalance(account, startDate);
      const endBalance = await this.calculateAccountBalance(account, endDate);
      startTotal += startBalance;
      endTotal += endBalance;
    }

    return endTotal - startTotal;
  }

  /**
   * Get change in long-term debt
   */
  private async getLongTermDebtChange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const longTermLiabilities = await this.accountRepository.find({
      where: {
        category: AccountCategory.LIABILITY,
        subCategory: AccountSubCategory.NON_CURRENT_LIABILITY,
        deletedAt: null as any,
      },
    });

    let startTotal = 0;
    let endTotal = 0;

    for (const account of longTermLiabilities) {
      const startBalance = await this.calculateAccountBalance(account, startDate);
      const endBalance = await this.calculateAccountBalance(account, endDate);
      startTotal += startBalance;
      endTotal += endBalance;
    }

    return endTotal - startTotal;
  }

  /**
   * Get change in equity
   */
  private async getEquityChange(startDate: Date, endDate: Date): Promise<number> {
    const equityAccounts = await this.accountRepository.find({
      where: {
        category: AccountCategory.EQUITY,
        deletedAt: null as any,
      },
    });

    let startTotal = 0;
    let endTotal = 0;

    for (const account of equityAccounts) {
      // Exclude retained earnings account (profit is calculated separately)
      if (account.subCategory === AccountSubCategory.RETAINED_EARNINGS) {
        continue;
      }

      const startBalance = await this.calculateAccountBalance(account, startDate);
      const endBalance = await this.calculateAccountBalance(account, endDate);
      startTotal += startBalance;
      endTotal += endBalance;
    }

    return endTotal - startTotal;
  }

  /**
   * Get depreciation expense
   */
  private async getDepreciationExpense(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .leftJoin('detail.account', 'account')
      .select('SUM(detail.debit_amount) - SUM(detail.credit_amount)', 'total')
      .where('account.name ILIKE :depPattern', { depPattern: '%depreciation%' })
      .orWhere('account.name ILIKE :amPattern', { amPattern: '%amortization%' })
      .andWhere('account.category = :category', { category: AccountCategory.EXPENSE })
      .andWhere('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Get total revenue for the period
   */
  private async getRevenue(periodStart: Date, periodEnd: Date): Promise<number> {
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .leftJoin('detail.account', 'account')
      .select('SUM(detail.credit_amount) - SUM(detail.debit_amount)', 'total')
      .where('account.category = :category', { category: AccountCategory.REVENUE })
      .andWhere('voucher.voucher_date >= :periodStart', { periodStart })
      .andWhere('voucher.voucher_date <= :periodEnd', { periodEnd })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .getRawOne();

    return Number(result?.total || 0);
  }

  /**
   * Calculate cash flow metrics
   */
  private calculateCashFlowMetrics(data: {
    operatingCashFlow: number;
    netIncome: number;
    revenue: number;
    capitalExpenditure: number;
  }): CashFlowStatement['metrics'] {
    // Operating Cash Flow Ratio = Operating Cash Flow / Net Income
    const operatingCashFlowRatio =
      data.netIncome > 0 ? data.operatingCashFlow / data.netIncome : 0;

    // Free Cash Flow = Operating Cash Flow - Capital Expenditure
    const freeCashFlow = data.operatingCashFlow - data.capitalExpenditure;

    // Cash Flow Margin = Operating Cash Flow / Revenue
    const cashFlowMargin =
      data.revenue > 0 ? (data.operatingCashFlow / data.revenue) * 100 : 0;

    return {
      operatingCashFlowRatio: Math.round(operatingCashFlowRatio * 100) / 100,
      freeCashFlow: Math.round(freeCashFlow * 100) / 100,
      cashFlowMargin: Math.round(cashFlowMargin * 100) / 100,
    };
  }
}
