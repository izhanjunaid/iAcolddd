import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralLedgerService } from './general-ledger.service';
import { GeneralLedgerController } from './general-ledger.controller';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';
import { Account } from '../accounts/entities/account.entity';
import { MonthlyBalance } from '../accounts/entities/monthly-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherMaster, VoucherDetail, Account, MonthlyBalance])],
  controllers: [GeneralLedgerController],
  providers: [GeneralLedgerService],
  exports: [GeneralLedgerService],
})
export class GeneralLedgerModule { }

