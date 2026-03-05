import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApBill } from './ap-bill.entity';
import { Account } from '../../accounts/entities/account.entity';
import { CostCenter } from '../../cost-centers/entities/cost-center.entity';

@Entity('ap_bill_lines')
export class ApBillLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'bill_id' })
  billId: string;

  @ManyToOne(() => ApBill, (bill) => bill.lines, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_id' })
  bill: ApBill;

  @Column({ type: 'uuid', name: 'expense_account_id' })
  expenseAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'expense_account_id' })
  expenseAccount: Account;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'tax_amount',
  })
  taxAmount: number;

  @Column({ type: 'uuid', name: 'cost_center_id', nullable: true })
  costCenterId: string;

  @ManyToOne(() => CostCenter, { nullable: true })
  @JoinColumn({ name: 'cost_center_id' })
  costCenter: CostCenter;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
