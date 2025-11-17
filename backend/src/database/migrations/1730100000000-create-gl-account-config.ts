import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlAccountConfig1730100000000 implements MigrationInterface {
  name = 'CreateGlAccountConfig1730100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create gl_account_configuration table
    await queryRunner.query(`
      CREATE TABLE "gl_account_configuration" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "config_key" VARCHAR(50) UNIQUE NOT NULL,
        "config_name" VARCHAR(100) NOT NULL,
        "account_id" uuid NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_by_id" uuid NOT NULL,
        "updated_by_id" uuid,
        CONSTRAINT "fk_gl_config_account"
          FOREIGN KEY ("account_id")
          REFERENCES "accounts"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_gl_config_created_by"
          FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_gl_config_updated_by"
          FOREIGN KEY ("updated_by_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_gl_config_key" ON "gl_account_configuration"("config_key");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_gl_config_account" ON "gl_account_configuration"("account_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_gl_config_active" ON "gl_account_configuration"("is_active");
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "gl_account_configuration" IS
      'Configurable GL account mappings for automated posting (inventory, billing, etc.)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "gl_account_configuration"."config_key" IS
      'Unique key for the configuration (e.g., inventory_asset, cost_of_goods_sold, etc.)';
    `);

    // Insert default GL account mappings (will be replaced with actual account IDs via seed script)
    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'inventory_asset',
        'Inventory Asset Account',
        a.id,
        'Default account for inventory asset tracking',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '1-0001-0001-0004'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'cost_of_goods_sold',
        'Cost of Goods Sold Account',
        a.id,
        'Default account for COGS expense',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '5-0001-0003-0001'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'grn_payable',
        'GRN Payable Account',
        a.id,
        'Default account for goods received not invoiced',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '2-0001-0001-0002'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'inventory_loss',
        'Inventory Loss Account',
        a.id,
        'Default account for inventory shrinkage/loss',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '5-0001-0002-0002'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'inventory_gain',
        'Inventory Gain Account',
        a.id,
        'Default account for inventory surplus/gain',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '4-0001-0002-0002'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'storage_revenue',
        'Storage Revenue Account',
        a.id,
        'Default account for cold storage revenue',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '4-0001-0001-0001'
      AND u.username = 'admin'
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO "gl_account_configuration"
        ("config_key", "config_name", "account_id", "description", "created_by_id")
      SELECT
        'customer_receivables',
        'Customer Receivables Account',
        a.id,
        'Default account for accounts receivable',
        u.id
      FROM accounts a
      CROSS JOIN users u
      WHERE a.code = '1-0001-0001-0003'
      AND u.username = 'admin'
      LIMIT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (cascade will handle dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_account_configuration" CASCADE;`);
  }
}
