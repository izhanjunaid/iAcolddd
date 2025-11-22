import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const updateCustomerPermissions = async () => {
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

    console.log('🔄 Updating customer permissions for Super Admin...');

    // Get Super Admin role ID
    const roleResult = await dataSource.query(
      `SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`,
    );

    if (roleResult.length === 0) {
      console.log('❌ Super Admin role not found!');
      await dataSource.destroy();
      process.exit(1);
    }

    const roleId = roleResult[0].id;
    console.log(`✅ Found Super Admin role (ID: ${roleId})`);

    // Customer permissions
    const customerPermissions = [
      'customers.create',
      'customers.read',
      'customers.update',
      'customers.delete',
    ];

    // Insert customer permissions if they don't exist
    for (const permCode of customerPermissions) {
      const [module, action] = permCode.split('.');
      await dataSource.query(
        `
        INSERT INTO permissions (code, name, description, module, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (code) DO NOTHING
        `,
        [
          permCode,
          `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
          `Permission to ${action} ${module}`,
          module,
        ],
      );
    }
    console.log('✅ Customer permissions ensured in database');

    // Link customer permissions to Super Admin role
    await dataSource.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, p.id
      FROM permissions p
      WHERE p.code LIKE 'customers.%'
      ON CONFLICT DO NOTHING
      `,
      [roleId],
    );
    console.log('✅ Customer permissions linked to Super Admin role');

    // Verify permissions
    const verifyResult = await dataSource.query(
      `
      SELECT p.code, p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = $1 AND p.code LIKE 'customers.%'
      ORDER BY p.code
      `,
      [roleId],
    );

    console.log('\n📋 Current customer permissions for Super Admin:');
    verifyResult.forEach((perm: any) => {
      console.log(`   ✓ ${perm.code} - ${perm.name}`);
    });

    console.log('\n🎉 Customer permissions update completed successfully!\n');
    console.log('⚠️  NOTE: Users need to log out and log back in for permissions to take effect.\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
};

updateCustomerPermissions();
