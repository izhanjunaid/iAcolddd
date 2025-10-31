import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaxRate } from './tax-rate.entity';
import { TaxEntityType } from '../../common/enums/tax-applicability.enum';

@Entity('tax_configurations')
export class TaxConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TaxEntityType,
    name: 'entity_type',
  })
  entityType: TaxEntityType;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column({ type: 'uuid', name: 'tax_rate_id' })
  taxRateId: string;

  @ManyToOne(() => TaxRate)
  @JoinColumn({ name: 'tax_rate_id' })
  taxRate: TaxRate;

  @Column({ type: 'boolean', default: false, name: 'is_exempt' })
  isExempt: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'exemption_reason' })
  exemptionReason: string;

  // Certificate details for tax exemption
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'exemption_certificate_number' })
  exemptionCertificateNumber: string;

  @Column({ type: 'date', nullable: true, name: 'exemption_valid_from' })
  exemptionValidFrom: Date;

  @Column({ type: 'date', nullable: true, name: 'exemption_valid_to' })
  exemptionValidTo: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
