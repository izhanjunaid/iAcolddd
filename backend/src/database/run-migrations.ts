import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

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
    // Add migrations path
    dataSource.setOptions({
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      subscribers: [],
    });

    await dataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🚀 Running pending migrations...');

    const migrations = await dataSource.runMigrations();

    console.log(`✅ ${migrations.length} migrations executed successfully!`);
    if (migrations.length > 0) {
      migrations.forEach((m) => console.log(`   - ${m.name}`));
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log(
        'ℹ️  Error indicates resource already exists. Please verify manually.',
      );
    } else {
      console.error(error);
    }
    await dataSource.destroy();
    process.exit(1);
  }
};

runMigrations();
