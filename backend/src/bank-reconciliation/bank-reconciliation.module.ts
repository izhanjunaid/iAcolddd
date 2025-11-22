import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankStatement, BankStatementLine } from './entities';
import { VoucherDetail } from '../vouchers/entities/voucher-detail.entity';
import { Account } from '../accounts/entities/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankStatement,
      BankStatementLine,
      VoucherDetail,
      Account,
    ]),
  ],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
})
export class BankReconciliationModule { }
