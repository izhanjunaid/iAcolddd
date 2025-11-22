import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';

@Entity('monthly_balances')
@Index(['accountId', 'year', 'month'], { unique: true })
export class MonthlyBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'fiscal_period_id', type: 'uuid', nullable: true })
  fiscalPeriodId: string | null;

  @ManyToOne(() => FiscalPeriod, { nullable: true })
  @JoinColumn({ name: 'fiscal_period_id' })
  fiscalPeriod: FiscalPeriod | null;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer' })
  month: number; // 1-12

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'opening_balance' })
  openingBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'total_debits' })
  totalDebits: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'total_credits' })
  totalCredits: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'closing_balance' })
  closingBalance: number;

  @Column({ type: 'boolean', default: false, name: 'is_final' })
  isFinal: boolean; // True if the period is closed and this balance cannot change

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
