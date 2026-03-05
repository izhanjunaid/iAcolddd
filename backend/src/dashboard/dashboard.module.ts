import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { PayablesModule } from '../payables/payables.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InvoicesModule, PayablesModule, InventoryModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
