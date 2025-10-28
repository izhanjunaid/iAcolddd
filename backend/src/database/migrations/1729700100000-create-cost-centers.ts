import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCostCenters1729700100000 implements MigrationInterface {
  name = 'CreateCostCenters1729700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cost_centers table
    await queryRunner.query(`
      CREATE TABLE "cost_centers" (
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
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_cost_centers_code" ON "cost_centers"("code");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cost_centers_parent" ON "cost_centers"("parent_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cost_centers_active" ON "cost_centers"("is_active");
    `);

    // Add cost_center_id to voucher_details
    await queryRunner.query(`
      ALTER TABLE "voucher_details" 
      ADD COLUMN "cost_center_id" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE "voucher_details"
      ADD CONSTRAINT "fk_voucher_detail_cost_center"
      FOREIGN KEY ("cost_center_id")
      REFERENCES "cost_centers"("id")
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_voucher_detail_cost_center" 
      ON "voucher_details"("cost_center_id");
    `);

    // Add require_cost_center to accounts table
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "require_cost_center" BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."require_cost_center" IS 
      'If true, transactions on this account must specify a cost center';
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "cost_centers" IS 
      'Cost centers for departmental/warehouse-level profitability tracking';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove from accounts
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      DROP COLUMN IF EXISTS "require_cost_center";
    `);

    // Remove FK from voucher_details
    await queryRunner.query(`
      ALTER TABLE "voucher_details" 
      DROP CONSTRAINT IF EXISTS "fk_voucher_detail_cost_center";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_voucher_detail_cost_center";
    `);

    await queryRunner.query(`
      ALTER TABLE "voucher_details" 
      DROP COLUMN IF EXISTS "cost_center_id";
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "cost_centers";`);
  }
}

