# 🔍 Customers Module - Integration Analysis

**Decision:** Separate CustomersModule (Option A)  
**Status:** 🟡 Planning Phase - Integration Analysis  
**Date:** October 22, 2025

---

## ⚠️ CRITICAL: Integration Points

This document analyzes **HOW** the CustomersModule will integrate with existing and future modules to ensure data consistency and proper business logic flow.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMERS MODULE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  customers table                                      │  │
│  │  - id (UUID)                                         │  │
│  │  - code (CUST-0001)                                  │  │
│  │  - name, contact info, terms                        │  │
│  │  - receivable_account_id → links to accounts       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    [Integration]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              CHART OF ACCOUNTS (Phase 3)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  accounts table                                       │  │
│  │  - id (UUID)                                         │  │
│  │  - code (02-0001)                                    │  │
│  │  - account_type = CUSTOMER (new enum value)         │  │
│  │  - customer_id (UUID) → foreign key to customers   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Point 1: Chart of Accounts (CRITICAL)

### Current State (Phase 3):
```typescript
// backend/src/accounts/entities/account.entity.ts
export enum AccountCategory {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

@Entity('accounts')
export class Account {
  @Column({ type: 'enum', enum: AccountCategory })
  category: AccountCategory;
  // No customer reference exists!
}
```

### Required Changes:

#### 1. Add CUSTOMER to AccountCategory enum
```typescript
// backend/src/common/enums/account-category.enum.ts
export enum AccountCategory {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  CUSTOMER = 'CUSTOMER',        // ← ADD THIS
  SUPPLIER = 'SUPPLIER'          // ← Future-proof for suppliers
}
```

#### 2. Add customer_id to Account entity
```typescript
// backend/src/accounts/entities/account.entity.ts
@Entity('accounts')
export class Account {
  // ... existing fields

  // NEW: Link to customer if this is a customer account
  @Column({ type: 'uuid', nullable: true })
  @Index()
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;
}
```

#### 3. Migration Required
```typescript
// migration: add-customer-accounts.ts
export class AddCustomerAccounts1729600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values
    await queryRunner.query(`
      ALTER TYPE "account_category_enum" 
      ADD VALUE IF NOT EXISTS 'CUSTOMER';
    `);
    
    await queryRunner.query(`
      ALTER TYPE "account_category_enum" 
      ADD VALUE IF NOT EXISTS 'SUPPLIER';
    `);

    // Add customer_id column
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "customer_id" uuid NULL 
      REFERENCES "customers"("id") ON DELETE RESTRICT;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX "IDX_accounts_customer_id" 
      ON "accounts"("customer_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_accounts_customer_id"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "customer_id"`);
  }
}
```

---

## 🔗 Integration Point 2: Vouchers Module (Phase 4)

### Current State:
Vouchers reference accounts by `accountCode`. No direct customer reference.

### No Changes Required! ✅
- Vouchers will continue to use `accountCode`
- Customer transactions will post to the customer's AR account
- Example: Payment from customer posts to their AR account (02-0001)

### Future Enhancement (Optional):
```typescript
// backend/src/vouchers/entities/voucher-detail.entity.ts
@Entity('voucher_details')
export class VoucherDetail {
  // ... existing fields

  // OPTIONAL: Direct customer reference for reporting
  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;
}
```

**Recommendation:** Add this later (Phase 6) when implementing invoicing.

---

## 🔗 Integration Point 3: GRN Module (Phase 5)

### How It Will Work:

```typescript
// backend/src/grn/entities/grn-master.entity.ts
@Entity('grn_masters')
export class GRNMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  grnNumber: string;  // GRN-2025-0001

  // CUSTOMER REFERENCE - Primary integration point
  @Column({ type: 'uuid' })
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Sub-customer (optional, for customer's clients)
  @Column({ type: 'varchar', length: 200, nullable: true })
  subCustomer?: string;

  // Business data
  @Column({ type: 'date' })
  grnDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicleNumber?: string;

  // Grace days from customer settings (can be overridden)
  @Column({ type: 'int', nullable: true })
  graceDays?: number;

  // ... other fields
}
```

### Business Logic Flow:

```typescript
// backend/src/grn/grn.service.ts
export class GRNService {
  async create(createGrnDto: CreateGRNDto, userId: string): Promise<GRNMaster> {
    // 1. Validate customer exists
    const customer = await this.customersService.findOne(createGrnDto.customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${createGrnDto.customerId} not found`);
    }

    // 2. Apply customer's default grace days if not specified
    const graceDays = createGrnDto.graceDays ?? customer.graceDays ?? 3;

    // 3. Create GRN
    const grn = this.grnRepository.create({
      ...createGrnDto,
      customerId: customer.id,
      graceDays,
      createdById: userId,
    });

    return await this.grnRepository.save(grn);
  }

  async approve(id: string, userId: string): Promise<GRNMaster> {
    const grn = await this.findOne(id);
    
    // ... approval logic
    
    // Post labour/carriage charges to accounting
    if (grn.labourAmount > 0) {
      // Get customer's AR account
      const customer = await this.customersService.findOne(grn.customerId);
      
      await this.vouchersService.create({
        voucherType: VoucherType.JOURNAL,
        voucherDate: grn.grnDate,
        description: `Labour charges on GRN ${grn.grnNumber}`,
        lineItems: [
          {
            accountCode: customer.receivableAccount.code,  // DR: Customer AR
            debit: grn.labourAmount,
            credit: 0,
          },
          {
            accountCode: grn.labourAccCodeCredit,          // CR: Labour Payable
            debit: 0,
            credit: grn.labourAmount,
          }
        ]
      }, userId);
    }

    return grn;
  }
}
```

---

## 🔗 Integration Point 4: Stock Module (Phase 5)

### Customer Reference in Stock:

```typescript
// backend/src/stock/entities/stock.entity.ts
@Entity('stock_balances')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to source GRN detail
  @Column({ type: 'uuid' })
  grnDetailId: string;

  // CUSTOMER OWNERSHIP
  @Column({ type: 'uuid' })
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Product and location
  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  roomId: string;

  // Quantities
  @Column({ type: 'decimal', precision: 18, scale: 3 })
  quantity: number;

  // ... other fields
}
```

### Query Example:
```typescript
// Get stock for specific customer
async getStockByCustomer(customerId: string) {
  return await this.stockRepository.find({
    where: { customerId, isActive: true },
    relations: ['customer', 'product', 'room'],
  });
}
```

---

## 🔗 Integration Point 5: GDN Module (Phase 5)

### Similar to GRN:

```typescript
// backend/src/gdn/entities/gdn-master.entity.ts
@Entity('gdn_masters')
export class GDNMaster {
  @Column({ type: 'uuid' })
  @Index()
  customerId: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // ... other fields
}
```

### Business Logic:
```typescript
// Only show customer's stock for delivery
async getAvailableStock(customerId: string) {
  return await this.stockService.getStockByCustomer(customerId);
}
```

---

## 🔗 Integration Point 6: Invoicing Module (Phase 6 - Future)

### How Invoicing Will Use Customers:

```typescript
// backend/src/invoices/entities/invoice-master.entity.ts
@Entity('invoice_masters')
export class InvoiceMaster {
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Invoice will use customer's:
  // - billing address
  // - credit terms
  // - grace days for rental calculation
  // - tax IDs for tax calculation

  // ... other fields
}
```

---

## 🗄️ Database Schema Design

### Customers Table:

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,           -- CUST-0001, auto-generated
    name VARCHAR(200) NOT NULL,
    
    -- Contact Information
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Pakistan',
    postal_code VARCHAR(20),
    
    -- Business Terms
    credit_limit DECIMAL(18,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    grace_days INTEGER DEFAULT 3,                -- For rental billing
    
    -- Tax Information
    tax_id VARCHAR(50),                          -- NTN (National Tax Number)
    gst_number VARCHAR(50),                      -- GST Registration
    
    -- Accounting Link (CRITICAL INTEGRATION)
    receivable_account_id UUID NOT NULL,         -- FK to accounts table
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit Trail
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,                      -- Soft delete
    
    -- Constraints
    CONSTRAINT fk_customer_receivable_account 
        FOREIGN KEY (receivable_account_id) 
        REFERENCES accounts(id) 
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_customer_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_customer_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX idx_customers_code ON customers(code);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_customers_receivable_account ON customers(receivable_account_id);
```

### Modified Accounts Table:

```sql
ALTER TABLE accounts 
ADD COLUMN customer_id UUID NULL 
    REFERENCES customers(id) 
    ON DELETE RESTRICT;

CREATE INDEX idx_accounts_customer_id ON accounts(customer_id);

-- Add constraint: if category is CUSTOMER, customer_id must be set
ALTER TABLE accounts 
ADD CONSTRAINT chk_customer_account_has_customer_id 
CHECK (
    (category = 'CUSTOMER' AND customer_id IS NOT NULL) OR 
    (category != 'CUSTOMER' AND customer_id IS NULL)
);
```

---

## 🔄 Customer Creation Flow (CRITICAL BUSINESS LOGIC)

### When creating a new customer:

```typescript
// backend/src/customers/customers.service.ts
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private accountsService: AccountsService,
    private dataSource: DataSource,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<Customer> {
    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async (manager) => {
      // 1. Generate customer code
      const code = await this.getNextCustomerCode();

      // 2. Create AR account in Chart of Accounts
      const arAccount = await this.accountsService.create({
        name: createCustomerDto.name,
        accountType: AccountType.DETAIL,
        nature: AccountNature.DEBIT,
        category: AccountCategory.CUSTOMER,      // New enum value
        parentAccountId: await this.getCustomersParentAccountId(), // "02 - Customers"
        openingBalance: 0,
        isActive: true,
      }, userId);

      // 3. Create customer record
      const customer = manager.create(Customer, {
        code,
        ...createCustomerDto,
        receivableAccountId: arAccount.id,
        createdById: userId,
      });

      await manager.save(customer);

      // 4. Update account with customer reference
      await manager.update(Account, arAccount.id, {
        customerId: customer.id,
      });

      return customer;
    });
  }

  private async getNextCustomerCode(): Promise<string> {
    const lastCustomer = await this.customerRepository.findOne({
      order: { code: 'DESC' },
    });

    if (!lastCustomer) {
      return 'CUST-0001';
    }

    const lastNumber = parseInt(lastCustomer.code.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }

  private async getCustomersParentAccountId(): Promise<string> {
    // Get or create "Customers" parent account (02)
    let parent = await this.accountsService.findByCode('02');
    
    if (!parent) {
      parent = await this.accountsService.create({
        code: '02',
        name: 'Customers',
        accountType: AccountType.CONTROL,
        nature: AccountNature.DEBIT,
        category: AccountCategory.CUSTOMER,
        isActive: true,
      }, 'system');
    }

    return parent.id;
  }
}
```

---

## ⚠️ Critical Concerns & Solutions

### Concern 1: Data Consistency
**Issue:** Customer and Account must always be in sync

**Solution:**
- Use database transactions
- Add database constraints
- Never allow direct account deletion if linked to customer
- Use `ON DELETE RESTRICT` on foreign keys

### Concern 2: Account Code Generation
**Issue:** Customer account codes must follow pattern (02-0001, 02-0002)

**Solution:**
```typescript
// Auto-generate account code based on customer code
const accountCode = `02-${customerCode.split('-')[1]}`;
// CUST-0001 → Account: 02-0001
// CUST-0042 → Account: 02-0042
```

### Concern 3: Circular Dependency
**Issue:** Customer → Account, Account → Customer

**Solution:**
- Customer has `receivableAccountId` (owns the relationship)
- Account has optional `customerId` (back-reference for queries)
- Use TypeORM's circular relationship handling
- Import cycle handled by TypeORM

### Concern 4: Existing Accounts Module
**Issue:** Phase 3 already complete, need to modify existing code

**Solution:**
1. Add new enum values (backward compatible)
2. Add nullable `customerId` column (doesn't break existing data)
3. Add new constraint only for new records
4. Existing accounts unaffected

### Concern 5: Permission System
**Issue:** Who can manage customers?

**Solution:**
```typescript
// Add new permissions
export enum Permission {
  // ... existing permissions
  CUSTOMERS_READ = 'customers.read',
  CUSTOMERS_CREATE = 'customers.create',
  CUSTOMERS_UPDATE = 'customers.update',
  CUSTOMERS_DELETE = 'customers.delete',
}

// Seed permissions in database
```

---

## 📊 API Endpoints Design

### CustomersController:

```typescript
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Customers')
export class CustomersController {
  @Get()
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get all customers' })
  findAll(@Query() query: QueryCustomersDto) {
    // Returns customers with pagination
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    // Returns customer with related account
  }

  @Post()
  @RequirePermissions('customers.create')
  @ApiOperation({ summary: 'Create new customer' })
  create(@Body() createDto: CreateCustomerDto, @Request() req) {
    // Creates customer + AR account atomically
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCustomerDto) {
    // Updates customer info (account name synced automatically)
  }

  @Delete(':id')
  @RequirePermissions('customers.delete')
  @ApiOperation({ summary: 'Soft delete customer' })
  remove(@Param('id') id: string) {
    // Soft delete (only if no active GRNs/invoices)
  }

  @Get(':id/balance')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get customer account balance' })
  getBalance(@Param('id') id: string) {
    // Queries general ledger for customer's AR balance
  }

  @Get(':id/transactions')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get customer transaction history' })
  getTransactions(@Param('id') id: string, @Query() query: QueryDto) {
    // Returns ledger entries for customer's AR account
  }
}
```

---

## 🎨 Frontend Integration

### Customer Selector Component (Reusable):

```typescript
// frontend/src/components/CustomerSelector.tsx
interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCustomers = async () => {
      const data = await customersService.getCustomers({
        search,
        isActive: true,
        limit: 100,
      });
      setCustomers(data.data);
    };
    loadCustomers();
  }, [search]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select customer..." />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {customers.map((customer) => (
          <SelectItem key={customer.id} value={customer.id}>
            {customer.code} - {customer.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

---

## ✅ Integration Checklist

### Phase 3 (Accounts) Modifications:
- [ ] Add CUSTOMER, SUPPLIER to AccountCategory enum
- [ ] Add `customerId` column to accounts table (nullable)
- [ ] Add migration script
- [ ] Add database constraint (CUSTOMER accounts must have customerId)
- [ ] Test existing functionality (should not break)

### Phase 5 (Customers) Implementation:
- [ ] Create CustomersModule
- [ ] Create customers table with all fields
- [ ] Create Customer entity with TypeORM relations
- [ ] Implement CustomersService with transaction handling
- [ ] Implement CustomersController with all endpoints
- [ ] Create frontend CustomersPage
- [ ] Create CustomerSelector component (reusable)
- [ ] Add customer permissions to seed data
- [ ] Write integration tests

### Phase 5 (GRN) Integration:
- [ ] Add `customerId` to GRNMaster entity
- [ ] Load customer data when creating GRN
- [ ] Apply customer's grace days
- [ ] Reference customer's AR account for labour charges
- [ ] Show customer info in GRN forms/reports

---

## 🚦 Implementation Order

### Step 1: Modify Accounts Module (1 day)
1. Add enum values
2. Create and run migration
3. Add customer relation to Account entity
4. Test existing functionality

### Step 2: Create Customers Module (2 days)
1. Generate module, controller, service
2. Create Customer entity
3. Implement CRUD operations with transactions
4. Add Swagger documentation
5. Add permissions

### Step 3: Frontend (1 day)
1. Create CustomersPage
2. Create CustomerSelector component
3. Add routing and navigation
4. Test customer creation flow

### Step 4: Integration Testing (0.5 days)
1. Test customer → account creation
2. Test account balance queries
3. Test customer soft delete
4. Verify data consistency

---

## 🎯 Success Criteria

Customer module is ready when:
- ✅ Can create customer (atomically creates AR account)
- ✅ Customer code auto-generated (CUST-0001, CUST-0002, etc.)
- ✅ Account code auto-generated (02-0001, 02-0002, etc.)
- ✅ Both records linked via foreign keys
- ✅ Can query customer balance from GL
- ✅ Can update customer (account name syncs)
- ✅ Cannot delete customer with active transactions
- ✅ Customer selector works in forms
- ✅ Existing Phase 3 functionality unchanged
- ✅ All tests passing

---

## 📝 Testing Strategy

### Unit Tests:
```typescript
describe('CustomersService', () => {
  it('should create customer with AR account atomically', async () => {
    // Test transaction rollback on failure
  });

  it('should generate sequential customer codes', async () => {
    // Test CUST-0001, CUST-0002, etc.
  });

  it('should prevent deletion if customer has GRNs', async () => {
    // Test business rule enforcement
  });
});
```

### Integration Tests:
```typescript
describe('Customer-Account Integration', () => {
  it('should create customer and account in single transaction', async () => {
    // Verify both records exist and are linked
  });

  it('should rollback both if account creation fails', async () => {
    // Verify transaction rollback
  });

  it('should sync account name when customer name changes', async () => {
    // Verify bidirectional sync
  });
});
```

---

## ⏱️ Estimated Timeline

| Task | Time | Dependencies |
|------|------|--------------|
| Modify Accounts enum + migration | 2 hours | None |
| Update Account entity | 1 hour | Migration |
| Test Phase 3 compatibility | 2 hours | Entity update |
| Create Customers entity | 2 hours | Account entity ready |
| Implement CustomersService | 4 hours | Entity created |
| Implement CustomersController | 2 hours | Service ready |
| Create frontend CustomersPage | 4 hours | API ready |
| Create CustomerSelector component | 2 hours | API ready |
| Integration testing | 3 hours | All complete |
| **Total** | **22 hours (~3 days)** | |

---

## 🎓 Key Learnings to Apply

1. **Always use transactions** when creating related records
2. **Foreign keys with RESTRICT** prevent orphaned data
3. **Database constraints** enforce business rules
4. **Soft deletes** preserve history
5. **Audit trail** tracks all changes
6. **TypeORM relations** handle circular dependencies
7. **Reusable components** reduce duplication

---

**Status:** ✅ Integration analysis complete  
**Next Step:** Review this analysis, then proceed with implementation  
**Confidence Level:** 🟢 High - All integration points identified and planned


