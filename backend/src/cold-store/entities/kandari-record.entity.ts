import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ColdStoreLot } from './cold-store-lot.entity';

export enum KandariRecordType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
  PERIODIC = 'PERIODIC',
}

/**
 * KandariRecord — weighbridge / weighing record.
 * Tracks gross, tare, and net weights at inward, outward, or periodic checks.
 */
@Entity('kandari_records')
@Index(['lotId'])
export class KandariRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'lot_id' })
  lotId: string;

  @ManyToOne(() => ColdStoreLot)
  @JoinColumn({ name: 'lot_id' })
  lot: ColdStoreLot;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'record_type',
    default: KandariRecordType.INWARD,
  })
  recordType: KandariRecordType;

  @Column({ type: 'date', name: 'weigh_date' })
  weighDate: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'gross_weight_kg',
    default: 0,
  })
  grossWeightKg: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'tare_weight_kg',
    default: 0,
  })
  tareWeightKg: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    name: 'net_weight_kg',
    default: 0,
  })
  netWeightKg: number;

  @Column({ type: 'integer', nullable: true, name: 'bags_weighed' })
  bagsWeighed: number;

  /** Weighbridge machine ID or slip number */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'weighbridge_id',
  })
  weighbridgeId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
