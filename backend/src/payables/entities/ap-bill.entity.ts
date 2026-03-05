import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { ApBillStatus } from '../enums/ap-bill-status.enum';
import { Customer } from '../../customers/entities/customer.entity'; // Using Customer as Vendor
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';
import { CostCenter } from '../../cost-centers/entities/cost-center.entity';

@Entity('ap_bills')
@Check(`"status" = 'DRAFT' OR "gl_voucher_id" IS NOT NULL`)
export class ApBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bill_number', length: 50, unique: true })
  billNumber: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  // Optional relation to Customer (as Vendor)
  // @ManyToOne(() => Customer)
  // @JoinColumn({ name: 'vendor_id' })
  // vendor: Customer;

  @Column({ name: 'vendor_invoice_number', length: 50, nullable: true })
  vendorInvoiceNumber: string;

  @Column({ name: 'bill_date', type: 'date' })
  billDate: Date;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  amountPaid: number;

  @Column({
    name: 'balance_due',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  balanceDue: number;

  @Column({
    type: 'enum',
    enum: ApBillStatus,
    default: ApBillStatus.DRAFT,
  })
  status: ApBillStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'gl_voucher_id', type: 'uuid', nullable: true })
  glVoucherId: string;

  @ManyToOne(() => VoucherMaster, { nullable: true })
  @JoinColumn({ name: 'gl_voucher_id' })
  glVoucher: VoucherMaster;

  @Column({ name: 'fiscal_period_id', type: 'uuid', nullable: true })
  fiscalPeriodId: string;

  @ManyToOne(() => FiscalPeriod, { nullable: true })
  @JoinColumn({ name: 'fiscal_period_id' })
  fiscalPeriod: FiscalPeriod;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ApBillLine, (line) => line.bill, { cascade: true })
  lines: ApBillLine[];
}

@Entity('ap_bill_lines')
export class ApBillLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bill_id', type: 'uuid' })
  billId: string;

  @ManyToOne(() => ApBill, (bill) => bill.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill: ApBill;

  @Column({ name: 'expense_account_id', type: 'uuid' })
  expenseAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'expense_account_id' })
  expenseAccount: Account;

  @Column({ length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    nullable: true,
  })
  taxAmount: number;

  @Column({ name: 'cost_center_id', type: 'uuid', nullable: true })
  costCenterId: string;

  @ManyToOne(() => CostCenter, { nullable: true })
  @JoinColumn({ name: 'cost_center_id' })
  costCenter: CostCenter;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
