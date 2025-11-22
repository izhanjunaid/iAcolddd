import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherDetail } from '../../vouchers/entities';
import { AccountCategory } from '../../common/enums/account-category.enum';
import { AccountSubCategory } from '../../common/enums/account-sub-category.enum';
import { AccountNature } from '../../common/enums/account-nature.enum';
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
   * Build Current Assets section (IAS 1 compliant)
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

    // 1. Cash and Cash Equivalents (IAS 7)
    const cashAccounts = currentAssetAccounts.filter((item) =>
      item.account.isCashAccount || item.account.isBankAccount,
    );

    if (cashAccounts.length > 0) {
      const cashTotal = cashAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-CASH',
        label: 'Cash and cash equivalents',
        amount: cashTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: cashAccounts.map((item) => item.account.code),
        notes: 'Note 1',
      });
      subtotal += cashTotal;

      if (dto.detailed) {
        cashAccounts.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 2. Trade and Other Receivables (IAS 1)
    const arAccounts = currentAssetAccounts.filter(
      (item) =>
        item.account.code.includes('Receivable') ||
        item.account.name.toLowerCase().includes('receivable') ||
        item.account.name.toLowerCase().includes('debtors'),
    );

    if (arAccounts.length > 0) {
      const arTotal = arAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-AR',
        label: 'Trade and other receivables',
        amount: arTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: arAccounts.map((item) => item.account.code),
        notes: 'Note 2',
      });
      subtotal += arTotal;

      if (dto.detailed) {
        arAccounts.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 3. Inventories (IAS 2)
    const inventoryAccounts = currentAssetAccounts.filter(
      (item) =>
        item.account.name.toLowerCase().includes('inventory') ||
        item.account.name.toLowerCase().includes('stock'),
    );

    if (inventoryAccounts.length > 0) {
      const inventoryTotal = inventoryAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-INV',
        label: 'Inventories',
        amount: inventoryTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: inventoryAccounts.map((item) => item.account.code),
        notes: 'Note 3',
      });
      subtotal += inventoryTotal;

      if (dto.detailed) {
        inventoryAccounts.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 4. Prepayments and Other Current Assets
    const prepaymentAccounts = currentAssetAccounts.filter(
      (item) =>
        item.account.name.toLowerCase().includes('prepaid') ||
        item.account.name.toLowerCase().includes('prepayment') ||
        item.account.name.toLowerCase().includes('advance'),
    );

    if (prepaymentAccounts.length > 0) {
      const prepaymentTotal = prepaymentAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-PREPAY',
        label: 'Prepayments and advances',
        amount: prepaymentTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: prepaymentAccounts.map((item) => item.account.code),
        notes: 'Note 4',
      });
      subtotal += prepaymentTotal;
    }

    // 5. Other Current Assets
    const otherCurrentAssets = currentAssetAccounts.filter(
      (item) =>
        !cashAccounts.includes(item) &&
        !arAccounts.includes(item) &&
        !inventoryAccounts.includes(item) &&
        !prepaymentAccounts.includes(item),
    );

    if (otherCurrentAssets.length > 0) {
      const otherTotal = otherCurrentAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CA-OTHER',
        label: 'Other current assets',
        amount: otherTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: otherCurrentAssets.map((item) => item.account.code),
        notes: 'Note 5',
      });
      subtotal += otherTotal;

      if (dto.detailed) {
        otherCurrentAssets.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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
      id: 'current-assets',
      title: 'Current Assets',
      lineItems,
      subtotal,
      order: 2, // Current assets shown after non-current in IAS 1
    };
  }

  /**
   * Build Non-Current Assets section (IAS 1 compliant)
   */
  private async buildNonCurrentAssetsSection(
    accounts: Map<string, any>,
    dto: BalanceSheetRequestDto,
  ): Promise<StatementSection> {
    const lineItems: StatementLineItem[] = [];
    let subtotal = 0;

    // 1. Property, Plant and Equipment (IAS 16)
    const fixedAssets = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        (item.account.subCategory === AccountSubCategory.FIXED_ASSET ||
          item.account.subCategory === AccountSubCategory.NON_CURRENT_ASSET),
    );

    if (fixedAssets.length > 0) {
      const fixedTotal = fixedAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-PPE',
        label: 'Property, plant and equipment',
        amount: fixedTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: fixedAssets.map((item) => item.account.code),
        notes: 'Note 6',
      });
      subtotal += fixedTotal;

      if (dto.detailed) {
        fixedAssets.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 2. Intangible Assets (IAS 38)
    const intangibleAssets = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        item.account.subCategory === AccountSubCategory.INTANGIBLE_ASSET,
    );

    if (intangibleAssets.length > 0) {
      const intangibleTotal = intangibleAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-INTANGIBLE',
        label: 'Intangible assets',
        amount: intangibleTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: intangibleAssets.map((item) => item.account.code),
        notes: 'Note 7',
      });
      subtotal += intangibleTotal;

      if (dto.detailed) {
        intangibleAssets.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 3. Long-term Investments (if any)
    const investmentAccounts = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        (item.account.name.toLowerCase().includes('investment') ||
          item.account.name.toLowerCase().includes('securities')) &&
        item.account.subCategory === AccountSubCategory.NON_CURRENT_ASSET,
    );

    if (investmentAccounts.length > 0) {
      const investmentTotal = investmentAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-INV',
        label: 'Long-term investments',
        amount: investmentTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: investmentAccounts.map((item) => item.account.code),
        notes: 'Note 8',
      });
      subtotal += investmentTotal;
    }

    // 4. Deferred Tax Assets (IAS 12)
    const deferredTaxAssets = Array.from(accounts.values()).filter(
      (item) =>
        item.account.category === AccountCategory.ASSET &&
        item.account.name.toLowerCase().includes('deferred tax'),
    );

    if (deferredTaxAssets.length > 0) {
      const deferredTaxTotal = deferredTaxAssets.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCA-DTA',
        label: 'Deferred tax assets',
        amount: deferredTaxTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: deferredTaxAssets.map((item) => item.account.code),
        notes: 'Note 9',
      });
      subtotal += deferredTaxTotal;
    }

    return {
      id: 'non-current-assets',
      title: 'Non-Current Assets',
      lineItems,
      subtotal,
      order: 1, // Non-current assets shown first in IAS 1
    };
  }

  /**
   * Build Current Liabilities section (IAS 1 compliant)
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

    // 1. Trade and Other Payables (IAS 1)
    const apAccounts = currentLiabilities.filter(
      (item) =>
        item.account.code.includes('Payable') ||
        item.account.name.toLowerCase().includes('payable') ||
        item.account.name.toLowerCase().includes('creditors'),
    );

    if (apAccounts.length > 0) {
      const apTotal = apAccounts.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-AP',
        label: 'Trade and other payables',
        amount: apTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: apAccounts.map((item) => item.account.code),
        notes: 'Note 10',
      });
      subtotal += apTotal;

      if (dto.detailed) {
        apAccounts.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 2. Short-term Borrowings
    const shortTermDebt = currentLiabilities.filter(
      (item) =>
        item.account.name.toLowerCase().includes('loan') ||
        item.account.name.toLowerCase().includes('borrowing') ||
        item.account.name.toLowerCase().includes('overdraft'),
    );

    if (shortTermDebt.length > 0) {
      const debtTotal = shortTermDebt.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-DEBT',
        label: 'Short-term borrowings',
        amount: debtTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: shortTermDebt.map((item) => item.account.code),
        notes: 'Note 11',
      });
      subtotal += debtTotal;
    }

    // 3. Current Tax Liabilities (IAS 12)
    const taxLiabilities = currentLiabilities.filter(
      (item) =>
        item.account.name.toLowerCase().includes('tax payable') ||
        item.account.name.toLowerCase().includes('income tax') ||
        item.account.name.toLowerCase().includes('sales tax'),
    );

    if (taxLiabilities.length > 0) {
      const taxTotal = taxLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-TAX',
        label: 'Current tax liabilities',
        amount: taxTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: taxLiabilities.map((item) => item.account.code),
        notes: 'Note 12',
      });
      subtotal += taxTotal;
    }

    // 4. Accruals and Provisions
    const accruals = currentLiabilities.filter(
      (item) =>
        item.account.name.toLowerCase().includes('accrual') ||
        item.account.name.toLowerCase().includes('provision'),
    );

    if (accruals.length > 0) {
      const accrualTotal = accruals.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-ACCRUAL',
        label: 'Accruals and provisions',
        amount: accrualTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: accruals.map((item) => item.account.code),
        notes: 'Note 13',
      });
      subtotal += accrualTotal;
    }

    // 5. Other Current Liabilities
    const otherCurrentLiabilities = currentLiabilities.filter(
      (item) =>
        !apAccounts.includes(item) &&
        !shortTermDebt.includes(item) &&
        !taxLiabilities.includes(item) &&
        !accruals.includes(item),
    );

    if (otherCurrentLiabilities.length > 0) {
      const otherTotal = otherCurrentLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'CL-OTHER',
        label: 'Other current liabilities',
        amount: otherTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: otherCurrentLiabilities.map((item) => item.account.code),
        notes: 'Note 14',
      });
      subtotal += otherTotal;

      if (dto.detailed) {
        otherCurrentLiabilities.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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
      order: 2, // Current liabilities after non-current in IAS 1
    };
  }

  /**
   * Build Non-Current Liabilities section (IAS 1 compliant)
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

    // 1. Long-term Borrowings
    const longTermDebt = nonCurrentLiabilities.filter(
      (item) =>
        item.account.name.toLowerCase().includes('loan') ||
        item.account.name.toLowerCase().includes('debt') ||
        item.account.name.toLowerCase().includes('borrowing') ||
        item.account.name.toLowerCase().includes('bonds'),
    );

    if (longTermDebt.length > 0) {
      const debtTotal = longTermDebt.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCL-DEBT',
        label: 'Long-term borrowings',
        amount: debtTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: longTermDebt.map((item) => item.account.code),
        notes: 'Note 15',
      });
      subtotal += debtTotal;

      if (dto.detailed) {
        longTermDebt.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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

    // 2. Deferred Tax Liabilities (IAS 12)
    const deferredTaxLiabilities = nonCurrentLiabilities.filter(
      (item) => item.account.name.toLowerCase().includes('deferred tax'),
    );

    if (deferredTaxLiabilities.length > 0) {
      const deferredTaxTotal = deferredTaxLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCL-DTL',
        label: 'Deferred tax liabilities',
        amount: deferredTaxTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: deferredTaxLiabilities.map((item) => item.account.code),
        notes: 'Note 16',
      });
      subtotal += deferredTaxTotal;
    }

    // 3. Long-term Provisions (IAS 37)
    const longTermProvisions = nonCurrentLiabilities.filter(
      (item) =>
        item.account.name.toLowerCase().includes('provision') &&
        !item.account.name.toLowerCase().includes('current'),
    );

    if (longTermProvisions.length > 0) {
      const provisionTotal = longTermProvisions.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCL-PROV',
        label: 'Long-term provisions',
        amount: provisionTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: longTermProvisions.map((item) => item.account.code),
        notes: 'Note 17',
      });
      subtotal += provisionTotal;
    }

    // 4. Other Non-Current Liabilities
    const otherNonCurrentLiabilities = nonCurrentLiabilities.filter(
      (item) =>
        !longTermDebt.includes(item) &&
        !deferredTaxLiabilities.includes(item) &&
        !longTermProvisions.includes(item),
    );

    if (otherNonCurrentLiabilities.length > 0) {
      const otherTotal = otherNonCurrentLiabilities.reduce((sum, item) => sum + item.balance, 0);
      lineItems.push({
        code: 'NCL-OTHER',
        label: 'Other non-current liabilities',
        amount: otherTotal,
        level: 1,
        isTotal: false,
        isBold: false,
        isCalculated: true,
        accountCodes: otherNonCurrentLiabilities.map((item) => item.account.code),
        notes: 'Note 18',
      });
      subtotal += otherTotal;

      if (dto.detailed) {
        otherNonCurrentLiabilities.forEach((item) => {
          lineItems.push({
            code: item.account.code,
            label: item.account.name,
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
      order: 1, // Non-current liabilities shown first in IAS 1
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
      .leftJoin('accounts', 'account', 'account.code = detail.account_code')
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
