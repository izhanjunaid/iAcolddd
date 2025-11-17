import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceType {
  STORAGE = 'STORAGE',
  SERVICE = 'SERVICE',
  MIXED = 'MIXED',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ type: 'enum', enum: InvoiceType, default: InvoiceType.STORAGE, name: 'invoice_type' })
  invoiceType: InvoiceType;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  // Customer relationship
  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  // Invoice dates
  @Column({ type: 'date', name: 'issue_date' })
  issueDate: Date;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'date', name: 'paid_date', nullable: true })
  paidDate: Date | null;

  // Storage billing details (if applicable)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight: number | null;

  @Column({ type: 'int', name: 'days_stored', nullable: true })
  daysStored: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'rate_per_kg_per_day', nullable: true })
  ratePerKgPerDay: number | null;

  @Column({ type: 'date', name: 'storage_start_date', nullable: true })
  storageDateIn: Date | null;

  @Column({ type: 'date', name: 'storage_end_date', nullable: true })
  storageDateOut: Date | null;

  // Financial amounts
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'storage_charges', default: 0 })
  storageCharges: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'labour_charges', default: 0 })
  labourCharges: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'loading_unloading_charges', default: 0 })
  loadingCharges: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'gst_amount', default: 0 })
  gstAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'gst_percentage', default: 0 })
  gstRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'wht_amount', default: 0 })
  whtAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'wht_percentage', default: 0 })
  whtRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  // Payment tracking
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'amount_paid', default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_due' })
  balanceDue: number;

  // Additional information
  @Column({ type: 'int', name: 'payment_terms_days', default: 30 })
  paymentTermsDays: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  breakdown: {
    storageCalculation?: string;
    labourCalculation?: string;
    taxCalculation?: string;
  } | null;

  // Line items (for detailed invoices)
  @OneToMany(() => InvoiceLineItem, (lineItem) => lineItem.invoice, { cascade: true })
  lineItems: InvoiceLineItem[];

  // Reference to source document (e.g., GDN number)
  @Column({ type: 'varchar', length: 100, name: 'reference_number', nullable: true })
  referenceNumber: string | null;

  // Audit fields
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 100, name: 'updated_by', nullable: true })
  updatedBy: string | null;
}
