import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(User);

    const username = 'admin';
    const email = 'admin@advance-erp.com';
    const password = 'password';

    console.log(`Ensuring admin user (${username} / ${password}) exists...`);

    try {
        let user = await userRepo.findOne({
            where: [
                { username },
                { email }
            ]
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (user) {
            console.log(`Updating existing user ${user.username}...`);
            await userRepo.update(user.id, {
                username: 'admin',
                email: 'admin@advance-erp.com', // Ensure email is consistent
                passwordHash: hashedPassword,
                failedLoginAttempts: 0,
                lockedUntil: null as any,
                status: 'ACTIVE' as any
            });
        } else {
            console.log('Creating new user...');
            const userData: any = {
                username,
                email,
                passwordHash: hashedPassword,
                fullName: 'System Administrator',
                roles: [],
                status: 'ACTIVE'
            };
            user = userRepo.create(userData);
            await userRepo.save(user);

            // Force update to be sure
            await userRepo.update(user.id, {
                status: 'ACTIVE' as any,
                lockedUntil: null as any,
                failedLoginAttempts: 0
            });
        }

        console.log('✅ Admin user ensured.');

    } catch (error) {
        console.error('Error ensuring admin user:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
