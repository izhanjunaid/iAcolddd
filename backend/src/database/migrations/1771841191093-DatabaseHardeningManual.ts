import { MigrationInterface, QueryRunner } from 'typeorm';

export class DatabaseHardeningManual1771841191093
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lot_id foreign keys to inventory tables
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD "lot_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inventory_transactions_lot_id" FOREIGN KEY ("lot_id") REFERENCES "cold_store_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "inventory_balances" ADD "lot_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_balances" ADD CONSTRAINT "FK_inventory_balances_lot_id" FOREIGN KEY ("lot_id") REFERENCES "cold_store_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Add CHECK constraints to enforce voucher and GL entries linked to operational entries
    await queryRunner.query(
      `ALTER TABLE "ap_bills" ADD CONSTRAINT "CHK_ap_bills_voucher" CHECK ("status" = 'DRAFT' OR "gl_voucher_id" IS NOT NULL) NOT VALID`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "CHK_invoices_voucher" CHECK ("status" IN ('DRAFT', 'CANCELLED') OR "voucher_id" IS NOT NULL) NOT VALID`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "CHK_invoices_voucher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ap_bills" DROP CONSTRAINT "CHK_ap_bills_voucher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_balances" DROP CONSTRAINT "FK_inventory_balances_lot_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_balances" DROP COLUMN "lot_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inventory_transactions_lot_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN "lot_id"`,
    );
  }
}
