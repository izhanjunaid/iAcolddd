import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './controllers/billing.controller';
import { StorageBillingService } from './services/storage-billing.service';
import { BillingRateConfiguration } from '../common/entities/billing-rate-configuration.entity';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingRateConfiguration]),
    TaxModule,
  ],
  controllers: [BillingController],
  providers: [StorageBillingService],
  exports: [StorageBillingService],
})
export class BillingModule {}
