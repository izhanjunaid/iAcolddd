import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { FiscalPeriodsController } from './fiscal-periods.controller';
import { FiscalYear, FiscalPeriod } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([FiscalYear, FiscalPeriod])],
  controllers: [FiscalPeriodsController],
  providers: [FiscalPeriodsService],
  exports: [
    FiscalPeriodsService,
    TypeOrmModule, // Export TypeORM module to make repositories available
  ],
})
export class FiscalPeriodsModule {}

