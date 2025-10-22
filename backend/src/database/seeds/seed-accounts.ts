import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const seedAccounts = async () => {
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

    // Check if accounts already exist
    const existingAccounts = await dataSource.query(
      `SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL`,
    );

    if (parseInt(existingAccounts[0].count) > 0) {
      console.log('⚠️  Accounts already exist. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    console.log('🌱 Starting Chart of Accounts seed...');

    // Get admin user ID
    const adminUser = await dataSource.query(
      `SELECT id FROM users WHERE username = 'admin' LIMIT 1`,
    );

    if (!adminUser.length) {
      console.error('❌ Admin user not found. Please run the main seed first.');
      await dataSource.destroy();
      process.exit(1);
    }

    const adminId = adminUser[0].id;

    // =======================
    // ASSETS (1-XXXX)
    // =======================

    const assets = await dataSource.query(
      `INSERT INTO accounts (code, name, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('1-0001', 'Assets', 'CONTROL', 'DEBIT', 'ASSET', true, true, 0, $1, $1, NOW(), NOW())
       RETURNING id`,
      [adminId],
    );
    console.log('✅ Created: Assets (CONTROL)');

    const currentAssets = await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('1-0001-0001', 'Current Assets', $1, 'SUB_CONTROL', 'DEBIT', 'ASSET', true, true, 0, $2, $2, NOW(), NOW())
       RETURNING id`,
      [assets[0].id, adminId],
    );
    console.log('✅ Created: Current Assets (SUB_CONTROL)');

    await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES 
         ('1-0001-0001-0001', 'Cash in Hand', $1, 'DETAIL', 'DEBIT', 'ASSET', true, true, 0, $2, $2, NOW(), NOW()),
         ('1-0001-0001-0002', 'Cash at Bank', $1, 'DETAIL', 'DEBIT', 'ASSET', true, true, 0, $2, $2, NOW(), NOW()),
         ('1-0001-0001-0003', 'Accounts Receivable', $1, 'DETAIL', 'DEBIT', 'ASSET', false, true, 0, $2, $2, NOW(), NOW())`,
      [currentAssets[0].id, adminId],
    );
    console.log('✅ Created: Cash in Hand, Cash at Bank, Accounts Receivable (DETAIL)');

    // =======================
    // LIABILITIES (2-XXXX)
    // =======================

    const liabilities = await dataSource.query(
      `INSERT INTO accounts (code, name, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('2-0001', 'Liabilities', 'CONTROL', 'CREDIT', 'LIABILITY', true, true, 0, $1, $1, NOW(), NOW())
       RETURNING id`,
      [adminId],
    );
    console.log('✅ Created: Liabilities (CONTROL)');

    const currentLiabilities = await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('2-0001-0001', 'Current Liabilities', $1, 'SUB_CONTROL', 'CREDIT', 'LIABILITY', false, true, 0, $2, $2, NOW(), NOW())
       RETURNING id`,
      [liabilities[0].id, adminId],
    );
    console.log('✅ Created: Current Liabilities (SUB_CONTROL)');

    await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES 
         ('2-0001-0001-0001', 'Accounts Payable', $1, 'DETAIL', 'CREDIT', 'LIABILITY', false, true, 0, $2, $2, NOW(), NOW())`,
      [currentLiabilities[0].id, adminId],
    );
    console.log('✅ Created: Accounts Payable (DETAIL)');

    // =======================
    // EQUITY (3-XXXX)
    // =======================

    const equity = await dataSource.query(
      `INSERT INTO accounts (code, name, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('3-0001', 'Equity', 'CONTROL', 'CREDIT', 'EQUITY', true, true, 0, $1, $1, NOW(), NOW())
       RETURNING id`,
      [adminId],
    );
    console.log('✅ Created: Equity (CONTROL)');

    await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES 
         ('3-0001-0001', 'Owner Capital', $1, 'DETAIL', 'CREDIT', 'EQUITY', false, true, 0, $2, $2, NOW(), NOW()),
         ('3-0001-0002', 'Retained Earnings', $1, 'DETAIL', 'CREDIT', 'EQUITY', true, true, 0, $2, $2, NOW(), NOW())`,
      [equity[0].id, adminId],
    );
    console.log('✅ Created: Owner Capital, Retained Earnings (DETAIL)');

    // =======================
    // REVENUE (4-XXXX)
    // =======================

    const revenue = await dataSource.query(
      `INSERT INTO accounts (code, name, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('4-0001', 'Revenue', 'CONTROL', 'CREDIT', 'REVENUE', false, true, 0, $1, $1, NOW(), NOW())
       RETURNING id`,
      [adminId],
    );
    console.log('✅ Created: Revenue (CONTROL)');

    await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES 
         ('4-0001-0001', 'Cold Storage Revenue', $1, 'DETAIL', 'CREDIT', 'REVENUE', false, true, 0, $2, $2, NOW(), NOW()),
         ('4-0001-0002', 'Service Revenue', $1, 'DETAIL', 'CREDIT', 'REVENUE', false, true, 0, $2, $2, NOW(), NOW())`,
      [revenue[0].id, adminId],
    );
    console.log('✅ Created: Cold Storage Revenue, Service Revenue (DETAIL)');

    // =======================
    // EXPENSES (5-XXXX)
    // =======================

    const expenses = await dataSource.query(
      `INSERT INTO accounts (code, name, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('5-0001', 'Expenses', 'CONTROL', 'DEBIT', 'EXPENSE', false, true, 0, $1, $1, NOW(), NOW())
       RETURNING id`,
      [adminId],
    );
    console.log('✅ Created: Expenses (CONTROL)');

    const opExpenses = await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES ('5-0001-0001', 'Operating Expenses', $1, 'SUB_CONTROL', 'DEBIT', 'EXPENSE', false, true, 0, $2, $2, NOW(), NOW())
       RETURNING id`,
      [expenses[0].id, adminId],
    );
    console.log('✅ Created: Operating Expenses (SUB_CONTROL)');

    await dataSource.query(
      `INSERT INTO accounts (code, name, parent_account_id, account_type, nature, category, is_system, is_active, opening_balance, created_by, updated_by, created_at, updated_at)
       VALUES 
         ('5-0001-0001-0001', 'Electricity Expense', $1, 'DETAIL', 'DEBIT', 'EXPENSE', false, true, 0, $2, $2, NOW(), NOW()),
         ('5-0001-0001-0002', 'Salaries Expense', $1, 'DETAIL', 'DEBIT', 'EXPENSE', false, true, 0, $2, $2, NOW(), NOW()),
         ('5-0001-0001-0003', 'Maintenance Expense', $1, 'DETAIL', 'DEBIT', 'EXPENSE', false, true, 0, $2, $2, NOW(), NOW())`,
      [opExpenses[0].id, adminId],
    );
    console.log('✅ Created: Electricity, Salaries, Maintenance (DETAIL)');

    console.log('\n🎉 Chart of Accounts seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 5 CONTROL accounts (Assets, Liabilities, Equity, Revenue, Expenses)');
    console.log('   - 3 SUB_CONTROL accounts');
    console.log('   - 11 DETAIL accounts (transactional)');
    console.log('   - Total: 19 accounts\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
};

seedAccounts();

