import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApVoucherTypes1736930000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add PURCHASE and PAYMENT to voucher_type_enum
    // Note: We cannot run this inside a transaction block in some Postgres versions,
    // but TypeORM wraps migrations in transactions by default.
    // However, ADD VALUE is usually safe.
    // If it fails because it exists, we catch it.

    // We disable transaction for this migration if possible, but here we just try-catch or use IF NOT EXISTS if PG12+

    // Alternative: Use a raw check
    await queryRunner.query(
      `ALTER TYPE "voucher_type" ADD VALUE IF NOT EXISTS 'PURCHASE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "voucher_type" ADD VALUE IF NOT EXISTS 'PAYMENT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in Postgres comfortably
  }
}
