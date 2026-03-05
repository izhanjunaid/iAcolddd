-- Fix CoA and GL Configuration mappings to reach 100/100 GAAP & IRS Score

BEGIN;

-- 1. Correct Hierarchy Violations
-- Upgrade DETAIL accounts that have children or act as controls to SUB_CONTROL to prevent direct posting
UPDATE "accounts" SET "account_type" = 'SUB_CONTROL' WHERE "name" = 'Cold Storage Revenue';
UPDATE "accounts" SET "account_type" = 'SUB_CONTROL' WHERE "name" = 'Service Revenue';

-- 2. Set Cash/Bank Flags correctly
UPDATE "accounts" SET "is_cash_account" = true WHERE "name" = 'Cash in Hand';
UPDATE "accounts" SET "is_bank_account" = true WHERE "name" = 'Cash at Bank';

-- 3. Fix GL Configurations (Decouple Taxes/Assets)
-- Update config pointing to correct existing physical accounts
-- Update GST Payable config
UPDATE "gl_account_configuration" 
SET "account_id" = (SELECT id FROM accounts WHERE name = 'GST Payable') 
WHERE "config_key" = 'GST_PAYABLE';

-- Update WHT Receivable config
UPDATE "gl_account_configuration" 
SET "account_id" = (SELECT id FROM accounts WHERE name = 'WHT Receivable') 
WHERE "config_key" = 'WHT_RECEIVABLE';

-- Insert missing Accrual/Depreciation/Tax GL mappings
INSERT INTO "gl_account_configuration" ("id", "config_key", "account_id", "description")
VALUES 
  (gen_random_uuid(), 'INCOME_TAX_PAYABLE', (SELECT id FROM accounts WHERE name = 'Income Tax Payable'), 'Default provision for income tax payable'),
  (gen_random_uuid(), 'PREPAID_EXPENSES', (SELECT id FROM accounts WHERE name = 'Prepaid Expenses'), 'Default prepaid expenses (Asset)'),
  (gen_random_uuid(), 'ACCRUED_EXPENSES', (SELECT id FROM accounts WHERE name = 'Accrued Expenses'), 'Default accrued expenses (Liability)'),
  (gen_random_uuid(), 'UNEARNED_REVENUE', (SELECT id FROM accounts WHERE name = 'Unearned Revenue'), 'Default unearned revenue (Liability)'),
  (gen_random_uuid(), 'WHT_PAYABLE', (SELECT id FROM accounts WHERE name = 'WHT Payable'), 'WHT payable to tax authority'),
  (gen_random_uuid(), 'DEPRECIATION_EXPENSE', (SELECT id FROM accounts WHERE name = 'Depreciation Expense'), 'Depreciation Expense'),
  (gen_random_uuid(), 'ACCUMULATED_DEPRECIATION', (SELECT id FROM accounts WHERE name = 'Accumulated Depreciation'), 'Accumulated Depreciation')
ON CONFLICT ("config_key") DO UPDATE SET "account_id" = EXCLUDED.account_id;

-- Make sure RETAINED EARNINGS exists in config mapping
INSERT INTO "gl_account_configuration" ("id", "config_key", "account_id", "description")
SELECT gen_random_uuid(), 'RETAINED_EARNINGS', id, 'Year End Retained Earnings' FROM accounts WHERE name = 'Retained Earnings'
ON CONFLICT ("config_key") DO NOTHING;

COMMIT;
