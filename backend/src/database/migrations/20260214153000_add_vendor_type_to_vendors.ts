import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVendorTypeToVendors20260214153000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vendors',
      new TableColumn({
        name: 'vendor_type',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendors', 'vendor_type');
  }
}
