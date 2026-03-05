import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { User } from '../../users/entities/user.entity';
import { ApBillLine } from './ap-bill-line.entity';
import { ApBillStatus } from '../enums/ap-bill-status.enum';

@Entity('ap_bills')
export class ApBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bill_number', unique: true })
  billNumber: string;

  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'vendor_invoice_number', nullable: true })
  vendorInvoiceNumber: string;

  @Column({ type: 'date', name: 'bill_date' })
  billDate: string; // YYYY-MM-DD

  @Column({ type: 'date', name: 'due_date' })
  dueDate: string; // YYYY-MM-DD

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'total_amount',
  })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'amount_paid',
  })
  amountPaid: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'balance_due',
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

  @Column({ type: 'uuid', name: 'gl_voucher_id', nullable: true })
  glVoucherId: string;

  @ManyToOne(() => VoucherMaster)
  @JoinColumn({ name: 'gl_voucher_id' })
  glVoucher: VoucherMaster;

  @Column({ type: 'uuid', name: 'fiscal_period_id', nullable: true })
  fiscalPeriodId: string;

  @ManyToOne(() => FiscalPeriod)
  @JoinColumn({ name: 'fiscal_period_id' })
  fiscalPeriod: FiscalPeriod;

  @OneToMany(() => ApBillLine, (line) => line.bill, { cascade: true })
  lines: ApBillLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
