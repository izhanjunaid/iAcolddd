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
import { User } from '../../users/entities/user.entity';
import { ColdStoreLot } from './cold-store-lot.entity';
import { GatePassStatus } from './inward-gate-pass.entity';
export { GatePassStatus } from './inward-gate-pass.entity';

/**
 * OutwardGatePass — the delivery order / release document.
 * On APPROVED (in a single DB transaction):
 *   1. Calculates rental charges up to today
 *   2. Closes the RentalBillingCycle
 *   3. Generates an AR Invoice
 *   4. Updates lot bags_out and status
 */
@Entity('gate_passes_outward')
@Index(['lotId'])
@Index(['customerId'])
@Index(['status'])
export class OutwardGatePass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Auto-generated: GPO-2026-0001 */
  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    name: 'gate_pass_number',
  })
  gatePassNumber: string;

  @Column({ type: 'uuid', name: 'lot_id' })
  lotId: string;

  @ManyToOne(() => ColdStoreLot)
  @JoinColumn({ name: 'lot_id' })
  lot: ColdStoreLot;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'vehicle_number',
  })
  vehicleNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'driver_name' })
  driverName: string;

  @Column({ type: 'integer', name: 'bags_released', default: 0 })
  bagsReleased: number;

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

  @Column({ type: 'date', name: 'outward_date' })
  outwardDate: Date;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.DRAFT,
  })
  status: GatePassStatus;

  /** Populated after approval — links to the generated invoice */
  @Column({ type: 'uuid', nullable: true, name: 'invoice_id' })
  invoiceId: string;

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
