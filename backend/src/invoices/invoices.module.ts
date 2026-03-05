import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, InvoiceLineItem } from './entities';
import {
  InvoicesService,
  InvoicePdfService,
  InvoiceGLService,
  PaymentGLService,
} from './services';
import { InvoicesController } from './controllers';
import { BillingModule } from '../billing/billing.module';
import { CustomersModule } from '../customers/customers.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { GlAccountConfiguration } from '../common/entities/gl-account-configuration.entity';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      GlAccountConfiguration,
    ]),
    BillingModule,
    CustomersModule,
    VouchersModule,
    SequencesModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicePdfService,
    InvoiceGLService,
    PaymentGLService,
  ],
  exports: [
    InvoicesService,
    InvoicePdfService,
    InvoiceGLService,
    PaymentGLService,
  ],
})
export class InvoicesModule {}
