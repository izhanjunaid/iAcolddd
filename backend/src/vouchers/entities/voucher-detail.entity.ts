import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VoucherMaster } from './voucher-master.entity';

@Entity('voucher_detail')
export class VoucherDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VoucherMaster, (voucher) => voucher.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherMaster;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ name: 'account_code', length: 20 })
  accountCode: string;

  @Column({ name: 'cost_center_id', type: 'uuid', nullable: true })
  costCenterId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'debit_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  debitAmount: number;

  @Column({ name: 'credit_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  creditAmount: number;

  @Column({ name: 'line_number', type: 'integer' })
  lineNumber: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

