-- Allow warehouse_id to be null for TRANSFER transactions
ALTER TABLE "inventory_transactions" ALTER COLUMN "warehouse_id" DROP NOT NULL;
