import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ApBill,
  ApBillLine,
  ApPayment,
  ApPaymentApplication,
} from './entities';
import { PayablesService } from './services/payables.service';
import { PayablesController } from './controllers/payables.controller';
import { VouchersModule } from '../vouchers/vouchers.module';
import { UsersModule } from '../users/users.module';
import { AccountsModule } from '../accounts/accounts.module';
import { FiscalPeriodsModule } from '../fiscal-periods/fiscal-periods.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApBill,
      ApBillLine,
      ApPayment,
      ApPaymentApplication,
    ]),
    VouchersModule,
    UsersModule,
    AccountsModule,
    FiscalPeriodsModule,
    CustomersModule,
  ],
  providers: [PayablesService],
  controllers: [PayablesController],
  exports: [PayablesService],
})
export class PayablesModule {}
