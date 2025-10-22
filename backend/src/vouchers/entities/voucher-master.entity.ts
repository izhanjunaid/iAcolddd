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
import { User } from '../../users/entities/user.entity';
import { VoucherDetail } from './voucher-detail.entity';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { PaymentMode } from '../../common/enums/payment-mode.enum';

@Entity('voucher_master')
export class VoucherMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'voucher_number', unique: true, length: 50 })
  voucherNumber: string;

  @Column({
    name: 'voucher_type',
    type: 'enum',
    enum: VoucherType,
  })
  voucherType: VoucherType;

  @Column({ name: 'voucher_date', type: 'date' })
  voucherDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Payment/Receipt specific fields
  @Column({
    name: 'payment_mode',
    type: 'enum',
    enum: PaymentMode,
    nullable: true,
  })
  paymentMode: PaymentMode;

  @Column({ name: 'cheque_number', length: 50, nullable: true })
  chequeNumber: string;

  @Column({ name: 'cheque_date', type: 'date', nullable: true })
  chequeDate: Date;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  // Reference to source document (for future GRN/GDN/Invoice integration)
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_number', length: 50, nullable: true })
  referenceNumber: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'is_posted', type: 'boolean', default: false })
  isPosted: boolean;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'posted_by' })
  postedBy: User;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedById: string;

  // Audit fields
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedById: string;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;

  // Relations
  @OneToMany(() => VoucherDetail, (detail) => detail.voucher, {
    cascade: true,
    eager: true,
  })
  details: VoucherDetail[];
}

