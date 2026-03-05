-- Add version column to inventory_balances for optimistic locking support
ALTER TABLE "inventory_balances" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Update existing records to version 1
UPDATE "inventory_balances" SET "version" = 1 WHERE "version" IS NULL;
