import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  InventoryItem,
  InventoryTransaction,
  InventoryBalance,
  InventoryCostLayer,
  Warehouse,
  Room
} from './entities';
import { GlAccountConfiguration } from '../common/entities/gl-account-configuration.entity';

// Services
import { 
  InventoryItemsService,
  InventoryTransactionsService,
  FIFOCostingService,
  InventoryGLService,
  WarehousesService
} from './services';

// Controllers
import { 
  InventoryItemsController,
  InventoryTransactionsController,
  InventoryBalancesController,
  InventoryReportsController,
  WarehousesController
} from './controllers';

// External modules
import { VouchersModule } from '../vouchers/vouchers.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CustomersModule } from '../customers/customers.module';
import { FiscalPeriodsModule } from '../fiscal-periods/fiscal-periods.module';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryTransaction,
      InventoryBalance,
      InventoryCostLayer,
      Warehouse,
      Room,
      GlAccountConfiguration,
    ]),
    
    // External modules for dependencies
    VouchersModule,
    AccountsModule,
    CustomersModule,
    FiscalPeriodsModule,
  ],
  
  providers: [
    InventoryItemsService,
    InventoryTransactionsService,
    FIFOCostingService,
    InventoryGLService,
    WarehousesService,
  ],
  
  controllers: [
    InventoryItemsController,
    InventoryTransactionsController,
    InventoryBalancesController,
    InventoryReportsController,
    WarehousesController,
  ],
  
  exports: [
    InventoryItemsService,
    InventoryTransactionsService,
    FIFOCostingService,
    InventoryGLService,
    WarehousesService,
  ],
})
export class InventoryModule {}

