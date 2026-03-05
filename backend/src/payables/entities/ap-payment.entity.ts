import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApPaymentMethod } from '../enums/ap-payment-method.enum';
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';
import { ApPaymentApplication } from './ap-payment-application.entity';

@Entity('ap_payments')
export class ApPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_number', length: 50, unique: true })
  paymentNumber: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  // @ManyToOne(() => Customer) ... link later

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ApPaymentMethod,
  })
  paymentMethod: ApPaymentMethod;

  @Column({ name: 'reference_number', length: 50, nullable: true })
  referenceNumber: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'gl_voucher_id', type: 'uuid', nullable: true })
  glVoucherId: string;

  @ManyToOne(() => VoucherMaster, { nullable: true })
  @JoinColumn({ name: 'gl_voucher_id' })
  glVoucher: VoucherMaster;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: Account;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ApPaymentApplication, (app) => app.payment, {
    cascade: true,
  })
  applications: ApPaymentApplication[];
}
