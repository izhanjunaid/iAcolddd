import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FiscalYear } from './fiscal-year.entity';

@Entity('fiscal_periods')
@Unique(['fiscalYearId', 'periodNumber'])
export class FiscalPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'fiscal_year_id' })
  @Index()
  fiscalYearId: string;

  @ManyToOne(() => FiscalYear, (year) => year.periods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fiscal_year_id' })
  fiscalYear: FiscalYear;

  @Column({ type: 'integer', name: 'period_number' })
  periodNumber: number; // 1-12 (July=1, August=2, ..., June=12)

  @Column({ type: 'varchar', length: 50, name: 'period_name' })
  periodName: string; // "July 2025", "August 2025", etc.

  @Column({ type: 'date', name: 'start_date' })
  @Index()
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  @Index()
  endDate: Date;

  @Column({ type: 'boolean', default: false, name: 'is_closed' })
  isClosed: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'closed_by_id' })
  closedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

