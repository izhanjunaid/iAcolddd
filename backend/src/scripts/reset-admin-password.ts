import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // UsersService usage for finding is fine if it works, but let's use DataSource for everything to be safe/raw.
    const dataSource = app.get(DataSource);

    const email = 'admin@advance-erp.com';
    const newPassword = 'admin123';

    console.log(`Resetting password for ${email}...`);

    try {
        const user = await dataSource.getRepository('User').findOne({ where: { email } });
        if (!user) {
            console.error('Admin user not found!');
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await dataSource.getRepository('User').update(user.id, {
            passwordHash: hashedPassword,
            failedLoginAttempts: 0,
            lockedUntil: null
        });

        console.log('✅ Password reset success.');

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
