import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './controllers/billing.controller';
import { StorageBillingService } from './services/storage-billing.service';
import { AccrualManagementService } from './services/accrual-management.service';
import { BillingRateConfiguration } from '../common/entities/billing-rate-configuration.entity';
import { TaxModule } from '../tax/tax.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingRateConfiguration]),
    TaxModule,
    forwardRef(() => VouchersModule),
  ],
  controllers: [BillingController],
  providers: [StorageBillingService, AccrualManagementService],
  exports: [StorageBillingService, AccrualManagementService],
})
export class BillingModule {}
