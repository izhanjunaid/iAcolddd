-- =====================================================
-- Phase 1: GL Foundation - Database Migration
-- =====================================================
-- This migration adds:
-- 1. Fiscal Years & Periods tables
-- 2. Cost Centers table  
-- 3. Account enhancements (sub-categories, financial statements, behavior flags)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE FISCAL YEARS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "fiscal_years" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "year" INTEGER UNIQUE NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "is_closed" BOOLEAN DEFAULT FALSE,
  "closed_by_id" uuid,
  "closed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "fk_fiscal_year_closed_by" 
    FOREIGN KEY ("closed_by_id") 
    REFERENCES "users"("id") 
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_years_year" ON "fiscal_years"("year");

COMMENT ON TABLE "fiscal_years" IS 
'Fiscal years for the organization (July 1 - June 30)';

-- =====================================================
-- 2. CREATE FISCAL PERIODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "fiscal_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiscal_year_id" uuid NOT NULL,
  "period_number" INTEGER NOT NULL,
  "period_name" VARCHAR(50) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "is_closed" BOOLEAN DEFAULT FALSE,
  "closed_by_id" uuid,
  "closed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "fk_fiscal_period_fiscal_year" 
    FOREIGN KEY ("fiscal_year_id") 
    REFERENCES "fiscal_years"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "fk_fiscal_period_closed_by" 
    FOREIGN KEY ("closed_by_id") 
    REFERENCES "users"("id") 
    ON DELETE RESTRICT,
  CONSTRAINT "chk_period_number" 
    CHECK ("period_number" BETWEEN 1 AND 12),
  UNIQUE("fiscal_year_id", "period_number")
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_fiscal_year" 
ON "fiscal_periods"("fiscal_year_id");

CREATE INDEX IF NOT EXISTS "idx_fiscal_periods_dates" 
ON "fiscal_periods"("start_date", "end_date");

COMMENT ON TABLE "fiscal_periods" IS 
'Monthly periods within fiscal years for transaction tracking and closing';

-- =====================================================
-- 3. ADD FISCAL_PERIOD_ID TO VOUCHER_MASTER
-- =====================================================
ALTER TABLE "voucher_master" 
ADD COLUMN IF NOT EXISTS "fiscal_period_id" uuid;

ALTER TABLE "voucher_master"
DROP CONSTRAINT IF EXISTS "fk_voucher_fiscal_period";

ALTER TABLE "voucher_master"
ADD CONSTRAINT "fk_voucher_fiscal_period"
FOREIGN KEY ("fiscal_period_id")
REFERENCES "fiscal_periods"("id")
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "idx_voucher_fiscal_period" 
ON "voucher_master"("fiscal_period_id");

-- =====================================================
-- 4. CREATE COST CENTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "cost_centers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) UNIQUE NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "parent_id" uuid,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "created_by_id" uuid NOT NULL,
  "updated_by_id" uuid,
  CONSTRAINT "fk_cost_center_parent" 
    FOREIGN KEY ("parent_id") 
    REFERENCES "cost_centers"("id") 
    ON DELETE RESTRICT,
  CONSTRAINT "fk_cost_center_created_by" 
    FOREIGN KEY ("created_by_id") 
    REFERENCES "users"("id") 
    ON DELETE RESTRICT,
  CONSTRAINT "fk_cost_center_updated_by" 
    FOREIGN KEY ("updated_by_id") 
    REFERENCES "users"("id") 
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_cost_centers_code" ON "cost_centers"("code");
CREATE INDEX IF NOT EXISTS "idx_cost_centers_parent" ON "cost_centers"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_cost_centers_active" ON "cost_centers"("is_active");

COMMENT ON TABLE "cost_centers" IS 
'Cost centers for departmental/warehouse-level profitability tracking';

-- =====================================================
-- 5. ADD COST_CENTER_ID TO VOUCHER_DETAIL
-- =====================================================
ALTER TABLE "voucher_detail" 
ADD COLUMN IF NOT EXISTS "cost_center_id" uuid;

ALTER TABLE "voucher_detail"
DROP CONSTRAINT IF EXISTS "fk_voucher_detail_cost_center";

ALTER TABLE "voucher_detail"
ADD CONSTRAINT "fk_voucher_detail_cost_center"
FOREIGN KEY ("cost_center_id")
REFERENCES "cost_centers"("id")
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "idx_voucher_detail_cost_center" 
ON "voucher_detail"("cost_center_id");

-- =====================================================
-- 6. ADD REQUIRE_COST_CENTER TO ACCOUNTS
-- =====================================================
ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "require_cost_center" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN "accounts"."require_cost_center" IS 
'If true, transactions on this account must specify a cost center';

-- =====================================================
-- 7. CREATE ACCOUNT ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE "account_sub_category_enum" AS ENUM (
    'CURRENT_ASSET',
    'NON_CURRENT_ASSET',
    'FIXED_ASSET',
    'INTANGIBLE_ASSET',
    'CURRENT_LIABILITY',
    'NON_CURRENT_LIABILITY',
    'SHARE_CAPITAL',
    'RETAINED_EARNINGS',
    'RESERVES',
    'OPERATING_REVENUE',
    'OTHER_INCOME',
    'COST_OF_GOODS_SOLD',
    'OPERATING_EXPENSE',
    'ADMINISTRATIVE_EXPENSE',
    'FINANCIAL_EXPENSE',
    'OTHER_EXPENSE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "financial_statement_enum" AS ENUM (
    'BALANCE_SHEET',
    'INCOME_STATEMENT',
    'CASH_FLOW_STATEMENT',
    'CHANGES_IN_EQUITY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 8. ADD ACCOUNT ENHANCEMENT COLUMNS
-- =====================================================
ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "sub_category" account_sub_category_enum;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "financial_statement" financial_statement_enum;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "statement_section" VARCHAR(100);

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "is_cash_account" BOOLEAN DEFAULT FALSE;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "is_bank_account" BOOLEAN DEFAULT FALSE;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "is_depreciable" BOOLEAN DEFAULT FALSE;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "require_project" BOOLEAN DEFAULT FALSE;

ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "allow_direct_posting" BOOLEAN DEFAULT TRUE;

-- =====================================================
-- 9. CREATE INDEXES ON ACCOUNTS
-- =====================================================
CREATE INDEX IF NOT EXISTS "idx_accounts_sub_category" 
ON "accounts"("sub_category");

CREATE INDEX IF NOT EXISTS "idx_accounts_financial_statement" 
ON "accounts"("financial_statement");

CREATE INDEX IF NOT EXISTS "idx_accounts_cash" 
ON "accounts"("is_cash_account") 
WHERE "is_cash_account" = TRUE;

CREATE INDEX IF NOT EXISTS "idx_accounts_bank" 
ON "accounts"("is_bank_account") 
WHERE "is_bank_account" = TRUE;

-- =====================================================
-- 10. ADD COMMENTS
-- =====================================================
COMMENT ON COLUMN "accounts"."sub_category" IS 
'Detailed classification for financial statement grouping';

COMMENT ON COLUMN "accounts"."financial_statement" IS 
'Which financial statement this account appears on';

COMMENT ON COLUMN "accounts"."statement_section" IS 
'Section name within the financial statement (e.g., Current Assets, Operating Expenses)';

COMMENT ON COLUMN "accounts"."display_order" IS 
'Order of appearance in financial statements (lower = appears first)';

COMMENT ON COLUMN "accounts"."is_cash_account" IS 
'Flag for cash flow statement generation';

COMMENT ON COLUMN "accounts"."is_bank_account" IS 
'Flag for bank reconciliation module';

COMMENT ON COLUMN "accounts"."is_depreciable" IS 
'Flag for fixed assets that require depreciation';

COMMENT ON COLUMN "accounts"."allow_direct_posting" IS 
'If false, account is for sub-totals only (no direct transactions)';

-- =====================================================
-- 11. INSERT FISCAL YEAR 2025-2026 (July 1 - June 30)
-- =====================================================
DO $$
DECLARE
  v_fiscal_year_id uuid;
  v_period_start date;
  v_period_end date;
  v_month_name text;
  v_period_year integer;
  i integer;
BEGIN
  -- Insert fiscal year
  INSERT INTO fiscal_years (year, start_date, end_date, is_closed, created_at, updated_at)
  VALUES (2025, '2025-07-01', '2026-06-30', FALSE, NOW(), NOW())
  ON CONFLICT (year) DO NOTHING
  RETURNING id INTO v_fiscal_year_id;

  -- If fiscal year was just created (not conflicting), create periods
  IF v_fiscal_year_id IS NOT NULL THEN
    -- Create 12 monthly periods
    FOR i IN 1..12 LOOP
      v_period_start := '2025-07-01'::date + ((i - 1) || ' months')::interval;
      v_period_end := v_period_start + '1 month'::interval - '1 day'::interval;
      
      -- Determine month name and year
      v_period_year := EXTRACT(YEAR FROM v_period_start)::integer;
      v_month_name := TO_CHAR(v_period_start, 'Month') || ' ' || v_period_year;
      
      INSERT INTO fiscal_periods (
        fiscal_year_id, 
        period_number, 
        period_name, 
        start_date, 
        end_date, 
        is_closed,
        created_at,
        updated_at
      )
      VALUES (
        v_fiscal_year_id,
        i,
        TRIM(v_month_name),
        v_period_start,
        v_period_end,
        FALSE,
        NOW(),
        NOW()
      );
    END LOOP;
    
      RAISE NOTICE '[OK] Fiscal Year 2025-2026 created with 12 periods';
  ELSE
    RAISE NOTICE '[SKIP] Fiscal Year 2025 already exists, skipping';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================
SELECT '[SUCCESS] Phase 1 GL Foundation migration completed successfully!' as status;
SELECT COUNT(*) as fiscal_years_count FROM fiscal_years;
SELECT COUNT(*) as fiscal_periods_count FROM fiscal_periods;
SELECT COUNT(*) as cost_centers_count FROM cost_centers;

