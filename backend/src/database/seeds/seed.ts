import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const seed = async () => {
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

    // Check if admin user already exists
    const existingAdmin = await dataSource.query(
      `SELECT id FROM users WHERE username = 'admin'`,
    );

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    console.log('🌱 Starting database seed...');

    // Hash the default admin password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Insert super admin role
    const roleResult = await dataSource.query(
      `
      INSERT INTO roles (name, description, is_system, created_at, updated_at)
      VALUES ('Super Admin', 'Full system access', true, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
      `,
    );
    const roleId = roleResult[0].id;
    console.log('✅ Super Admin role created');

    // Insert all permissions for super admin
    const permissions = [
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
      'accounts.create',
      'accounts.read',
      'accounts.update',
      'accounts.delete',
      'customers.create',
      'customers.read',
      'customers.update',
      'customers.delete',
      'vouchers.create',
      'vouchers.read',
      'vouchers.update',
      'vouchers.delete',
      'vouchers.post',
      'vouchers.unpost',
      'invoices.create',
      'invoices.read',
      'invoices.update',
      'invoices.delete',
      'invoices.approve',
      'warehouse.create',
      'warehouse.read',
      'warehouse.update',
      'warehouse.delete',
      'reports.view',
      'reports.export',
      'settings.manage',
    ];

    for (const permCode of permissions) {
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
    console.log('✅ Permissions created');

    // Link all permissions to super admin role
    await dataSource.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, id FROM permissions
      ON CONFLICT DO NOTHING
      `,
      [roleId],
    );
    console.log('✅ Permissions linked to Super Admin role');

    // Insert admin user
    const userResult = await dataSource.query(
      `
      INSERT INTO users (username, email, password_hash, full_name, phone, status, created_at, updated_at)
      VALUES ('admin', 'admin@advance-erp.com', $1, 'System Administrator', '+1234567890', 'ACTIVE', NOW(), NOW())
      RETURNING id
      `,
      [hashedPassword],
    );
    const userId = userResult[0].id;
    console.log('✅ Admin user created');

    // Assign super admin role to admin user
    await dataSource.query(
      `
      INSERT INTO user_roles (user_id, role_id, created_at)
      VALUES ($1, $2, NOW())
      `,
      [userId, roleId],
    );
    console.log('✅ Super Admin role assigned to admin user');

    console.log('\n🎉 Database seed completed successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('   Email: admin@advance-erp.com\n');
    console.log('⚠️  IMPORTANT: Change the admin password after first login!\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
};

seed();

