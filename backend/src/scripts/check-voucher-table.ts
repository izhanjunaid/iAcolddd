import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module'; // Adjust path
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        const result = await dataSource.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'voucher_master'
      `);
        console.log('Columns:', result);
    } catch (e) {
        console.error(e);
    }

    await app.close();
    process.exit(0);
}
bootstrap();
