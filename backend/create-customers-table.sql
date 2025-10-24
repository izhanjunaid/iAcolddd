-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
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
    grace_days INTEGER DEFAULT 3,
    
    -- Tax Information
    tax_id VARCHAR(50),
    gst_number VARCHAR(50),
    
    -- Accounting Link (CRITICAL: Links to Chart of Accounts)
    receivable_account_id UUID NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Additional metadata (flexible for future extensions)
    metadata JSONB,
    
    -- Audit Trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    
    -- Foreign Keys
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_receivable_account ON customers(receivable_account_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

