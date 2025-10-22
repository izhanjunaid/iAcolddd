import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherMaster, VoucherDetail } from './entities';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoucherMaster, VoucherDetail]),
    AccountsModule, // For account validation
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService, TypeOrmModule],
})
export class VouchersModule {}

