import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaxType } from '../../common/enums/tax-type.enum';
import { TaxApplicability } from '../../common/enums/tax-applicability.enum';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaxType,
    name: 'tax_type',
  })
  taxType: TaxType;

  @Column({
    type: 'enum',
    enum: TaxApplicability,
    default: TaxApplicability.ALL,
  })
  applicability: TaxApplicability;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'date', name: 'effective_from' })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true, name: 'effective_to' })
  effectiveTo: Date;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  // FBR Account for tax liability
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'liability_account_code' })
  liabilityAccountCode: string;

  // Metadata for additional configuration
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  // Audit fields
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;
}
