import { MigrationInterface, QueryRunner } from 'typeorm';

export class RentalCycleMultiInvoiceSupport20260302102500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new JSONB columns for multi-invoice support
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" ADD COLUMN IF NOT EXISTS "invoice_ids" jsonb DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" ADD COLUMN IF NOT EXISTS "outward_gate_pass_ids" jsonb DEFAULT '[]'`,
    );

    // 2. Migrate existing data: copy old single UUIDs into the new arrays
    await queryRunner.query(`
            UPDATE "rental_billing_cycles"
            SET "invoice_ids" = CASE 
                WHEN "invoice_id" IS NOT NULL THEN jsonb_build_array("invoice_id"::text)
                ELSE '[]'::jsonb
            END,
            "outward_gate_pass_ids" = CASE 
                WHEN "outward_gate_pass_id" IS NOT NULL THEN jsonb_build_array("outward_gate_pass_id"::text)
                ELSE '[]'::jsonb
            END
        `);

    // 3. Drop old columns
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" DROP COLUMN IF EXISTS "invoice_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" DROP COLUMN IF EXISTS "outward_gate_pass_id"`,
    );

    // 4. Remove 'CLOSED' from the enum (recreate it without CLOSED)
    // PostgreSQL doesn't support removing values from enums, but since CLOSED
    // was never used in any data, we can safely leave the enum as-is.
    // The TypeScript code no longer references CLOSED.

    // 5. Fix #6: Create new ACTIVE billing cycles for legacy orphaned lots
    // These are lots that are PARTIALLY_RELEASED but their cycles are already INVOICED
    await queryRunner.query(`
            INSERT INTO "rental_billing_cycles" (
                "id", "lot_id", "customer_id", "billing_start_date",
                "billing_unit", "rate_applied", "status", "billed_quantity",
                "storage_charges", "handling_charges_in", "handling_charges_out",
                "other_charges", "subtotal", "gst_amount", "wht_amount", "total_amount",
                "invoice_ids", "outward_gate_pass_ids", "notes"
            )
            SELECT 
                gen_random_uuid(),
                l.id,
                l.customer_id,
                l.billing_start_date,
                l.billing_unit,
                COALESCE(l.rate_per_bag_per_season, l.rate_per_kg_per_day, 0),
                'ACTIVE',
                l.bags_out,
                0, 0, 0, 0, 0, 0, 0, 0,
                '[]'::jsonb,
                '[]'::jsonb,
                'Auto-created to repair legacy partial billing (migration 20260302102500)'
            FROM cold_store_lots l
            WHERE l.status = 'PARTIALLY_RELEASED'
            AND NOT EXISTS (
                SELECT 1 FROM rental_billing_cycles rbc 
                WHERE rbc.lot_id = l.id AND rbc.status = 'ACTIVE'
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: re-add old columns and drop new ones
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" ADD COLUMN "invoice_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" ADD COLUMN "outward_gate_pass_id" uuid`,
    );

    // Copy first element from arrays back to single columns
    await queryRunner.query(`
            UPDATE "rental_billing_cycles"
            SET "invoice_id" = (invoice_ids->>0)::uuid,
                "outward_gate_pass_id" = (outward_gate_pass_ids->>0)::uuid
            WHERE jsonb_array_length(invoice_ids) > 0
        `);

    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" DROP COLUMN "invoice_ids"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" DROP COLUMN "outward_gate_pass_ids"`,
    );

    // Remove auto-created repair cycles
    await queryRunner.query(`
            DELETE FROM "rental_billing_cycles" 
            WHERE notes LIKE '%migration 20260302102500%'
        `);
  }
}
