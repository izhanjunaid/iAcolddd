import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { FiscalPeriodsController } from './fiscal-periods.controller';
import { YearEndClosingService } from './year-end-closing.service';
import { FiscalYear, FiscalPeriod } from './entities';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FiscalYear, FiscalPeriod]),
    forwardRef(() => VouchersModule),
  ],
  controllers: [FiscalPeriodsController],
  providers: [FiscalPeriodsService, YearEndClosingService],
  exports: [FiscalPeriodsService, YearEndClosingService, TypeOrmModule],
})
export class FiscalPeriodsModule {}
