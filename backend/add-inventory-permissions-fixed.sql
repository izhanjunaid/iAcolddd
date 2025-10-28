-- =================================================================
-- ADD INVENTORY PERMISSIONS TO ADVANCE ERP DATABASE
-- Fix: Using correct table names (permissions, role_permissions)
-- =================================================================

-- Insert inventory permissions if they don't exist
INSERT INTO "permissions" ("code", "name", "description", "module", "created_at") VALUES
('inventory.items.create', 'Create inventory', 'Permission to create inventory', 'inventory', NOW()),
('inventory.items.read', 'Read inventory', 'Permission to read inventory', 'inventory', NOW()),
('inventory.items.update', 'Update inventory', 'Permission to update inventory', 'inventory', NOW()),
('inventory.items.delete', 'Delete inventory', 'Permission to delete inventory', 'inventory', NOW()),
('inventory.transactions.create', 'Create transactions', 'Permission to create transactions', 'inventory', NOW()),
('inventory.transactions.read', 'Read transactions', 'Permission to read transactions', 'inventory', NOW()),
('inventory.transactions.post', 'Post transactions', 'Permission to post transactions', 'inventory', NOW()),
('inventory.transactions.reverse', 'Reverse transactions', 'Permission to reverse transactions', 'inventory', NOW()),
('inventory.balances.read', 'Read balances', 'Permission to read balances', 'inventory', NOW()),
('inventory.reports.read', 'Read reports', 'Permission to read reports', 'inventory', NOW()),
('reports.view', 'View reports', 'Permission to view reports', 'reports', NOW()),
('reports.export', 'Export reports', 'Permission to export reports', 'reports', NOW()),
('settings.manage', 'Manage settings', 'Permission to manage settings', 'settings', NOW())
ON CONFLICT (code) DO NOTHING;

-- Get the Super Admin role ID and add permissions
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin' 
AND p.code IN (
    'inventory.items.create',
    'inventory.items.read', 
    'inventory.items.update',
    'inventory.items.delete',
    'inventory.transactions.create',
    'inventory.transactions.read',
    'inventory.transactions.post',
    'inventory.transactions.reverse',
    'inventory.balances.read',
    'inventory.reports.read',
    'reports.view',
    'reports.export',
    'settings.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verify permissions were added
SELECT 
    'SUCCESS: Added ' || COUNT(*) || ' inventory permissions to Super Admin role' as result
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'Super Admin' 
AND p.code LIKE 'inventory%';
