import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { TaxRate, TaxConfiguration } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([TaxRate, TaxConfiguration])],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService], // Export for use in other modules (e.g., invoicing)
})
export class TaxModule {}
