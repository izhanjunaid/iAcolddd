-- Add inventory permissions to Super Admin role
INSERT INTO "permission" ("permission") VALUES 
('inventory.items.create'),
('inventory.items.read'),
('inventory.items.update'),
('inventory.items.delete'),
('inventory.transactions.create'),
('inventory.transactions.read'),
('inventory.transactions.post'),
('inventory.transactions.reverse'),
('inventory.balances.read'),
('inventory.reports.read')
ON CONFLICT ("permission") DO NOTHING;

-- Add permissions to Super Admin role
INSERT INTO "role_permission" ("role_id", "permission_id") 
SELECT r.id, p.id 
FROM "role" r, "permission" p 
WHERE r.name = 'Super Admin' 
  AND p.permission IN (
    'inventory.items.create',
    'inventory.items.read',
    'inventory.items.update',
    'inventory.items.delete',
    'inventory.transactions.create',
    'inventory.transactions.read',
    'inventory.transactions.post',
    'inventory.transactions.reverse',
    'inventory.balances.read',
    'inventory.reports.read'
  )
ON CONFLICT DO NOTHING;

-- Verify the permissions were added
SELECT p.permission 
FROM permission p 
JOIN role_permission rp ON p.id = rp.permission_id 
JOIN role r ON r.id = rp.role_id 
WHERE r.name = 'Super Admin' 
  AND p.permission LIKE 'inventory.%'
ORDER BY p.permission;
