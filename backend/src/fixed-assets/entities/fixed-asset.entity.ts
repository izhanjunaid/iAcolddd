import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',
  DISPOSED = 'DISPOSED',
  INACTIVE = 'INACTIVE',
}

@Entity('fixed_assets')
export class FixedAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_code', length: 30, unique: true })
  assetCode: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: Date;

  @Column({ name: 'purchase_cost', type: 'decimal', precision: 18, scale: 2 })
  purchaseCost: number;

  @Column({
    name: 'salvage_value',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  salvageValue: number;

  @Column({ name: 'useful_life_months', type: 'integer' })
  usefulLifeMonths: number;

  @Column({
    name: 'depreciation_method',
    type: 'enum',
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
  })
  depreciationMethod: DepreciationMethod;

  @Column({
    name: 'declining_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  decliningRate: number | null; // e.g., 20.00 for 20% declining balance

  @Column({
    name: 'accumulated_depreciation',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  accumulatedDepreciation: number;

  @Column({
    name: 'net_book_value',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  netBookValue: number;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  status: AssetStatus;

  // GL Account Codes for posting
  @Column({ name: 'asset_account_code', length: 20 })
  assetAccountCode: string; // e.g., '1-0001-0002-0001' (PP&E)

  @Column({ name: 'depreciation_expense_code', length: 20 })
  depreciationExpenseCode: string; // e.g., '5-0001-0001-0004' (Depreciation Expense)

  @Column({ name: 'accumulated_depreciation_code', length: 20 })
  accumulatedDepreciationCode: string; // e.g., '1-0001-0002-0002' (Accumulated Depreciation)

  @Column({ name: 'last_depreciation_date', type: 'date', nullable: true })
  lastDepreciationDate: Date | null;

  @Column({ name: 'disposal_date', type: 'date', nullable: true })
  disposalDate: Date | null;

  @Column({
    name: 'disposal_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  disposalAmount: number | null;

  @Column({ name: 'cost_center_id', type: 'uuid', nullable: true })
  costCenterId: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
