import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilledQuantityToRentalCycle20260302095500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" ADD "billed_quantity" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rental_billing_cycles" DROP COLUMN "billed_quantity"`,
    );
  }
}
