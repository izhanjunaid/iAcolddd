import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';

@Entity('gl_account_configuration')
export class GlAccountConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'config_key' })
  configKey: string;

  @Column({ type: 'varchar', length: 100, name: 'config_name' })
  configName: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by_id' })
  updatedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;
}
