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

export enum BardanaRecordType {
  RECEIVED = 'RECEIVED', // Bags came in with the goods
  RETURNED = 'RETURNED', // Empty bags returned to customer
  DEDUCTED = 'DEDUCTED', // Bags deducted from billing (damaged/missing)
}

export enum BagType {
  GUNNY = 'GUNNY',
  PP = 'PP',
  JUTE = 'JUTE',
  OTHER = 'OTHER',
}

/**
 * BardanaRecord — empty bag (bori) tracking.
 * Tracks bag movements in/out for each lot.
 */
@Entity('bardana_records')
@Index(['lotId'])
export class BardanaRecord {
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
    default: BardanaRecordType.RECEIVED,
  })
  recordType: BardanaRecordType;

  @Column({ type: 'date', name: 'record_date' })
  recordDate: Date;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'bag_type',
    default: BagType.GUNNY,
  })
  bagType: BagType;

  @Column({ type: 'integer', name: 'bags_count', default: 0 })
  bagsCount: number;

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
