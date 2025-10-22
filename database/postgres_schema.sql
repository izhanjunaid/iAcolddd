-- ============================================================================
-- Advance ERP - Modern PostgreSQL Schema
-- Database: advance_erp
-- Version: 1.0
-- Date: October 15, 2025
-- 
-- Modernization Improvements:
-- - UUID primary keys for distributed systems and security
-- - Strict foreign key constraints for referential integrity
-- - JSONB columns for flexible metadata storage
-- - Audit fields (created_at, updated_at, created_by, updated_by)
-- - Soft deletes (deleted_at) for data recovery
-- - Check constraints for business rules
-- - Indexes for performance optimization
-- - Full-text search support
-- - Triggers for automated audit logging
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For multi-column indexes

-- ============================================================================
-- ENUMS (Type Definitions)
-- ============================================================================

CREATE TYPE account_type AS ENUM ('CONTROL', 'SUB_CONTROL', 'DETAIL');
CREATE TYPE account_nature AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE account_category AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE voucher_type AS ENUM ('JOURNAL', 'PAYMENT', 'RECEIPT');
CREATE TYPE payment_mode AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD', 'OTHER');
CREATE TYPE invoice_period AS ENUM ('DAILY', 'SEASONAL', 'MONTHLY');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- ============================================================================
-- SYSTEM CONFIGURATION TABLES
-- ============================================================================

-- Company Information
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(100),
    ntn VARCHAR(50),
    gst VARCHAR(50),
    sales_tax_reg VARCHAR(50),
    logo_url TEXT,
    fiscal_year_start DATE NOT NULL DEFAULT '2025-01-01',
    base_currency VARCHAR(3) DEFAULT 'PKR',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_deleted_at ON companies(deleted_at) WHERE deleted_at IS NULL;

-- Company Preferences
CREATE TABLE company_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Default account codes
    default_cash_account_code VARCHAR(20),
    default_bank_account_code VARCHAR(20),
    default_inventory_account_code VARCHAR(20),
    default_sales_account_code VARCHAR(20),
    default_purchase_account_code VARCHAR(20),
    default_income_tax_account_code VARCHAR(20),
    default_withholding_tax_account_code VARCHAR(20),
    default_rental_income_account_code VARCHAR(20),
    
    -- Business rules
    require_password_for_delete BOOLEAN DEFAULT TRUE,
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    auto_backup_interval_days INTEGER DEFAULT 7,
    default_invoice_grace_days INTEGER DEFAULT 0,
    
    -- Numbering sequences
    voucher_number_prefix_jv VARCHAR(10) DEFAULT 'JV',
    voucher_number_prefix_pv VARCHAR(10) DEFAULT 'PV',
    voucher_number_prefix_rv VARCHAR(10) DEFAULT 'RV',
    grn_number_prefix VARCHAR(10) DEFAULT 'GRN',
    gdn_number_prefix VARCHAR(10) DEFAULT 'GDN',
    invoice_number_prefix VARCHAR(10) DEFAULT 'INV',
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_preferences_company_id ON company_preferences(company_id);

-- System Settings (Key-Value Store)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- System settings cannot be deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON settings(key);

-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- System roles (Admin, User) cannot be deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NULL;

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'invoices:create', 'vouchers:delete'
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'accounting', 'inventory', 'reports', etc.
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_code ON permissions(code);

-- Role-Permission Mapping (Many-to-Many)
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    status user_status DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- User-Role Mapping (Many-to-Many)
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token) WHERE is_revoked = FALSE;
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE is_revoked = FALSE;

-- ============================================================================
-- ACCOUNTING MODULE TABLES
-- ============================================================================

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    parent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    account_type account_type NOT NULL DEFAULT 'DETAIL',
    nature account_nature NOT NULL,
    category account_category NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System accounts (Cash, Bank) cannot be deleted
    opening_balance DECIMAL(18, 2) DEFAULT 0,
    opening_date DATE,
    credit_limit DECIMAL(18, 2),
    credit_days INTEGER,
    
    -- Contact details (for customer/supplier accounts)
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_name VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(100),
    ntn VARCHAR(50),
    gst VARCHAR(50),
    
    metadata JSONB, -- Extra attributes like bank details, tax rates, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_account_code_format CHECK (code ~ '^[0-9-]+$'),
    CONSTRAINT chk_opening_balance_positive CHECK (opening_balance >= 0),
    CONSTRAINT chk_credit_limit_positive CHECK (credit_limit IS NULL OR credit_limit >= 0)
);

CREATE INDEX idx_accounts_code ON accounts(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_category ON accounts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_nature ON accounts(nature) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin(name gin_trgm_ops); -- Full-text search

-- Voucher Master (Journal, Payment, Receipt)
CREATE TABLE voucher_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    voucher_type voucher_type NOT NULL,
    voucher_date DATE NOT NULL,
    description TEXT,
    
    -- Payment/Receipt specific fields
    payment_mode payment_mode,
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(100),
    
    -- Reference to source document (GRN, GDN, Invoice)
    reference_id UUID,
    reference_type VARCHAR(50), -- 'GRN', 'GDN', 'INVOICE', etc.
    reference_number VARCHAR(50),
    
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    
    -- Reversal support
    reversed_by_voucher_id UUID REFERENCES voucher_master(id),
    is_reversed BOOLEAN DEFAULT FALSE,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT chk_posted_consistency CHECK (
        (is_posted = TRUE AND posted_at IS NOT NULL AND posted_by IS NOT NULL) OR
        (is_posted = FALSE)
    )
);

CREATE INDEX idx_voucher_master_number ON voucher_master(voucher_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_voucher_master_type ON voucher_master(voucher_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_voucher_master_date ON voucher_master(voucher_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_voucher_master_posted ON voucher_master(is_posted) WHERE deleted_at IS NULL;
CREATE INDEX idx_voucher_master_reference ON voucher_master(reference_id, reference_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_voucher_master_deleted_at ON voucher_master(deleted_at) WHERE deleted_at IS NULL;

-- Voucher Detail (Line Items)
CREATE TABLE voucher_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES voucher_master(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    description TEXT,
    debit_amount DECIMAL(18, 2) DEFAULT 0,
    credit_amount DECIMAL(18, 2) DEFAULT 0,
    line_number INTEGER NOT NULL,
    metadata JSONB, -- Extra info like cost center, project code, etc.
    
    CONSTRAINT chk_debit_positive CHECK (debit_amount >= 0),
    CONSTRAINT chk_credit_positive CHECK (credit_amount >= 0),
    CONSTRAINT chk_debit_credit_mutual CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    ),
    CONSTRAINT fk_voucher_detail_account FOREIGN KEY (account_code) 
        REFERENCES accounts(code) ON DELETE RESTRICT
);

CREATE INDEX idx_voucher_detail_voucher_id ON voucher_detail(voucher_id);
CREATE INDEX idx_voucher_detail_account_code ON voucher_detail(account_code);

-- ============================================================================
-- PRODUCT & INVENTORY TABLES
-- ============================================================================

-- Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_product_categories_code ON product_categories(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_categories_parent ON product_categories(parent_category_id) WHERE deleted_at IS NULL;

-- Product Varieties
CREATE TABLE product_varieties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_product_varieties_code ON product_varieties(code) WHERE deleted_at IS NULL;

-- Packing Types
CREATE TABLE packings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    standard_weight DECIMAL(10, 3), -- Standard weight in kg
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_packings_code ON packings(code) WHERE deleted_at IS NULL;

-- Products Master
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
    sales_account_code VARCHAR(20) REFERENCES accounts(code),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB, -- Extra attributes like HSN code, barcode, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_code ON products(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops); -- Full-text search

-- ============================================================================
-- WAREHOUSE MANAGEMENT TABLES
-- ============================================================================

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    manager_user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_warehouses_code ON warehouses(code) WHERE deleted_at IS NULL;

-- Rooms (Storage chambers/sections)
CREATE TABLE warehouse_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    capacity_kg DECIMAL(18, 2),
    temperature_celsius DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT uq_room_code UNIQUE (warehouse_id, code)
);

CREATE INDEX idx_warehouse_rooms_warehouse_id ON warehouse_rooms(warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_rooms_code ON warehouse_rooms(code) WHERE deleted_at IS NULL;

-- Racks (Storage positions within rooms)
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES warehouse_rooms(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    capacity_kg DECIMAL(18, 2),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT uq_rack_code UNIQUE (room_id, code)
);

CREATE INDEX idx_racks_room_id ON racks(room_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_racks_code ON racks(code) WHERE deleted_at IS NULL;

-- ============================================================================
-- GOODS RECEIPT NOTE (GRN) TABLES
-- ============================================================================

-- GRN Master
CREATE TABLE grn_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    manual_grn_number VARCHAR(50), -- User-entered reference number
    grn_date DATE NOT NULL,
    time_in TIME,
    supplier_account_id UUID NOT NULL REFERENCES accounts(id),
    sub_supplier_code VARCHAR(50), -- Secondary supplier reference
    builty_number VARCHAR(50), -- Transport document number
    vehicle_number VARCHAR(50),
    invoice_grace_days INTEGER DEFAULT 0,
    remarks TEXT,
    
    -- Labour and carriage charges
    labour_amount DECIMAL(18, 2) DEFAULT 0,
    labour_debit_account_code VARCHAR(20) REFERENCES accounts(code),
    labour_credit_account_code VARCHAR(20) REFERENCES accounts(code),
    carriage_amount DECIMAL(18, 2) DEFAULT 0,
    carriage_debit_account_code VARCHAR(20) REFERENCES accounts(code),
    carriage_credit_account_code VARCHAR(20) REFERENCES accounts(code),
    
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_grn_amounts_positive CHECK (
        labour_amount >= 0 AND carriage_amount >= 0
    )
);

CREATE INDEX idx_grn_master_number ON grn_master(grn_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_grn_master_date ON grn_master(grn_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_grn_master_supplier ON grn_master(supplier_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_grn_master_deleted_at ON grn_master(deleted_at) WHERE deleted_at IS NULL;

-- GRN Detail (Line Items)
CREATE TABLE grn_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES grn_master(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variety_id UUID REFERENCES product_varieties(id),
    packing_id UUID REFERENCES packings(id),
    room_id UUID NOT NULL REFERENCES warehouse_rooms(id),
    rack_id UUID REFERENCES racks(id),
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    gross_weight_kg DECIMAL(18, 3),
    net_weight_kg DECIMAL(18, 3),
    remarks TEXT,
    line_number INTEGER NOT NULL,
    metadata JSONB,
    
    CONSTRAINT chk_grn_detail_positive CHECK (
        quantity > 0 AND rate >= 0 AND amount >= 0
    )
);

CREATE INDEX idx_grn_detail_grn_id ON grn_detail(grn_id);
CREATE INDEX idx_grn_detail_product_id ON grn_detail(product_id);
CREATE INDEX idx_grn_detail_room_id ON grn_detail(room_id);

-- GRN Bag Details (Individual bag tracking for weight verification)
CREATE TABLE grn_bag_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_detail_id UUID NOT NULL REFERENCES grn_detail(id) ON DELETE CASCADE,
    bag_number VARCHAR(50) NOT NULL,
    weight_kg DECIMAL(10, 3) NOT NULL,
    remarks TEXT,
    
    CONSTRAINT chk_bag_weight_positive CHECK (weight_kg > 0)
);

CREATE INDEX idx_grn_bag_detail_grn_detail_id ON grn_bag_detail(grn_detail_id);

-- ============================================================================
-- GOODS DELIVERY NOTE (GDN) TABLES
-- ============================================================================

-- GDN Master
CREATE TABLE gdn_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gdn_number VARCHAR(50) UNIQUE NOT NULL,
    manual_gdn_number VARCHAR(50),
    gdn_date DATE NOT NULL,
    time_out TIME,
    customer_account_id UUID NOT NULL REFERENCES accounts(id),
    vehicle_number VARCHAR(50),
    remarks TEXT,
    
    -- Labour charges for delivery
    labour_amount DECIMAL(18, 2) DEFAULT 0,
    labour_debit_account_code VARCHAR(20) REFERENCES accounts(code),
    labour_credit_account_code VARCHAR(20) REFERENCES accounts(code),
    
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gdn_master_number ON gdn_master(gdn_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_gdn_master_date ON gdn_master(gdn_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_gdn_master_customer ON gdn_master(customer_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gdn_master_deleted_at ON gdn_master(deleted_at) WHERE deleted_at IS NULL;

-- GDN Detail (References GRN Detail for stock reduction)
CREATE TABLE gdn_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gdn_id UUID NOT NULL REFERENCES gdn_master(id) ON DELETE CASCADE,
    grn_detail_id UUID NOT NULL REFERENCES grn_detail(id), -- Which GRN stock to reduce
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    labour_charges DECIMAL(18, 2) DEFAULT 0,
    remarks TEXT,
    line_number INTEGER NOT NULL,
    metadata JSONB,
    
    CONSTRAINT chk_gdn_detail_positive CHECK (
        quantity > 0 AND rate >= 0 AND amount >= 0 AND labour_charges >= 0
    )
);

CREATE INDEX idx_gdn_detail_gdn_id ON gdn_detail(gdn_id);
CREATE INDEX idx_gdn_detail_grn_detail_id ON gdn_detail(grn_detail_id);

-- ============================================================================
-- INTER-ROOM TRANSFERS
-- ============================================================================

CREATE TABLE inter_room_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATE NOT NULL,
    grn_detail_id UUID NOT NULL REFERENCES grn_detail(id), -- Source GRN stock
    from_room_id UUID NOT NULL REFERENCES warehouse_rooms(id),
    from_rack_id UUID REFERENCES racks(id),
    to_room_id UUID NOT NULL REFERENCES warehouse_rooms(id),
    to_rack_id UUID REFERENCES racks(id),
    quantity DECIMAL(18, 3) NOT NULL,
    labour_charges DECIMAL(18, 2) DEFAULT 0,
    remarks TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_transfer_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_transfer_different_rooms CHECK (from_room_id != to_room_id)
);

CREATE INDEX idx_inter_room_transfers_number ON inter_room_transfers(transfer_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_inter_room_transfers_date ON inter_room_transfers(transfer_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_inter_room_transfers_grn_detail ON inter_room_transfers(grn_detail_id);

-- ============================================================================
-- OWNERSHIP TRANSFER TABLES
-- ============================================================================

-- Ownership Transfer Master (Change ownership without physical movement)
CREATE TABLE ownership_transfer_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATE NOT NULL,
    from_customer_account_id UUID NOT NULL REFERENCES accounts(id),
    to_customer_account_id UUID NOT NULL REFERENCES accounts(id),
    remarks TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_ownership_different_customers CHECK (
        from_customer_account_id != to_customer_account_id
    )
);

CREATE INDEX idx_ownership_transfer_master_number ON ownership_transfer_master(transfer_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_ownership_transfer_master_date ON ownership_transfer_master(transfer_date) WHERE deleted_at IS NULL;

-- Ownership Transfer Stock Details
CREATE TABLE ownership_transfer_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES ownership_transfer_master(id) ON DELETE CASCADE,
    grn_detail_id UUID NOT NULL REFERENCES grn_detail(id),
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    line_number INTEGER NOT NULL,
    
    CONSTRAINT chk_ownership_stock_positive CHECK (
        quantity > 0 AND rate >= 0 AND amount >= 0
    )
);

CREATE INDEX idx_ownership_transfer_stock_transfer_id ON ownership_transfer_stock(transfer_id);
CREATE INDEX idx_ownership_transfer_stock_grn_detail_id ON ownership_transfer_stock(grn_detail_id);

-- Ownership Transfer Invoices (Generated from ownership transfers)
CREATE TABLE ownership_transfer_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES ownership_transfer_master(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoice_master(id), -- Link to generated invoice
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ownership_transfer_invoices_transfer_id ON ownership_transfer_invoices(transfer_id);
CREATE INDEX idx_ownership_transfer_invoices_invoice_id ON ownership_transfer_invoices(invoice_id);

-- ============================================================================
-- INVOICE TABLES
-- ============================================================================

-- Invoice Master
CREATE TABLE invoice_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_account_id UUID NOT NULL REFERENCES accounts(id),
    
    -- Amounts
    subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
    income_tax_percent DECIMAL(5, 2) DEFAULT 0,
    income_tax_amount DECIMAL(18, 2) DEFAULT 0,
    income_tax_account_code VARCHAR(20) REFERENCES accounts(code),
    loading_amount DECIMAL(18, 2) DEFAULT 0,
    loading_account_code VARCHAR(20) REFERENCES accounts(code),
    withholding_percent DECIMAL(5, 2) DEFAULT 0,
    withholding_amount DECIMAL(18, 2) DEFAULT 0,
    withholding_account_code VARCHAR(20) REFERENCES accounts(code),
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    
    -- Payment tracking
    cash_received DECIMAL(18, 2) DEFAULT 0,
    cash_account_code VARCHAR(20) REFERENCES accounts(code),
    balance DECIMAL(18, 2) DEFAULT 0,
    
    grace_days INTEGER DEFAULT 0,
    credit_days INTEGER,
    remarks TEXT,
    
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_invoice_amounts_positive CHECK (
        subtotal >= 0 AND total_amount >= 0 AND cash_received >= 0
    )
);

CREATE INDEX idx_invoice_master_number ON invoice_master(invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_master_date ON invoice_master(invoice_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_master_customer ON invoice_master(customer_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_master_balance ON invoice_master(balance) WHERE balance > 0 AND deleted_at IS NULL;
CREATE INDEX idx_invoice_master_deleted_at ON invoice_master(deleted_at) WHERE deleted_at IS NULL;

-- Invoice Detail (Line Items)
CREATE TABLE invoice_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoice_master(id) ON DELETE CASCADE,
    grn_detail_id UUID NOT NULL REFERENCES grn_detail(id),
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    invoice_period invoice_period NOT NULL,
    months_charged DECIMAL(10, 2), -- Calculated storage months
    gross_amount DECIMAL(18, 2) NOT NULL,
    labour_charges DECIMAL(18, 2) DEFAULT 0,
    loading_charges DECIMAL(18, 2) DEFAULT 0,
    line_total DECIMAL(18, 2) NOT NULL,
    line_number INTEGER NOT NULL,
    metadata JSONB,
    
    CONSTRAINT chk_invoice_detail_positive CHECK (
        quantity > 0 AND rate >= 0 AND gross_amount >= 0 AND line_total >= 0
    )
);

CREATE INDEX idx_invoice_detail_invoice_id ON invoice_detail(invoice_id);
CREATE INDEX idx_invoice_detail_grn_detail_id ON invoice_detail(grn_detail_id);

-- ============================================================================
-- GENERAL ITEMS MANAGEMENT (NON-PRODUCT ITEMS)
-- ============================================================================

-- General Item Categories
CREATE TABLE general_item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_general_item_categories_code ON general_item_categories(code) WHERE deleted_at IS NULL;

-- General Items (Consumables, supplies, etc.)
CREATE TABLE general_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES general_item_categories(id),
    unit VARCHAR(50), -- kg, pcs, ltr, etc.
    purchase_account_code VARCHAR(20) REFERENCES accounts(code),
    sales_account_code VARCHAR(20) REFERENCES accounts(code),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_general_items_code ON general_items(code) WHERE deleted_at IS NULL;

-- General Item Purchases
CREATE TABLE gi_purchase_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_account_id UUID NOT NULL REFERENCES accounts(id),
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gi_purchase_master_number ON gi_purchase_master(purchase_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_gi_purchase_master_date ON gi_purchase_master(purchase_date) WHERE deleted_at IS NULL;

CREATE TABLE gi_purchase_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES gi_purchase_master(id) ON DELETE CASCADE,
    general_item_id UUID NOT NULL REFERENCES general_items(id),
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    line_number INTEGER NOT NULL,
    
    CONSTRAINT chk_gi_purchase_positive CHECK (quantity > 0 AND rate >= 0 AND amount >= 0)
);

CREATE INDEX idx_gi_purchase_detail_purchase_id ON gi_purchase_detail(purchase_id);

-- General Item Sales
CREATE TABLE gi_sale_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    sale_date DATE NOT NULL,
    customer_account_id UUID NOT NULL REFERENCES accounts(id),
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gi_sale_master_number ON gi_sale_master(sale_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_gi_sale_master_date ON gi_sale_master(sale_date) WHERE deleted_at IS NULL;

CREATE TABLE gi_sale_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES gi_sale_master(id) ON DELETE CASCADE,
    general_item_id UUID NOT NULL REFERENCES general_items(id),
    quantity DECIMAL(18, 3) NOT NULL,
    rate DECIMAL(18, 2) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    line_number INTEGER NOT NULL,
    
    CONSTRAINT chk_gi_sale_positive CHECK (quantity > 0 AND rate >= 0 AND amount >= 0)
);

CREATE INDEX idx_gi_sale_detail_sale_id ON gi_sale_detail(sale_id);

-- ============================================================================
-- AUDIT & LOGGING TABLES
-- ============================================================================

-- Audit Logs (Track all significant actions)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'INVOICE', 'VOUCHER', 'GRN', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'POST', 'UNPOST'
    user_id UUID NOT NULL REFERENCES users(id),
    changes_before JSONB, -- Old values (for UPDATE)
    changes_after JSONB, -- New values (for UPDATE/CREATE)
    metadata JSONB, -- Extra context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- System Activity Logs (General system events, errors, warnings)
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    message TEXT NOT NULL,
    context JSONB,
    stack_trace TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- ============================================================================
-- NOTIFICATION TABLES
-- ============================================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Deep link to related entity
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- REPORT TABLES
-- ============================================================================

-- Saved Reports (User-generated reports)
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'TRIAL_BALANCE', 'LEDGER', 'STOCK_REPORT', etc.
    parameters JSONB, -- Report filters and parameters
    file_url TEXT, -- Link to generated file (PDF/Excel)
    user_id UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Auto-delete after expiry
);

CREATE INDEX idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX idx_saved_reports_expires_at ON saved_reports(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR AUTOMATED AUDIT LOGGING
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voucher_master_updated_at BEFORE UPDATE ON voucher_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grn_master_updated_at BEFORE UPDATE ON grn_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdn_master_updated_at BEFORE UPDATE ON gdn_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_master_updated_at BEFORE UPDATE ON invoice_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Account Balances View
CREATE OR REPLACE VIEW v_account_balances AS
SELECT 
    a.id,
    a.code,
    a.name,
    a.nature,
    a.category,
    a.opening_balance,
    COALESCE(SUM(vd.debit_amount), 0) AS total_debit,
    COALESCE(SUM(vd.credit_amount), 0) AS total_credit,
    CASE 
        WHEN a.nature = 'DEBIT' THEN 
            a.opening_balance + COALESCE(SUM(vd.debit_amount - vd.credit_amount), 0)
        ELSE 
            a.opening_balance + COALESCE(SUM(vd.credit_amount - vd.debit_amount), 0)
    END AS current_balance
FROM accounts a
LEFT JOIN voucher_detail vd ON a.code = vd.account_code
LEFT JOIN voucher_master vm ON vd.voucher_id = vm.id AND vm.is_posted = TRUE AND vm.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.code, a.name, a.nature, a.category, a.opening_balance;

-- Stock Summary View
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT 
    p.id AS product_id,
    p.code AS product_code,
    p.name AS product_name,
    wr.id AS room_id,
    wr.name AS room_name,
    COALESCE(SUM(gd.quantity), 0) AS total_received,
    COALESCE(SUM(gdnd.quantity), 0) AS total_delivered,
    COALESCE(SUM(gd.quantity), 0) - COALESCE(SUM(gdnd.quantity), 0) AS current_stock
FROM products p
LEFT JOIN grn_detail gd ON p.id = gd.product_id
LEFT JOIN grn_master gm ON gd.grn_id = gm.id AND gm.deleted_at IS NULL
LEFT JOIN warehouse_rooms wr ON gd.room_id = wr.id AND wr.deleted_at IS NULL
LEFT JOIN gdn_detail gdnd ON gd.id = gdnd.grn_detail_id
LEFT JOIN gdn_master gdnm ON gdnd.gdn_id = gdnm.id AND gdnm.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name, wr.id, wr.name;

-- Outstanding Invoices View
CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT 
    im.id,
    im.invoice_number,
    im.invoice_date,
    im.customer_account_id,
    a.name AS customer_name,
    im.total_amount,
    im.cash_received,
    im.balance,
    CURRENT_DATE - im.invoice_date AS days_outstanding
FROM invoice_master im
INNER JOIN accounts a ON im.customer_account_id = a.id
WHERE im.balance > 0 
  AND im.is_posted = TRUE 
  AND im.deleted_at IS NULL
ORDER BY im.invoice_date ASC;

-- ============================================================================
-- SEED DATA (System Defaults)
-- ============================================================================

-- Insert default company
INSERT INTO companies (id, name, fiscal_year_start, base_currency)
VALUES (uuid_generate_v4(), 'Default Company', '2025-01-01', 'PKR');

-- Insert default roles
INSERT INTO roles (id, name, description, is_system) VALUES
    (uuid_generate_v4(), 'Admin', 'Full system access', TRUE),
    (uuid_generate_v4(), 'Manager', 'Manager level access', TRUE),
    (uuid_generate_v4(), 'User', 'Standard user access', TRUE),
    (uuid_generate_v4(), 'Viewer', 'Read-only access', TRUE);

-- Insert permissions (sample - expand as needed)
INSERT INTO permissions (code, name, module) VALUES
    ('accounts:view', 'View Accounts', 'accounting'),
    ('accounts:create', 'Create Accounts', 'accounting'),
    ('accounts:update', 'Update Accounts', 'accounting'),
    ('accounts:delete', 'Delete Accounts', 'accounting'),
    ('vouchers:view', 'View Vouchers', 'accounting'),
    ('vouchers:create', 'Create Vouchers', 'accounting'),
    ('vouchers:update', 'Update Vouchers', 'accounting'),
    ('vouchers:delete', 'Delete Vouchers', 'accounting'),
    ('vouchers:post', 'Post Vouchers', 'accounting'),
    ('invoices:view', 'View Invoices', 'billing'),
    ('invoices:create', 'Create Invoices', 'billing'),
    ('invoices:update', 'Update Invoices', 'billing'),
    ('invoices:delete', 'Delete Invoices', 'billing'),
    ('invoices:post', 'Post Invoices', 'billing'),
    ('grn:view', 'View GRN', 'warehouse'),
    ('grn:create', 'Create GRN', 'warehouse'),
    ('grn:update', 'Update GRN', 'warehouse'),
    ('grn:delete', 'Delete GRN', 'warehouse'),
    ('gdn:view', 'View GDN', 'warehouse'),
    ('gdn:create', 'Create GDN', 'warehouse'),
    ('gdn:update', 'Update GDN', 'warehouse'),
    ('gdn:delete', 'Delete GDN', 'warehouse'),
    ('reports:view', 'View Reports', 'reports'),
    ('reports:generate', 'Generate Reports', 'reports'),
    ('users:manage', 'Manage Users', 'system'),
    ('settings:manage', 'Manage Settings', 'system');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE accounts IS 'Chart of Accounts - foundation for all financial transactions';
COMMENT ON TABLE voucher_master IS 'Journal, Payment, and Receipt vouchers';
COMMENT ON TABLE grn_master IS 'Goods Receipt Notes - primary inventory receipt documents';
COMMENT ON TABLE gdn_master IS 'Goods Delivery Notes - inventory outbound documents';
COMMENT ON TABLE invoice_master IS 'Customer invoices for rental and services';
COMMENT ON TABLE inter_room_transfers IS 'Stock movement between warehouse rooms';
COMMENT ON TABLE ownership_transfer_master IS 'Change ownership without physical movement';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all significant actions';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Performance: Analyze tables for query planner
ANALYZE;

-- Display schema summary
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
