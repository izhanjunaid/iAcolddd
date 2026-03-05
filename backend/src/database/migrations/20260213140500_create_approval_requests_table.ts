import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateApprovalRequestsTable1739458000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Enums
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "approval_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "approval_entity_type_enum" AS ENUM ('VOUCHER', 'INVOICE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "approval_action_enum" AS ENUM ('UNPOST', 'REOPEN', 'MARK_AS_SENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'approval_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'entityType',
            type: 'approval_entity_type_enum',
          },
          {
            name: 'entityId',
            type: 'uuid',
          },
          {
            name: 'action',
            type: 'approval_action_enum',
          },
          {
            name: 'status',
            type: 'approval_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'requested_by',
            type: 'uuid',
          },
          {
            name: 'approved_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
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

    // Indices
    await queryRunner.createIndex(
      'approval_requests',
      new TableIndex({
        name: 'IDX_approval_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'approval_requests',
      new TableIndex({
        name: 'IDX_approval_requests_entity',
        columnNames: ['entityId', 'entityType'],
      }),
    );

    // Foreign Keys (Users)
    // Assuming 'users' table exists and has 'id'
    await queryRunner.createForeignKey(
      'approval_requests',
      new TableForeignKey({
        columnNames: ['requested_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'approval_requests',
      new TableForeignKey({
        columnNames: ['approved_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('approval_requests');
    if (table) {
      const requestedByFK = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('requested_by') !== -1,
      );
      const approvedByFK = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('approved_by') !== -1,
      );

      if (requestedByFK)
        await queryRunner.dropForeignKey('approval_requests', requestedByFK);
      if (approvedByFK)
        await queryRunner.dropForeignKey('approval_requests', approvedByFK);

      await queryRunner.dropIndex(
        'approval_requests',
        'IDX_approval_requests_status',
      );
      await queryRunner.dropIndex(
        'approval_requests',
        'IDX_approval_requests_entity',
      );
    }

    await queryRunner.dropTable('approval_requests');

    await queryRunner.query(`DROP TYPE "approval_action_enum"`);
    await queryRunner.query(`DROP TYPE "approval_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE "approval_status_enum"`);
  }
}
