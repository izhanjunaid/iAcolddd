import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const addBillingPermissions = async () => {
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

    // Billing permissions to add
    const billingPermissions = [
      'billing.calculate',
      'billing.read',
      'billing.create',
      'billing.update',
      'billing.delete',
    ];

    console.log('🔧 Adding billing permissions...');

    for (const permCode of billingPermissions) {
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
      console.log(`  ✓ Added permission: ${permCode}`);
    }

    // Get Super Admin role ID
    const roleResult = await dataSource.query(
      `SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`,
    );

    if (roleResult.length === 0) {
      console.log('⚠️  Super Admin role not found. Please run the main seed first.');
      await dataSource.destroy();
      process.exit(1);
    }

    const roleId = roleResult[0].id;

    // Link billing permissions to Super Admin role
    console.log('🔗 Linking billing permissions to Super Admin role...');
    await dataSource.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, id FROM permissions WHERE module = 'billing'
      ON CONFLICT DO NOTHING
      `,
      [roleId],
    );

    console.log('\n🎉 Billing permissions added successfully!');
    console.log('✅ Admin user now has billing.calculate permission');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding billing permissions:', error);
    await dataSource.destroy();
    process.exit(1);
  }
};

addBillingPermissions();
