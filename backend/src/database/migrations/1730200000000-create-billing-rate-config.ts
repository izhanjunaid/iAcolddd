import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillingRateConfig1730200000000
  implements MigrationInterface
{
  name = 'CreateBillingRateConfig1730200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create billing_rate_configuration table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_rate_configuration" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rate_type" VARCHAR(50) NOT NULL,
        "rate_name" VARCHAR(100) NOT NULL,
        "rate_value" DECIMAL(10, 2) NOT NULL,
        "customer_id" uuid,
        "product_category_id" uuid,
        "effective_from" DATE NOT NULL,
        "effective_to" DATE,
        "description" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_by_id" uuid NOT NULL,
        "updated_by_id" uuid,
        CONSTRAINT "fk_billing_rate_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_billing_rate_created_by"
          FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_billing_rate_updated_by"
          FOREIGN KEY ("updated_by_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_billing_rate_value_positive"
          CHECK ("rate_value" > 0),
        CONSTRAINT "chk_billing_rate_dates"
          CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_billing_rate_type" ON "billing_rate_configuration"("rate_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_billing_rate_customer" ON "billing_rate_configuration"("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_billing_rate_active" ON "billing_rate_configuration"("is_active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_billing_rate_effective_dates"
      ON "billing_rate_configuration"("effective_from", "effective_to");
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE "billing_rate_configuration" IS
      'Configurable billing rates for cold storage services';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "billing_rate_configuration"."rate_type" IS
      'Type of rate: daily, seasonal, monthly, volume_discount, etc.';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "billing_rate_configuration"."customer_id" IS
      'Optional: customer-specific rate override (NULL for default rate)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "billing_rate_configuration"."product_category_id" IS
      'Optional: category-specific rate (NULL for all categories)';
    `);

    // Insert default billing rates - using rate_name or rate_type + rate_name as unique identifier logic for conflict?
    // The table doesn't have a unique key other than ID.
    // We should check if exists or just ignore duplication if we can't ensure it.
    // Ideally add UNIQUE constraint on (rate_type, rate_name, customer_id, product_category_id, effective_from)
    // For now, let's use DO block to insert if not exists based on logic.

    // Actually, simpler to just wrap in a check.

    // Daily
    await queryRunner.query(`
      INSERT INTO "billing_rate_configuration"
        ("rate_type", "rate_name", "rate_value", "effective_from", "description", "created_by_id")
      SELECT
        'daily',
        'Default Daily Storage Rate',
        2.00,
        CURRENT_DATE,
        'Standard daily storage rate per kg',
        u.id
      FROM users u
      WHERE u.username = 'admin'
      AND NOT EXISTS (
          SELECT 1 FROM "billing_rate_configuration" WHERE "rate_name" = 'Default Daily Storage Rate'
      )
      LIMIT 1;
    `);

    // Seasonal
    await queryRunner.query(`
      INSERT INTO "billing_rate_configuration"
        ("rate_type", "rate_name", "rate_value", "effective_from", "description", "created_by_id")
      SELECT
        'seasonal',
        'Seasonal Storage Rate',
        1.50,
        CURRENT_DATE,
        'Reduced rate for seasonal storage agreements',
        u.id
      FROM users u
      WHERE u.username = 'admin'
      AND NOT EXISTS (
          SELECT 1 FROM "billing_rate_configuration" WHERE "rate_name" = 'Seasonal Storage Rate'
      )
      LIMIT 1;
    `);

    // Monthly
    await queryRunner.query(`
      INSERT INTO "billing_rate_configuration"
        ("rate_type", "rate_name", "rate_value", "effective_from", "description", "created_by_id")
      SELECT
        'monthly',
        'Monthly Commitment Rate',
        1.20,
        CURRENT_DATE,
        'Discounted rate for monthly commitment',
        u.id
      FROM users u
      WHERE u.username = 'admin'
      AND NOT EXISTS (
          SELECT 1 FROM "billing_rate_configuration" WHERE "rate_name" = 'Monthly Commitment Rate'
      )
      LIMIT 1;
    `);

    // Loading
    await queryRunner.query(`
      INSERT INTO "billing_rate_configuration"
        ("rate_type", "rate_name", "rate_value", "effective_from", "description", "created_by_id")
      SELECT
        'loading',
        'Loading/Unloading Labour Rate',
        50.00,
        CURRENT_DATE,
        'Labour charge per operation',
        u.id
      FROM users u
      WHERE u.username = 'admin'
      AND NOT EXISTS (
          SELECT 1 FROM "billing_rate_configuration" WHERE "rate_name" = 'Loading/Unloading Labour Rate'
      )
      LIMIT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (cascade will handle dependencies)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "billing_rate_configuration" CASCADE;`,
    );
  }
}
