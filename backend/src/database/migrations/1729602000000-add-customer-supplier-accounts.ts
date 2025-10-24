import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerSupplierAccounts1729602000000
  implements MigrationInterface
{
  name = 'AddCustomerSupplierAccounts1729602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CUSTOMER and SUPPLIER to account_category enum
    await queryRunner.query(`
      ALTER TYPE "account_category_enum" 
      ADD VALUE IF NOT EXISTS 'CUSTOMER';
    `);

    await queryRunner.query(`
      ALTER TYPE "account_category_enum" 
      ADD VALUE IF NOT EXISTS 'SUPPLIER';
    `);

    // Add customer_id column to accounts table
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      ADD COLUMN "customer_id" uuid NULL;
    `);

    // Add index for customer_id for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_accounts_customer_id" 
      ON "accounts"("customer_id");
    `);

    // Add comment explaining the column
    await queryRunner.query(`
      COMMENT ON COLUMN "accounts"."customer_id" IS 
      'Reference to customer entity for CUSTOMER category accounts';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_accounts_customer_id";
    `);

    // Remove customer_id column
    await queryRunner.query(`
      ALTER TABLE "accounts" 
      DROP COLUMN IF EXISTS "customer_id";
    `);

    // Note: Cannot remove enum values in PostgreSQL without recreating the type
    // The CUSTOMER and SUPPLIER values will remain in the enum
    // This is acceptable as they won't cause issues
  }
}

