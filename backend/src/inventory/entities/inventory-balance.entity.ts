import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InventoryItem } from './inventory-item.entity';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';

@Entity('inventory_balances')
@Unique(['itemId', 'customerId', 'warehouseId', 'roomId', 'lotNumber'])
@Index(['itemId'])
@Index(['customerId'])
@Index(['warehouseId'])
@Index(['quantityOnHand'])
export class InventoryBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Item and location identifiers
  @Column({ type: 'uuid', name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.balances)
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

  // Quantities
  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 3, 
    default: 0, 
    name: 'quantity_on_hand' 
  })
  quantityOnHand: number;

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 3, 
    default: 0, 
    name: 'quantity_reserved' 
  })
  quantityReserved: number;

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 3, 
    default: 0, 
    name: 'quantity_available' 
  })
  quantityAvailable: number;

  // Costing
  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 4, 
    default: 0, 
    name: 'weighted_average_cost' 
  })
  weightedAverageCost: number;

  @Column({ 
    type: 'decimal', 
    precision: 18, 
    scale: 2, 
    default: 0, 
    name: 'total_value' 
  })
  totalValue: number;

  // Last movement tracking
  @Column({ type: 'date', nullable: true, name: 'last_movement_date' })
  lastMovementDate: Date;

  @Column({
    type: 'enum',
    enum: InventoryTransactionType,
    nullable: true,
    name: 'last_movement_type',
  })
  lastMovementType: InventoryTransactionType;

  // Audit
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

