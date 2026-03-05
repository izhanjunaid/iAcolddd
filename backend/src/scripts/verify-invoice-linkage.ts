import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoicesModule } from '../invoices/invoices.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CustomersModule } from '../customers/customers.module';
import { DataSource } from 'typeorm';
import { InvoiceGLService } from '../invoices/services/invoice-gl.service';
import { InvoicesService } from '../invoices/services/invoices.service';
import { CustomersService } from '../customers/customers.service';
import { InvoiceStatus } from '../invoices/entities/invoice.entity';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';

async function verifyLinkage() {
    const moduleRef = await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    type: 'postgres',
                    host: configService.get<string>('DATABASE_HOST'),
                    port: configService.get<number>('DATABASE_PORT'),
                    username: configService.get<string>('DATABASE_USER'),
                    password: configService.get<string>('DATABASE_PASSWORD'),
                    database: configService.get<string>('DATABASE_NAME'),
                    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                    synchronize: false,
                }),
                inject: [ConfigService],
            }),
            InvoicesModule,
            VouchersModule,
            CustomersModule,
            UsersModule
        ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const invoicesService = app.get(InvoicesService);
    const invoiceGLService = app.get(InvoiceGLService);
    const customersService = app.get(CustomersService);
    const usersService = app.get(UsersService);
    const dataSource = app.get(DataSource);

    try {
        console.log('🧪 Starting Verification: Invoice-Voucher Linkage');

        // 1. Get a customer
        const customersResult = await customersService.findAll({});
        const customer = customersResult.data[0];
        if (!customer) {
            throw new Error('No customers found. Cannot run test.');
        }
        console.log(`👤 Using customer: ${customer.name}`);

        const users = await usersService.findAll();
        const user = users[0];

        if (!user) throw new Error('No users found');
        const userId = user.id;
        console.log(`👤 Using user: ${user.fullName} (${userId})`);

        // 2. Create a Draft Invoice
        const invoice = await invoicesService.createInvoiceFromBilling({
            customerId: customer.id,
            issueDate: new Date().toISOString(),
            billingData: {
                customerId: customer.id,
                dateIn: new Date(),
                dateOut: new Date(),
                weight: 100
            },
            notes: 'Verification Test Invoice ' + Date.now(),
            autoSend: false
        }, userId);

        console.log(`📄 Created Invoice: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

        // 3. Mark as Sent (Triggers GL Voucher Creation)
        console.log('🔄 Marking as SENT...');
        await invoicesService.markAsSent(invoice.id, userId);

        // 4. Verify Voucher Linkage
        const sentInvoice = await invoicesService.findOne(invoice.id);
        console.log(`✅ Invoice Voucher ID: ${sentInvoice.voucherId}`);

        if (!sentInvoice.voucherId) {
            throw new Error('❌ Voucher ID is missing after sending invoice!');
        }

        // 5. Verify Idempotency (Call createInvoiceVoucher again)
        console.log('🔄 Attempting to create voucher again (Idempotency check)...');

        // Check voucher count before
        const vouchersBefore = await dataSource.query(`SELECT count(*) FROM voucher_master WHERE "reference_number" = '${sentInvoice.invoiceNumber}'`);
        const countBefore = parseInt(vouchersBefore[0].count);

        await invoiceGLService.createInvoiceVoucher(invoice.id, userId);

        // Check voucher count after
        const vouchersAfter = await dataSource.query(`SELECT count(*) FROM voucher_master WHERE "reference_number" = '${sentInvoice.invoiceNumber}'`);
        const countAfter = parseInt(vouchersAfter[0].count);

        if (countAfter !== countBefore) {
            throw new Error(`❌ Idempotency failed! Voucher count changed from ${countBefore} to ${countAfter}`);
        }

        console.log('✅ Idempotency verified: No duplicate voucher created.');

        // Cleanup (optional, keeping for inspection)
        // await invoicesService.cancel(invoice.id);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await app.close();
    }
}

verifyLinkage();
