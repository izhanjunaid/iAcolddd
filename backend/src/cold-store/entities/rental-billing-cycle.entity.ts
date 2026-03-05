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
import { ColdStoreLot, BillingUnitType } from './cold-store-lot.entity';

export enum RentalCycleStatus {
  ACTIVE = 'ACTIVE',
  INVOICED = 'INVOICED',
}

/**
 * RentalBillingCycle — tracks the billing period for a lot.
 * Created automatically when an InwardGatePass is approved.
 * Closed automatically when an OutwardGatePass is approved.
 *
 * Billing logic (both modes supported per lot):
 *   PER_BAG:  storage_charges = rate_applied × bags_billed  (one-time seasonal)
 *   PER_KG:   storage_charges = rate_applied × weight_billed_kg × days_stored
 */
@Entity('rental_billing_cycles')
@Index(['lotId'])
@Index(['customerId'])
@Index(['status'])
export class RentalBillingCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'date', name: 'billing_start_date' })
  billingStartDate: Date;

  @Column({ type: 'date', nullable: true, name: 'billing_end_date' })
  billingEndDate: Date;

  @Column({ type: 'integer', nullable: true, name: 'days_stored' })
  daysStored: number;

  /** Bags billed (for PER_BAG mode) */
  @Column({ type: 'integer', nullable: true, name: 'bags_billed' })
  bagsBilled: number;

  /** Tracks total bags/qty that have been invoiced so far across partial gates passes */
  @Column({ type: 'integer', name: 'billed_quantity', default: 0 })
  billedQuantity: number;

  /** Weight billed in kg (for PER_KG mode) */
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    name: 'weight_billed_kg',
  })
  weightBilledKg: number;

  /** The rate that was applied (PKR/bag or PKR/kg/day depending on billing_unit) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'rate_applied',
    default: 0,
  })
  rateApplied: number;

  @Column({
    type: 'enum',
    enum: BillingUnitType,
    name: 'billing_unit',
    default: BillingUnitType.PER_BAG,
  })
  billingUnit: BillingUnitType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'storage_charges',
    default: 0,
  })
  storageCharges: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'handling_charges_in',
    default: 0,
  })
  handlingChargesIn: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'handling_charges_out',
    default: 0,
  })
  handlingChargesOut: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'other_charges',
    default: 0,
  })
  otherCharges: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'subtotal',
    default: 0,
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'gst_amount',
    default: 0,
  })
  gstAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'wht_amount',
    default: 0,
  })
  whtAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'total_amount',
    default: 0,
  })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: RentalCycleStatus,
    default: RentalCycleStatus.ACTIVE,
  })
  status: RentalCycleStatus;

  /** All invoices generated against this cycle (supports partial outwards) */
  @Column({ type: 'jsonb', nullable: true, name: 'invoice_ids', default: '[]' })
  invoiceIds: string[];

  /** All outward gate passes linked to this cycle */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'outward_gate_pass_ids',
    default: '[]',
  })
  outwardGatePassIds: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
