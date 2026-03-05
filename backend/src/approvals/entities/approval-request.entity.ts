import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalEntityType {
  VOUCHER = 'VOUCHER',
  INVOICE = 'INVOICE',
}

export enum ApprovalAction {
  UNPOST = 'UNPOST',
  REOPEN = 'REOPEN',
  MARK_AS_SENT = 'MARK_AS_SENT',
  ADD_CHARGE = 'ADD_CHARGE',
}

@Entity('approval_requests')
export class ApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ApprovalEntityType })
  entityType: ApprovalEntityType;

  @Column({ type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'enum', enum: ApprovalAction })
  action: ApprovalAction;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  @Index()
  status: ApprovalStatus;

  @Column({ type: 'uuid', name: 'requested_by' })
  requestedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requestedBy: User;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
