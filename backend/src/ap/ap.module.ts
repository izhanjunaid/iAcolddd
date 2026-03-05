import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApBill } from './entities/ap-bill.entity';
import { ApBillLine } from './entities/ap-bill-line.entity';
import { ApPayment } from './entities/ap-payment.entity';
import { ApPaymentApplication } from './entities/ap-payment-application.entity';
import { ApBillsService } from './services/ap-bills.service';
import { ApPaymentsService } from './services/ap-payments.service';
import { ApBillsController } from './controllers/ap-bills.controller';
import { ApPaymentsController } from './controllers/ap-payments.controller';
import { SequencesModule } from '../sequences/sequences.module';
import { VendorsModule } from '../vendors/vendors.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApBill,
      ApBillLine,
      ApPayment,
      ApPaymentApplication,
    ]),
    SequencesModule,
    VendorsModule,
    VouchersModule,
  ],
  controllers: [ApBillsController, ApPaymentsController],
  providers: [ApBillsService, ApPaymentsService],
  exports: [ApBillsService, ApPaymentsService],
})
export class ApModule {}
