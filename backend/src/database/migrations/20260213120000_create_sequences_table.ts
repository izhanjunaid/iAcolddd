import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSequencesTable1739454000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sequences',
        columns: [
          {
            name: 'key',
            type: 'varchar',
            isPrimary: true,
            comment: 'The sequence key (e.g., INV-2026, JV-2026)',
          },
          {
            name: 'value',
            type: 'int',
            isNullable: false,
            default: 0,
            comment: 'The last used sequence number',
          },
          {
            name: 'version',
            type: 'int',
            isNullable: false,
            default: 1,
            comment: 'For optimistic locking or version tracking',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sequences');
  }
}
