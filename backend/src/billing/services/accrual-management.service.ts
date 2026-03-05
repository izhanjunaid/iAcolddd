import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { VouchersService } from '../../vouchers/vouchers.service';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';

export interface AccrualResult {
  periodEndDate: string;
  totalAccruedRevenue: number;
  lotsProcessed: number;
  voucherId: string;
  voucherNumber: string;
  details: Array<{
    lotNumber: string;
    customerName: string;
    daysStored: number;
    accruedAmount: number;
  }>;
}

@Injectable()
export class AccrualManagementService {
  private readonly logger = new Logger(AccrualManagementService.name);

  constructor(
    private readonly vouchersService: VouchersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Run month-end accrual for cold storage revenue.
   *
   * For all IN_STORAGE lots that haven't been billed yet,
   * calculate accrued revenue from billing_start_date to periodEndDate.
   *
   * Journal Entry:
   *   DR  Accrued Revenue Receivable (Asset)
   *   CR  Service Revenue (Revenue)
   *
   * This accrual is REVERSED at the start of the next period
   * (or when the actual invoice is generated on outward release).
   */
  async runMonthEndAccrual(
    periodEndDate: string,
    userId: string,
  ): Promise<AccrualResult> {
    const endDate = new Date(periodEndDate);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Find all IN_STORAGE lots with their billing details
      const activeLots = await manager.query(
        `
        SELECT 
          csl.id,
          csl.lot_number,
          csl.customer_id,
          c.name as customer_name,
          csl.billing_start_date,
          csl.net_weight_kg,
          csl.bags_in,
          csl.bags_out,
          csl.rate_per_kg_per_day,
          csl.rate_per_bag_per_season,
          csl.billing_unit
        FROM cold_store_lots csl
        JOIN customers c ON csl.customer_id = c.id
        WHERE csl.status = 'IN_STORAGE'
          AND csl.billing_start_date <= $1
        ORDER BY c.name, csl.lot_number
      `,
        [periodEndDate],
      );

      if (activeLots.length === 0) {
        throw new BadRequestException('No active lots found for accrual');
      }

      // 2. Calculate accrued revenue for each lot
      const voucherDetails: VoucherLineItemDto[] = [];
      const resultDetails: AccrualResult['details'] = [];
      let totalAccrued = 0;
      let lineNumber = 1;

      // Get the Accrued Revenue receivable code and Service Revenue code
      const accrualAccountResult = await manager.query(`
        SELECT code FROM accounts 
        WHERE name ILIKE '%accrued%' AND category = 'ASSET' AND deleted_at IS NULL AND account_type = 'DETAIL'
        LIMIT 1
      `);

      // Fall back to AR receivable if no specific accrual account
      const accrualAccount =
        accrualAccountResult.length > 0
          ? accrualAccountResult[0].code
          : (
              await manager.query(`
            SELECT code FROM accounts 
            WHERE sub_category = 'CURRENT_ASSET' AND name ILIKE '%receivable%' AND deleted_at IS NULL AND account_type = 'DETAIL'
            LIMIT 1
          `)
            )[0]?.code;

      const revenueResult = await manager.query(`
        SELECT code FROM accounts 
        WHERE category = 'REVENUE' AND deleted_at IS NULL AND account_type = 'DETAIL'
        ORDER BY code LIMIT 1
      `);

      if (!accrualAccount || !revenueResult.length) {
        throw new BadRequestException(
          'Missing GL accounts: Need an Accrued/Receivable asset account and a Revenue account for accruals',
        );
      }

      const revenueCode = revenueResult[0].code;

      for (const lot of activeLots) {
        const billingStart = new Date(lot.billing_start_date);
        const daysStored = Math.max(
          1,
          Math.ceil(
            (endDate.getTime() - billingStart.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );

        let accruedAmount = 0;

        if (lot.billing_unit === 'PER_KG') {
          const rate = Number(lot.rate_per_kg_per_day) || 2.0; // fallback rate
          accruedAmount = Number(lot.net_weight_kg) * rate * daysStored;
        } else {
          // PER_BAG (seasonal)
          const rate = Number(lot.rate_per_bag_per_season) || 100; // fallback
          const currentBags = Number(lot.bags_in) - Number(lot.bags_out);
          accruedAmount = currentBags * rate;
        }

        accruedAmount = Math.round(accruedAmount * 100) / 100;

        if (accruedAmount <= 0) continue;

        totalAccrued += accruedAmount;

        resultDetails.push({
          lotNumber: lot.lot_number,
          customerName: lot.customer_name,
          daysStored,
          accruedAmount,
        });
      }

      if (totalAccrued <= 0) {
        throw new BadRequestException('No revenue to accrue for this period');
      }

      // 3. Build consolidated voucher (DR Accrued Receivable, CR Revenue)
      voucherDetails.push({
        accountCode: accrualAccount,
        description: `Month-end accrued storage revenue — ${endDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        debitAmount: totalAccrued,
        creditAmount: 0,
        lineNumber: lineNumber++,
      });

      voucherDetails.push({
        accountCode: revenueCode,
        description: `Accrued storage revenue (${resultDetails.length} lots) — ${endDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        debitAmount: 0,
        creditAmount: totalAccrued,
        lineNumber: lineNumber++,
      });

      // 4. Create and post the accrual voucher
      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.JOURNAL,
        voucherDate: periodEndDate,
        description: `Month-End Accrual — Storage Revenue (${resultDetails.length} lots, ${endDate.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
        referenceType: 'ACCRUAL',
        details: voucherDetails,
      };

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

      this.logger.log(
        `Accrual run complete: ${resultDetails.length} lots, total ${totalAccrued.toFixed(2)}, voucher ${postedVoucher.voucherNumber}`,
      );

      return {
        periodEndDate,
        totalAccruedRevenue: totalAccrued,
        lotsProcessed: resultDetails.length,
        voucherId: postedVoucher.id,
        voucherNumber: postedVoucher.voucherNumber,
        details: resultDetails,
      };
    });
  }

  /**
   * Reverse a previous accrual (at period start or when actual invoice is generated).
   * Creates the exact opposite journal entry.
   */
  async reverseAccrual(
    originalVoucherId: string,
    reversalDate: string,
    userId: string,
  ): Promise<{ reversalVoucherId: string; reversalVoucherNumber: string }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // Load original voucher
      const original = await this.vouchersService.findOne(originalVoucherId);

      if (!original || !original.details?.length) {
        throw new BadRequestException(
          'Original accrual voucher not found or has no details',
        );
      }

      // Build reversal lines (swap DR/CR)
      const reversalDetails: VoucherLineItemDto[] = original.details.map(
        (d, idx) => ({
          accountCode: d.accountCode,
          description: `REVERSAL: ${d.description}`,
          debitAmount: Number(d.creditAmount),
          creditAmount: Number(d.debitAmount),
          lineNumber: idx + 1,
        }),
      );

      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.JOURNAL,
        voucherDate: reversalDate,
        description: `REVERSAL of Accrual ${original.voucherNumber}`,
        referenceType: 'ACCRUAL_REVERSAL',
        referenceId: originalVoucherId,
        details: reversalDetails,
      };

      const voucher = await this.vouchersService.create(
        voucherDto,
        userId,
        manager,
      );
      const posted = await this.vouchersService.postVoucher(
        voucher.id,
        userId,
        manager,
      );

      return {
        reversalVoucherId: posted.id,
        reversalVoucherNumber: posted.voucherNumber,
      };
    });
  }
}
