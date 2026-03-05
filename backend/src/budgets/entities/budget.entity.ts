import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('budgets')
@Unique(['accountCode', 'fiscalYearId', 'periodMonth'])
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fiscal_year_id', type: 'uuid' })
  fiscalYearId: string;

  @Column({ name: 'account_code', length: 20 })
  accountCode: string;

  @Column({ name: 'period_month', type: 'integer' })
  periodMonth: number; // 1-12

  @Column({
    name: 'budgeted_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  budgetedAmount: number;

  @Column({
    name: 'revised_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  revisedAmount: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'cost_center_id', type: 'uuid', nullable: true })
  costCenterId: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
