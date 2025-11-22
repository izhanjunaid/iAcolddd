import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { Account } from './entities/account.entity';
import { MonthlyBalance } from './entities/monthly-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, MonthlyBalance])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService, TypeOrmModule],
})
export class AccountsModule { }

