-- =====================================================
-- PHASE 2: INVENTORY SUB-LEDGER MIGRATION
-- =====================================================
-- Date: October 26, 2025
-- System: Advance ERP - Cold Storage Management
-- Description: Creates complete inventory management system

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

CREATE TYPE inventory_transaction_type_enum AS ENUM(
    'RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT'
);

CREATE TYPE inventory_reference_type_enum AS ENUM(
    'GRN', 'GDN', 'TRANSFER', 'ADJUSTMENT', 'PURCHASE_ORDER', 
    'SALES_ORDER', 'PHYSICAL_COUNT', 'SYSTEM_ADJUSTMENT'
);

CREATE TYPE unit_of_measure_enum AS ENUM(
    'KG', 'GRAM', 'TON', 'POUND', 'PALLET', 'CARTON', 'BAG', 'SACK',
    'LITER', 'ML', 'GALLON', 'PIECE', 'DOZEN', 'CONTAINER', 'TRAY'
);

-- =====================================================
-- 2. CREATE WAREHOUSES TABLE
-- =====================================================

CREATE TABLE warehouses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_warehouses PRIMARY KEY (id),
    CONSTRAINT uq_warehouses_code UNIQUE (code)
);

-- =====================================================
-- 3. CREATE ROOMS TABLE
-- =====================================================

CREATE TABLE rooms (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    temperature_range VARCHAR(50),
    capacity_tons DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_rooms PRIMARY KEY (id),
    CONSTRAINT uq_rooms_warehouse_code UNIQUE (warehouse_id, code),
    CONSTRAINT fk_rooms_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE
);

-- =====================================================
-- 4. CREATE INVENTORY_ITEMS TABLE
-- =====================================================

CREATE TABLE inventory_items (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure unit_of_measure_enum NOT NULL,
    is_perishable BOOLEAN NOT NULL DEFAULT FALSE,
    shelf_life_days INTEGER,
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    standard_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    last_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    CONSTRAINT pk_inventory_items PRIMARY KEY (id),
    CONSTRAINT uq_inventory_items_sku UNIQUE (sku),
    CONSTRAINT fk_inventory_items_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_items_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT
);

-- =====================================================
-- 5. CREATE INVENTORY_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE inventory_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) NOT NULL,
    transaction_type inventory_transaction_type_enum NOT NULL,
    transaction_date DATE NOT NULL,
    reference_type inventory_reference_type_enum,
    reference_id UUID,
    reference_number VARCHAR(50),
    item_id UUID NOT NULL,
    customer_id UUID,
    warehouse_id UUID NOT NULL,
    room_id UUID,
    from_warehouse_id UUID,
    from_room_id UUID,
    to_warehouse_id UUID,
    to_room_id UUID,
    quantity DECIMAL(18,3) NOT NULL,
    unit_of_measure unit_of_measure_enum NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL,
    total_cost DECIMAL(18,2) NOT NULL,
    lot_number VARCHAR(50),
    batch_number VARCHAR(50),
    expiry_date DATE,
    manufacture_date DATE,
    is_posted_to_gl BOOLEAN NOT NULL DEFAULT FALSE,
    gl_voucher_id UUID,
    fiscal_period_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    notes TEXT,
    CONSTRAINT pk_inventory_transactions PRIMARY KEY (id),
    CONSTRAINT uq_inventory_transactions_number UNIQUE (transaction_number),
    CONSTRAINT fk_inventory_transactions_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_from_warehouse FOREIGN KEY (from_warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_from_room FOREIGN KEY (from_room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_to_warehouse FOREIGN KEY (to_warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_to_room FOREIGN KEY (to_room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_gl_voucher FOREIGN KEY (gl_voucher_id) REFERENCES voucher_master (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_fiscal_period FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
);

-- =====================================================
-- 6. CREATE INVENTORY_BALANCES TABLE
-- =====================================================

CREATE TABLE inventory_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    customer_id UUID,
    warehouse_id UUID NOT NULL,
    room_id UUID,
    lot_number VARCHAR(50),
    quantity_on_hand DECIMAL(18,3) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(18,3) NOT NULL DEFAULT 0,
    quantity_available DECIMAL(18,3) NOT NULL DEFAULT 0,
    weighted_average_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    last_movement_date DATE,
    last_movement_type inventory_transaction_type_enum,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_inventory_balances PRIMARY KEY (id),
    CONSTRAINT uq_inventory_balances_location UNIQUE (item_id, customer_id, warehouse_id, room_id, lot_number),
    CONSTRAINT fk_inventory_balances_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_balances_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_balances_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_balances_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
);

-- =====================================================
-- 7. CREATE INVENTORY_COST_LAYERS TABLE
-- =====================================================

CREATE TABLE inventory_cost_layers (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    customer_id UUID,
    warehouse_id UUID NOT NULL,
    room_id UUID,
    lot_number VARCHAR(50),
    receipt_date DATE NOT NULL,
    receipt_reference VARCHAR(50),
    receipt_transaction_id UUID,
    original_quantity DECIMAL(18,3) NOT NULL,
    remaining_quantity DECIMAL(18,3) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL,
    is_fully_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_inventory_cost_layers PRIMARY KEY (id),
    CONSTRAINT fk_inventory_cost_layers_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_cost_layers_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_cost_layers_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_cost_layers_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_cost_layers_receipt_transaction FOREIGN KEY (receipt_transaction_id) REFERENCES inventory_transactions (id) ON DELETE SET NULL
);

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Inventory items indexes
CREATE INDEX idx_inventory_items_sku ON inventory_items (sku);
CREATE INDEX idx_inventory_items_category ON inventory_items (category);
CREATE INDEX idx_inventory_items_active ON inventory_items (is_active);

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions (item_id);
CREATE INDEX idx_inventory_transactions_customer ON inventory_transactions (customer_id);
CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions (warehouse_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions (transaction_date);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions (transaction_type);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions (reference_type, reference_number);

-- Inventory balances indexes
CREATE INDEX idx_inventory_balances_item ON inventory_balances (item_id);
CREATE INDEX idx_inventory_balances_customer ON inventory_balances (customer_id);
CREATE INDEX idx_inventory_balances_warehouse ON inventory_balances (warehouse_id);
CREATE INDEX idx_inventory_balances_quantity ON inventory_balances (quantity_on_hand) WHERE quantity_on_hand > 0;

-- Inventory cost layers indexes (critical for FIFO performance)
CREATE INDEX idx_inventory_cost_layers_item ON inventory_cost_layers (item_id);
CREATE INDEX idx_inventory_cost_layers_customer ON inventory_cost_layers (customer_id);
CREATE INDEX idx_inventory_cost_layers_warehouse ON inventory_cost_layers (warehouse_id);
CREATE INDEX idx_inventory_cost_layers_receipt_date ON inventory_cost_layers (receipt_date);
CREATE INDEX idx_inventory_cost_layers_remaining ON inventory_cost_layers (remaining_quantity) WHERE remaining_quantity > 0;
CREATE INDEX idx_inventory_cost_layers_fifo ON inventory_cost_layers (item_id, customer_id, warehouse_id, receipt_date);

-- =====================================================
-- 9. INSERT SAMPLE DATA
-- =====================================================

-- Sample warehouses
INSERT INTO warehouses (code, name, address, is_active) VALUES
('WH001', 'Main Cold Storage', '123 Cold Storage Lane, Karachi', TRUE),
('WH002', 'Secondary Cold Storage', '456 Freezer Street, Lahore', TRUE),
('WH003', 'Dry Storage Facility', '789 Ambient Ave, Islamabad', TRUE);

-- Sample rooms
INSERT INTO rooms (warehouse_id, code, name, temperature_range, capacity_tons) 
SELECT 
    w.id,
    r.code,
    r.name,
    r.temperature_range,
    r.capacity_tons
FROM warehouses w
CROSS JOIN (VALUES
    ('R001', 'Frozen Section A', '-18°C to -15°C', 500.00),
    ('R002', 'Frozen Section B', '-18°C to -15°C', 500.00),
    ('R003', 'Chilled Section A', '2°C to 4°C', 300.00),
    ('R004', 'Chilled Section B', '2°C to 4°C', 300.00),
    ('R005', 'Dry Storage A', '15°C to 25°C', 200.00)
) r(code, name, temperature_range, capacity_tons)
WHERE w.code IN ('WH001', 'WH002');

-- Add sample inventory items for testing
INSERT INTO inventory_items (
    sku, name, description, category, unit_of_measure, 
    is_perishable, shelf_life_days, min_temperature, max_temperature,
    standard_cost, created_by
) 
SELECT 
    i.sku,
    i.name,
    i.description,
    i.category,
    i.unit_of_measure::unit_of_measure_enum,
    i.is_perishable,
    i.shelf_life_days,
    i.min_temperature,
    i.max_temperature,
    i.standard_cost,
    u.id
FROM (VALUES
    ('RICE001', 'Basmati Rice Premium', 'High quality basmati rice for export', 'Grains', 'BAG', FALSE, NULL, 15, 25, 25.00),
    ('MEAT001', 'Beef Frozen Cuts', 'Premium frozen beef cuts', 'Meat', 'KG', TRUE, 180, -18, -15, 800.00),
    ('DAIRY001', 'Milk Powder', 'Full cream milk powder', 'Dairy', 'KG', TRUE, 365, 2, 4, 150.00),
    ('FRUIT001', 'Frozen Mangoes', 'IQF frozen mango chunks', 'Fruits', 'KG', TRUE, 720, -18, -15, 200.00),
    ('VEG001', 'Frozen Vegetables Mix', 'Mixed frozen vegetables', 'Vegetables', 'KG', TRUE, 540, -18, -15, 120.00)
) i(sku, name, description, category, unit_of_measure, is_perishable, shelf_life_days, min_temperature, max_temperature, standard_cost)
CROSS JOIN (
    SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1
) u;

-- =====================================================
-- 10. ADD INVENTORY PERMISSIONS 
-- =====================================================

-- Insert permissions if they don't exist
INSERT INTO permissions (code, module, action, description)
VALUES 
    ('inventory.items.create', 'inventory', 'items.create', 'Create inventory items'),
    ('inventory.items.read', 'inventory', 'items.read', 'View inventory items'),
    ('inventory.items.update', 'inventory', 'items.update', 'Update inventory items'),
    ('inventory.items.delete', 'inventory', 'items.delete', 'Delete inventory items'),
    ('inventory.transactions.create', 'inventory', 'transactions.create', 'Create inventory transactions'),
    ('inventory.transactions.read', 'inventory', 'transactions.read', 'View inventory transactions'),
    ('inventory.transactions.post', 'inventory', 'transactions.post', 'Post transactions to GL'),
    ('inventory.transactions.reverse', 'inventory', 'transactions.reverse', 'Reverse GL postings'),
    ('inventory.balances.read', 'inventory', 'balances.read', 'View inventory balances'),
    ('inventory.reports.read', 'inventory', 'reports.read', 'View inventory reports')
ON CONFLICT (code) DO NOTHING;

-- Assign all inventory permissions to Super Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin' 
AND p.code LIKE 'inventory.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '[SUCCESS] Phase 2 Inventory System migration completed successfully!' as status;
SELECT 'Created: 6 tables, 5 sample items, 3 warehouses, 10 rooms, 10 permissions' as summary;

