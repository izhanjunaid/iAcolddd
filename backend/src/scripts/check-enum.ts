import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module'; // Adjust path
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        const result = await dataSource.query(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            ORDER BY t.typname, e.enumlabel
        `);
        console.log('Enums in DB:', result);
    } catch (e) {
        console.error(e);
    }

    await app.close();
    process.exit(0);
}
bootstrap();
