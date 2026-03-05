import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChargeApprovalAction1740500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ADD_CHARGE to the approval_action_enum
    await queryRunner.query(
      `ALTER TYPE "approval_action_enum" ADD VALUE IF NOT EXISTS 'ADD_CHARGE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from enums directly.
    // To truly revert, you would need to recreate the enum — left as no-op for safety.
  }
}
