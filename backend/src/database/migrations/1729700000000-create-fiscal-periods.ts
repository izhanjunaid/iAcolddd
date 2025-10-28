import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFiscalPeriods1729700000000 implements MigrationInterface {
  name = 'CreateFiscalPeriods1729700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create fiscal_years table
    await queryRunner.query(`
      CREATE TABLE "fiscal_years" (
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
    `);

    // Create index on year
    await queryRunner.query(`
      CREATE INDEX "idx_fiscal_years_year" ON "fiscal_years"("year");
    `);

    // Create fiscal_periods table
    await queryRunner.query(`
      CREATE TABLE "fiscal_periods" (
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
    `);

    // Create indexes on fiscal_periods
    await queryRunner.query(`
      CREATE INDEX "idx_fiscal_periods_fiscal_year" 
      ON "fiscal_periods"("fiscal_year_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_fiscal_periods_dates" 
      ON "fiscal_periods"("start_date", "end_date");
    `);

    // Add fiscal_period_id to voucher_master
    await queryRunner.query(`
      ALTER TABLE "voucher_master" 
      ADD COLUMN "fiscal_period_id" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE "voucher_master"
      ADD CONSTRAINT "fk_voucher_fiscal_period"
      FOREIGN KEY ("fiscal_period_id")
      REFERENCES "fiscal_periods"("id")
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_voucher_fiscal_period" 
      ON "voucher_master"("fiscal_period_id");
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "fiscal_years" IS 
      'Fiscal years for the organization (July 1 - June 30)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "fiscal_periods" IS 
      'Monthly periods within fiscal years for transaction tracking and closing';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove FK from voucher_master
    await queryRunner.query(`
      ALTER TABLE "voucher_master" 
      DROP CONSTRAINT IF EXISTS "fk_voucher_fiscal_period";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_voucher_fiscal_period";
    `);

    await queryRunner.query(`
      ALTER TABLE "voucher_master" 
      DROP COLUMN IF EXISTS "fiscal_period_id";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_periods";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_years";`);
  }
}

