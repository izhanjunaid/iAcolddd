import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum';
import { InventoryTransaction } from './inventory-transaction.entity';
import { InventoryBalance } from './inventory-balance.entity';

@Entity('inventory_items')
@Index(['sku'], { unique: true })
@Index(['category'])
@Index(['isActive'])
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({
    type: 'enum',
    enum: UnitOfMeasure,
    name: 'unit_of_measure',
  })
  unitOfMeasure: UnitOfMeasure;

  // Product specifications
  @Column({ type: 'boolean', default: false, name: 'is_perishable' })
  isPerishable: boolean;

  @Column({ type: 'integer', nullable: true, name: 'shelf_life_days' })
  shelfLifeDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'min_temperature' })
  minTemperature: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'max_temperature' })
  maxTemperature: number;

  // Costing
  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0, name: 'standard_cost' })
  standardCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0, name: 'last_cost' })
  lastCost: number;

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Audit fields
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  // Relations
  @OneToMany(() => InventoryTransaction, (transaction) => transaction.item)
  transactions: InventoryTransaction[];

  @OneToMany(() => InventoryBalance, (balance) => balance.item)
  balances: InventoryBalance[];
}

