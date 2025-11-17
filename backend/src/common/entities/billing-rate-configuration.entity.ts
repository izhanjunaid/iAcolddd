import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('billing_rate_configuration')
export class BillingRateConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'rate_type' })
  rateType: string; // daily, seasonal, monthly, volume_discount, loading, etc.

  @Column({ type: 'varchar', length: 100, name: 'rate_name' })
  rateName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'rate_value' })
  rateValue: number;

  @Column({ type: 'uuid', nullable: true, name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', nullable: true, name: 'product_category_id' })
  productCategoryId: string;

  @Column({ type: 'date', name: 'effective_from' })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true, name: 'effective_to' })
  effectiveTo: Date;

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
