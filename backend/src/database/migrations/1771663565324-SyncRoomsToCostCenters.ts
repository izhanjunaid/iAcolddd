import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncRoomsToCostCenters1771663565324 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$ 
            DECLARE
                admin_user_id UUID;
                parent_cc_id UUID;
            BEGIN
                -- Find the system admin user to attribute creation
                SELECT id INTO admin_user_id FROM users WHERE username = 'admin' LIMIT 1;
                
                IF admin_user_id IS NULL THEN
                    RETURN; -- Skip if no admin user exists
                END IF;

                -- Create a parent Cost Center for all Cold Store Chambers if it doesn't exist
                INSERT INTO cost_centers (code, name, description, is_active, created_at, updated_at, created_by_id)
                VALUES ('CS-000', 'Cold Store Facilities', 'Master cost center for all cold store chambers', true, NOW(), NOW(), admin_user_id)
                ON CONFLICT (code) DO NOTHING;

                SELECT id INTO parent_cc_id FROM cost_centers WHERE code = 'CS-000' LIMIT 1;

                -- Insert a cost center for each room
                INSERT INTO cost_centers (code, name, description, parent_id, is_active, created_at, updated_at, created_by_id)
                SELECT 
                    'CC-' || r.code, 
                    w.name || ' - ' || r.name, 
                    'Cost Center for Cold Store Chamber ' || r.code,
                    parent_cc_id,
                    true,
                    NOW(),
                    NOW(),
                    admin_user_id
                FROM rooms r
                JOIN warehouses w ON r.warehouse_id = w.id
                ON CONFLICT (code) DO NOTHING;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Cost Centers created for Rooms.
    // We delete children first (CC-R%) then the parent (CS-000).
    await queryRunner.query(`
            DELETE FROM cost_centers WHERE code LIKE 'CC-R%';
            DELETE FROM cost_centers WHERE code = 'CS-000';
        `);
  }
}
