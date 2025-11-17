import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, InvoiceLineItem } from './entities';
import { InvoicesService, InvoicePdfService } from './services';
import { InvoicesController } from './controllers';
import { BillingModule } from '../billing/billing.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLineItem]),
    BillingModule,
    CustomersModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService, InvoicePdfService],
})
export class InvoicesModule {}
