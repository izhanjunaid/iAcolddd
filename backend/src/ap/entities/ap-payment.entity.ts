import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';
import { ApPaymentMethod } from '../enums/ap-payment-method.enum';

@Entity('ap_payments')
export class ApPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_number', unique: true })
  paymentNumber: string;

  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'date', name: 'payment_date' })
  paymentDate: string;

  @Column({
    type: 'enum',
    enum: ApPaymentMethod,
    name: 'payment_method',
  })
  paymentMethod: ApPaymentMethod;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', name: 'gl_voucher_id', nullable: true })
  glVoucherId: string;

  @ManyToOne(() => VoucherMaster)
  @JoinColumn({ name: 'gl_voucher_id' })
  glVoucher: VoucherMaster;

  @Column({ type: 'uuid', name: 'bank_account_id', nullable: true })
  bankAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: Account;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
