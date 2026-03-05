import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GoodsReceiptNote } from './goods-receipt-note.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';

@Entity('goods_receipt_note_items')
@Index(['goodsReceiptNoteId'])
@Index(['purchaseOrderItemId'])
@Index(['itemId'])
export class GoodsReceiptNoteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goods_receipt_note_id', type: 'uuid' })
  goodsReceiptNoteId: string;

  @ManyToOne(() => GoodsReceiptNote, (grn) => grn.items, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'goods_receipt_note_id' })
  goodsReceiptNote: GoodsReceiptNote;

  @Column({ name: 'purchase_order_item_id', type: 'uuid' })
  purchaseOrderItemId: string;

  @ManyToOne(() => PurchaseOrderItem)
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem: PurchaseOrderItem;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({
    name: 'ordered_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  orderedQuantity: number;

  @Column({
    name: 'received_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  receivedQuantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4 })
  unitPrice: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  // Storage location
  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId: string;

  // Lot/batch tracking
  @Column({ name: 'lot_number', type: 'varchar', length: 50, nullable: true })
  lotNumber: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;
}
