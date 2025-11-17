import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoicesSystem1730000000000 implements MigrationInterface {
  name = 'CreateInvoicesSystem1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "invoice_status_enum" AS ENUM(
        'DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "invoice_type_enum" AS ENUM(
        'STORAGE', 'SERVICE', 'MIXED'
      )
    `);

    // Create invoices table
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "invoice_number" VARCHAR(50) NOT NULL,
        "invoice_type" "invoice_type_enum" NOT NULL DEFAULT 'STORAGE',
        "status" "invoice_status_enum" NOT NULL DEFAULT 'DRAFT',
        "customer_id" UUID NOT NULL,

        -- Dates
        "issue_date" DATE NOT NULL,
        "due_date" DATE NOT NULL,
        "storage_start_date" DATE,
        "storage_end_date" DATE,
        "paid_date" DATE,

        -- Storage details
        "weight" DECIMAL(10,2),
        "days_stored" INTEGER,
        "rate_per_kg_per_day" DECIMAL(10,4),

        -- Charge breakdown
        "storage_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "labour_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "loading_unloading_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,

        -- Tax calculations
        "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "wht_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "wht_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

        -- Total amounts
        "total_amount" DECIMAL(12,2) NOT NULL,
        "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "balance_due" DECIMAL(12,2) NOT NULL,

        -- Additional info
        "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
        "reference_number" VARCHAR(100),
        "notes" TEXT,
        "breakdown" JSONB,

        -- Audit fields
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_by" VARCHAR(100),
        "updated_by" VARCHAR(100),

        CONSTRAINT "pk_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "uq_invoices_number" UNIQUE ("invoice_number"),
        CONSTRAINT "fk_invoices_customer" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT
      )
    `);

    // Create index for faster queries
    await queryRunner.query(`
      CREATE INDEX "idx_invoices_customer" ON "invoices" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_invoices_status" ON "invoices" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_invoices_dates" ON "invoices" ("issue_date", "due_date")
    `);

    // Create invoice_line_items table
    await queryRunner.query(`
      CREATE TABLE "invoice_line_items" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "invoice_id" UUID NOT NULL,
        "line_number" INTEGER NOT NULL,
        "description" VARCHAR(200) NOT NULL,
        "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
        "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "line_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "tax_rate" DECIMAL(5,2),
        "tax_amount" DECIMAL(12,2),

        CONSTRAINT "pk_invoice_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_invoice_line_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE
      )
    `);

    // Create index for line items
    await queryRunner.query(`
      CREATE INDEX "idx_invoice_line_items_invoice" ON "invoice_line_items" ("invoice_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE "invoice_line_items"`);
    await queryRunner.query(`DROP INDEX "idx_invoices_dates"`);
    await queryRunner.query(`DROP INDEX "idx_invoices_status"`);
    await queryRunner.query(`DROP INDEX "idx_invoices_customer"`);
    await queryRunner.query(`DROP TABLE "invoices"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "invoice_type_enum"`);
    await queryRunner.query(`DROP TYPE "invoice_status_enum"`);
  }
}
