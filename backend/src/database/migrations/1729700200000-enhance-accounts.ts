import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceAccounts1729700200000 implements MigrationInterface {
  name = 'EnhanceAccounts1729700200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create account_sub_category enum
    await queryRunner.query(`
      CREATE TYPE "account_sub_category_enum" AS ENUM (
        'CURRENT_ASSET',
        'NON_CURRENT_ASSET',
        'FIXED_ASSET',
        'INTANGIBLE_ASSET',
        'CURRENT_LIABILITY',
        'NON_CURRENT_LIABILITY',
        'SHARE_CAPITAL',
        'RETAINED_EARNINGS',
        'RESERVES',
        'OPERATING_REVENUE',
        'OTHER_INCOME',
        'COST_OF_GOODS_SOLD',
        'OPERATING_EXPENSE',
        'ADMINISTRATIVE_EXPENSE',
        'FINANCIAL_EXPENSE',
        'OTHER_EXPENSE'
      );
    `);

    // Create financial_statement enum
    await queryRunner.query(`
      CREATE TYPE "financial_statement_enum" AS ENUM (
        'BALANCE_SHEET',
        'INCOME_STATEMENT',
        'CASH_FLOW_STATEMENT',
        'CHANGES_IN_EQUITY'
      );
    `);

    // Add sub_category to accounts
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "sub_category" account_sub_category_enum;
    `);

    // Add financial_statement mapping
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "financial_statement" financial_statement_enum;
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "statement_section" VARCHAR(100);
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "display_order" INTEGER DEFAULT 0;
    `);

    // Add behavior flags
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "is_cash_account" BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "is_bank_account" BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "is_depreciable" BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "require_project" BOOLEAN DEFAULT FALSE;
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "allow_direct_posting" BOOLEAN DEFAULT TRUE;
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX "idx_accounts_sub_category" 
      ON "accounts"("sub_category");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_accounts_financial_statement" 
      ON "accounts"("financial_statement");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_accounts_cash" 
      ON "accounts"("is_cash_account") 
      WHERE "is_cash_account" = TRUE;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_accounts_bank" 
      ON "accounts"("is_bank_account") 
      WHERE "is_bank_account" = TRUE;
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."sub_category" IS 
      'Detailed classification for financial statement grouping';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."financial_statement" IS 
      'Which financial statement this account appears on';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."statement_section" IS 
      'Section name within the financial statement (e.g., Current Assets, Operating Expenses)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."display_order" IS 
      'Order of appearance in financial statements (lower = appears first)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."is_cash_account" IS 
      'Flag for cash flow statement generation';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."is_bank_account" IS 
      'Flag for bank reconciliation module';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."is_depreciable" IS 
      'Flag for fixed assets that require depreciation';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."allow_direct_posting" IS 
      'If false, account is for sub-totals only (no direct transactions)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_accounts_bank";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_accounts_cash";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_accounts_financial_statement";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_accounts_sub_category";`);

    // Remove columns
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "allow_direct_posting";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "require_project";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "is_depreciable";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "is_bank_account";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "is_cash_account";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "display_order";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "statement_section";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "financial_statement";`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "sub_category";`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "financial_statement_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "account_sub_category_enum";`);
  }
}

