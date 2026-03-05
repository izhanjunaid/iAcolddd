import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { FiscalYear, FiscalPeriod } from './entities';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateVoucherDto } from '../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../common/enums/voucher-type.enum';

export interface YearEndClosingResult {
  fiscalYear: FiscalYear;
  netIncome: number;
  totalRevenue: number;
  totalExpenses: number;
  closingVoucherId: string;
  closingVoucherNumber: string;
  accountsClosed: number;
}

@Injectable()
export class YearEndClosingService {
  private readonly logger = new Logger(YearEndClosingService.name);

  constructor(
    @InjectRepository(FiscalYear)
    private readonly fiscalYearRepository: Repository<FiscalYear>,
    @InjectRepository(FiscalPeriod)
    private readonly fiscalPeriodRepository: Repository<FiscalPeriod>,
    private readonly vouchersService: VouchersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Execute Year-End Closing for a fiscal year.
   *
   * This process:
   * 1. Validates all periods are closed
   * 2. Calculates Net Income (Revenue - Expenses) from GL
   * 3. Creates a closing journal voucher:
   *    - DR all Revenue accounts (zero them out)
   *    - CR all Expense accounts (zero them out)
   *    - DR/CR Retained Earnings for net income
   * 4. Locks the fiscal year permanently
   */
  async closeYear(
    fiscalYearId: string,
    userId: string,
  ): Promise<YearEndClosingResult> {
    // 1. Load fiscal year with periods
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: fiscalYearId },
      relations: ['periods'],
    });

    if (!fiscalYear) {
      throw new BadRequestException(`Fiscal year ${fiscalYearId} not found`);
    }

    if (fiscalYear.isClosed) {
      throw new BadRequestException(
        `Fiscal year ${fiscalYear.year} is already closed`,
      );
    }

    // 2. Validate ALL periods are closed
    const openPeriods = fiscalYear.periods.filter((p) => !p.isClosed);
    if (openPeriods.length > 0) {
      const openNames = openPeriods.map((p) => p.periodName).join(', ');
      throw new BadRequestException(
        `Cannot close fiscal year ${fiscalYear.year}. The following periods are still open: ${openNames}. Close all periods first.`,
      );
    }

    // 3. Execute closing in a transaction
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 3a. Calculate Revenue and Expense totals from voucher_detail
      // Revenue accounts have category = 'REVENUE', Expense accounts have category = 'EXPENSE'
      const revenueData = await manager.query(
        `
        SELECT 
          vd.account_code,
          a.name as account_name,
          COALESCE(SUM(vd.credit_amount), 0) - COALESCE(SUM(vd.debit_amount), 0) as net_balance
        FROM voucher_detail vd
        JOIN voucher_master vm ON vd.voucher_id = vm.id
        JOIN accounts a ON vd.account_code = a.code AND a.deleted_at IS NULL
        WHERE a.category = 'REVENUE'
          AND vm.is_posted = true
          AND vm.voucher_date >= $1
          AND vm.voucher_date <= $2
          AND vm.deleted_at IS NULL
        GROUP BY vd.account_code, a.name
        HAVING COALESCE(SUM(vd.credit_amount), 0) - COALESCE(SUM(vd.debit_amount), 0) != 0
      `,
        [fiscalYear.startDate, fiscalYear.endDate],
      );

      const expenseData = await manager.query(
        `
        SELECT 
          vd.account_code,
          a.name as account_name,
          COALESCE(SUM(vd.debit_amount), 0) - COALESCE(SUM(vd.credit_amount), 0) as net_balance
        FROM voucher_detail vd
        JOIN voucher_master vm ON vd.voucher_id = vm.id
        JOIN accounts a ON vd.account_code = a.code AND a.deleted_at IS NULL
        WHERE a.category = 'EXPENSE'
          AND vm.is_posted = true
          AND vm.voucher_date >= $1
          AND vm.voucher_date <= $2
          AND vm.deleted_at IS NULL
        GROUP BY vd.account_code, a.name
        HAVING COALESCE(SUM(vd.debit_amount), 0) - COALESCE(SUM(vd.credit_amount), 0) != 0
      `,
        [fiscalYear.startDate, fiscalYear.endDate],
      );

      const totalRevenue = revenueData.reduce(
        (sum: number, r: any) => sum + Number(r.net_balance),
        0,
      );
      const totalExpenses = expenseData.reduce(
        (sum: number, e: any) => sum + Number(e.net_balance),
        0,
      );
      const netIncome = totalRevenue - totalExpenses;

      this.logger.log(
        `Year-End Closing FY${fiscalYear.year}: Revenue=${totalRevenue}, Expenses=${totalExpenses}, Net Income=${netIncome}`,
      );

      // 3b. Build closing voucher lines
      // Get Retained Earnings account code
      const retainedEarnings = await manager.query(`
        SELECT code FROM accounts 
        WHERE sub_category = 'RETAINED_EARNINGS' 
          AND account_type = 'DETAIL'
          AND deleted_at IS NULL 
        LIMIT 1
      `);

      if (!retainedEarnings.length) {
        throw new BadRequestException(
          'Cannot close year: No Retained Earnings account found. Create a DETAIL account with sub_category = RETAINED_EARNINGS.',
        );
      }

      const retainedEarningsCode = retainedEarnings[0].code;
      const voucherDetails: VoucherLineItemDto[] = [];
      let lineNumber = 1;

      // DR Revenue accounts (to zero them) — Revenue normally has CR balance
      for (const rev of revenueData) {
        const balance = Number(rev.net_balance);
        if (balance > 0) {
          voucherDetails.push({
            accountCode: rev.account_code,
            description: `Year-end close: ${rev.account_name}`,
            debitAmount: balance,
            creditAmount: 0,
            lineNumber: lineNumber++,
          });
        } else if (balance < 0) {
          // Contra-revenue (e.g., Sales Returns with DR balance)
          voucherDetails.push({
            accountCode: rev.account_code,
            description: `Year-end close: ${rev.account_name}`,
            debitAmount: 0,
            creditAmount: Math.abs(balance),
            lineNumber: lineNumber++,
          });
        }
      }

      // CR Expense accounts (to zero them) — Expenses normally have DR balance
      for (const exp of expenseData) {
        const balance = Number(exp.net_balance);
        if (balance > 0) {
          voucherDetails.push({
            accountCode: exp.account_code,
            description: `Year-end close: ${exp.account_name}`,
            debitAmount: 0,
            creditAmount: balance,
            lineNumber: lineNumber++,
          });
        } else if (balance < 0) {
          // Contra-expense with CR balance
          voucherDetails.push({
            accountCode: exp.account_code,
            description: `Year-end close: ${exp.account_name}`,
            debitAmount: Math.abs(balance),
            creditAmount: 0,
            lineNumber: lineNumber++,
          });
        }
      }

      // Net Income → Retained Earnings
      if (netIncome > 0) {
        // Profit: CR Retained Earnings
        voucherDetails.push({
          accountCode: retainedEarningsCode,
          description: `Net Income transferred to Retained Earnings for FY${fiscalYear.year}`,
          debitAmount: 0,
          creditAmount: netIncome,
          lineNumber: lineNumber++,
        });
      } else if (netIncome < 0) {
        // Loss: DR Retained Earnings
        voucherDetails.push({
          accountCode: retainedEarningsCode,
          description: `Net Loss transferred to Retained Earnings for FY${fiscalYear.year}`,
          debitAmount: Math.abs(netIncome),
          creditAmount: 0,
          lineNumber: lineNumber++,
        });
      }

      // Edge case: no activity
      if (voucherDetails.length < 2) {
        this.logger.warn(
          `FY${fiscalYear.year}: No revenue/expense activity to close.`,
        );
        // Still lock the year
        await manager.update(FiscalYear, fiscalYearId, {
          isClosed: true,
          closedById: userId,
          closedAt: new Date(),
        });

        return {
          fiscalYear: (await manager.findOne(FiscalYear, {
            where: { id: fiscalYearId },
          })) as FiscalYear,
          netIncome: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          closingVoucherId: '',
          closingVoucherNumber: 'N/A - No activity',
          accountsClosed: 0,
        };
      }

      // 3c. Create and post the closing voucher
      const lastPeriod = fiscalYear.periods.sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      )[0];

      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.JOURNAL,
        voucherDate: new Date(lastPeriod.endDate).toISOString().split('T')[0],
        description: `Year-End Closing Entry — FY${fiscalYear.year} (${fiscalYear.startDate} to ${fiscalYear.endDate})`,
        referenceType: 'YEAR_END_CLOSING',
        referenceId: fiscalYearId,
        details: voucherDetails,
      };

      // Temporarily reopen the last period for the closing entry
      await manager.update(FiscalPeriod, lastPeriod.id, { isClosed: false });

      const voucher = await this.vouchersService.create(
        voucherDto,
        userId,
        manager,
      );
      const postedVoucher = await this.vouchersService.postVoucher(
        voucher.id,
        userId,
        manager,
      );

      // Re-close the last period
      await manager.update(FiscalPeriod, lastPeriod.id, { isClosed: true });

      // 3d. Lock the fiscal year
      await manager.update(FiscalYear, fiscalYearId, {
        isClosed: true,
        closedById: userId,
        closedAt: new Date(),
      });

      const closedYear = await manager.findOne(FiscalYear, {
        where: { id: fiscalYearId },
        relations: ['periods'],
      });

      this.logger.log(
        `Year-End Closing complete for FY${fiscalYear.year}. Voucher: ${postedVoucher.voucherNumber}`,
      );

      return {
        fiscalYear: closedYear!,
        netIncome,
        totalRevenue,
        totalExpenses,
        closingVoucherId: postedVoucher.id,
        closingVoucherNumber: postedVoucher.voucherNumber,
        accountsClosed: revenueData.length + expenseData.length,
      };
    });
  }

  /**
   * Preview Year-End Closing without executing.
   * Shows what the closing entry would look like.
   */
  async previewYearEndClosing(fiscalYearId: string) {
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: fiscalYearId },
      relations: ['periods'],
    });

    if (!fiscalYear) {
      throw new BadRequestException(`Fiscal year ${fiscalYearId} not found`);
    }

    const revenueData = await this.dataSource.query(
      `
      SELECT vd.account_code, a.name as account_name,
        COALESCE(SUM(vd.credit_amount), 0) - COALESCE(SUM(vd.debit_amount), 0) as net_balance
      FROM voucher_detail vd
      JOIN voucher_master vm ON vd.voucher_id = vm.id
      JOIN accounts a ON vd.account_code = a.code AND a.deleted_at IS NULL
      WHERE a.category = 'REVENUE' AND vm.is_posted = true
        AND vm.voucher_date >= $1 AND vm.voucher_date <= $2
        AND vm.deleted_at IS NULL
      GROUP BY vd.account_code, a.name
      HAVING COALESCE(SUM(vd.credit_amount), 0) - COALESCE(SUM(vd.debit_amount), 0) != 0
    `,
      [fiscalYear.startDate, fiscalYear.endDate],
    );

    const expenseData = await this.dataSource.query(
      `
      SELECT vd.account_code, a.name as account_name,
        COALESCE(SUM(vd.debit_amount), 0) - COALESCE(SUM(vd.credit_amount), 0) as net_balance
      FROM voucher_detail vd
      JOIN voucher_master vm ON vd.voucher_id = vm.id
      JOIN accounts a ON vd.account_code = a.code AND a.deleted_at IS NULL
      WHERE a.category = 'EXPENSE' AND vm.is_posted = true
        AND vm.voucher_date >= $1 AND vm.voucher_date <= $2
        AND vm.deleted_at IS NULL
      GROUP BY vd.account_code, a.name
      HAVING COALESCE(SUM(vd.debit_amount), 0) - COALESCE(SUM(vd.credit_amount), 0) != 0
    `,
      [fiscalYear.startDate, fiscalYear.endDate],
    );

    const totalRevenue = revenueData.reduce(
      (s: number, r: any) => s + Number(r.net_balance),
      0,
    );
    const totalExpenses = expenseData.reduce(
      (s: number, e: any) => s + Number(e.net_balance),
      0,
    );

    return {
      fiscalYear: fiscalYear.year,
      period: `${fiscalYear.startDate} to ${fiscalYear.endDate}`,
      isClosed: fiscalYear.isClosed,
      openPeriods: fiscalYear.periods
        .filter((p) => !p.isClosed)
        .map((p) => p.periodName),
      revenueAccounts: revenueData,
      expenseAccounts: expenseData,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      canClose:
        fiscalYear.periods.every((p) => p.isClosed) && !fiscalYear.isClosed,
    };
  }
}
