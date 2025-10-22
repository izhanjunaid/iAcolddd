# Legacy Database Schema Audit Report
**Database:** Izhan Database (SQL Server)  
**Date:** October 15, 2025  
**Total Tables:** 37  
**Total Columns:** 395  
**Primary Keys:** 39 constraints  
**Foreign Keys:** 12 relationships

---

## Executive Summary

The **Izhan database** is a well-structured SQL Server database designed for **cold storage facility management** of agricultural products (primarily potatoes). While functionally complete, it suffers from common legacy database anti-patterns including limited foreign key enforcement, Hungarian notation naming, and lack of modern features like soft deletes and proper audit trails.

**Key Findings:**
- **Good**: Clear master-detail pattern, reasonable normalization, consistent naming
- **Issues**: Missing FK constraints, no indexes beyond PKs, limited data integrity enforcement
- **Security**: No encryption, no row-level security, limited audit fields
- **Performance**: No query optimization indexes, all lookups use clustered PK scans

---

## 1. Schema Overview

### 1.1 Database Statistics
```
Total Tables:          37
Total Columns:         395
Primary Keys:          39 (some composite keys)
Foreign Keys:          12 (many implicit relationships not enforced)
Indexes:               39 (all clustered primary key indexes only)
Check Constraints:     0 (all validation in application)
Default Constraints:   ~20 (mostly NULL defaults)
Computed Columns:      0
Views:                 Unknown (not in documentation)
Stored Procedures:     Unknown (likely minimal)
Functions:             Unknown
Triggers:              Unknown (likely minimal)
```

### 1.2 Table Categorization

**Accounting Module (9 tables):**
- `tblAccChartOfAccounts` - Chart of accounts master
- `tblAccJournalVoucherMaster/Detail` - Journal entries
- `tblAccPaymentVoucherMaster/Detail` - Payments
- `tblAccReceiptVoucherMaster/Detail` - Receipts
- `tblAccOtherVoucherMaster/Detail` - System-generated vouchers

**Inventory & Warehouse (18 tables):**
- `tblProducts`, `tblProductCatagory`, `tblProductVariety`, `tblProductPacking`
- `tblRooms`, `tblRacks`
- `tblGRNMaster/Detail` - Goods Receipt Notes
- `tblGDNMaster/Detail` - Goods Despatch Notes
- `tblInterRoomTransfer` - Stock movements
- `tblOwnershipTransferMaster/Invoice/Stock` - Ownership changes

**Billing (3 tables):**
- `tblInvoiceMaster/Detail` - Customer invoices
- `tblTempLabels` - Barcode label generation

**General Items (5 tables):**
- `tblGeneralItemCategory`, `tblGeneralItems`
- `tblGiPurchaseMaster/Detail`, `tblGiSaleMaster/Detail`

**System Configuration (5 tables):**
- `tblCompany`, `tblCompanyPreference`
- `tblSettings`
- `tblUsers`
- `tblSubCustomerSupplier`

---

## 2. Naming Convention Analysis

### 2.1 Current Naming Pattern

**Table Names:**
```
Pattern: tbl[EntityName]
Examples:
- tblAccChartOfAccounts
- tblGRNMaster
- tblProducts
- tblUsers
```

**Column Names:**
```
Patterns:
- PascalCase (mostly)
- Abbrev

iations used (Acc, Grn, Gdn, etc.)
- Hungarian notation remnants (Id, Code, Name suffixes)

Examples:
- AccId, AccCode, AccName
- GRNNumber, GRNDate
- ProductCode, ProductName
```

**Issues with Current Naming:**
1. **Inconsistent abbreviations** - "Acc" vs "Account", "Cat" vs "Category"
2. **"tbl" prefix** - Outdated practice (tables should be obvious from context)
3. **Mixed singular/plural** - "tblUsers" vs "tblProduct"
4. **No clear schema separation** - All tables in dbo schema

**Recommendations:**
```
Modern PostgreSQL naming:
- Schema-based organization: accounting.chart_of_accounts
- Lowercase with underscores: product_categories
- Descriptive names: goods_receipt_notes (not grn_master)
- Consistent pluralization: users, products, invoices
```

---

## 3. Table-by-Table Analysis

### 3.1 Core Master Tables

#### **tblAccChartOfAccounts** (10 rows)
**Purpose:** Chart of accounts master - foundation of accounting system

**Structure:**
```sql
CREATE TABLE tblAccChartOfAccounts (
    AccId bigint IDENTITY(1,1) NOT NULL,
    AccCode nvarchar(50) NOT NULL,
    AccName nvarchar(100) NOT NULL,
    ParentAccCode nvarchar(50) NULL,
    AccLevel smallint NULL,
    IsAccount bit NULL,
    OpeningDate date NULL,
    OpeningDebit decimal(18,2) NULL,
    OpeningCredit decimal(18,2) NULL,
    OpeningDebitFC decimal(18,2) NULL,      -- Foreign Currency
    OpeningCreditFC decimal(18,2) NULL,
    CreditLimit decimal(18,2) NULL,
    CreditDays int NULL,
    AccType nvarchar(50) NULL,              -- Asset, Liability, Revenue, Expense, etc.
    AccNature nvarchar(50) NULL,
    Address1 nvarchar(200) NULL,
    Address2 nvarchar(200) NULL,
    City nvarchar(100) NULL,
    State nvarchar(50) NULL,
    Country nvarchar(200) NULL,
    PostalCode nvarchar(50) NULL,
    ContactName nvarchar(200) NULL,
    Mobile nvarchar(50) NULL,
    Landline nvarchar(50) NULL,
    Fax nvarchar(50) NULL,
    Email nvarchar(100) NULL,
    Website nvarchar(50) NULL,
    NTN nvarchar(50) NULL,                  -- National Tax Number
    GST nvarchar(50) NULL,                  -- GST Registration
    EntryUser nvarchar(50) NULL,
    SysTimeStamp datetime NULL,
    InvoiceGraceDays int NULL,
    CONSTRAINT PK_tblAccChartOfAccounts PRIMARY KEY CLUSTERED (AccId, AccCode)
);
```

**Issues:**
1. **Composite PK** (AccId, AccCode) - Unnecessary complexity
   - `AccCode` is natural key, `AccId` is surrogate
   - Should use single column PK (AccCode or AccId, not both)
2. **No FK to self** - ParentAccCode references AccCode but no constraint
3. **Mixed concerns** - Contact info should be in separate Customer/Supplier table
4. **No data type constraints** - AccType values not enforced
5. **Poor audit trail** - Only EntryUser and SysTimeStamp, no UpdatedBy/UpdatedAt
6. **Foreign currency fields unused** - OpeningDebitFC, OpeningCreditFC
7. **No account hierarchy depth limit** - AccLevel not constrained

**Account Code Structure:**
```
01 - Fixed Assets
02 - Customers (02001, 02002, ...)
03 - Bank Accounts
04 - Cash Accounts
05 - Business Expenses
06 - Employees
07 - Current Assets
08 - Equity/Capital
09 - Revenue Accounts (09001 - Rental Income, ...)
10 - General Item Stock
```

**Sample Data:**
| AccCode | AccName | AccType | ParentAccCode | AccLevel |
|---------|---------|---------|---------------|----------|
| 01 | Fixed Assets | Asset | NULL | 1 |
| 02 | Potato Customers | Customer | NULL | 1 |
| 02001 | Customer ABC | Customer | 02 | 2 |
| 03 | Bank A/c | Bank | NULL | 1 |
| 04 | Cash A/c | Cash | NULL | 1 |
| 09 | Product Rental Income | Revenue | NULL | 1 |
| 09001 | Red Potato Rental Income | Revenue | 09 | 2 |

**Modernization Recommendations:**
```sql
-- Separate concerns:
CREATE TABLE accounting.accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    parent_account_id UUID REFERENCES accounting.accounts(account_id),
    account_type account_type_enum NOT NULL,  -- ENUM type
    account_level SMALLINT CHECK (account_level BETWEEN 1 AND 10),
    is_active BOOLEAN DEFAULT TRUE,
    opening_balance DECIMAL(18,2),
    opening_date DATE,
    credit_limit DECIMAL(18,2),
    credit_days INTEGER,
    metadata JSONB,  -- For flexible extensions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(user_id),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE TABLE accounting.account_contacts (
    contact_id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounting.accounts(account_id),
    contact_type contact_type_enum,  -- PRIMARY, BILLING, SHIPPING
    contact_name VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **tblProducts** (10 rows)
**Purpose:** Product catalog

**Structure:**
```sql
CREATE TABLE tblProducts (
    ProductCode nvarchar(50) NOT NULL,
    ProductName nvarchar(200) NOT NULL,
    ProductCatagoryCode nvarchar(50) NULL,
    ProductSaleAccCode nvarchar(50) NULL,
    CONSTRAINT PK_tblProducts PRIMARY KEY CLUSTERED (ProductCode)
);
```

**Issues:**
1. **No FK constraints** - ProductCatagoryCode and ProductSaleAccCode not enforced
2. **Typo** - "Catagory" should be "Category"
3. **No audit fields** - No created/updated tracking
4. **Limited metadata** - No description, unit, active status, etc.
5. **No product attributes** - All product-specific data scattered in related tables

**Sample Products:**
- 0201 - Red Potato Ration
- 0202 - White Potato
- 0203 - Potato Seeds
- 0204 - Agricultural Products

**Modernization:**
```sql
CREATE TABLE products.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES products.categories(category_id),
    revenue_account_id UUID REFERENCES accounting.accounts(account_id),
    unit_of_measure unit_type_enum,  -- BAG, CRATE, KG, etc.
    is_active BOOLEAN DEFAULT TRUE,
    attributes JSONB,  -- Flexible product attributes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

#### **tblUsers** (24 columns)
**Purpose:** User accounts and permissions

**Structure:**
```sql
CREATE TABLE tblUsers (
    UserId bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserName nvarchar(50) NOT NULL,
    UserPassword nvarchar(200) NOT NULL,      -- Encrypted, not hashed!
    FullName nvarchar(200),
    Disabled bit DEFAULT 0,
    BackDateEntryDays int DEFAULT 0,
    -- Permission flags (Boolean for each):
    CanCreateUsers bit,
    CanDefineAccounts bit,
    CanEnterAccountingVoucher bit,
    CanDefineOperations bit,
    CanEnterOperationalVoucher bit,
    CanEditVouchers bit,
    CanDeleteVoucher bit,
    CanApproveVouchers bit,
    CanEditApprovedVouchers bit,
    CanSystemSettings bit,
    CanViewDashboard bit,
    CanViewIncomeStatementReport bit,
    CanViewBalanceSheetReport bit,
    CanViewTrialBalanceReport bit,
    CanViewGeneralLedgerReport bit,
    CanViewPurchaseReport bit,
    CanViewSaleReport bit,
    CreatedDate datetime,
    CreatedBy nvarchar(50)
);
```

**Critical Issues:**
1. **Password storage** - Encrypted (reversible), not hashed (irreversible)
2. **No salt** - All passwords use same encryption key
3. **Flat permissions** - 17 boolean flags instead of role-based
4. **No role abstraction** - Cannot create custom roles
5. **No permission groups** - Cannot assign bulk permissions
6. **No session management** - No login tracking, no concurrent session control
7. **No password policy** - No expiry, no complexity requirements
8. **No MFA support**

**Modernization:**
```sql
CREATE TABLE auth.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt/Argon2
    password_salt VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE auth.roles (
    role_id UUID PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth.permissions (
    permission_id UUID PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100),  -- 'invoices', 'reports', etc.
    action VARCHAR(50),     -- 'create', 'read', 'update', 'delete'
    description TEXT
);

CREATE TABLE auth.role_permissions (
    role_id UUID REFERENCES auth.roles(role_id),
    permission_id UUID REFERENCES auth.permissions(permission_id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auth.user_roles (
    user_id UUID REFERENCES auth.users(user_id),
    role_id UUID REFERENCES auth.roles(role_id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(user_id),
    PRIMARY KEY (user_id, role_id)
);
```

---

### 3.2 Transaction Tables (Master-Detail Pattern)

#### **tblGRNMaster** - Goods Receipt Note Header
```sql
CREATE TABLE tblGRNMaster (
    GRNNumber bigint NOT NULL PRIMARY KEY,
    ManualGRNNumber bigint NOT NULL,
    GRNDate date NULL,
    TimeIn nvarchar(50) NULL,              -- Should be TIME type!
    CustomerAccCode nvarchar(50) NULL,     -- No FK!
    SubCustomerCode nvarchar(50) NULL,
    BuiltyNumber nvarchar(50) NULL,        -- Bill of lading
    InvoiceGraceDays int NULL,
    VehicleNumber nvarchar(50) NULL,
    Remarks nvarchar(1000) NULL,
    IsApproved bit NULL,
    EntryUser nvarchar(50) NULL,
    ApprovedBy nvarchar(50) NULL,
    SysTimeStamp datetime NULL,
    LabourAmount decimal(18,2) NULL,
    LabourAccCodeDebit nvarchar(50) NULL,  -- No FK!
    LabourAccCodeCredit nvarchar(50) NULL,
    CarriageAmount decimal(18,2) NULL,
    CarriageAccCodeDebit nvarchar(50) NULL,
    CarriageAccCodeCredit nvarchar(50) NULL
);
```

**Issues:**
1. **No FK constraints** - Customer, accounts not enforced
2. **Time as string** - "TimeIn" should be TIME or DATETIME
3. **Limited audit trail** - No UpdatedBy, UpdatedAt
4. **No versioning** - Cannot track changes after approval
5. **Manual number field** - ManualGRNNumber duplicates GRNNumber (legacy field)
6. **Approval model** - Simple bit flag, no workflow support

#### **tblGRNDetail** - Goods Receipt Note Lines
```sql
CREATE TABLE tblGRNDetail (
    GRNDetailId bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GRNNumber bigint NULL,                 -- FK exists!
    ProductCode nvarchar(50) NULL,
    VarietyId bigint NULL,
    PackingId bigint NULL,
    Qty decimal(18,2) NULL,
    Rate decimal(18,2) NULL,
    Amount decimal(18,2) NULL,             -- Computed: Qty * Rate
    GrossWeight decimal(18,2) NULL,
    TareWeight decimal(18,2) NULL,
    NetWeight decimal(18,2) NULL,          -- Computed: Gross - Tare
    RoomId bigint NULL,
    RackId bigint NULL,
    LabourRate decimal(18,2) NULL,
    OwnershipDate date NULL,               -- For rental calculation
    CONSTRAINT FK_GRNDetail_GRNMaster 
        FOREIGN KEY (GRNNumber) REFERENCES tblGRNMaster(GRNNumber)
);
```

**Issues:**
1. **Missing FK constraints** - ProductCode, RoomId, RackId not enforced
2. **Computed fields not enforced** - Amount, NetWeight calculated in app
3. **No quantity validation** - Could have negative quantities
4. **Decimal precision** - (18,2) may not be enough for weight precision
5. **No unit tracking** - Assumes all quantities in same unit

**Business Rules Not Enforced:**
- NetWeight = GrossWeight - TareWeight
- Amount = Qty * Rate
- Qty must be > 0
- Rate must be >= 0
- OwnershipDate defaults to GRNDate

#### **tblInvoiceMaster** - Invoice Header
```sql
CREATE TABLE tblInvoiceMaster (
    InvoiceNumber bigint NOT NULL PRIMARY KEY,
    InvoiceDate date NULL,
    CustomerAccCode nvarchar(50) NULL,
    Remarks nvarchar(1000) NULL,
    IncomeTaxPercent decimal(18,2) NULL,
    IncomeTaxAmount decimal(18,2) NULL,
    IncomeTaxAccCode nvarchar(50) NULL,
    LoadingAmount decimal(18,2) NULL,
    LoadingAccCode nvarchar(50) NULL,
    WithholdingPercentage decimal(18,2) NULL,
    WithholdingAmount decimal(18,2) NULL,
    WithholdingAccCode nvarchar(50) NULL,
    CashReceivedAmount decimal(18,2) NULL,
    CashReceivedAccCode nvarchar(50) NULL,
    IsApproved bit NULL,
    EntryUser nvarchar(50) NULL,
    ApprovedBy nvarchar(50) NULL,
    SysTimeStamp datetime NULL,
    CreditDays int NULL
);
```

**Tax Calculation Issues:**
- Tax percentages and amounts stored separately (redundant)
- No validation that Amount = Percentage * Base
- Tax account codes not FK-constrained
- No tax rate history tracking

#### **tblInvoiceDetail** - Invoice Lines
```sql
CREATE TABLE tblInvoiceDetail (
    InvoiceDetailId bigint IDENTITY(1,1) PRIMARY KEY,
    InvoiceNumber bigint NULL,             -- FK exists
    GRNDetailId bigint NULL,               -- Links to inventory
    ProductCode nvarchar(50) NULL,
    Qty decimal(18,2) NULL,
    Rate decimal(18,2) NULL,
    RowGrossTotal decimal(18,2) NULL,      -- Qty * Rate * Months
    DiscountPercent decimal(18,2) NULL,
    DiscountAmount decimal(18,2) NULL,
    RowTotalAfterDiscount decimal(18,2) NULL,
    InwardDate date NULL,                  -- From GRN
    OutwardDate date NULL,                 -- From GDN or invoice date
    TotalDays int NULL,                    -- OutwardDate - InwardDate
    GraceDays int NULL,
    DaysToCharge int NULL,                 -- TotalDays - GraceDays
    MonthsToCharge decimal(18,2) NULL,     -- Calculated by formula
    InvoicePeriod nvarchar(50) NULL,       -- 'Monthly' or 'Seasonal'
    LabourAmount decimal(18,2) NULL,       -- Allocated labour cost
    CONSTRAINT FK_InvoiceDetail_InvoiceMaster
        FOREIGN KEY (InvoiceNumber) REFERENCES tblInvoiceMaster(InvoiceNumber)
);
```

**Issues:**
1. **Denormalized calculations** - All computed fields stored
2. **No recalculation support** - If rates change, old invoices unchanged
3. **Complex business logic** - MonthsToCharge formula not in database
4. **GRNDetailId not FK** - Critical relationship not enforced
5. **Audit trail incomplete** - Cannot see what changed

**Business Logic Buried:**
```sql
-- Formula for MonthsToCharge (from code analysis):
-- If InvoicePeriod = 'Seasonal': Months = 1 (flat rate)
-- Else:
--   DaysToCharge = TotalDays - GraceDays
--   If ownership transferred:
--     Months = Max(0.5, Ceiling(DaysToCharge / 15) * 0.5)
--   Else:
--     Months = Max(1.0, 1.0 + Ceiling((DaysToCharge - 30) / 15) * 0.5)
```

**Recommendation:** Move to computed columns or database functions:
```sql
-- Modern approach with generated columns:
ALTER TABLE invoices.invoice_lines
ADD COLUMN days_stored INTEGER GENERATED ALWAYS AS 
    (outward_date - inward_date) STORED;

ALTER TABLE invoices.invoice_lines
ADD COLUMN days_to_charge INTEGER GENERATED ALWAYS AS 
    (GREATEST(0, days_stored - grace_days)) STORED;

-- Complex calculation stays in application or function:
CREATE FUNCTION calculate_months_to_charge(
    days_to_charge INTEGER,
    is_ownership_transferred BOOLEAN,
    invoice_period VARCHAR
) RETURNS DECIMAL(10,2) AS $$
    -- Implementation here
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

### 3.3 Accounting Tables

#### **tblAccJournalVoucherMaster/Detail**
**Purpose:** Manual journal entries

**Master:**
```sql
CREATE TABLE tblAccJournalVoucherMaster (
    VoucherId bigint IDENTITY(1,1) PRIMARY KEY,
    VoucherNumber bigint NULL,
    VoucherDate date NULL,
    Remarks nvarchar(1000) NULL,
    IsApproved bit NULL,
    EntryUser nvarchar(50) NULL,
    ApprovedBy nvarchar(50) NULL,
    SysTimeStamp datetime NULL
);
```

**Detail:**
```sql
CREATE TABLE tblAccJournalVoucherDetail (
    VoucherDetailId bigint IDENTITY(1,1) PRIMARY KEY,
    VoucherId bigint NULL,                 -- FK exists
    AccCode nvarchar(50) NULL,
    Description nvarchar(1000) NULL,
    Debit decimal(18,2) NULL,
    Credit decimal(18,2) NULL,
    CreditDays int NULL,
    CONSTRAINT FK_JVDetail_JVMaster
        FOREIGN KEY (VoucherId) REFERENCES tblAccJournalVoucherMaster(VoucherId)
);
```

**Missing Validations:**
1. **Balance check** - No constraint ensuring SUM(Debit) = SUM(Credit)
2. **Debit/Credit mutex** - Should have: CHECK ((Debit > 0 AND Credit = 0) OR (Credit > 0 AND Debit = 0))
3. **AccCode FK** - Not enforced
4. **Empty vouchers** - No check for minimum line items

**Recommendation:**
```sql
-- Add validation trigger:
CREATE TRIGGER validate_journal_balance
BEFORE INSERT OR UPDATE ON accounting.journal_voucher_master
FOR EACH ROW
EXECUTE FUNCTION validate_voucher_balance();

-- Function to check balance:
CREATE FUNCTION validate_voucher_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_total DECIMAL(18,2);
    credit_total DECIMAL(18,2);
BEGIN
    SELECT 
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO debit_total, credit_total
    FROM accounting.journal_voucher_detail
    WHERE voucher_id = NEW.voucher_id;
    
    IF debit_total != credit_total THEN
        RAISE EXCEPTION 'Journal voucher % out of balance: DR=% CR=%',
            NEW.voucher_id, debit_total, credit_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **tblAccOtherVoucherMaster/Detail**
**Purpose:** System-generated vouchers (from invoices, GRN, GDN)

**Special Feature:**
```sql
ALTER TABLE tblAccOtherVoucherMaster
ADD ReversingVoucherId nvarchar(50) NULL
    REFERENCES tblAccOtherVoucherMaster(VoucherId);  -- Self-referencing FK
```

**Issues:**
1. **VoucherId is string** - "SV-1234" format, not ideal for FK
2. **No cascade rules** - What happens when reversed voucher deleted?
3. **No audit of reversal** - When/who/why reversed not tracked

---

## 4. Missing Database Features

### 4.1 Referential Integrity

**FK Constraints Found:** 12  
**FK Constraints Needed:** ~50+

**Missing Critical FKs:**
```sql
-- Missing in current schema:
tblGRNMaster.CustomerAccCode → tblAccChartOfAccounts.AccCode
tblGRNDetail.ProductCode → tblProducts.ProductCode
tblGRNDetail.RoomId → tblRooms.RoomId
tblGRNDetail.RackId → tblRacks.RackId
tblGRNDetail.VarietyId → tblProductVariety.VarietyId
tblGRNDetail.PackingId → tblProductPacking.PackingId
tblInvoiceMaster.CustomerAccCode → tblAccChartOfAccounts.AccCode
tblInvoiceDetail.GRNDetailId → tblGRNDetail.GRNDetailId
tblInvoiceDetail.ProductCode → tblProducts.ProductCode
tblUsers.CreatedBy → tblUsers.UserId (self-reference)
-- ... and 40+ more
```

**Impact:** **High Data Integrity Risk**
- Orphaned records possible
- Invalid references (deleted accounts, products)
- Cascading deletes not enforced
- Application-level validation only

**Recommendation:** Add all missing FK constraints with appropriate ON DELETE/UPDATE rules:
```sql
-- Example:
ALTER TABLE warehouse.goods_receipt_details
ADD CONSTRAINT fk_grn_product
    FOREIGN KEY (product_id) 
    REFERENCES products.products(product_id)
    ON DELETE RESTRICT;  -- Cannot delete product with GRN records

ALTER TABLE warehouse.goods_receipt_details
ADD CONSTRAINT fk_grn_room
    FOREIGN KEY (room_id)
    REFERENCES warehouse.rooms(room_id)
    ON DELETE RESTRICT;
```

### 4.2 Check Constraints

**Current:** 0 check constraints  
**Needed:** ~30+

**Missing Validations:**
```sql
-- Quantity validations:
CHECK (Qty > 0)
CHECK (Rate >= 0)
CHECK (GrossWeight >= TareWeight)
CHECK (NetWeight = GrossWeight - TareWeight)

-- Date validations:
CHECK (OutwardDate >= InwardDate)
CHECK (GRNDate >= SystemStartDate)
CHECK (InvoiceDate >= GRNDate)

-- Financial validations:
CHECK (OpeningDebit >= 0)
CHECK (OpeningCredit >= 0)
CHECK ((Debit > 0 AND Credit = 0) OR (Credit > 0 AND Debit = 0))

-- Enum-like validations:
CHECK (AccType IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Customer'))
CHECK (InvoicePeriod IN ('Monthly', 'Seasonal'))
```

**Recommendation:** Add all business rule constraints to database:
```sql
ALTER TABLE warehouse.goods_receipt_details
ADD CONSTRAINT chk_positive_quantity CHECK (quantity > 0),
ADD CONSTRAINT chk_non_negative_rate CHECK (rate >= 0),
ADD CONSTRAINT chk_weight_logic CHECK (gross_weight >= tare_weight),
ADD CONSTRAINT chk_net_weight CHECK (net_weight = gross_weight - tare_weight);

-- Or use generated columns for computed values:
ALTER TABLE warehouse.goods_receipt_details
ADD COLUMN net_weight DECIMAL(18,3) GENERATED ALWAYS AS 
    (gross_weight - tare_weight) STORED;
```

### 4.3 Indexes

**Current:** 39 indexes (all clustered primary key indexes)  
**Missing:** All non-clustered indexes for queries

**Performance Impact:** All lookups scan primary key, no query optimization

**Needed Indexes:**
```sql
-- Lookup indexes:
CREATE INDEX idx_grn_customer ON tblGRNMaster(CustomerAccCode, GRNDate);
CREATE INDEX idx_grn_date_range ON tblGRNMaster(GRNDate) WHERE IsApproved = 1;
CREATE INDEX idx_invoice_customer_date ON tblInvoiceMaster(CustomerAccCode, InvoiceDate);
CREATE INDEX idx_invoice_detail_grn ON tblInvoiceDetail(GRNDetailId);

-- Foreign key indexes (important!):
CREATE INDEX idx_grn_detail_product ON tblGRNDetail(ProductCode);
CREATE INDEX idx_grn_detail_room ON tblGRNDetail(RoomId, RackId);

-- Accounting query indexes:
CREATE INDEX idx_voucher_date ON tblAccJournalVoucherMaster(VoucherDate);
CREATE INDEX idx_voucher_detail_account ON tblAccJournalVoucherDetail(AccCode, VoucherId);
CREATE INDEX idx_account_parent ON tblAccChartOfAccounts(ParentAccCode);

-- Search indexes:
CREATE INDEX idx_account_name ON tblAccChartOfAccounts(AccName);  -- For autocomplete
CREATE INDEX idx_product_name ON tblProducts(ProductName);
```

**Full-Text Search Needed:**
```sql
-- SQL Server:
CREATE FULLTEXT INDEX ON tblAccChartOfAccounts(AccName, ContactName)
    KEY INDEX PK_tblAccChartOfAccounts;

-- PostgreSQL:
CREATE INDEX idx_account_name_fts ON accounting.accounts 
    USING GIN(to_tsvector('english', account_name));
```

### 4.4 Audit Trail

**Current Audit Fields:**
- `EntryUser` (nvarchar)
- `SysTimeStamp` (datetime)
- `ApprovedBy` (nvarchar, optional)

**Missing:**
- `UpdatedBy` - Who modified?
- `UpdatedAt` - When modified?
- `DeletedBy` - Who deleted?
- `DeletedAt` - Soft delete timestamp
- `Version` - Optimistic locking
- History tables - Track all changes

**Recommendation:** Implement comprehensive audit:
```sql
-- Every table should have:
CREATE TABLE schema.table_name (
    ...business columns...,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(user_id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(user_id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(user_id),
    version INTEGER NOT NULL DEFAULT 1  -- For optimistic locking
);

-- Automatic trigger for updated_at:
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON schema.table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- History table (temporal data):
CREATE TABLE schema.table_name_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...all columns from main table...,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31',
    operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Trigger to maintain history:
CREATE TRIGGER track_changes
AFTER INSERT OR UPDATE OR DELETE ON schema.table_name
FOR EACH ROW
EXECUTE FUNCTION log_to_history_table();
```

### 4.5 Data Integrity Features

**Missing:**
1. **Transactions** - No evidence of explicit transaction management in schema
2. **Triggers** - Likely minimal (no validation triggers found)
3. **Stored Procedures** - Minimal or none
4. **Views** - Unknown (documentation doesn't list them)
5. **Functions** - Unknown
6. **Sequences** - Using IDENTITY, no custom sequences
7. **Enums** - No enum types, using nvarchar for categorical data
8. **Domains** - No custom types

**Recommendation for PostgreSQL:**
```sql
-- Create ENUMs for categorical data:
CREATE TYPE account_type AS ENUM (
    'ASSET', 'LIABILITY', 'EQUITY', 
    'REVENUE', 'EXPENSE', 'CUSTOMER'
);

CREATE TYPE voucher_type AS ENUM (
    'JOURNAL', 'PAYMENT', 'RECEIPT', 'SYSTEM'
);

CREATE TYPE invoice_period AS ENUM ('MONTHLY', 'SEASONAL');

-- Custom domains:
CREATE DOMAIN positive_decimal AS DECIMAL(18,2) CHECK (VALUE > 0);
CREATE DOMAIN non_negative_decimal AS DECIMAL(18,2) CHECK (VALUE >= 0);
CREATE DOMAIN email_address AS VARCHAR(200) CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');
```

---

## 5. Data Type Issues

### 5.1 Inappropriate Types

**Issues Found:**
```sql
-- Time as string:
TimeIn nvarchar(50)          -- Should be: TIME or TIMESTAMP
TimeOut nvarchar(50)

-- Boolean as bit (SQL Server):
IsApproved bit               -- PostgreSQL: BOOLEAN
IsAccount bit
Disabled bit

-- Imprecise decimals for currency:
Amount decimal(18,2)         -- Consider: decimal(19,4) or MONEY type

-- Weight precision too low:
GrossWeight decimal(18,2)    -- Should be: decimal(18,3) or decimal(18,4)

-- String FKs:
EntryUser nvarchar(50)       -- Should reference UserId (bigint)
ApprovedBy nvarchar(50)

-- Mixed ID types:
AccId bigint
AccCode nvarchar(50)
-- Using both as composite PK creates confusion
```

**Modernization:**
```sql
-- PostgreSQL best practices:
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
timestamps TIMESTAMPTZ (always with timezone)
amounts DECIMAL(19,4)  -- Exact precision for money
weights DECIMAL(18,3)  -- Extra precision for weights
booleans BOOLEAN (not bit)
enums Use ENUM types or lookup tables
```

### 5.2 NULL Handling

**Issues:**
- Too many nullable columns (unclear if NULL = 0 or no data)
- No default values where appropriate
- NULL semantics unclear (e.g., NULL Debit means 0 or error?)

**Recommendation:**
```sql
-- Be explicit with NULLs and defaults:
quantity DECIMAL(18,2) NOT NULL CHECK (quantity > 0)
rate DECIMAL(18,2) NOT NULL CHECK (rate >= 0)
discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100)
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

---

## 6. Normalization Analysis

### 6.1 Current Normalization Level: ~3NF

**Good:**
- Separate master-detail tables
- No repeating groups
- Most transitive dependencies eliminated

**Issues:**

**Denormalization for Performance (Good):**
- Invoice detail stores InwardDate, OutwardDate (from GRN/GDN)
- Computed fields cached (MonthsToCharge, LabourAmount)
- Account names duplicated in voucher descriptions

**Inappropriate Denormalization (Bad):**
- Contact info in accounts table (should be separate)
- AccId and AccCode both in primary key (choose one)
- Product names repeated in multiple places

**Missing Normalization:**
- Tax rates should be in separate table with history
- Unit prices should have effective date ranges
- Account types should be lookup table

**Recommendation:**
```sql
-- Separate contact information:
CREATE TABLE accounting.accounts (
    account_id UUID PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE,
    account_name VARCHAR(200),
    -- No contact fields here
);

CREATE TABLE accounting.account_contacts (
    contact_id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounting.accounts(account_id),
    contact_type contact_type_enum,
    -- All contact fields here
);

-- Tax rates with history:
CREATE TABLE accounting.tax_rates (
    tax_rate_id UUID PRIMARY KEY,
    tax_name VARCHAR(100),
    tax_type tax_type_enum,
    rate DECIMAL(5,2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Price lists with date ranges:
CREATE TABLE products.price_lists (
    price_list_id UUID PRIMARY KEY,
    product_id UUID REFERENCES products.products(product_id),
    price_type price_type_enum,  -- 'RENTAL', 'SALE', etc.
    unit_price DECIMAL(19,4),
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## 7. Security Issues

### 7.1 Data Security

**Current:** **None detected**

**Missing:**
1. **Encryption at rest** - Database files not encrypted
2. **Column-level encryption** - Sensitive data (passwords, tax IDs) in plain text
3. **Row-level security** - No multi-tenancy support
4. **Dynamic data masking** - All users see all data
5. **Transparent data encryption (TDE)** - Not enabled

**Recommendations:**
```sql
-- PostgreSQL row-level security:
ALTER TABLE accounting.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_access_policy ON accounting.accounts
    FOR ALL
    TO app_user
    USING (
        -- Users can only see accounts they have permission for
        EXISTS (
            SELECT 1 FROM auth.user_permissions
            WHERE user_id = current_user_id()
            AND (
                resource = 'accounts'
                OR resource = 'all'
            )
        )
    );

-- Column encryption for sensitive data:
CREATE EXTENSION pgcrypto;

ALTER TABLE auth.users 
    ALTER COLUMN mfa_secret TYPE BYTEA
    USING pgp_sym_encrypt(mfa_secret, encryption_key());
```

### 7.2 SQL Injection Prevention

**Current:** Mostly safe (parameterized queries in code)

**Risk Areas:**
- Some dynamic SQL in report generation
- String concatenation in search queries

**Database-Level Protection:**
```sql
-- Use least privilege:
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE schema.table_name TO app_user;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Use stored procedures for critical operations:
CREATE PROCEDURE accounting.post_journal_voucher(
    p_voucher_data JSONB
) AS $$
    -- Controlled SQL execution
    -- No dynamic SQL
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8. Performance Recommendations

### 8.1 Indexing Strategy

**Current:** Only PK indexes (39 total)  
**Recommended:** Add 50-100 indexes based on query patterns

**Priority Indexes:**
```sql
-- High-priority (query optimization):
CREATE INDEX idx_grn_customer_date ON warehouse.goods_receipt_master(customer_account_id, receipt_date DESC);
CREATE INDEX idx_invoice_customer_pending ON invoices.invoice_master(customer_account_id, invoice_date) WHERE is_approved = FALSE;
CREATE INDEX idx_inventory_location ON warehouse.goods_receipt_details(room_id, rack_id, product_id) WHERE outward_date IS NULL;

-- Medium-priority (FK support):
CREATE INDEX idx_invoice_detail_grn_fk ON invoices.invoice_details(grn_detail_id);
CREATE INDEX idx_voucher_detail_account_fk ON accounting.voucher_details(account_id);

-- Low-priority (reporting):
CREATE INDEX idx_invoice_date_month ON invoices.invoice_master(DATE_TRUNC('month', invoice_date));
CREATE INDEX idx_account_hierarchy ON accounting.accounts(parent_account_id, account_level);
```

### 8.2 Query Optimization

**Recommendations:**
```sql
-- Partitioning for large tables (invoices, vouchers):
CREATE TABLE invoices.invoice_master_2024 PARTITION OF invoices.invoice_master
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized views for reports:
CREATE MATERIALIZED VIEW reports.inventory_summary AS
SELECT 
    room_id,
    product_id,
    SUM(quantity) as total_quantity,
    COUNT(*) as lot_count
FROM warehouse.goods_receipt_details
WHERE outward_date IS NULL
GROUP BY room_id, product_id;

CREATE INDEX ON reports.inventory_summary(room_id, product_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY reports.inventory_summary;

-- Full-text search indexes:
CREATE INDEX idx_account_search ON accounting.accounts 
    USING GIN(to_tsvector('english', account_name || ' ' || COALESCE(contact_name, '')));
```

### 8.3 Database Maintenance

**Missing:**
- Index maintenance jobs
- Statistics updates
- Vacuum/analyze schedules
- Backup strategy documentation

**Recommendations:**
```sql
-- PostgreSQL auto-vacuum tuning:
ALTER TABLE accounting.journal_voucher_detail 
    SET (autovacuum_vacuum_scale_factor = 0.1);

-- Statistics update:
CREATE OR REPLACE PROCEDURE maintain_statistics()
AS $$
BEGIN
    ANALYZE accounting.accounts;
    ANALYZE invoices.invoice_master;
    ANALYZE warehouse.goods_receipt_master;
    -- Add all frequently queried tables
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron:
SELECT cron.schedule('analyze-tables', '0 2 * * *', 'CALL maintain_statistics()');
```

---

## 9. Migration to PostgreSQL

### 9.1 Data Type Mappings

| SQL Server | PostgreSQL | Notes |
|------------|------------|-------|
| `bigint IDENTITY` | `BIGSERIAL` or `UUID` | Recommend UUID for modern apps |
| `nvarchar(n)` | `VARCHAR(n)` | PostgreSQL UTF-8 by default |
| `datetime` | `TIMESTAMPTZ` | Always use with timezone |
| `date` | `DATE` | Same |
| `decimal(p,s)` | `DECIMAL(p,s)` or `NUMERIC` | Same |
| `bit` | `BOOLEAN` | Native boolean type |
| `nvarchar(MAX)` | `TEXT` | No length limit |

### 9.2 Feature Differences

**SQL Server → PostgreSQL:**
- `IDENTITY` → `SERIAL` or `UUID` with `gen_random_uuid()`
- `GETDATE()` → `NOW()` or `CURRENT_TIMESTAMP`
- `ISNULL(x, y)` → `COALESCE(x, y)`
- `LEN(str)` → `LENGTH(str)`
- `CONVERT(type, value)` → `value::type` or `CAST(value AS type)`
- Case insensitive by default → Use `ILIKE` or `citext` extension
- Composite PKs allowed → Same (but not recommended)

### 9.3 Schema Modernization Plan

```sql
-- Step 1: Create schema organization
CREATE SCHEMA accounting;
CREATE SCHEMA warehouse;
CREATE SCHEMA products;
CREATE SCHEMA invoices;
CREATE SCHEMA auth;
CREATE SCHEMA reporting;

-- Step 2: Create ENUM types
CREATE TYPE account_type AS ENUM (...);
CREATE TYPE voucher_type AS ENUM (...);

-- Step 3: Create base tables with modern structure
CREATE TABLE accounting.accounts (...);
CREATE TABLE products.products (...);

-- Step 4: Add indexes
CREATE INDEX ...;

-- Step 5: Add constraints (FK, CHECK)
ALTER TABLE ... ADD CONSTRAINT ...;

-- Step 6: Create views for backward compatibility
CREATE VIEW dbo.tblAccChartOfAccounts AS 
SELECT account_id as "AccId", ... FROM accounting.accounts;

-- Step 7: Create triggers for audit
CREATE TRIGGER ... EXECUTE FUNCTION ...;

-- Step 8: Migrate data
INSERT INTO accounting.accounts (account_code, account_name, ...)
SELECT AccCode, AccName, ... FROM legacy.tblAccChartOfAccounts;
```

---

## 10. Recommendations Summary

### 10.1 Critical (Fix First)

1. **Add Foreign Key Constraints** - Enforce referential integrity (50+ missing FKs)
2. **Add Check Constraints** - Validate data at database level (30+ needed)
3. **Fix Password Storage** - Use proper hashing (bcrypt/Argon2), not encryption
4. **Add Indexes** - Query optimization (50+ indexes needed)
5. **Implement Audit Trail** - Track all changes (updated_by, updated_at, history tables)

### 10.2 Important (Phased Approach)

6. **Normalize Contact Data** - Separate from accounts table
7. **Add Soft Deletes** - deleted_at instead of hard deletes
8. **Implement RBAC** - Replace boolean permission flags with roles/permissions
9. **Add Data Validation** - Business rules in database (triggers, functions)
10. **Create Missing Indexes** - Foreign keys and query optimization

### 10.3 Enhancements (Future)

11. **Partitioning** - Large tables by date
12. **Materialized Views** - Fast reporting
13. **Full-Text Search** - Better search UX
14. **Row-Level Security** - Multi-tenancy support
15. **Temporal Tables** - Complete change history

---

## Conclusion

The Izhan database is **functionally complete but architecturally outdated**. It successfully supports the business operations but lacks modern database features essential for scalability, security, and maintainability.

**Strengths:**
- Clear master-detail pattern consistently applied
- Reasonable normalization (3NF mostly)
- Comprehensive business data model
- Working system with real data

**Critical Weaknesses:**
- Missing 50+ foreign key constraints (data integrity risk)
- No indexes except primary keys (performance issues)
- Weak security (password encryption, no RLS)
- Limited audit trail (only created, not updated/deleted)
- No data validation at database level

**Migration Strategy:**
1. **Schema Redesign** - PostgreSQL with proper constraints, indexes, audit
2. **Data Migration** - ETL process with validation
3. **Backward Compatibility** - Views for legacy structure during transition
4. **Performance Testing** - Validate query performance with new schema
5. **Gradual Rollout** - Parallel run, then cutover

**Estimated Effort:**
- Schema redesign: 2-3 weeks
- Data migration scripts: 1-2 weeks
- Testing & validation: 2-3 weeks
- **Total: 5-8 weeks** for database modernization

**Next Document:** `legacy_workflows.md` - Detailed business process documentation

---

**Document Version:** 1.0  
**Author:** ERP Modernization AI Architect  
**Next Document:** `legacy_workflows.md`

