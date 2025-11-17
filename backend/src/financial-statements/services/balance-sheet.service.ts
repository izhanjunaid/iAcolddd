import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherDetail } from '../../vouchers/entities';
import { AccountCategory, AccountSubCategory, AccountNature } from '../../common/enums';
import {
  BalanceSheet,
  StatementSection,
  StatementLineItem,
} from '../interfaces/financial-statement.interface';
import { BalanceSheetRequestDto } from '../dto/statement-request.dto';

@Injectable()
export class BalanceSheetService {
  private readonly logger = new Logger(BalanceSheetService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
  ) {}

  /**
   * Generate Balance Sheet (Statement of Financial Position)
   */
  async generateBalanceSheet(dto: BalanceSheetRequestDto): Promise<BalanceSheet> {
    this.logger.log(`Generating Balance Sheet from ${dto.periodStart} to ${dto.periodEnd}`);

    const companyName = dto.companyName || 'Your Company Name';

    // Get all accounts with their balances
    const accounts = await this.getAllAccountsWithBalances(
      dto.periodEnd,
      dto.postedOnly !== false,
      dto.includeZeroBalances || false,
    );

    // Build current period data
    const currentAssets = await this.buildCurrentAssetsSection(accounts, dto);
    const nonCurrentAssets = await this.buildNonCurrentAssetsSection(accounts, dto);
    const currentLiabilities = await this.buildCurrentLiabilitiesSection(accounts, dto);
    const nonCurrentLiabilities = await this.buildNonCurrentLiabilitiesSection(accounts, dto);
    const equity = await this.buildEquitySection(accounts, dto);

    // Calculate totals
    const totalAssets = currentAssets.subtotal + nonCurrentAssets.subtotal;
    const totalLiabilities = currentLiabilities.subtotal + nonCurrentLiabilities.subtotal;
    const totalEquity = equity.shareCapital.subtotal + equity.reserves.subtotal + equity.retainedEarnings + equity.currentYearProfit;

    // Build previous period data if requested
    let previousTotalAssets: number | undefined;
    let previousTotalLiabilities: number | undefined;
    let previousTotalEquity: number | undefined;

    if (dto.includeComparison && dto.previousPeriodEnd) {
      const previousAccounts = await this.getAllAccountsWithBalances(
        dto.previousPeriodEnd,
        dto.postedOnly !== false,
        false,
      );

      previousTotalAssets = this.calculateTotalAssets(previousAccounts);
      previousTotalLiabilities = this.calculateTotalLiabilities(previousAccounts);
      previousTotalEquity = this.calculateTotalEquity(previousAccounts);
    }

    // Calculate financial metrics
    const metrics = dto.includeMetrics !== false
      ? this.calculateFinancialMetrics({
          totalAssets,
          totalLiabilities,
          totalEquity,
          currentAssets: currentAssets.subtotal,
          currentLiabilities: currentLiabilities.subtotal,
          inventory: this.getInventoryValue(accounts),
        })
      : {
          workingCapital: 0,
          currentRatio: 0,
          quickRatio: 0,
          debtToEquityRatio: 0,
          returnOnAssets: 0,
          returnOnEquity: 0,
        };

    // Check if balanced
    const balanceDifference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const isBalanced = balanceDifference < 0.01; // Allow 1 cent difference for rounding

    if (!isBalanced) {
      this.logger.warn(
        `Balance Sheet is not balanced! Difference: ${balanceDifference.toFixed(2)}`,
      );
    }

    const balanceSheet: BalanceSheet = {
      title: 'Balance Sheet',
      generatedAt: new Date(),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      companyName,
      isComparative: dto.includeComparison || false,
      assets: {
        currentAssets,
        nonCurrentAssets,
        totalAssets,
        previousTotalAssets,
      },
      liabilities: {
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
        previousTotalLiabilities,
      },
      equity: {
        shareCapital: equity.shareCapital,
        reserves: equity.reserves,
        retainedEarnings: equity.retainedEarnings,
        currentYearProfit: equity.currentYearProfit,
        totalEquity,
        previousTotalEquity,
      },
      metrics,
      isBalanced,
      balanceDifference: isBalanced ? undefined : balanceDifference,
    };

    this.logger.log(`Balance Sheet generated successfully. Total Assets: ${totalAssets.toFixed(2)}`);
    return balanceSheet;
  }

  /**
   * Get all accounts with their calculated balances
   */
  private async getAllAccountsWithBalances(
    asOfDate: Date,
    postedOnly: boolean,
    includeZero: boolean,
  ): Promise<Map<string, { account: Account; balance: number; balanceType: 'DR' | 'CR' }>> {
    // Get all accounts
    const accounts = await this.accountRepository.find({
      where: { deletedAt: null as any },
      order: { code: 'ASC' },
    });

    const accountBalances = new Map();

    for (const account of accounts) {
      const balance = await this.calculateAccountBalance(account, asOfDate, postedOnly);

      if (!includeZero && Math.abs(balance.balance) < 0.01) {
        continue;
      }

      accountBalances.set(account.code, {
        account,
        balance: balance.balance,
        balanceType: balance.balanceType,
      });
    }

    return accountBalances;
  }

  /**
   * Calculate balance for a single account
   */
  private async calculateAccountBalance(
    account: Account,
    asOfDate: Date,
    postedOnly: boolean,
  ): Promise<{ balance: number; balanceType: 'DR' | 'CR' }> {
    const query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode: account.code })
      .andWhere('voucher.voucher_date <= :asOfDate', { asOfDate })
      .andWhere('voucher.deleted_at IS NULL');

    if (postedOnly) {
      query.andWhere('voucher.is_posted = :isPosted', { isPosted: true });
    }

    const result = await query.getRawOne();

    const totalDebits = Number(result?.totalDebits || 0);
    const totalCredits = Number(result?.totalCredits || 0);
    const openingBalance = Number(account.openingBalance || 0);

    let balance: number;
    let balanceType: 'DR' | 'CR';

    if (account.nature === AccountNature.DEBIT) {
      balance = openingBalance + totalDebits - totalCredits;
      balanceType = balance >= 0 ? 'DR' : 'CR';
    } else {
      balance = openingBalance + totalCredits - totalDebits;
      balanceType = balance >= 0 ? 'CR' : 'DR';
    }

    return { balance: Math.abs(balance), balanceType };
  }

  /**
   * Build Current Assets section
   */
  private async buildCurrentAssetsSection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<StatementSection> {
    const lineItems: StatementLineItem[] = [];
    let subtotal = 0;

    // Group accounts by sub-category
    const currentAssetAccounts = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        item.account.subCategory === AccountSubCategory.CURRENT_ASSET,
    );

    // Cash and Cash Equivalents
    const cashAccounts = currentAssetAccounts.filter((item) =>
      item.account.isCashAccount || item.account.isBankAccount,
    );

    if (cashAccounts.length > 0) {
      const cashTotal = cashAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-CASH',
        label: 'Cash and Cash Equivalents',
        amount: cashTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: cashAccounts.map((item) => item.account.code),
      });
      subtotal += cashTotal;

      if (dto.detailed) {
        cashAccounts.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: `  ${item.account.name}`,
            amount: item.balance,
            level: 2,
            isTotal: false,
            isBold: false,
            isCalculated: false,
            accountCodes: [item.account.code],
          });
        });
      }
    }

    // Accounts Receivable
    const arAccounts = currentAssetAccounts.filter(
      (item) => item.account.code.includes('Receivable') || item.account.name.includes('Receivable'),
    );

    if (arAccounts.length > 0) {
      const arTotal = arAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-AR',
        label: 'Accounts Receivable',
        amount: arTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: arAccounts.map((item) => item.account.code),
      });
      subtotal += arTotal;
    }

    // Inventory (if exists)
    const inventoryAccounts = currentAssetAccounts.filter(
      (item) => item.account.name.toLowerCase().includes('inventory'),
    );

    if (inventoryAccounts.length > 0) {
      const inventoryTotal = inventoryAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-INV',
        label: 'Inventory',
        amount: inventoryTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: inventoryAccounts.map((item) => item.account.code),
      });
      subtotal += inventoryTotal;
    }

    // Other Current Assets
    const otherCurrentAssets = currentAssetAccounts.filter(
      (item) =>
        !cashAccounts.includes(item) &&
        !arAccounts.includes(item) &&
        !inventoryAccounts.includes(item),
    );

    if (otherCurrentAssets.length > 0) {
      const otherTotal = otherCurrentAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-OTHER',
        label: 'Other Current Assets',
        amount: otherTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: otherCurrentAssets.map((item) => item.account.code),
      });
      subtotal += otherTotal;
    }

    return {
      id: 'current-assets',
      title: 'Current Assets',
      lineItems,
      subtotal,
      order: 1,
    };
  }

  /**
   * Build Non-Current Assets section
   */
  private async buildNonCurrentAssetsSection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<StatementSection> {
    const lineItems: StatementLineItem[] = [];
    let subtotal = 0;

    // Fixed Assets
    const fixedAssets = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        (item.account.subCategory === AccountSubCategory.FIXED_ASSET ||
          item.account.subCategory === AccountSubCategory.NON_CURRENT_ASSET),
    );

    if (fixedAssets.length > 0) {
      const fixedTotal = fixedAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-FIXED',
        label: 'Property, Plant & Equipment',
        amount: fixedTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: fixedAssets.map((item) => item.account.code),
      });
      subtotal += fixedTotal;

      if (dto.detailed) {
        fixedAssets.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: `  ${item.account.name}`,
            amount: item.balance,
            level: 2,
            isTotal: false,
            isBold: false,
            isCalculated: false,
            accountCodes: [item.account.code],
          });
        });
      }
    }

    // Intangible Assets
    const intangibleAssets = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        item.account.subCategory === AccountSubCategory.INTANGIBLE_ASSET,
    );

    if (intangibleAssets.length > 0) {
      const intangibleTotal = intangibleAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-INTANGIBLE',
        label: 'Intangible Assets',
        amount: intangibleTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: intangibleAssets.map((item) => item.account.code),
      });
      subtotal += intangibleTotal;
    }

    return {
      id: 'non-current-assets',
      title: 'Non-Current Assets',
      lineItems,
      subtotal,
      order: 2,
    };
  }

  /**
   * Build Current Liabilities section
   */
  private async buildCurrentLiabilitiesSection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<StatementSection> {
    const lineItems: StatementLineItem[] = [];
    let subtotal = 0;

    const currentLiabilities = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.LIABILITY &&
        item.account.subCategory === AccountSubCategory.CURRENT_LIABILITY,
    );

    // Accounts Payable
    const apAccounts = currentLiabilities.filter(
      (item) => item.account.code.includes('Payable') || item.account.name.includes('Payable'),
    );

    if (apAccounts.length > 0) {
      const apTotal = apAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-AP',
        label: 'Accounts Payable',
        amount: apTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: apAccounts.map((item) => item.account.code),
      });
      subtotal += apTotal;
    }

    // Other Current Liabilities
    const otherCurrentLiabilities = currentLiabilities.filter(
      (item) => !apAccounts.includes(item),
    );

    if (otherCurrentLiabilities.length > 0) {
      const otherTotal = otherCurrentLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-OTHER',
        label: 'Other Current Liabilities',
        amount: otherTotal,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: otherCurrentLiabilities.map((item) => item.account.code),
      });
      subtotal += otherTotal;

      if (dto.detailed) {
        otherCurrentLiabilities.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: `  ${item.account.name}`,
            amount: item.balance,
            level: 2,
            isTotal: false,
            isBold: false,
            isCalculated: false,
            accountCodes: [item.account.code],
          });
        });
      }
    }

    return {
      id: 'current-liabilities',
      title: 'Current Liabilities',
      lineItems,
      subtotal,
      order: 1,
    };
  }

  /**
   * Build Non-Current Liabilities section
   */
  private async buildNonCurrentLiabilitiesSection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<StatementSection> {
    const lineItems: StatementLineItem[] = [];
    let subtotal = 0;

    const nonCurrentLiabilities = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.LIABILITY &&
        item.account.subCategory === AccountSubCategory.NON_CURRENT_LIABILITY,
    );

    if (nonCurrentLiabilities.length > 0) {
      const total = nonCurrentLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCL-LONGTERM',
        label: 'Long-term Debt',
        amount: total,
        level: 1,
        isTotal: false,
        isBold: true,
        isCalculated: true,
        accountCodes: nonCurrentLiabilities.map((item) => item.account.code),
      });
      subtotal += total;

      if (dto.detailed) {
        nonCurrentLiabilities.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: `  ${item.account.name}`,
            amount: item.balance,
            level: 2,
            isTotal: false,
            isBold: false,
            isCalculated: false,
            accountCodes: [item.account.code],
          });
        });
      }
    }

    return {
      id: 'non-current-liabilities',
      title: 'Non-Current Liabilities',
      lineItems,
      subtotal,
      order: 2,
    };
  }

  /**
   * Build Equity section
   */
  private async buildEquitySection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<{
    shareCapital: StatementSection;
    reserves: StatementSection;
    retainedEarnings: number;
    currentYearProfit: number;
  }> {
    const equityAccounts = Array.from(accounts.values()).filter(
      (item) => item.account.category === AccountCategory.EQUITY,
    );

    // Share Capital
    const shareCapitalAccounts = equityAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.SHARE_CAPITAL,
    );

    const shareCapitalItems: StatementLineItem[] = [];
    let shareCapitalTotal = 0;

    if (shareCapitalAccounts.length > 0) {
      shareCapitalAccounts.forEach((item) => {
        shareCapitalItems.push({
          code: item.account.code,
          label: item.account.name,
          amount: item.balance,
          level: 1,
          isTotal: false,
          isBold: false,
          isCalculated: false,
          accountCodes: [item.account.code],
        });
        shareCapitalTotal += item.balance;
      });
    }

    // Reserves
    const reservesAccounts = equityAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.RESERVES,
    );

    const reservesItems: StatementLineItem[] = [];
    let reservesTotal = 0;

    if (reservesAccounts.length > 0) {
      reservesAccounts.forEach((item) => {
        reservesItems.push({
          code: item.account.code,
          label: item.account.name,
          amount: item.balance,
          level: 1,
          isTotal: false,
          isBold: false,
          isCalculated: false,
          accountCodes: [item.account.code],
        });
        reservesTotal += item.balance;
      });
    }

    // Retained Earnings
    const retainedEarningsAccounts = equityAccounts.filter(
      (item) => item.account.subCategory === AccountSubCategory.RETAINED_EARNINGS,
    );

    const retainedEarnings = retainedEarningsAccounts.reduce(
      (sum, item) => sum + item.balance,
      0,
    );

    // Current year profit (from revenue - expenses)
    const currentYearProfit = await this.calculateCurrentYearProfit(dto.periodStart, dto.periodEnd);

    return {
      shareCapital: {
        id: 'share-capital',
        title: 'Share Capital',
        lineItems: shareCapitalItems,
        subtotal: shareCapitalTotal,
        order: 1,
      },
      reserves: {
        id: 'reserves',
        title: 'Reserves',
        lineItems: reservesItems,
        subtotal: reservesTotal,
        order: 2,
      },
      retainedEarnings,
      currentYearProfit,
    };
  }

  /**
   * Calculate current year profit (Revenue - Expenses)
   */
  private async calculateCurrentYearProfit(periodStart: Date, periodEnd: Date): Promise<number> {
    // Get revenue and expense accounts
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
   * Calculate financial metrics
   */
  private calculateFinancialMetrics(data: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
  }): BalanceSheet['metrics'] {
    const {
      totalAssets,
      totalLiabilities,
      totalEquity,
      currentAssets,
      currentLiabilities,
      inventory,
    } = data;

    // Working Capital = Current Assets - Current Liabilities
    const workingCapital = currentAssets - currentLiabilities;

    // Current Ratio = Current Assets / Current Liabilities
    const currentRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
    const quickRatio =
      currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;

    // Debt-to-Equity Ratio = Total Liabilities / Total Equity
    const debtToEquityRatio = totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    // Return on Assets = Net Income / Total Assets (placeholder - will be calculated with P&L)
    const returnOnAssets = 0; // Will be calculated when we have net income

    // Return on Equity = Net Income / Total Equity (placeholder)
    const returnOnEquity = 0; // Will be calculated when we have net income

    return {
      workingCapital: Math.round(workingCapital * 100) / 100,
      currentRatio: Math.round(currentRatio * 100) / 100,
      quickRatio: Math.round(quickRatio * 100) / 100,
      debtToEquityRatio: Math.round(debtToEquityRatio * 100) / 100,
      returnOnAssets: Math.round(returnOnAssets * 100) / 100,
      returnOnEquity: Math.round(returnOnEquity * 100) / 100,
    };
  }

  /**
   * Helper: Calculate total assets from accounts
   */
  private calculateTotalAssets(accounts: Map<string, any>): number {
    return Array.from(accounts.values())
      .filter((item) => item.account.category === AccountCategory.ASSET)
      .reduce((sum, item) => sum + item.balance, 0);
  }

  /**
   * Helper: Calculate total liabilities from accounts
   */
  private calculateTotalLiabilities(accounts: Map<string, any>): number {
    return Array.from(accounts.values())
      .filter((item) => item.account.category === AccountCategory.LIABILITY)
      .reduce((sum, item) => sum + item.balance, 0);
  }

  /**
   * Helper: Calculate total equity from accounts
   */
  private calculateTotalEquity(accounts: Map<string, any>): number {
    return Array.from(accounts.values())
      .filter((item) => item.account.category === AccountCategory.EQUITY)
      .reduce((sum, item) => sum + item.balance, 0);
  }

  /**
   * Helper: Get inventory value
   */
  private getInventoryValue(accounts: Map<string, any>): number {
    return Array.from(accounts.values())
      .filter((item) => item.account.name.toLowerCase().includes('inventory'))
      .reduce((sum, item) => sum + item.balance, 0);
  }
}
