import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';
import { Account } from '../accounts/entities/account.entity';
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
  ) {}

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

    // Build query to sum debits and credits from posted vouchers
    let query = this.voucherDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.voucher', 'voucher')
      .select('SUM(detail.debit_amount)', 'totalDebits')
      .addSelect('SUM(detail.credit_amount)', 'totalCredits')
      .where('detail.account_code = :accountCode', { accountCode })
      .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
      .andWhere('voucher.deleted_at IS NULL');

    // Apply date filter if provided
    if (asOfDate) {
      query = query.andWhere('voucher.voucher_date <= :asOfDate', { asOfDate });
    }

    const result = await query.getRawOne();

    const totalDebits = Number(result?.totalDebits || 0);
    const totalCredits = Number(result?.totalCredits || 0);
    const openingBalance = Number(account.openingBalance || 0);

    // Calculate current balance based on account nature
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
}

