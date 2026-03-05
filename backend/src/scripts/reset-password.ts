import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const resetPassword = async () => {
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

        const hashedPassword = await bcrypt.hash('Admin@123', 10);

        const result = await dataSource.query(
            `
      UPDATE users 
      SET 
        password_hash = $1,
        failed_login_attempts = 0,
        locked_until = NULL,
        status = 'ACTIVE'
      WHERE username = 'admin'
      RETURNING id, username
      `,
            [hashedPassword],
        );

        if (result.length > 0) {
            console.log('✅ Admin password has been reset to: Admin@123');
            console.log('✅ Account unlocked and active.');
        } else {
            console.log('❌ Admin user not found!');
        }

        await dataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Reset failed:', error);
        await dataSource.destroy();
        process.exit(1);
    }
};

resetPassword();
