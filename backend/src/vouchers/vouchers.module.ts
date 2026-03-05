import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherMaster, VoucherDetail } from './entities';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { FiscalPeriodsModule } from '../fiscal-periods/fiscal-periods.module';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoucherMaster, VoucherDetail]),
    AccountsModule, // For account validation
    FiscalPeriodsModule, // For fiscal period validation
    SequencesModule,
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService, TypeOrmModule],
})
export class VouchersModule {}
