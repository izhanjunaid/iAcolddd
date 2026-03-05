import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GrnStatus } from '../enums/grn-status.enum';
import { GoodsReceiptNoteItem } from './goods-receipt-note-item.entity';

@Entity('goods_receipt_notes')
@Index(['grnNumber'], { unique: true })
@Index(['purchaseOrderId'])
@Index(['vendorId'])
@Index(['status'])
export class GoodsReceiptNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'grn_number', type: 'varchar', length: 50, unique: true })
  grnNumber: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate: Date;

  @Column({
    type: 'enum',
    enum: GrnStatus,
    default: GrnStatus.DRAFT,
  })
  status: GrnStatus;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => GoodsReceiptNoteItem, (item) => item.goodsReceiptNote, {
    cascade: true,
  })
  items: GoodsReceiptNoteItem[];

  // Audit fields
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;
}
