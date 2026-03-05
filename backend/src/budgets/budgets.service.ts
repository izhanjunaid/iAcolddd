import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Budget } from './entities';

export interface BudgetVsActualRow {
  accountCode: string;
  accountName: string;
  month: number;
  budgetedAmount: number;
  revisedAmount: number | null;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create or update budget entries for a fiscal year
   */
  async upsertBudget(
    fiscalYearId: string,
    accountCode: string,
    entries: Array<{ month: number; amount: number; notes?: string }>,
    userId: string,
    costCenterId?: string,
  ): Promise<Budget[]> {
    const results: Budget[] = [];

    for (const entry of entries) {
      if (entry.month < 1 || entry.month > 12) {
        throw new BadRequestException(`Invalid month: ${entry.month}`);
      }

      let budget = await this.budgetRepository.findOne({
        where: {
          fiscalYearId,
          accountCode,
          periodMonth: entry.month,
        },
      });

      if (budget) {
        budget.budgetedAmount = entry.amount;
        budget.notes = entry.notes || budget.notes;
      } else {
        budget = this.budgetRepository.create({
          fiscalYearId,
          accountCode,
          periodMonth: entry.month,
          budgetedAmount: entry.amount,
          notes: entry.notes,
          costCenterId,
          createdById: userId,
        });
      }

      results.push(await this.budgetRepository.save(budget));
    }

    return results;
  }

  /**
   * Get Budget vs Actual report for a fiscal year
   */
  async getBudgetVsActual(
    fiscalYearId: string,
    costCenterId?: string,
  ): Promise<BudgetVsActualRow[]> {
    // Get budgets
    const budgetQuery = this.budgetRepository
      .createQueryBuilder('b')
      .where('b.fiscal_year_id = :fiscalYearId', { fiscalYearId });

    if (costCenterId) {
      budgetQuery.andWhere('b.cost_center_id = :costCenterId', {
        costCenterId,
      });
    }

    const budgets = await budgetQuery.getMany();

    // Get actuals from voucher_detail within the fiscal year date range
    const actuals = await this.dataSource.query(
      `
      SELECT 
        vd.account_code,
        a.name as account_name,
        EXTRACT(MONTH FROM vm.voucher_date) as month,
        COALESCE(SUM(vd.debit_amount), 0) - COALESCE(SUM(vd.credit_amount), 0) as net_amount
      FROM voucher_detail vd
      JOIN voucher_master vm ON vd.voucher_id = vm.id
      JOIN accounts a ON vd.account_code = a.code AND a.deleted_at IS NULL
      JOIN fiscal_years fy ON fy.id = $1
      WHERE vm.is_posted = true
        AND vm.voucher_date >= fy.start_date
        AND vm.voucher_date <= fy.end_date
        AND vm.deleted_at IS NULL
        AND a.category IN ('EXPENSE', 'REVENUE')
      GROUP BY vd.account_code, a.name, EXTRACT(MONTH FROM vm.voucher_date)
    `,
      [fiscalYearId],
    );

    // Merge budgets with actuals
    const resultMap = new Map<string, BudgetVsActualRow>();

    for (const b of budgets) {
      const key = `${b.accountCode}-${b.periodMonth}`;
      resultMap.set(key, {
        accountCode: b.accountCode,
        accountName: '',
        month: b.periodMonth,
        budgetedAmount: Number(b.budgetedAmount),
        revisedAmount: b.revisedAmount ? Number(b.revisedAmount) : null,
        actualAmount: 0,
        variance: 0,
        variancePercent: 0,
      });
    }

    for (const a of actuals) {
      const key = `${a.account_code}-${a.month}`;
      const existing = resultMap.get(key);
      if (existing) {
        existing.accountName = a.account_name;
        existing.actualAmount = Number(a.net_amount);
        const budget = existing.revisedAmount || existing.budgetedAmount;
        existing.variance = budget - existing.actualAmount;
        existing.variancePercent =
          budget !== 0
            ? Math.round((existing.variance / budget) * 10000) / 100
            : 0;
      } else {
        const actual = Number(a.net_amount);
        resultMap.set(key, {
          accountCode: a.account_code,
          accountName: a.account_name,
          month: Number(a.month),
          budgetedAmount: 0,
          revisedAmount: null,
          actualAmount: actual,
          variance: -actual,
          variancePercent: 0,
        });
      }
    }

    return Array.from(resultMap.values()).sort(
      (a, b) => a.accountCode.localeCompare(b.accountCode) || a.month - b.month,
    );
  }

  /**
   * Get all budgets for a fiscal year
   */
  async findByFiscalYear(fiscalYearId: string): Promise<Budget[]> {
    return await this.budgetRepository.find({
      where: { fiscalYearId },
      order: { accountCode: 'ASC', periodMonth: 'ASC' },
    });
  }
}
