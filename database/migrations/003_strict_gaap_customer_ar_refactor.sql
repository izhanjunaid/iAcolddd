--
-- Database Migration: 003_strict_gaap_customer_ar_refactor
-- Purpose: Eradicate the non-GAAP compliant '02' root folder for customers.
--          Customers must structurally exist under Assets -> Current Assets -> Accounts Receivable.
--

BEGIN;

DO $$
DECLARE
    v_ar_account_id UUID;
    v_ar_account_code VARCHAR;
    v_02_parent_id UUID;
    v_customer_account RECORD;
    v_sequence_number INT := 1;
    v_new_code VARCHAR;
BEGIN
    -- 1. Identify the designated structural 'Accounts Receivable' account (1-0001-0001-0003)
    SELECT id INTO v_ar_account_id
    FROM accounts
    WHERE code = '1-0001-0001-0003'
    LIMIT 1;

    IF v_ar_account_id IS NULL THEN
        RAISE EXCEPTION 'Critical Error: Accounts Receivable account (1-0001-0001-0003) not found in system.';
    END IF;

    -- Ensure the GL Configuration exists for it so the backend service can find it later
    IF NOT EXISTS (SELECT 1 FROM gl_account_configuration WHERE config_key = 'ACCOUNTS_RECEIVABLE') THEN
        INSERT INTO gl_account_configuration (config_key, config_name, account_id, description, created_by_id)
        VALUES (
            'ACCOUNTS_RECEIVABLE', 
            'Accounts Receivable', 
            v_ar_account_id, 
            'Strict GAAP Accounts Receivable Parent', 
            (SELECT id FROM users LIMIT 1)
        );
        RAISE NOTICE 'Seeded missing ACCOUNTS_RECEIVABLE gl_account_configuration mapping.';
    END IF;

    IF v_ar_account_id IS NULL THEN
        RAISE EXCEPTION 'Critical Error: Accounts Receivable GL Configuration not found.';
    END IF;

    SELECT code INTO v_ar_account_code
    FROM accounts
    WHERE id = v_ar_account_id;

    -- Upgrade Accounts Receivable to SUB_CONTROL if it was set to DETAIL
    UPDATE accounts 
    SET account_type = 'SUB_CONTROL' 
    WHERE id = v_ar_account_id AND account_type = 'DETAIL';

    -- 2. Identify the illegal '02' Customers root account
    SELECT id INTO v_02_parent_id
    FROM accounts
    WHERE code = '02' AND parent_account_id IS NULL
    LIMIT 1;

    IF v_02_parent_id IS NULL THEN
        RAISE NOTICE 'The 02 Customer root account does not exist. Skipping migration.';
        RETURN;
    END IF;

    -- 3. Loop over and reparent all existing customer sub-accounts from '02' to true 'AR'
    FOR v_customer_account IN 
        SELECT id, code
        FROM accounts
        WHERE parent_account_id = v_02_parent_id
        ORDER BY created_at ASC
    LOOP
        -- Extract the trailing number from the old code (e.g., '02-0001' -> '0001')
        -- Alternatively, just generate a fresh sequence to guarantee safety against weird past patterns.
        -- We must use 3 digits so that `1-0001-0001-0003-xxx` is <= 20 chars long!
        v_new_code := v_ar_account_code || '-' || LPAD(v_sequence_number::text, 3, '0');
        
        UPDATE accounts
        SET 
            parent_account_id = v_ar_account_id,
            code = v_new_code
        WHERE id = v_customer_account.id;

        -- We DO NOT need to update customers.receivable_account_id 
        -- because it references by UUID, not code!

        v_sequence_number := v_sequence_number + 1;
    END LOOP;

    -- 4. Delete the orphaned '02' root account
    DELETE FROM accounts WHERE id = v_02_parent_id;

    RAISE NOTICE 'Successfully reparented % customer accounts under Accounts Receivable (%) and removed the 02 root.', (v_sequence_number - 1), v_ar_account_code;

END $$;

COMMIT;
