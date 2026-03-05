--
-- Database Migration: 004_consolidate_ar_control_account
-- Purpose: Consolidate individual customer Accounts Receivable accounts into a single control account
--          to ensure subledger decoupling from General Ledger, complying precisely with IFRS.
--

BEGIN;

DO $$
DECLARE
    v_ar_control_id UUID;
    v_ar_control_code VARCHAR;
    v_customer_receivable_count INT;
BEGIN
    -- 1. Identify the single parent 'Accounts Receivable' control account (1-0001-0001-0003)
    SELECT id, code INTO v_ar_control_id, v_ar_control_code
    FROM accounts
    WHERE code = '1-0001-0001-0003'
    LIMIT 1;

    IF v_ar_control_id IS NULL THEN
        RAISE EXCEPTION 'Critical Error: Accounts Receivable control account (1-0001-0001-0003) not found in system.';
    END IF;

    -- Ensure it is flagged as DETAIL (transactions post here)
    UPDATE accounts 
    SET account_type = 'DETAIL',
        allow_direct_posting = true
    WHERE id = v_ar_control_id;

    -- 2. Ensure GL Account Configuration points to this single control account for 'CUSTOMER_RECEIVABLES'
    IF EXISTS (SELECT 1 FROM gl_account_configuration WHERE config_key = 'CUSTOMER_RECEIVABLES') THEN
        UPDATE gl_account_configuration
        SET account_id = v_ar_control_id
        WHERE config_key = 'CUSTOMER_RECEIVABLES';
    ELSE
        INSERT INTO gl_account_configuration (config_key, config_name, account_id, description, created_by_id)
        VALUES (
            'CUSTOMER_RECEIVABLES', 
            'Customer Receivables Account', 
            v_ar_control_id, 
            'Unified AR Control Account', 
            (SELECT id FROM users LIMIT 1)
        );
    END IF;

    -- 3. Remap all existing vouchers pointing to dynamic child customer accounts to point to the control account
    -- Dynamic customer accounts were created under '1-0001-0001-0003-xxx'.
    -- The voucher_detail table uses account_code for mapping.
    UPDATE voucher_detail
    SET account_code = v_ar_control_code
    WHERE account_code LIKE v_ar_control_code || '-%';

    -- Note: Retaining customer_id mapping via the invoices or customer subledgers (customers table)
    -- If vouchers need the customer_id explicitly, this should be patched at the application layer going forward.

    -- 4. Delete the now-orphaned child customer AR accounts from the GL
    WITH deleted_accounts AS (
        DELETE FROM accounts 
        WHERE parent_account_id = v_ar_control_id
        RETURNING id
    )
    SELECT count(*) INTO v_customer_receivable_count FROM deleted_accounts;

    -- 5. Point specific receivable_account_id on all customer records to the newly centralized control account
    UPDATE customers 
    SET receivable_account_id = v_ar_control_id
    WHERE receivable_account_id IS NOT NULL;

    RAISE NOTICE 'Consolidated % customer sub-accounts into strict Unified AR Control Account.', v_customer_receivable_count;

END $$;

COMMIT;
