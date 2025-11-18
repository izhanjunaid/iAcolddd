# Voucher System - Key Code Snippets

## 1. Core Validation Logic

### Double-Entry Balance Validation
```typescript
// From: vouchers.service.ts (lines 451-475)
private validateVoucherBalance(details: any[]) {
  const totalDebits = details.reduce(
    (sum, detail) => sum + Number(detail.debitAmount),
    0,
  );

  const totalCredits = details.reduce(
    (sum, detail) => sum + Number(detail.creditAmount),
    0,
  );

  // Use fixed decimal comparison to avoid floating point issues
  const debitsFixed = totalDebits.toFixed(2);
  const creditsFixed = totalCredits.toFixed(2);

  if (debitsFixed !== creditsFixed) {
    throw new BadRequestException(
      `Voucher is not balanced. Total Debits: ${debitsFixed}, Total Credits: ${creditsFixed}, Difference: ${(totalDebits - totalCredits).toFixed(2)}`,
    );
  }
}
```

### Fiscal Period Enforcement
```typescript
// From: vouchers.service.ts (lines 32-46)
const voucherDate = new Date(createVoucherDto.voucherDate);
const period = await this.fiscalPeriodsService.findPeriodByDate(voucherDate);

if (!period) {
  throw new BadRequestException(
    `No fiscal period found for date ${voucherDate.toISOString().split('T')[0]}. Please ensure the date falls within an active fiscal year.`
  );
}

if (period.isClosed) {
  throw new BadRequestException(
    `Cannot post voucher to closed period: ${period.periodName} (${period.startDate} - ${period.endDate}). Please contact your administrator to reopen the period if this is an adjustment.`
  );
}
```

## 2. Transaction Safety with Database Transactions

```typescript
// From: vouchers.service.ts (lines 59-104)
return await this.dataSource.transaction(async (manager) => {
  // Create voucher master
  const voucherMaster = manager.create(VoucherMaster, {
    voucherNumber,
    voucherType: createVoucherDto.voucherType,
    voucherDate: new Date(createVoucherDto.voucherDate),
    fiscalPeriodId: period.id,
    // ... other fields
    createdById: userId,
  });

  const savedVoucher = await manager.save(VoucherMaster, voucherMaster);

  // Create voucher details
  const details = createVoucherDto.details.map((detail) =>
    manager.create(VoucherDetail, {
      voucherId: savedVoucher.id,
      accountCode: detail.accountCode,
      debitAmount: Number(detail.debitAmount),
      creditAmount: Number(detail.creditAmount),
      lineNumber: detail.lineNumber,
    }),
  );

  await manager.save(VoucherDetail, details);

  // Return complete voucher with details
  return await manager.findOne(VoucherMaster, {
    where: { id: savedVoucher.id },
    relations: ['details'],
  });
});
```

## 3. GL Integration - Account Balance Calculation

```typescript
// From: general-ledger.service.ts (lines 63-123)
async getAccountBalance(
  accountCode: string,
  asOfDate?: Date,
): Promise<AccountBalance> {
  // Get account details
  const account = await this.accountRepository.findOne({
    where: { code: accountCode, deletedAt: null as any },
  });

  // Build query to sum debits and credits from posted vouchers
  let query = this.voucherDetailRepository
    .createQueryBuilder('detail')
    .leftJoin('detail.voucher', 'voucher')
    .select('SUM(detail.debit_amount)', 'totalDebits')
    .addSelect('SUM(detail.credit_amount)', 'totalCredits')
    .where('detail.account_code = :accountCode', { accountCode })
    .andWhere('voucher.is_posted = :isPosted', { isPosted: true })  // ONLY POSTED
    .andWhere('voucher.deleted_at IS NULL');

  // Apply date filter if provided
  if (asOfDate) {
    query = query.andWhere('voucher.voucher_date <= :asOfDate', { asOfDate });
  }

  const result = await query.getRawOne();

  const totalDebits = Number(result?.totalDebits || 0);
  const totalCredits = Number(result?.totalCredits || 0);
  const openingBalance = Number(account.openingBalance || 0);

  // Calculate based on account nature
  let currentBalance: number;
  let balanceType: 'DR' | 'CR';

  if (account.nature === AccountNature.DEBIT) {
    currentBalance = openingBalance + totalDebits - totalCredits;
    balanceType = currentBalance >= 0 ? 'DR' : 'CR';
    currentBalance = Math.abs(currentBalance);
  } else {
    currentBalance = openingBalance + totalCredits - totalDebits;
    balanceType = currentBalance >= 0 ? 'CR' : 'DR';
    currentBalance = Math.abs(currentBalance);
  }

  return {
    accountCode: account.code,
    accountName: account.name,
    nature: account.nature,
    openingBalance,
    totalDebits,
    totalCredits,
    currentBalance,
    balanceType,
  };
}
```

## 4. Voucher Number Generation

```typescript
// From: vouchers.service.ts (lines 357-385)
async generateVoucherNumber(voucherType: VoucherType): Promise<string> {
  const prefix = getVoucherPrefix(voucherType);
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  // Find last voucher number for this type and year
  const lastVoucher = await this.voucherMasterRepository
    .createQueryBuilder('voucher')
    .where('voucher.voucherNumber LIKE :pattern', { pattern })
    .orderBy('voucher.voucherNumber', 'DESC')
    .getOne();

  let sequence = 1;

  if (lastVoucher) {
    // Extract sequence from last voucher number
    const lastNumber = lastVoucher.voucherNumber;
    const parts = lastNumber.split('-');
    const lastSequence = parseInt(parts[2], 10);
    sequence = lastSequence + 1;
  }

  // Format: PREFIX-YEAR-SEQUENCE (sequence padded to 4 digits)
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
}
```

## 5. Posting Workflow

```typescript
// From: vouchers.service.ts (lines 310-331)
async postVoucher(id: string, userId: string) {
  const voucher = await this.findOne(id);

  if (voucher.isPosted) {
    throw new BadRequestException('Voucher is already posted');
  }

  // Re-validate before posting
  this.validateVoucherBalance(voucher.details);

  // Update voucher
  await this.voucherMasterRepository.update(
    { id },
    {
      isPosted: true,
      postedAt: new Date(),
      postedById: userId,
    },
  );

  return await this.findOne(id);
}
```

## 6. GL Trial Balance with Rounding Tolerance

```typescript
// From: general-ledger.service.ts (lines 281-294)
const debitsRounded = Math.round(totalDebits * 100) / 100;
const creditsRounded = Math.round(totalCredits * 100) / 100;
const difference = Math.round((totalDebits - totalCredits) * 100) / 100;

return {
  asOfDate: asOfDate || new Date(),
  accounts: entries,
  totalDebits: debitsRounded,
  totalCredits: creditsRounded,
  isBalanced: Math.abs(difference) < 0.01,  // Allow 1 cent difference
  difference,
};
```

## 7. Query Filtering with SQL Injection Prevention

```typescript
// From: vouchers.service.ts (lines 156-171)
const allowedSortFields = [
  'voucherNumber',
  'voucherType',
  'voucherDate',
  'description',
  'totalAmount',
  'isPosted',
  'createdAt',
  'updatedAt',
  'postedAt',
];

const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'voucherDate';
const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';
queryBuilder.orderBy(`voucher.${safeSortBy}`, orderDirection);
```

## 8. Entity Structure - Full Audit Trail

```typescript
// From: voucher-master.entity.ts (lines 84-106)
@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
createdAt: Date;

@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
updatedAt: Date;

@ManyToOne(() => User, { nullable: false })
@JoinColumn({ name: 'created_by' })
createdBy: User;

@Column({ name: 'created_by', type: 'uuid' })
createdById: string;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'updated_by' })
updatedBy: User;

@Column({ name: 'updated_by', type: 'uuid', nullable: true })
updatedById: string;

@Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
deletedAt: Date;
```

## 9. API Endpoint with Permission Guards

```typescript
// From: vouchers.controller.ts (lines 27-32)
@Post()
@RequirePermissions('vouchers.create')
@ApiOperation({ summary: 'Create new voucher' })
@ApiResponse({ status: 201, description: 'Voucher created successfully' })
create(@Body() createVoucherDto: CreateVoucherDto, @Request() req) {
  return this.vouchersService.create(createVoucherDto, req.user.id);
}
```

## 10. Soft Delete Pattern

```typescript
// From: vouchers.service.ts (lines 290-305)
async remove(id: string) {
  const voucher = await this.findOne(id);

  if (voucher.isPosted) {
    throw new BadRequestException(
      'Cannot delete posted voucher. Please unpost first.',
    );
  }

  await this.voucherMasterRepository.update(
    { id },
    { deletedAt: new Date() },
  );

  return { message: 'Voucher deleted successfully' };
}
```

## 11. Line Item DTO with Validation

```typescript
// From: voucher-line-item.dto.ts
export class VoucherLineItemDto {
  @ApiProperty({ description: 'Account code', example: '1-0001-0001-0001' })
  @IsString()
  accountCode: string;

  @ApiProperty({ description: 'Debit amount', example: 1000.00, default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount: number;

  @ApiProperty({ description: 'Credit amount', example: 0, default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount: number;

  @ApiProperty({ description: 'Line number (for ordering)', example: 1 })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Cost center ID' })
  @IsString()
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
```

## 12. Running Balance Calculation in GL Ledger

```typescript
// From: general-ledger.service.ts (lines 192-228)
let runningBalance = openingBalance.currentBalance;
if (openingBalance.balanceType === 'CR' && account.nature === AccountNature.DEBIT) {
  runningBalance = -runningBalance;
}

const entries: AccountLedgerEntry[] = details.map((detail) => {
  const debit = Number(detail.debitAmount);
  const credit = Number(detail.creditAmount);

  // Update running balance
  if (account.nature === AccountNature.DEBIT) {
    runningBalance += debit - credit;
  } else {
    runningBalance += credit - debit;
  }

  // Determine balance type based on account nature
  let balanceType: 'DR' | 'CR';
  if (account.nature === AccountNature.DEBIT) {
    balanceType = runningBalance >= 0 ? 'DR' : 'CR';
  } else {
    balanceType = runningBalance >= 0 ? 'CR' : 'DR';
  }

  return {
    date: detail.voucher.voucherDate,
    voucherNumber: detail.voucher.voucherNumber,
    voucherId: detail.voucher.id,
    voucherType: detail.voucher.voucherType,
    description: detail.description || detail.voucher.description || '',
    debit,
    credit,
    balance: Math.abs(runningBalance),
    balanceType,
  };
});
```

---

## Key File Locations

```
/home/user/iAcolddd/backend/src/
├── vouchers/
│   ├── entities/
│   │   ├── voucher-master.entity.ts      (Main voucher record)
│   │   ├── voucher-detail.entity.ts      (Line items)
│   │   └── index.ts
│   ├── dto/
│   │   ├── create-voucher.dto.ts         (Input validation)
│   │   ├── update-voucher.dto.ts
│   │   ├── voucher-line-item.dto.ts      (Line item input)
│   │   ├── query-vouchers.dto.ts         (Search filters)
│   │   └── index.ts
│   ├── vouchers.service.ts               (Business logic - 483 lines)
│   ├── vouchers.controller.ts            (API endpoints)
│   └── vouchers.module.ts                (Module definition)
│
├── general-ledger/
│   ├── general-ledger.service.ts         (GL calculations)
│   ├── general-ledger.controller.ts      (GL APIs)
│   └── general-ledger.module.ts
│
├── common/enums/
│   ├── voucher-type.enum.ts              (11 voucher types)
│   ├── payment-mode.enum.ts              (6 payment methods)
│   ├── account-nature.enum.ts            (DEBIT/CREDIT)
│   ├── account-category.enum.ts          (ASSET/LIABILITY/etc)
│   └── ...
│
└── database/
    ├── migrations/
    │   ├── 1729700000000-create-fiscal-periods.ts
    │   ├── 1729700100000-create-cost-centers.ts
    │   └── ... (other migrations)
    └── seeds/
        └── seed.ts                       (Permission definitions)
```
