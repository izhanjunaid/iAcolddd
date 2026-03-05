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
import { Room } from '../../inventory/entities/room.entity';
import { User } from '../../users/entities/user.entity';
import { ColdStoreLot, BillingUnitType } from './cold-store-lot.entity';

export enum GatePassStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
}

/**
 * InwardGatePass — the physical document created when a truck arrives.
 * On APPROVED: auto-creates a ColdStoreLot and a RentalBillingCycle.
 */
@Entity('gate_passes_inward')
@Index(['customerId'])
@Index(['status'])
@Index(['inwardDate'])
export class InwardGatePass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Auto-generated: GPI-2026-0001 */
  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    name: 'gate_pass_number',
  })
  gatePassNumber: string;

  /** Populated after approval — links to the created lot */
  @Column({ type: 'uuid', nullable: true, name: 'lot_id' })
  lotId: string;

  @ManyToOne(() => ColdStoreLot, { nullable: true })
  @JoinColumn({ name: 'lot_id' })
  lot: ColdStoreLot;

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

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'vehicle_number',
  })
  vehicleNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'driver_name' })
  driverName: string;

  @Column({ type: 'integer', name: 'bags_received', default: 0 })
  bagsReceived: number;

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

  @Column({
    type: 'enum',
    enum: BillingUnitType,
    name: 'billing_unit',
    default: BillingUnitType.PER_BAG,
  })
  billingUnit: BillingUnitType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'rate_per_bag_per_season',
  })
  ratePerBagPerSeason: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    name: 'rate_per_kg_per_day',
  })
  ratePerKgPerDay: number;

  @Column({ type: 'date', name: 'inward_date' })
  inwardDate: Date;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.DRAFT,
  })
  status: GatePassStatus;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
