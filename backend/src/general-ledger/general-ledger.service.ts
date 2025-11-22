import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';
import { Account } from '../accounts/entities/account.entity';
import { MonthlyBalance } from '../accounts/entities/monthly-balance.entity';
import { AccountNature } from '../common/enums/account-nature.enum';

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  balanceType: 'DR' | 'CR';
}

export interface AccountLedgerEntry {
  date: Date;
  voucherNumber: string;
  voucherId: string;
  voucherType: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'DR' | 'CR';
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  category: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  asOfDate: Date;
  accounts: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

@Injectable()
export class GeneralLedgerService {
  constructor(
    @InjectRepository(VoucherMaster)
    private readonly voucherMasterRepository: Repository<VoucherMaster>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(MonthlyBalance)
    private readonly monthlyBalanceRepository: Repository<MonthlyBalance>,
  ) { }

  /**
   * Get current balance for an account
   */
  async getAccountBalance(
    accountCode: string,
    asOfDate?: Date,
  ): Promise<AccountBalance> {
    // Get account details
    const account = await this.accountRepository.findOne({
      where: { code: accountCode, deletedAt: null as any },
    });

    if (!account) {
      throw new Error(`Account ${accountCode} not found`);
    }

    const targetDate = asOfDate || new Date();
    let openingBalance = Number(account.openingBalance || 0);
    let totalDebits = 0;
    let totalCredits = 0;

    // 1. Try to find the latest final monthly balance before the target date
    const lastMonthDate = new Date(targetDate);
    lastMonthDate.setDate(0); // Last day of previous month

    const latestSnapshot = await this.monthlyBalanceRepository.findOne({
      where: {
        accountId: account.id,
        year: lastMonthDate.getFullYear(),
        month: lastMonthDate.getMonth() + 1,
        isFinal: true
      },
    });

    let startDate = new Date(account.openingDate || '1970-01-01');

    if (latestSnapshot) {
      openingBalance = Number(latestSnapshot.closingBalance);
      // Start summing vouchers from the first day of the current month
      startDate = new Date(latestSnapshot.year, latestSnapshot.month, 1);
    }

    // 2. Sum vouchers from the snapshot date (or opening date) to the target date
    const result = await this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .andWhere('voucher.voucher_date >= :startDate', { startDate })
      .andWhere('voucher.voucher_date <= :endDate', { endDate: targetDate })
      .getRawOne();

    totalDebits = Number(result?.totalDebits || 0);
    totalCredits = Number(result?.totalCredits || 0);

    // 3. Calculate current balance
    let currentBalance: number;
    let balanceType: 'DR' | 'CR';

    if (account.nature === AccountNature.DEBIT) {
      // For debit nature accounts: Balance = Opening + Debits - Credits
      currentBalance = openingBalance + totalDebits - totalCredits;
      balanceType = currentBalance >= 0 ? 'DR' : 'CR';
      currentBalance = Math.abs(currentBalance);
    } else {
      // For credit nature accounts: Balance = Opening + Credits - Debits
      currentBalance = openingBalance + totalCredits - totalDebits;
      balanceType = currentBalance >= 0 ? 'CR' : 'DR';
      currentBalance = Math.abs(currentBalance);
    }

    return {
      accountCode: account.code,
      accountName: account.name,
      nature: account.nature,
      openingBalance,
      totalDebits,
      totalCredits,
      currentBalance,
      balanceType,
    };
  }

  /**
   * Get account ledger (all transactions for an account)
   */
  async getAccountLedger(
    accountCode: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    account: Account;
    openingBalance: AccountBalance;
    entries: AccountLedgerEntry[];
    closingBalance: AccountBalance;
  }> {
    // Get account
    const account = await this.accountRepository.findOne({
      where: { code: accountCode, deletedAt: null as any },
    });

    if (!account) {
      throw new Error(`Account ${accountCode} not found`);
    }

    // Get opening balance (balance before fromDate if provided)
    // If no fromDate, use the account's opening balance without any transactions
    let openingBalance: AccountBalance;
    if (fromDate) {
      // Get balance as of the day before fromDate
      openingBalance = await this.getAccountBalance(
        accountCode,
        new Date(fromDate.getTime() - 1),
      );
    } else {
      // Use only the account's opening balance field (no transactions)
      const openingBal = Number(account.openingBalance || 0);
      openingBalance = {
        accountCode: account.code,
        accountName: account.name,
        nature: account.nature,
        openingBalance: openingBal,
        totalDebits: 0,
        totalCredits: 0,
        currentBalance: openingBal,
        balanceType: openingBal >= 0 ? (account.nature === AccountNature.DEBIT ? 'DR' : 'CR') : (account.nature === AccountNature.DEBIT ? 'CR' : 'DR'),
      };
    }

    // Get transactions
    let query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.voucher', 'voucher')
      .where('detail.account_code = :accountCode', { accountCode })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL')
      .orderBy('voucher.voucher_date', 'ASC')
      .addOrderBy('voucher.voucher_number', 'ASC');

    // Apply date filters
    if (fromDate) {
      query = query.andWhere('voucher.voucher_date >= :fromDate', { fromDate });
    }

    if (toDate) {
      query = query.andWhere('voucher.voucher_date <= :toDate', { toDate });
    }

    const details = await query.getMany();

    // Calculate running balance
    let runningBalance = openingBalance.currentBalance;
    if (openingBalance.balanceType === 'CR' && account.nature === AccountNature.DEBIT) {
      runningBalance = -runningBalance;
    }

    const entries: AccountLedgerEntry[] = details.map((detail) => {
      const debit = Number(detail.debitAmount);
      const credit = Number(detail.creditAmount);

      // Update running balance
      if (account.nature === AccountNature.DEBIT) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      // Determine balance type based on account nature
      let balanceType: 'DR' | 'CR';
      if (account.nature === AccountNature.DEBIT) {
        balanceType = runningBalance >= 0 ? 'DR' : 'CR';
      } else {
        balanceType = runningBalance >= 0 ? 'CR' : 'DR';
      }

      return {
        date: detail.voucher.voucherDate,
        voucherNumber: detail.voucher.voucherNumber,
        voucherId: detail.voucher.id,
        voucherType: detail.voucher.voucherType,
        description: detail.description || detail.voucher.description || '',
        debit,
        credit,
        balance: Math.abs(runningBalance),
        balanceType,
      };
    });

    // Get closing balance
    const closingBalance = await this.getAccountBalance(accountCode, toDate);

    return {
      account,
      openingBalance,
      entries,
      closingBalance,
    };
  }

  /**
   * Get Trial Balance (all accounts with their balances)
   */
  async getTrialBalance(asOfDate?: Date): Promise<TrialBalance> {
    // Get all accounts
    const accounts = await this.accountRepository.find({
      where: { deletedAt: null as any },
      order: { code: 'ASC' },
    });

    const entries: TrialBalanceEntry[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    // Calculate balance for each account
    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.code, asOfDate);

      let debitBalance = 0;
      let creditBalance = 0;

      // Categorize balance as DR or CR
      if (balance.balanceType === 'DR') {
        debitBalance = balance.currentBalance;
        totalDebits += debitBalance;
      } else {
        creditBalance = balance.currentBalance;
        totalCredits += creditBalance;
      }

      entries.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.accountType,
        category: account.category,
        debitBalance,
        creditBalance,
      });
    }

    // Round to 2 decimal places for comparison
    const debitsRounded = Math.round(totalDebits * 100) / 100;
    const creditsRounded = Math.round(totalCredits * 100) / 100;
    const difference = Math.round((totalDebits - totalCredits) * 100) / 100;

    return {
      asOfDate: asOfDate || new Date(),
      accounts: entries,
      totalDebits: debitsRounded,
      totalCredits: creditsRounded,
      isBalanced: Math.abs(difference) < 0.01, // Allow 1 cent difference for rounding
      difference,
    };
  }

  /**
   * Get summary balances by category (for financial statements)
   */
  async getCategorySummary(asOfDate?: Date) {
    const trialBalance = await this.getTrialBalance(asOfDate);

    const summary = {
      ASSET: { debit: 0, credit: 0 },
      LIABILITY: { debit: 0, credit: 0 },
      EQUITY: { debit: 0, credit: 0 },
      REVENUE: { debit: 0, credit: 0 },
      EXPENSE: { debit: 0, credit: 0 },
    };

    for (const entry of trialBalance.accounts) {
      const category = entry.category as keyof typeof summary;
      if (summary[category]) {
        summary[category].debit += entry.debitBalance;
        summary[category].credit += entry.creditBalance;
      }
    }

    return {
      asOfDate: trialBalance.asOfDate,
      categories: summary,
      totalAssets: summary.ASSET.debit - summary.ASSET.credit,
      totalLiabilities: summary.LIABILITY.credit - summary.LIABILITY.debit,
      totalEquity: summary.EQUITY.credit - summary.EQUITY.debit,
      totalRevenue: summary.REVENUE.credit - summary.REVENUE.debit,
      totalExpenses: summary.EXPENSE.debit - summary.EXPENSE.credit,
      netIncome:
        summary.REVENUE.credit -
        summary.REVENUE.debit -
        (summary.EXPENSE.debit - summary.EXPENSE.credit),
    };
  }
  /**
   * Generate monthly balances for all accounts up to a specific date
   * This should be run periodically (e.g., nightly or manually triggered)
   */
  async generateMonthlyBalances(upToDate: Date = new Date()): Promise<void> {
    const accounts = await this.accountRepository.find();

    // Determine the start date (e.g., beginning of fiscal year or system start)
    // For simplicity, we'll start from the earliest voucher date or a fixed date
    const earliestVoucher = await this.voucherMasterRepository.findOne({
      where: {},
      order: { voucherDate: 'ASC' },
    });

    if (!earliestVoucher) return;

    let currentDate = new Date(earliestVoucher.voucherDate);
    currentDate.setDate(1); // Start of month

    while (currentDate <= upToDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const nextMonth = new Date(year, month, 1); // Month is 0-indexed in Date constructor, so month + 1 is next month

      for (const account of accounts) {
        // Calculate balance for this month
        // 1. Get opening balance (closing balance of previous month)
        let openingBalance = 0;
        if (month === 1) {
          // If January, check if we need to carry forward from previous year or reset (for P&L)
          // For simplicity, we'll just get previous month's closing
          const prevYear = year - 1;
          const prevMonthBalance = await this.monthlyBalanceRepository.findOne({
            where: { accountId: account.id, year: prevYear, month: 12 },
          });
          openingBalance = prevMonthBalance ? Number(prevMonthBalance.closingBalance) : Number(account.openingBalance);
        } else {
          const prevMonthBalance = await this.monthlyBalanceRepository.findOne({
            where: { accountId: account.id, year, month: month - 1 },
          });
          openingBalance = prevMonthBalance ? Number(prevMonthBalance.closingBalance) : Number(account.openingBalance);
        }

        // 2. Sum debits and credits for this month
        const { totalDebits, totalCredits } = await this.voucherDetailRepository
          .createQueryBuilder('detail')
          .leftJoin('detail.voucher', 'voucher')
          .select('SUM(detail.debit_amount)', 'totalDebits')
          .addSelect('SUM(detail.credit_amount)', 'totalCredits')
          .where('detail.account_code = :accountCode', { accountCode: account.code })
          .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
          .andWhere('voucher.deleted_at IS NULL')
          .andWhere('voucher.voucher_date >= :startDate', { startDate: currentDate })
          .andWhere('voucher.voucher_date < :endDate', { endDate: nextMonth })
          .getRawOne();

        const debits = Number(totalDebits || 0);
        const credits = Number(totalCredits || 0);

        // 3. Calculate closing balance
        let closingBalance = 0;
        if (account.nature === AccountNature.DEBIT) {
          closingBalance = openingBalance + debits - credits;
        } else {
          closingBalance = openingBalance + credits - debits;
        }

        // 4. Save or Update MonthlyBalance
        let monthlyBalance = await this.monthlyBalanceRepository.findOne({
          where: { accountId: account.id, year, month },
        });

        if (!monthlyBalance) {
          monthlyBalance = this.monthlyBalanceRepository.create({
            accountId: account.id,
            year,
            month,
          });
        }

        monthlyBalance.openingBalance = openingBalance;
        monthlyBalance.totalDebits = debits;
        monthlyBalance.totalCredits = credits;
        monthlyBalance.closingBalance = closingBalance;
        monthlyBalance.isFinal = nextMonth <= new Date(); // Mark as final if month is fully past

        await this.monthlyBalanceRepository.save(monthlyBalance);
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
}

