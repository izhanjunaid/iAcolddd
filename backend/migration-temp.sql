-- Add CUSTOMER and SUPPLIER to account_category enum
ALTER TYPE "account_category" 
ADD VALUE IF NOT EXISTS 'CUSTOMER';

ALTER TYPE "account_category" 
ADD VALUE IF NOT EXISTS 'SUPPLIER';

-- Add customer_id column to accounts table
ALTER TABLE "accounts" 
ADD COLUMN IF NOT EXISTS "customer_id" uuid NULL;

-- Add index for customer_id for better query performance
CREATE INDEX IF NOT EXISTS "IDX_accounts_customer_id" 
ON "accounts"("customer_id");

-- Add comment explaining the column
COMMENT ON COLUMN "accounts"."customer_id" IS 
'Reference to customer entity for CUSTOMER category accounts';

