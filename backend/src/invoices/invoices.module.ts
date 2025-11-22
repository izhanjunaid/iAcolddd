import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, InvoiceLineItem } from './entities';
import { InvoicesService, InvoicePdfService, InvoiceGLService } from './services';
import { InvoicesController } from './controllers';
import { BillingModule } from '../billing/billing.module';
import { CustomersModule } from '../customers/customers.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { GlAccountConfiguration } from '../common/entities/gl-account-configuration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLineItem, GlAccountConfiguration]),
    BillingModule,
    CustomersModule,
    VouchersModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService, InvoiceGLService],
  exports: [InvoicesService, InvoicePdfService, InvoiceGLService],
})
export class InvoicesModule { }
