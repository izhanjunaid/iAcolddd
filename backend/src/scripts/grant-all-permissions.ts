
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { Permission } from '../users/entities/permission.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);

    console.log('Granting ALL permissions to admin...');

    // 1. Define Permissions
    const permissionsToGrant = [
        // AP Permissions
        { code: 'vendors.read', name: 'Read Vendors', module: 'vendors', description: 'View vendor list and details' },
        { code: 'vendors.create', name: 'Create Vendor', module: 'vendors', description: 'Create new vendors' },
        { code: 'vendors.update', name: 'Update Vendor', module: 'vendors', description: 'Update existing vendors' },
        { code: 'vendors.delete', name: 'Delete Vendor', module: 'vendors', description: 'Delete vendors' },
        { code: 'ap.payment.read', name: 'Read AP Payments', module: 'ap-payments', description: 'View AP payments' },
        { code: 'ap.payment.create', name: 'Create AP Payment', module: 'ap-payments', description: 'Record AP payments' },
        { code: 'ap.payment.apply', name: 'Apply AP Payment', module: 'ap-payments', description: 'Apply AP payments to bills' },

        // Inventory Permissions
        { code: 'inventory.items.read', name: 'Read Inventory Items', module: 'inventory', description: 'View inventory items' },
        { code: 'inventory.items.create', name: 'Create Inventory Item', module: 'inventory', description: 'Create inventory items' },
        { code: 'inventory.items.update', name: 'Update Inventory Item', module: 'inventory', description: 'Update inventory items' },
    ];

    const processingPermissions: Permission[] = [];

    // 2. Upsert Permissions
    for (const p of permissionsToGrant) {
        let perm = await permRepo.findOne({ where: { code: p.code } });
        if (!perm) {
            console.log(`Creating permission: ${p.code}`);
            perm = permRepo.create(p);
            await permRepo.save(perm);
        } else {
            console.log(`Permission exists: ${p.code}`);
        }
        processingPermissions.push(perm);
    }

    // 3. Find or Create Super Admin Role
    let role = await roleRepo.findOne({
        where: { name: 'Super Admin' },
        relations: ['permissions']
    });

    if (!role) {
        console.log('Creating Super Admin role...');
        role = roleRepo.create({
            name: 'Super Admin',
            description: 'Can access everything',
            isSystem: true,
            permissions: []
        });
        await roleRepo.save(role);
    }

    // 4. Assign Permissions to Role
    // We add new ones to existing ones
    const existingPermIds = new Set(role.permissions.map(p => p.id));
    let addedCount = 0;
    for (const perm of processingPermissions) {
        if (!existingPermIds.has(perm.id)) {
            role.permissions.push(perm);
            addedCount++;
        }
    }

    if (addedCount > 0) {
        console.log(`Adding ${addedCount} new permissions to Super Admin role...`);
        await roleRepo.save(role);
    } else {
        console.log('Super Admin role already has all specified permissions.');
    }

    // 5. Assign Role to Admin User
    const adminUser = await userRepo.findOne({
        where: { username: 'admin' },
        relations: ['roles']
    });

    if (!adminUser) {
        console.error('Admin user not found!');
        process.exit(1);
    }

    const hasRole = adminUser.roles.some(r => r.name === 'Super Admin');
    if (!hasRole) {
        console.log('Assigning Super Admin role to admin user...');
        adminUser.roles.push(role);
        await userRepo.save(adminUser);
        console.log('Role assigned.');
    } else {
        console.log('Admin user already has Super Admin role.');
    }

    console.log('✅ Permissions granted successfully.');
    await app.close();
}

bootstrap();
