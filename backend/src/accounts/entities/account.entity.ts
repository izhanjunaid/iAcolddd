import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AccountType } from '../../common/enums/account-type.enum';
import { AccountNature } from '../../common/enums/account-nature.enum';
import { AccountCategory } from '../../common/enums/account-category.enum';
import { AccountSubCategory } from '../../common/enums/account-sub-category.enum';
import { FinancialStatement } from '../../common/enums/financial-statement.enum';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'uuid', nullable: true, name: 'parent_account_id' })
  parentAccountId: string | null;

  @ManyToOne(() => Account, (account) => account.children, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_account_id' })
  parent: Account | null;

  @OneToMany(() => Account, (account) => account.parent)
  children: Account[];

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.DETAIL,
    name: 'account_type',
  })
  accountType: AccountType;

  @Column({ type: 'enum', enum: AccountNature })
  nature: AccountNature;

  @Column({ type: 'enum', enum: AccountCategory })
  category: AccountCategory;

  @Column({
    type: 'enum',
    enum: AccountSubCategory,
    nullable: true,
    name: 'sub_category',
  })
  subCategory: AccountSubCategory | null;

  @Column({
    type: 'enum',
    enum: FinancialStatement,
    nullable: true,
    name: 'financial_statement',
  })
  financialStatement: FinancialStatement | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'statement_section' })
  statementSection: string | null;

  @Column({ type: 'integer', default: 0, name: 'display_order' })
  displayOrder: number;

  // Link to customer/supplier entity (for CUSTOMER/SUPPLIER category accounts)
  @Column({ type: 'uuid', nullable: true, name: 'customer_id' })
  customerId: string | null;

  // Note: ManyToOne relation to Customer will be added when Customer entity is created
  // to avoid circular dependency issues during module creation

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  // Behavior flags
  @Column({ type: 'boolean', default: false, name: 'is_cash_account' })
  isCashAccount: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_bank_account' })
  isBankAccount: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_depreciable' })
  isDepreciable: boolean;

  @Column({ type: 'boolean', default: false, name: 'require_cost_center' })
  requireCostCenter: boolean;

  @Column({ type: 'boolean', default: false, name: 'require_project' })
  requireProject: boolean;

  @Column({ type: 'boolean', default: true, name: 'allow_direct_posting' })
  allowDirectPosting: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'opening_balance' })
  openingBalance: number;

  @Column({ type: 'date', nullable: true, name: 'opening_date' })
  openingDate: Date | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true, name: 'credit_limit' })
  creditLimit: number | null;

  @Column({ type: 'integer', nullable: true, name: 'credit_days' })
  creditDays: number | null;

  // Contact details (for customer/supplier accounts)
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'address_line1' })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'address_line2' })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'postal_code' })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'contact_name' })
  contactName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mobile: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ntn: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gst: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  // Virtual property for hierarchy level
  level?: number;

  // Virtual property for full path
  path?: string;

  // Virtual property for current balance
  currentBalance?: number;
}

