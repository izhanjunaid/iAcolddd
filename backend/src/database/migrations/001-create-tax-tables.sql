-- ============================================================================
-- TAX MODULE DATABASE MIGRATION
-- Date: October 28, 2025
-- Purpose: Create tables for tax calculation system (GST, WHT, etc.)
-- ============================================================================

-- Create enum types for tax
CREATE TYPE tax_type_enum AS ENUM (
    'GST',
    'WHT',
    'INCOME_TAX',
    'PROVINCIAL_TAX',
    'CUSTOM_DUTY',
    'EXCISE_DUTY'
);

CREATE TYPE tax_applicability_enum AS ENUM (
    'ALL',
    'REGISTERED',
    'UNREGISTERED',
    'COMPANY',
    'INDIVIDUAL',
    'IMPORT',
    'EXPORT',
    'LOCAL'
);

CREATE TYPE tax_entity_type_enum AS ENUM (
    'CUSTOMER',
    'PRODUCT',
    'PRODUCT_CATEGORY',
    'TRANSACTION'
);

-- ============================================================================
-- TAX RATES TABLE
-- ============================================================================

CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    tax_type tax_type_enum NOT NULL,
    applicability tax_applicability_enum NOT NULL DEFAULT 'ALL',
    rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- GL Account for tax liability (e.g., GST Payable, WHT Payable)
    liability_account_code VARCHAR(20) REFERENCES accounts(code),

    -- Metadata for additional configuration
    metadata JSONB,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_effective_dates CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    )
    -- Note: Default rate uniqueness per tax type is enforced at application level
);

-- Indexes for tax_rates
CREATE INDEX idx_tax_rates_type ON tax_rates(tax_type) WHERE is_active = TRUE;
CREATE INDEX idx_tax_rates_active ON tax_rates(is_active);
CREATE INDEX idx_tax_rates_effective_dates ON tax_rates(effective_from, effective_to);
CREATE INDEX idx_tax_rates_default ON tax_rates(tax_type, is_default) WHERE is_default = TRUE;

-- Comments
COMMENT ON TABLE tax_rates IS 'Master table for all tax rates (GST, WHT, Income Tax, etc.)';
COMMENT ON COLUMN tax_rates.tax_type IS 'Type of tax: GST, WHT, INCOME_TAX, etc.';
COMMENT ON COLUMN tax_rates.applicability IS 'When this rate applies: ALL, REGISTERED, COMPANY, etc.';
COMMENT ON COLUMN tax_rates.rate IS 'Tax rate as percentage (e.g., 18.00 for 18%)';
COMMENT ON COLUMN tax_rates.liability_account_code IS 'GL account where tax liability is recorded';

-- ============================================================================
-- TAX CONFIGURATIONS TABLE
-- ============================================================================

CREATE TABLE tax_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type tax_entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    tax_rate_id UUID NOT NULL REFERENCES tax_rates(id) ON DELETE RESTRICT,

    -- Exemption details
    is_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    exemption_reason VARCHAR(500),
    exemption_certificate_number VARCHAR(100),
    exemption_valid_from DATE,
    exemption_valid_to DATE,

    -- Metadata
    metadata JSONB,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one tax config per entity per tax type
    CONSTRAINT uq_tax_config UNIQUE (entity_type, entity_id, tax_rate_id)
);

-- Indexes for tax_configurations
CREATE INDEX idx_tax_configs_entity ON tax_configurations(entity_type, entity_id);
CREATE INDEX idx_tax_configs_tax_rate ON tax_configurations(tax_rate_id);
CREATE INDEX idx_tax_configs_exempt ON tax_configurations(is_exempt) WHERE is_exempt = TRUE;

-- Comments
COMMENT ON TABLE tax_configurations IS 'Entity-specific tax configurations (customer, product exemptions, etc.)';
COMMENT ON COLUMN tax_configurations.entity_type IS 'Type of entity: CUSTOMER, PRODUCT, PRODUCT_CATEGORY';
COMMENT ON COLUMN tax_configurations.entity_id IS 'UUID of the entity (customer_id, product_id, etc.)';
COMMENT ON COLUMN tax_configurations.is_exempt IS 'Whether this entity is tax-exempt';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_tax_rates_updated_at
    BEFORE UPDATE ON tax_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_configurations_updated_at
    BEFORE UPDATE ON tax_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT TAX RATES (Pakistan)
-- ============================================================================

-- Insert default GST rates
INSERT INTO tax_rates (name, description, tax_type, applicability, rate, is_active, effective_from, is_default, liability_account_code)
VALUES
    ('Standard GST - 18%', 'Standard General Sales Tax rate in Pakistan', 'GST', 'ALL', 18.00, TRUE, '2025-01-01', TRUE, '2-0001-0002-0001'),
    ('Reduced GST - 17%', 'Reduced GST rate for certain items', 'GST', 'ALL', 17.00, TRUE, '2025-01-01', FALSE, '2-0001-0002-0001'),
    ('Zero-rated GST - 0%', 'Zero-rated GST for exports', 'GST', 'EXPORT', 0.00, TRUE, '2025-01-01', FALSE, '2-0001-0002-0001');

-- Insert default WHT rates
INSERT INTO tax_rates (name, description, tax_type, applicability, rate, is_active, effective_from, is_default, liability_account_code)
VALUES
    ('WHT Company - 4%', 'Withholding tax for companies', 'WHT', 'COMPANY', 4.00, TRUE, '2025-01-01', TRUE, '2-0001-0002-0002'),
    ('WHT Individual - 1%', 'Withholding tax for individuals', 'WHT', 'INDIVIDUAL', 1.00, TRUE, '2025-01-01', FALSE, '2-0001-0002-0002'),
    ('WHT Services - 0.1%', 'Withholding tax on services', 'WHT', 'ALL', 0.10, TRUE, '2025-01-01', FALSE, '2-0001-0002-0002');

-- Insert default Income Tax rates
INSERT INTO tax_rates (name, description, tax_type, applicability, rate, is_active, effective_from, is_default, liability_account_code)
VALUES
    ('Income Tax - 29%', 'Corporate income tax in Pakistan', 'INCOME_TAX', 'COMPANY', 29.00, TRUE, '2025-01-01', TRUE, '2-0001-0002-0003');

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View for currently active tax rates
CREATE OR REPLACE VIEW v_active_tax_rates AS
SELECT
    tr.id,
    tr.name,
    tr.tax_type,
    tr.applicability,
    tr.rate,
    tr.effective_from,
    tr.effective_to,
    tr.liability_account_code,
    a.name AS liability_account_name,
    tr.is_default
FROM tax_rates tr
LEFT JOIN accounts a ON tr.liability_account_code = a.code
WHERE tr.is_active = TRUE
  AND tr.effective_from <= CURRENT_DATE
  AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
ORDER BY tr.tax_type, tr.rate DESC;

-- View for tax-exempt entities
CREATE OR REPLACE VIEW v_tax_exempt_entities AS
SELECT
    tc.entity_type,
    tc.entity_id,
    tr.tax_type,
    tc.exemption_reason,
    tc.exemption_certificate_number,
    tc.exemption_valid_from,
    tc.exemption_valid_to,
    CASE
        WHEN c.id IS NOT NULL THEN c.name
        WHEN p.id IS NOT NULL THEN p.name
        ELSE 'Unknown'
    END AS entity_name
FROM tax_configurations tc
JOIN tax_rates tr ON tc.tax_rate_id = tr.id
LEFT JOIN customers c ON tc.entity_type = 'CUSTOMER' AND tc.entity_id = c.id
LEFT JOIN products p ON tc.entity_type = 'PRODUCT' AND tc.entity_id = p.id
WHERE tc.is_exempt = TRUE
  AND (tc.exemption_valid_to IS NULL OR tc.exemption_valid_to >= CURRENT_DATE);

-- ============================================================================
-- PERMISSIONS FOR TAX MODULE
-- ============================================================================

INSERT INTO permissions (code, name, module, description) VALUES
    ('tax:view', 'View Tax Rates', 'tax', 'Can view tax rates and configurations'),
    ('tax:create', 'Create Tax Rates', 'tax', 'Can create new tax rates'),
    ('tax:update', 'Update Tax Rates', 'tax', 'Can update existing tax rates'),
    ('tax:delete', 'Delete Tax Rates', 'tax', 'Can delete tax rates'),
    ('tax:configure', 'Configure Tax Exemptions', 'tax', 'Can configure entity-specific tax settings'),
    ('tax:calculate', 'Calculate Taxes', 'tax', 'Can calculate taxes for transactions');

-- Grant permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.module = 'tax';

-- ============================================================================
-- ANALYTICS QUERY EXAMPLES
-- ============================================================================

-- Example query: Get total tax collected by type for a date range
-- SELECT
--     tax_type,
--     SUM(tax_amount) AS total_collected
-- FROM invoice_master im
-- WHERE invoice_date BETWEEN '2025-01-01' AND '2025-12-31'
-- GROUP BY tax_type
-- ORDER BY total_collected DESC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Display summary
SELECT
    'Tax tables created successfully' AS status,
    COUNT(*) AS default_tax_rates_created
FROM tax_rates
WHERE is_default = TRUE;
