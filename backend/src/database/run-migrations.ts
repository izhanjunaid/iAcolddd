import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import { CreateInvoicesSystem1730000000000 } from './migrations/1730000000000-create-invoices-system';

// Load environment variables
dotenvConfig();

const runMigrations = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'admin123',
    database: process.env.DATABASE_NAME || 'advance_erp',
  });

  try {
    console.log('📦 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🚀 Running invoice system migration...');

    const migration = new CreateInvoicesSystem1730000000000();
    await migration.up(dataSource.createQueryRunner());

    console.log('✅ Invoice system migration completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - invoices');
    console.log('  - invoice_line_items');
    console.log('');
    console.log('Created enums:');
    console.log('  - invoice_status_enum');
    console.log('  - invoice_type_enum');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables might already exist. Skipping migration.');
    } else {
      throw error;
    }
    await dataSource.destroy();
    process.exit(1);
  }
};

runMigrations();
