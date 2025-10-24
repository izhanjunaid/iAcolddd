import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  code: string; // CUST-0001, CUST-0002, etc.

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string;

  // Contact Information
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'contact_person' })
  contactPerson: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mobile: string | null;

  // Address
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'address_line1' })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'address_line2' })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Pakistan' })
  country: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'postal_code' })
  postalCode: string | null;

  // Business Terms
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'credit_limit' })
  creditLimit: number;

  @Column({ type: 'integer', default: 0, name: 'credit_days' })
  creditDays: number;

  @Column({ type: 'integer', default: 3, name: 'grace_days' })
  graceDays: number; // Billing grace period for cold storage rental

  // Tax Information
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_id' })
  taxId: string | null; // NTN (National Tax Number)

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'gst_number' })
  gstNumber: string | null; // GST Registration Number

  // Accounting Link (CRITICAL: Links to Chart of Accounts)
  @Column({ type: 'uuid', name: 'receivable_account_id' })
  @Index()
  receivableAccountId: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receivable_account_id' })
  receivableAccount: Account;

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Additional metadata (flexible for future extensions)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Audit Trail
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by' })
  updater: User | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  // Virtual properties for UI display
  displayName?: string; // Computed: code + name
  currentBalance?: number; // From general ledger
}

