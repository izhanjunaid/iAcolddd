import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVendorsTable20260213150000 implements MigrationInterface {
  name = 'CreateVendorsTable20260213150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vendors table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "vendors" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "code" VARCHAR NOT NULL,
                "name" VARCHAR NOT NULL,
                "contact_person" VARCHAR,
                "email" VARCHAR,
                "phone" VARCHAR,
                "address_line1" VARCHAR,
                "address_line2" VARCHAR,
                "city" VARCHAR,
                "state" VARCHAR,
                "postal_code" VARCHAR,
                "country" VARCHAR,
                "tax_id" VARCHAR,
                "gst_number" VARCHAR,
                "payment_terms" INTEGER NOT NULL DEFAULT 0,
                "payable_account_id" UUID,
                "is_active" BOOLEAN NOT NULL DEFAULT true,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMPTZ,
                "created_by" UUID,
                "updated_by" UUID,
                CONSTRAINT "pk_vendors" PRIMARY KEY ("id"),
                CONSTRAINT "uq_vendors_code" UNIQUE ("code"),
                CONSTRAINT "fk_vendors_payable_account" FOREIGN KEY ("payable_account_id") REFERENCES "accounts" ("id"),
                CONSTRAINT "fk_vendors_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id"),
                CONSTRAINT "fk_vendors_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("id")
            )
        `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vendors_code" ON "vendors" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vendors_name" ON "vendors" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vendors_payable_account" ON "vendors" ("payable_account_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vendors"`);
  }
}
