import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FiscalPeriod } from './fiscal-period.entity';

@Entity('fiscal_years')
export class FiscalYear {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Index()
  year: number; // e.g., 2025 (represents FY 2025-2026: July 1, 2025 - June 30, 2026)

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date; // July 1

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date; // June 30

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

  // Relations
  @OneToMany(() => FiscalPeriod, (period) => period.fiscalYear, {
    cascade: true,
  })
  periods: FiscalPeriod[];
}

