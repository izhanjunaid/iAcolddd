import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ColdStoreLot } from './entities/cold-store-lot.entity';
import { InwardGatePass } from './entities/inward-gate-pass.entity';
import { OutwardGatePass } from './entities/outward-gate-pass.entity';
import { RentalBillingCycle } from './entities/rental-billing-cycle.entity';
import { KandariRecord } from './entities/kandari-record.entity';
import { BardanaRecord } from './entities/bardana-record.entity';
import { Room } from '../inventory/entities/room.entity';
import { GlAccountConfiguration } from '../common/entities/gl-account-configuration.entity';

// Invoice entities (needed for OutwardGatePassService to create invoices)
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceLineItem } from '../invoices/entities/invoice-line-item.entity';

// Services
import { ColdStoreLotService } from './services/cold-store-lot.service';
import { InwardGatePassService } from './services/inward-gate-pass.service';
import { OutwardGatePassService } from './services/outward-gate-pass.service';
import { RentalBillingService } from './services/rental-billing.service';
import { ColdStoreReportsService } from './services/cold-store-reports.service';
import { DeferredRevenueService } from './services/deferred-revenue.service';

// Controller
import { ColdStoreController } from './cold-store.controller';

// Shared modules
import { SequencesModule } from '../sequences/sequences.module';
import { TaxModule } from '../tax/tax.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ColdStoreLot,
      InwardGatePass,
      OutwardGatePass,
      RentalBillingCycle,
      KandariRecord,
      BardanaRecord,
      Invoice,
      InvoiceLineItem,
      Room,
      GlAccountConfiguration,
    ]),
    SequencesModule,
    TaxModule,
    VouchersModule,
  ],
  controllers: [ColdStoreController],
  providers: [
    ColdStoreLotService,
    InwardGatePassService,
    OutwardGatePassService,
    RentalBillingService,
    ColdStoreReportsService,
    DeferredRevenueService,
  ],
  exports: [
    ColdStoreLotService,
    InwardGatePassService,
    OutwardGatePassService,
    RentalBillingService,
    ColdStoreReportsService,
    DeferredRevenueService,
  ],
})
export class ColdStoreModule { }
