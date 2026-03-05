
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    const username = 'admin';
    const user = await usersService.findByUsername(username);

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User: ${user.username}`);
    console.log(`Roles: ${user.roles.map(r => r.name).join(', ')}`);

    const permissions = await usersService.getUserPermissions(user.id);
    console.log('Permissions:');
    permissions.forEach(p => console.log(` - ${p}`));

    await app.close();
}

bootstrap();
