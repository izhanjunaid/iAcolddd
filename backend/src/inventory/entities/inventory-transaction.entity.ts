import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { InventoryItem } from './inventory-item.entity';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { InventoryReferenceType } from '../../common/enums/inventory-reference-type.enum';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum';

@Entity('inventory_transactions')
@Index(['transactionNumber'], { unique: true })
@Index(['itemId'])
@Index(['customerId'])
@Index(['warehouseId'])
@Index(['transactionDate'])
@Index(['transactionType'])
@Index(['referenceType', 'referenceNumber'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'transaction_number' })
  transactionNumber: string;

  // Transaction details
  @Column({
    type: 'enum',
    enum: InventoryTransactionType,
    name: 'transaction_type',
  })
  transactionType: InventoryTransactionType;

  @Column({ type: 'date', name: 'transaction_date' })
  transactionDate: Date;

  @Column({
    type: 'enum',
    enum: InventoryReferenceType,
    nullable: true,
    name: 'reference_type',
  })
  referenceType: InventoryReferenceType;

  @Column({ type: 'uuid', nullable: true, name: 'reference_id' })
  referenceId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'reference_number' })
  referenceNumber: string;

  // Item and location
  @Column({ type: 'uuid', name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.transactions)
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({ type: 'uuid', nullable: true, name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', name: 'warehouse_id' })
  warehouseId: string;

  // Note: Warehouse entity will be created later when we implement warehouse management
  // For now, we'll store the warehouse_id as a string

  @Column({ type: 'uuid', nullable: true, name: 'room_id' })
  roomId: string;

  // From/To locations (for transfers)
  @Column({ type: 'uuid', nullable: true, name: 'from_warehouse_id' })
  fromWarehouseId: string;

  @Column({ type: 'uuid', nullable: true, name: 'from_room_id' })
  fromRoomId: string;

  @Column({ type: 'uuid', nullable: true, name: 'to_warehouse_id' })
  toWarehouseId: string;

  @Column({ type: 'uuid', nullable: true, name: 'to_room_id' })
  toRoomId: string;

  // Quantity and costing
  @Column({ type: 'decimal', precision: 18, scale: 3 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: UnitOfMeasure,
    name: 'unit_of_measure',
  })
  unitOfMeasure: UnitOfMeasure;

  @Column({ type: 'decimal', precision: 18, scale: 4, name: 'unit_cost' })
  unitCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'total_cost' })
  totalCost: number;

  // Lot/batch tracking
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'lot_number' })
  lotNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'batch_number' })
  batchNumber: string;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date;

  @Column({ type: 'date', nullable: true, name: 'manufacture_date' })
  manufactureDate: Date;

  // GL integration
  @Column({ type: 'boolean', default: false, name: 'is_posted_to_gl' })
  isPostedToGl: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'gl_voucher_id' })
  glVoucherId: string;

  @ManyToOne(() => VoucherMaster)
  @JoinColumn({ name: 'gl_voucher_id' })
  glVoucher: VoucherMaster;

  // Audit fields
  @Column({ type: 'uuid', nullable: true, name: 'fiscal_period_id' })
  fiscalPeriodId: string;

  @ManyToOne(() => FiscalPeriod)
  @JoinColumn({ name: 'fiscal_period_id' })
  fiscalPeriod: FiscalPeriod;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ type: 'text', nullable: true })
  notes: string;
}

