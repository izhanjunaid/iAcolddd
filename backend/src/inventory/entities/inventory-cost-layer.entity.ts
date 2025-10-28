import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InventoryItem } from './inventory-item.entity';
import { InventoryTransaction } from './inventory-transaction.entity';

@Entity('inventory_cost_layers')
@Index(['itemId'])
@Index(['customerId'])
@Index(['warehouseId'])
@Index(['receiptDate'])
@Index(['remainingQuantity'])
@Index(['itemId', 'customerId', 'warehouseId', 'receiptDate']) // FIFO ordering index
@Index(['remainingQuantity'], { where: 'remaining_quantity > 0' }) // Active layers only
export class InventoryCostLayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Item and location identifiers
  @Column({ type: 'uuid', name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
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

  // Note: Room entity will be created later when we implement room management
  // For now, we'll store the room_id as a string

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'lot_number' })
  lotNumber: string;

  // Receipt details
  @Column({ type: 'date', name: 'receipt_date' })
  receiptDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'receipt_reference' })
  receiptReference: string;

  @Column({ type: 'uuid', nullable: true, name: 'receipt_transaction_id' })
  receiptTransactionId: string;

  @ManyToOne(() => InventoryTransaction)
  @JoinColumn({ name: 'receipt_transaction_id' })
  receiptTransaction: InventoryTransaction;

  // Layer quantities and costing
  @Column({ type: 'decimal', precision: 18, scale: 3, name: 'original_quantity' })
  originalQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, name: 'remaining_quantity' })
  remainingQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, name: 'unit_cost' })
  unitCost: number;

  // Status
  @Column({ type: 'boolean', default: false, name: 'is_fully_consumed' })
  isFullyConsumed: boolean;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

