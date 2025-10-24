import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncomeStatementService } from './income-statement.service';
import { IncomeStatementController } from './income-statement.controller';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';
import { Account } from '../accounts/entities/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherMaster, VoucherDetail, Account])],
  controllers: [IncomeStatementController],
  providers: [IncomeStatementService],
  exports: [IncomeStatementService],
})
export class IncomeStatementModule {}