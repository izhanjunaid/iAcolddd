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
import { Customer } from '../../customers/entities/customer.entity';
import { Room } from '../../inventory/entities/room.entity';
import { User } from '../../users/entities/user.entity';

export enum ColdStoreLotStatus {
  IN_STORAGE = 'IN_STORAGE',
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum BillingUnitType {
  PER_BAG = 'PER_BAG',
  PER_KG = 'PER_KG',
}

@Entity('cold_store_lots')
@Index(['customerId'])
@Index(['status'])
@Index(['inwardDate'])
export class ColdStoreLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true, name: 'lot_number' })
  lotNumber: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'varchar', length: 100 })
  commodity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  variety: string;

  @Column({ type: 'uuid', nullable: true, name: 'chamber_id' })
  chamberId: string;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'chamber_id' })
  chamber: Room;

  @Column({ type: 'integer', name: 'bags_in', default: 0 })
  bagsIn: number;

  @Column({ type: 'integer', name: 'bags_out', default: 0 })
  bagsOut: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'gross_weight_kg',
    default: 0,
  })
  grossWeightKg: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'tare_weight_kg',
    default: 0,
  })
  tareWeightKg: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'net_weight_kg',
    default: 0,
  })
  netWeightKg: number;

  @Column({ type: 'date', name: 'inward_date' })
  inwardDate: Date;

  @Column({ type: 'date', nullable: true, name: 'outward_date' })
  outwardDate: Date;

  @Column({ type: 'date', name: 'billing_start_date' })
  billingStartDate: Date;

  @Column({
    type: 'enum',
    enum: ColdStoreLotStatus,
    default: ColdStoreLotStatus.IN_STORAGE,
  })
  status: ColdStoreLotStatus;

  @Column({
    type: 'enum',
    enum: BillingUnitType,
    name: 'billing_unit',
    default: BillingUnitType.PER_BAG,
  })
  billingUnit: BillingUnitType;

  /** Rate per bag for the entire season (PKR/bag) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'rate_per_bag_per_season',
  })
  ratePerBagPerSeason: number;

  /** Rate per kg per day (PKR/kg/day) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    name: 'rate_per_kg_per_day',
  })
  ratePerKgPerDay: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ─── Computed helpers ───────────────────────────────────────────────────────
  get bagsBalance(): number {
    return this.bagsIn - this.bagsOut;
  }
}
