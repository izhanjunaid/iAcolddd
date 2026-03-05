import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAPSystem1736930000000 implements MigrationInterface {
  name = 'CreateAPSystem1736930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "ap_bill_status_enum" AS ENUM(
                    'DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'VOID'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "ap_payment_method_enum" AS ENUM(
                    'CASH', 'CHEQUE', 'ONLINE_TRANSFER'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

    // Create ap_bills table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ap_bills" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "bill_number" VARCHAR(50) NOT NULL,
        "vendor_id" UUID NOT NULL,
        "vendor_invoice_number" VARCHAR(50),
        "bill_date" DATE NOT NULL,
        "due_date" DATE NOT NULL,
        "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "amount_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "balance_due" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "status" "ap_bill_status_enum" NOT NULL DEFAULT 'DRAFT',
        "notes" TEXT,
        "gl_voucher_id" UUID,
        "fiscal_period_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_by" UUID,
        CONSTRAINT "pk_ap_bills" PRIMARY KEY ("id"),
        CONSTRAINT "uq_ap_bills_number" UNIQUE ("bill_number"),
        CONSTRAINT "fk_ap_bills_gl_voucher" FOREIGN KEY ("gl_voucher_id") REFERENCES "voucher_master" ("id"),
        CONSTRAINT "fk_ap_bills_fiscal_period" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods" ("id"),
        CONSTRAINT "fk_ap_bills_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id")
        -- Note: Vendor/Supplier constraint will be added when we have a Suppliers table, 
        -- possibly reusing Customers with a flag or a separate table. 
        -- For now, we assume vendor_id points to a Customer entity flagged as supplier or a generic party.
      )
    `);

    // Create indexes for ap_bills
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_bills_vendor" ON "ap_bills" ("vendor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_bills_status" ON "ap_bills" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_bills_dates" ON "ap_bills" ("bill_date", "due_date")`,
    );

    // Create ap_bill_lines table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ap_bill_lines" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "bill_id" UUID NOT NULL,
        "expense_account_id" UUID NOT NULL,
        "description" VARCHAR(200) NOT NULL,
        "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "tax_amount" DECIMAL(18,2) DEFAULT 0,
        "cost_center_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_ap_bill_lines" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ap_bill_lines_bill" FOREIGN KEY ("bill_id") REFERENCES "ap_bills" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ap_bill_lines_account" FOREIGN KEY ("expense_account_id") REFERENCES "accounts" ("id"),
        CONSTRAINT "fk_ap_bill_lines_cost_center" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers" ("id")
      )
    `);

    // Create ap_payments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ap_payments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "payment_number" VARCHAR(50) NOT NULL,
        "vendor_id" UUID NOT NULL,
        "payment_date" DATE NOT NULL,
        "payment_method" "ap_payment_method_enum" NOT NULL,
        "reference_number" VARCHAR(50), 
        "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "notes" TEXT,
        "gl_voucher_id" UUID,
        "bank_account_id" UUID, -- Account used for payment (Cash/Bank)
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_by" UUID,
        CONSTRAINT "pk_ap_payments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_ap_payments_number" UNIQUE ("payment_number"),
        CONSTRAINT "fk_ap_payments_gl_voucher" FOREIGN KEY ("gl_voucher_id") REFERENCES "voucher_master" ("id"),
        CONSTRAINT "fk_ap_payments_bank_account" FOREIGN KEY ("bank_account_id") REFERENCES "accounts" ("id"),
        CONSTRAINT "fk_ap_payments_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id")
      )
    `);

    // Create indexes for ap_payments
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_payments_vendor" ON "ap_payments" ("vendor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_payments_date" ON "ap_payments" ("payment_date")`,
    );

    // Create ap_payment_applications table (Many-to-Many link between Payment and Bills)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ap_payment_applications" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" UUID NOT NULL,
        "bill_id" UUID NOT NULL,
        "amount_applied" DECIMAL(18,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_ap_payment_applications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ap_payment_applications_payment" FOREIGN KEY ("payment_id") REFERENCES "ap_payments" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ap_payment_applications_bill" FOREIGN KEY ("bill_id") REFERENCES "ap_bills" ("id") ON DELETE RESTRICT
      )
    `);

    // Index for applications
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_apps_payment" ON "ap_payment_applications" ("payment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ap_apps_bill" ON "ap_payment_applications" ("bill_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_apps_bill"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_apps_payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ap_payment_applications"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_payments_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_payments_vendor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ap_payments"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "ap_bill_lines"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_bills_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_bills_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ap_bills_vendor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ap_bills"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "ap_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ap_bill_status_enum"`);
  }
}
