-- ===============================================
-- ERP AUDIT FIX MIGRATION: Batches 1 & 3
-- Date: 2026-03-02
-- Description: Fixes identified in the ERP Chart of Accounts audit
-- ===============================================

BEGIN;

-- ===============================================
-- BATCH 1.1 — Create Missing Accounts
-- ===============================================

-- Current Assets: new detail accounts
INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '1-0001-0001-0005', 'WHT Receivable', 'DETAIL', 'DEBIT', 'ASSET', 'CURRENT_ASSET', 'BALANCE_SHEET', 'a8bfe6a1-fa74-48eb-913b-8c46f2f0f558', true, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0001-0005');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '1-0001-0001-0006', 'Prepaid Expenses', 'DETAIL', 'DEBIT', 'ASSET', 'CURRENT_ASSET', 'BALANCE_SHEET', 'a8bfe6a1-fa74-48eb-913b-8c46f2f0f558', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0001-0006');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '1-0001-0001-0007', 'Advance to Suppliers', 'DETAIL', 'DEBIT', 'ASSET', 'CURRENT_ASSET', 'BALANCE_SHEET', 'a8bfe6a1-fa74-48eb-913b-8c46f2f0f558', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0001-0007');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '1-0001-0001-0008', 'GST Input Tax', 'DETAIL', 'DEBIT', 'ASSET', 'CURRENT_ASSET', 'BALANCE_SHEET', 'a8bfe6a1-fa74-48eb-913b-8c46f2f0f558', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0001-0008');

-- Non-Current Assets group
INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '1-0001-0002', 'Non-Current Assets', 'SUB_CONTROL', 'DEBIT', 'ASSET', 'FIXED_ASSET', 'BALANCE_SHEET', 'c0a1df21-453a-484b-ad0f-46e06fdaaee5', true, true, false, false, 0, NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0002');

-- PP&E and Accumulated Depreciation
INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting, is_depreciable)
SELECT gen_random_uuid(), '1-0001-0002-0001', 'Property, Plant & Equipment', 'DETAIL', 'DEBIT', 'ASSET', 'FIXED_ASSET', 'BALANCE_SHEET', (SELECT id FROM accounts WHERE code = '1-0001-0002'), false, true, false, false, 0, NOW(), NOW(), true, true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0002-0001');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting, is_depreciable)
SELECT gen_random_uuid(), '1-0001-0002-0002', 'Accumulated Depreciation', 'DETAIL', 'CREDIT', 'ASSET', 'FIXED_ASSET', 'BALANCE_SHEET', (SELECT id FROM accounts WHERE code = '1-0001-0002'), true, true, false, false, 0, NOW(), NOW(), true, false
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1-0001-0002-0002');

-- Liabilities
INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0001-0003', 'GST Payable', 'DETAIL', 'CREDIT', 'LIABILITY', 'CURRENT_LIABILITY', 'BALANCE_SHEET', 'd230ac7a-906e-4608-a718-13cfd7ce67c8', true, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0001-0003');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0001-0004', 'WHT Payable', 'DETAIL', 'CREDIT', 'LIABILITY', 'CURRENT_LIABILITY', 'BALANCE_SHEET', 'd230ac7a-906e-4608-a718-13cfd7ce67c8', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0001-0004');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0001-0005', 'Income Tax Payable', 'DETAIL', 'CREDIT', 'LIABILITY', 'CURRENT_LIABILITY', 'BALANCE_SHEET', 'd230ac7a-906e-4608-a718-13cfd7ce67c8', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0001-0005');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0001-0006', 'Accrued Expenses', 'DETAIL', 'CREDIT', 'LIABILITY', 'CURRENT_LIABILITY', 'BALANCE_SHEET', 'd230ac7a-906e-4608-a718-13cfd7ce67c8', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0001-0006');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0001-0007', 'Unearned Revenue', 'DETAIL', 'CREDIT', 'LIABILITY', 'CURRENT_LIABILITY', 'BALANCE_SHEET', 'd230ac7a-906e-4608-a718-13cfd7ce67c8', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0001-0007');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '2-0001-0002', 'Non-Current Liabilities', 'SUB_CONTROL', 'CREDIT', 'LIABILITY', 'NON_CURRENT_LIABILITY', 'BALANCE_SHEET', 'db320853-a4cd-41a4-aea5-4c188ed542c0', false, true, false, false, 0, NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2-0001-0002');

-- Expenses
INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '5-0001-0001-0004', 'Depreciation Expense', 'DETAIL', 'DEBIT', 'EXPENSE', 'OPERATING_EXPENSE', 'INCOME_STATEMENT', 'fc40f635-0a28-45d5-885c-93bcc2faba2d', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5-0001-0001-0004');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '5-0001-0001-0005', 'Fuel & Transport Expense', 'DETAIL', 'DEBIT', 'EXPENSE', 'OPERATING_EXPENSE', 'INCOME_STATEMENT', 'fc40f635-0a28-45d5-885c-93bcc2faba2d', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5-0001-0001-0005');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '5-0001-0001-0006', 'Labour Expense', 'DETAIL', 'DEBIT', 'EXPENSE', 'OPERATING_EXPENSE', 'INCOME_STATEMENT', 'fc40f635-0a28-45d5-885c-93bcc2faba2d', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5-0001-0001-0006');

INSERT INTO accounts (id, code, name, account_type, nature, category, sub_category, financial_statement, parent_account_id, is_system, is_active, is_cash_account, is_bank_account, opening_balance, created_at, updated_at, allow_direct_posting)
SELECT gen_random_uuid(), '5-0001-0002-0003', 'Bank Charges', 'DETAIL', 'DEBIT', 'EXPENSE', 'FINANCIAL_EXPENSE', 'INCOME_STATEMENT', '85573fc4-c58f-4f2a-91d0-183e15ca891d', false, true, false, false, 0, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5-0001-0002-0003');

-- ===============================================
-- BATCH 1.1 — Fix GL Account Configuration
-- ===============================================

UPDATE gl_account_configuration SET account_id = (SELECT id FROM accounts WHERE code = '2-0001-0001-0003'), updated_at = NOW() WHERE config_key = 'GST_PAYABLE';
UPDATE gl_account_configuration SET account_id = (SELECT id FROM accounts WHERE code = '1-0001-0001-0005'), updated_at = NOW() WHERE config_key = 'WHT_RECEIVABLE';

-- ===============================================
-- BATCH 1.2 — Fix Cash/Bank Flags
-- ===============================================

UPDATE accounts SET is_cash_account = true, updated_at = NOW() WHERE code = '1-0001-0001-0001';
UPDATE accounts SET is_bank_account = true, updated_at = NOW() WHERE code = '1-0001-0001-0002';

-- ===============================================
-- BATCH 1.3 — Fix Revenue Hierarchy
-- ===============================================

UPDATE accounts SET account_type = 'SUB_CONTROL', updated_at = NOW() WHERE code IN ('4-0001-0001', '4-0001-0002');

-- ===============================================
-- BATCH 1.4 — Populate sub_category and financial_statement
-- ===============================================

UPDATE accounts SET sub_category = 'CURRENT_ASSET', financial_statement = 'BALANCE_SHEET' WHERE code LIKE '1-0001-0001%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'BALANCE_SHEET' WHERE code = '1-0001' AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'CURRENT_LIABILITY', financial_statement = 'BALANCE_SHEET' WHERE code LIKE '2-0001-0001%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'BALANCE_SHEET' WHERE code = '2-0001' AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'RETAINED_EARNINGS', financial_statement = 'BALANCE_SHEET' WHERE code = '3-0001-0002' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'BALANCE_SHEET' WHERE code = '3-0001' AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'BALANCE_SHEET' WHERE category = 'CUSTOMER' AND financial_statement IS NULL AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OPERATING_REVENUE', financial_statement = 'INCOME_STATEMENT' WHERE code LIKE '4-0001-0001%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OPERATING_REVENUE', financial_statement = 'INCOME_STATEMENT' WHERE code = '4-0001-0002' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OTHER_INCOME', financial_statement = 'INCOME_STATEMENT' WHERE code = '4-0001-0002-0002' AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OPERATING_REVENUE', financial_statement = 'INCOME_STATEMENT' WHERE code = '4-0001-0010' AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'INCOME_STATEMENT' WHERE code = '4-0001' AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OPERATING_EXPENSE', financial_statement = 'INCOME_STATEMENT' WHERE code LIKE '5-0001-0001%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'OTHER_EXPENSE', financial_statement = 'INCOME_STATEMENT' WHERE code LIKE '5-0001-0002%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET sub_category = 'COST_OF_GOODS_SOLD', financial_statement = 'INCOME_STATEMENT' WHERE code LIKE '5-0001-0003%' AND sub_category IS NULL AND deleted_at IS NULL;
UPDATE accounts SET financial_statement = 'INCOME_STATEMENT' WHERE code = '5-0001' AND deleted_at IS NULL;

-- ===============================================
-- BATCH 1.5 — Fix Naming
-- ===============================================

UPDATE accounts SET name = 'Mian Junaid Capital' WHERE code = '3-0001-0003';
UPDATE accounts SET name = 'Mian Umair Capital' WHERE code = '3-0001-0004';

-- ===============================================
-- BATCH 3.2 — Soft-delete protection trigger
-- ===============================================

CREATE OR REPLACE FUNCTION prevent_posted_voucher_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_posted = true AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        RAISE EXCEPTION 'Cannot delete a posted voucher (ID: %). Unpost it first.', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_posted_voucher_soft_delete ON voucher_master;
CREATE TRIGGER trg_prevent_posted_voucher_soft_delete
    BEFORE UPDATE ON voucher_master
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_voucher_soft_delete();

-- ===============================================
-- BATCH 3.3 — CASCADE → RESTRICT on financial FKs
-- ===============================================

ALTER TABLE voucher_detail DROP CONSTRAINT IF EXISTS voucher_detail_voucher_id_fkey;
ALTER TABLE voucher_detail ADD CONSTRAINT voucher_detail_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES voucher_master(id) ON DELETE RESTRICT;

ALTER TABLE invoice_detail DROP CONSTRAINT IF EXISTS invoice_detail_invoice_id_fkey;
ALTER TABLE invoice_detail ADD CONSTRAINT invoice_detail_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoice_master(id) ON DELETE RESTRICT;

ALTER TABLE ap_bill_lines DROP CONSTRAINT IF EXISTS fk_ap_bill_lines_bill;
ALTER TABLE ap_bill_lines ADD CONSTRAINT fk_ap_bill_lines_bill FOREIGN KEY (bill_id) REFERENCES ap_bills(id) ON DELETE RESTRICT;

ALTER TABLE grn_detail DROP CONSTRAINT IF EXISTS grn_detail_grn_id_fkey;
ALTER TABLE grn_detail ADD CONSTRAINT grn_detail_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES grn_master(id) ON DELETE RESTRICT;

ALTER TABLE invoice_line_items DROP CONSTRAINT IF EXISTS fk_invoice_line_items_invoice;
ALTER TABLE invoice_line_items ADD CONSTRAINT fk_invoice_line_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

ALTER TABLE grn_bag_detail DROP CONSTRAINT IF EXISTS grn_bag_detail_grn_detail_id_fkey;
ALTER TABLE grn_bag_detail ADD CONSTRAINT grn_bag_detail_grn_detail_id_fkey FOREIGN KEY (grn_detail_id) REFERENCES grn_detail(id) ON DELETE RESTRICT;

ALTER TABLE gdn_detail DROP CONSTRAINT IF EXISTS gdn_detail_gdn_id_fkey;
ALTER TABLE gdn_detail ADD CONSTRAINT gdn_detail_gdn_id_fkey FOREIGN KEY (gdn_id) REFERENCES gdn_master(id) ON DELETE RESTRICT;

ALTER TABLE monthly_balances DROP CONSTRAINT IF EXISTS fk_monthly_balances_account;
ALTER TABLE monthly_balances ADD CONSTRAINT fk_monthly_balances_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

COMMIT;
