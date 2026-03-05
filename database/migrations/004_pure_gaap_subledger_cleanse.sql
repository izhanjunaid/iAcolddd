--
-- Database Migration: 004_pure_gaap_subledger_cleanse
-- Purpose: Complete the transition to a pure Accounts Receivable Subledger.
--          Deletes individual customer GL accounts and points all customers to
--          the singular AR Control Account.
--

BEGIN;

DO $$
DECLARE
    v_ar_account_id UUID;
    v_ar_account_code VARCHAR;
    v_customers_updated INT;
    v_accounts_deleted INT;
BEGIN
    -- 1. Identify the designated structural 'Accounts Receivable' account
    SELECT account_id INTO v_ar_account_id
    FROM gl_account_configuration
    WHERE config_key = 'ACCOUNTS_RECEIVABLE'
    LIMIT 1;

    IF v_ar_account_id IS NULL THEN
        -- Fallback to hardcoded GAAP ID if config is missing
        SELECT id INTO v_ar_account_id
        FROM accounts
        WHERE code = '1-0001-0001-0003'
        LIMIT 1;
        
        IF v_ar_account_id IS NULL THEN
            RAISE EXCEPTION 'Critical Error: Accounts Receivable account not found in system.';
        END IF;
    END IF;

    -- Retrieve the exact code for logging
    SELECT code INTO v_ar_account_code
    FROM accounts
    WHERE id = v_ar_account_id;

    -- 2. Repoint all customers directly to the universal AR account
    UPDATE customers
    SET receivable_account_id = v_ar_account_id;
    GET DIAGNOSTICS v_customers_updated = ROW_COUNT;

    -- 3. Nullify cyclic references to avoid constraint violations during deletion
    UPDATE accounts 
    SET customer_id = NULL 
    WHERE parent_account_id = v_ar_account_id 
       OR code LIKE '02-%' 
       OR code = '02';

    -- 4. Delete the now-orphaned child customer accounts
    DELETE FROM accounts 
    WHERE parent_account_id = v_ar_account_id 
       OR code LIKE '02-%' 
       OR code = '02';
    GET DIAGNOSTICS v_accounts_deleted = ROW_COUNT;

    -- 5. Revert the AR account back to a postable DETAIL account (Optional, but best practice if it has no children)
    UPDATE accounts 
    SET account_type = 'DETAIL' 
    WHERE id = v_ar_account_id AND account_type = 'SUB_CONTROL';

    RAISE NOTICE 'Pure Subledger Migration Complete.';
    RAISE NOTICE 'Updated % customers to point uniformly to AR Control Account (%).', v_customers_updated, v_ar_account_code;
    RAISE NOTICE 'Deleted % auto-generated child customer GL accounts.', v_accounts_deleted;

END $$;

COMMIT;
