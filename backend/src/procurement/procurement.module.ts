import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptNoteItem } from './entities/goods-receipt-note-item.entity';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { GoodsReceiptNotesController } from './controllers/goods-receipt-notes.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { GoodsReceiptNotesService } from './services/goods-receipt-notes.service';
import { SequencesModule } from '../sequences/sequences.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Vendor } from '../vendors/entities/vendor.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceiptNote,
      GoodsReceiptNoteItem,
      Vendor,
      InventoryItem,
    ]),
    SequencesModule,
    InventoryModule,
  ],
  controllers: [PurchaseOrdersController, GoodsReceiptNotesController],
  providers: [PurchaseOrdersService, GoodsReceiptNotesService],
  exports: [PurchaseOrdersService, GoodsReceiptNotesService],
})
export class ProcurementModule {}
