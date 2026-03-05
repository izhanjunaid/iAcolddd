import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FixedAssetsService } from './fixed-assets.service';

@Injectable()
export class FixedAssetsScheduler {
    private readonly logger = new Logger(FixedAssetsScheduler.name);

    constructor(
        private readonly fixedAssetsService: FixedAssetsService,
    ) { }

    /**
     * Run monthly depreciation automatically on the 1st of every month at midnight.
     * This will calculate and post depreciation for the previous month.
     */
    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async handleMonthlyDepreciation() {
        this.logger.log('Starting automated monthly fixed asset depreciation run...');

        try {
            // Determine the last day of the previous month
            const today = new Date();
            const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

            // Format to YYYY-MM-DD
            const periodIsoDate = lastDayOfPrevMonth.toISOString().split('T')[0];

            // Note: System-generated automation might not have a specific 'userId'.
            // Using a designated system constant or null, depending on your system's strictness.
            // For now, we'll use a placeholder UUID or let the service handle it (if null is allowed).
            // Assuming the DB schema allows created_by_id = NULL for system jobs, or we pass a known 'system' UUID.
            const systemUserId = '00000000-0000-0000-0000-000000000000'; // Replace with a real root/system ID if required

            const result = await this.fixedAssetsService.runMonthlyDepreciation(periodIsoDate, systemUserId);

            this.logger.log(`Automated depreciation successful. Processed ${result.assetsProcessed} assets for period ${periodIsoDate}. Total: ${result.totalDepreciation}`);
        } catch (error) {
            // It's possible there are no assets to depreciate, which throws a BadRequestException.
            // That's an expected operational flow, so warning rather than error is okay.
            if (error.status === 400 || (error.message && error.message.includes('No active assets'))) {
                this.logger.log(`Skipped depreciation run: ${error.message}`);
            } else {
                this.logger.error('Error running automated fixed asset depreciation', error.stack);
            }
        }
    }
}
