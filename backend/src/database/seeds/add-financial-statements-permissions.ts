import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const addFinancialStatementsPermissions = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'admin123',
    database: process.env.DATABASE_NAME || 'advance_erp',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Check if permissions already exist
    const existingPermissions = await dataSource.query(
      `SELECT COUNT(*) as count FROM permissions WHERE code LIKE 'financial-statements.%'`,
    );

    if (parseInt(existingPermissions[0].count) > 0) {
      console.log('⚠️  Financial Statements permissions already exist. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    console.log('🌱 Starting Financial Statements permissions seed...');

    // Define permissions
    const permissions = [
      {
        code: 'financial-statements.read',
        name: 'View Financial Statements',
        description: 'View Balance Sheet, Income Statement, Cash Flow, and Analysis',
      },
      {
        code: 'financial-statements.export',
        name: 'Export Financial Statements',
        description: 'Export financial statements to PDF or Excel',
      },
    ];

    // Insert permissions
    for (const perm of permissions) {
      await dataSource.query(
        `INSERT INTO permissions (code, name, module, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO NOTHING`,
        [perm.code, perm.name, 'Financial Statements', perm.description],
      );
      console.log(`✅ Created permission: ${perm.code}`);
    }

    // Grant permissions to admin role
    const adminRole = await dataSource.query(
      `SELECT id FROM roles WHERE name = 'Admin' LIMIT 1`,
    );

    if (adminRole.length > 0) {
      const adminRoleId = adminRole[0].id;

      for (const perm of permissions) {
        const permissionRow = await dataSource.query(
          `SELECT id FROM permissions WHERE code = $1`,
          [perm.code],
        );

        if (permissionRow.length > 0) {
          const permissionId = permissionRow[0].id;

          await dataSource.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [adminRoleId, permissionId],
          );

          console.log(`✅ Granted ${perm.code} to Admin role`);
        }
      }
    }

    console.log('\n🎉 Financial Statements permissions seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${permissions.length} permissions created`);
    console.log(`   - Permissions granted to Admin role\n`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
};

addFinancialStatementsPermissions();
