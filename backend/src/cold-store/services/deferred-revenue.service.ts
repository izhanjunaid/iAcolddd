import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RentalBillingCycle, RentalCycleStatus } from '../entities/rental-billing-cycle.entity';
import { BillingUnitType } from '../entities/cold-store-lot.entity';
import { VouchersService } from '../../vouchers/vouchers.service';
import { GlAccountConfiguration } from '../../common/entities/gl-account-configuration.entity';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';

/**
 * IFRS 15 Deferred Revenue Service (P3)
 *
 * For PER_BAG (seasonal) billing, revenue must be deferred at invoice time:
 *   DR Accounts Receivable   |  CR Unearned Revenue
 *
 * Then, recognized ratably each month over the season:
 *   DR Unearned Revenue      |  CR Service Revenue
 *
 * For PER_KG (daily weight-based), revenue recognition timing is driven
 * by the billing period, so no additional deferral is required since
 * invoices are raised at the end of the storage period (earned basis).
 */
@Injectable()
export class DeferredRevenueService {
    private readonly logger = new Logger(DeferredRevenueService.name);

    // System user ID for automated GL postings
    private readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    constructor(
        @InjectRepository(RentalBillingCycle)
        private readonly cycleRepo: Repository<RentalBillingCycle>,
        @InjectRepository(GlAccountConfiguration)
        private readonly glConfigRepo: Repository<GlAccountConfiguration>,
        private readonly vouchersService: VouchersService,
    ) { }

    /**
     * Run monthly on the 1st of each month at 01:00 AM.
     * Amortizes Unearned Revenue → Service Revenue for all active PER_BAG billing cycles.
     */
    @Cron('0 1 1 * *')
    async runMonthlyRevenueAmortization() {
        this.logger.log('Starting automated monthly deferred revenue amortization run...');

        try {
            const today = new Date();
            // Last day of previous month
            const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            const periodDate = lastDayOfPrevMonth.toISOString().split('T')[0];

            const result = await this.amortizeDeferredRevenue(periodDate, this.SYSTEM_USER_ID);
            this.logger.log(
                `Deferred revenue amortization complete: ${result.cyclesProcessed} cycles, Total amortized: ${result.totalAmortized}`,
            );
        } catch (error) {
            this.logger.error('Error running deferred revenue amortization', error.stack);
        }
    }

    /**
     * Amortize deferred (unearned) revenue for all active PER_BAG cycles.
     *
     * Logic:
     * - For each active PER_BAG billing cycle, calculate monthly earned amount
     *   (total_amount / estimated_months_in_season)
     * - Post: DR Unearned Revenue / CR Service Revenue
     *
     * @param periodDate  ISO date string (YYYY-MM-DD) — last day of the period
     * @param userId      User or system ID performing the posting
     */
    async amortizeDeferredRevenue(
        periodDate: string,
        userId: string,
    ): Promise<{ cyclesProcessed: number; totalAmortized: number; voucherId?: string }> {
        // Fetch all active PER_BAG billing cycles
        const activePerbagCycles = await this.cycleRepo.find({
            where: {
                status: RentalCycleStatus.ACTIVE,
                billingUnit: BillingUnitType.PER_BAG,
            },
            relations: ['lot', 'customer'],
        });

        if (activePerbagCycles.length === 0) {
            this.logger.log('No active PER_BAG billing cycles to amortize.');
            return { cyclesProcessed: 0, totalAmortized: 0 };
        }

        // Resolve GL accounts from configuration
        const unearnedRevenueAccount = await this.getGlConfig('UNEARNED_REVENUE');
        const serviceRevenueAccount = await this.getGlConfig('SERVICE_REVENUE');

        if (!unearnedRevenueAccount || !serviceRevenueAccount) {
            throw new Error(
                'GL Account Configuration missing for UNEARNED_REVENUE or SERVICE_REVENUE. Please configure in gl_account_configuration.',
            );
        }

        const details: any[] = [];
        let lineNumber = 1;
        let totalAmortized = 0;

        for (const cycle of activePerbagCycles) {
            // Estimate storage season is typically 6 months for cold storage
            // Use billing_start_date to billing_end_date if available; otherwise default to 6 months
            const estimatedMonths = this.estimateSeasonMonths(cycle);
            const monthlyEarned = Math.round((Number(cycle.totalAmount) / estimatedMonths) * 100) / 100;

            if (monthlyEarned <= 0) continue;

            totalAmortized += monthlyEarned;

            // DR Unearned Revenue (reduce liability)
            details.push({
                accountCode: unearnedRevenueAccount,
                debitAmount: monthlyEarned,
                creditAmount: 0,
                description: `Monthly amortization: ${cycle.customer?.name ?? cycle.customerId} — Lot ${cycle.lot?.lotNumber ?? cycle.lotId}`,
                lineNumber: lineNumber++,
                metadata: { billingCycleId: cycle.id, customerId: cycle.customerId },
            });

            // CR Service Revenue (recognise earned revenue)
            details.push({
                accountCode: serviceRevenueAccount,
                debitAmount: 0,
                creditAmount: monthlyEarned,
                description: `Revenue earned: ${cycle.customer?.name ?? cycle.customerId} — Lot ${cycle.lot?.lotNumber ?? cycle.lotId}`,
                lineNumber: lineNumber++,
                metadata: { billingCycleId: cycle.id, customerId: cycle.customerId },
            });
        }

        if (details.length === 0) {
            return { cyclesProcessed: 0, totalAmortized: 0 };
        }

        const voucherDto: CreateVoucherDto = {
            voucherType: VoucherType.JOURNAL,
            voucherDate: periodDate,
            description: `IFRS 15 Deferred Revenue Amortization — ${new Date(periodDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            referenceType: 'DEFERRED_REVENUE_AMORTIZATION',
            details,
        };

        const voucher = await this.vouchersService.create(voucherDto, userId);
        await this.vouchersService.postVoucher(voucher.id, userId);

        return {
            cyclesProcessed: activePerbagCycles.length,
            totalAmortized,
            voucherId: voucher.id,
        };
    }

    /**
     * Estimate number of months in a billing season.
     * Uses actual billing start/end if available, otherwise defaults to 6 months.
     */
    private estimateSeasonMonths(cycle: RentalBillingCycle): number {
        if (cycle.billingStartDate && cycle.billingEndDate) {
            const start = new Date(cycle.billingStartDate);
            const end = new Date(cycle.billingEndDate);
            const months =
                (end.getFullYear() - start.getFullYear()) * 12 +
                (end.getMonth() - start.getMonth());
            return Math.max(1, months);
        }
        // Default cold storage season = 6 months
        return 6;
    }

    /**
     * Resolve a GL account code from named configuration.
     */
    private async getGlConfig(configKey: string): Promise<string | null> {
        const config = await this.glConfigRepo.findOne({
            where: { configKey },
            relations: ['account'],
        });
        return config?.account?.code ?? null;
    }
}
