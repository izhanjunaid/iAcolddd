
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import { Customer } from '../customers/entities/customer.entity';
import { BillingRateConfiguration } from '../common/entities/billing-rate-configuration.entity';
import { Invoice, InvoiceStatus, InvoiceType } from '../invoices/entities/invoice.entity';
import { InvoiceLineItem } from '../invoices/entities/invoice-line-item.entity';
import { User } from '../users/entities/user.entity';
import { Account } from '../accounts/entities/account.entity';

// Load environment variables
dotenvConfig();

const runScenario = async () => {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'admin',
        password: process.env.DATABASE_PASSWORD || 'admin123',
        database: process.env.DATABASE_NAME || 'advance_erp',
        entities: [path.join(__dirname, '..', '**', '*.entity.ts')],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Database connection established');

        // 1. Get Admin User
        const userRepo = dataSource.getRepository(User);
        const admin = await userRepo.findOne({ where: { username: 'admin' } });
        if (!admin) {
            console.error('❌ Admin user not found. Please run seed first.');
            return;
        }
        console.log(`👤 Using Admin User: ${admin.username}`);

        // 2. Get Receivable Account
        const accountRepo = dataSource.getRepository(Account);
        // Try to find a receivable account, or just pick the first asset account
        let receivableAccount = await accountRepo.findOne({
            where: { code: '1100' } // Assuming 1100 is standard for Receivables
        });

        if (!receivableAccount) {
            // Fallback: find any account
            receivableAccount = await accountRepo.findOne({ where: {} });
            if (!receivableAccount) {
                console.error('❌ No accounts found. Please run seed:accounts first.');
                return;
            }
        }
        console.log(`💰 Using Account: ${receivableAccount.name} (${receivableAccount.code})`);

        // 3. Create Customer "Rana Pool"
        const customerRepo = dataSource.getRepository(Customer);
        let customer = await customerRepo.findOne({ where: { name: 'Rana Pool' } });

        if (!customer) {
            console.log('Creating customer "Rana Pool"...');
            // Generate Code
            const count = await customerRepo.count();
            const code = `CUST-${(count + 1).toString().padStart(4, '0')}`;

            customer = customerRepo.create({
                code,
                name: 'Rana Pool',
                email: 'rana.pool@example.com',
                phone: '+923001234567',
                addressLine1: '123 Apple Orchard',
                city: 'Swat',
                country: 'Pakistan',
                isActive: true,
                createdById: admin.id,
                receivableAccountId: receivableAccount.id,
                creditLimit: 1000000,
                creditDays: 30
            });
            await customerRepo.save(customer);
            console.log(`✅ Customer "Rana Pool" created (${code})`);
        } else {
            console.log(`ℹ️ Customer "Rana Pool" already exists (${customer.code})`);
        }

        // 4. Create Billing Rate for "Apples"
        const rateRepo = dataSource.getRepository(BillingRateConfiguration);
        const rateName = 'Apple Season Rate 2025';
        let rate = await rateRepo.findOne({
            where: {
                customerId: customer.id,
                rateName: rateName
            }
        });

        if (!rate) {
            console.log('Creating Seasonal Rate for Apples...');
            rate = rateRepo.create({
                rateName: rateName,
                rateType: 'seasonal',
                rateValue: 1.5, // 1.5 PKR per kg per day
                customerId: customer.id,
                effectiveFrom: new Date(),
                description: 'Special seasonal rate for Apple storage',
                isActive: true,
                createdById: admin.id,
            });
            await rateRepo.save(rate);
            console.log('✅ Seasonal Rate configured: 1.5 PKR/kg/day');
        } else {
            console.log('ℹ️ Rate configuration already exists');
        }

        // 5. Create Invoice for Apple Season
        const invoiceRepo = dataSource.getRepository(Invoice);
        const lineItemRepo = dataSource.getRepository(InvoiceLineItem);

        const weight = 1000;
        const daysStored = 90;
        const ratePerDay = 1.5;
        const storageCharges = weight * ratePerDay * daysStored;
        const labourCharges = 5000;
        const subtotal = storageCharges + labourCharges;
        const totalAmount = subtotal;

        // Generate Invoice Number
        const year = new Date().getFullYear();
        const invCount = await invoiceRepo.count();
        const invoiceNumber = `INV-${year}-${(invCount + 1).toString().padStart(4, '0')}`;

        console.log(`Creating Invoice ${invoiceNumber}...`);

        const invoice = invoiceRepo.create({
            invoiceNumber,
            invoiceType: InvoiceType.STORAGE,
            status: InvoiceStatus.SENT,
            customerId: customer.id,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

            weight,
            daysStored,
            ratePerKgPerDay: ratePerDay,
            storageDateIn: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            storageDateOut: new Date(),

            storageCharges,
            labourCharges,
            loadingCharges: 0,
            subtotal,
            gstAmount: 0,
            gstRate: 0,
            whtAmount: 0,
            whtRate: 0,
            totalAmount,
            balanceDue: totalAmount,

            notes: 'Apple Season Storage - 2025',
            createdBy: admin.username,
        });

        const savedInvoice = await invoiceRepo.save(invoice);

        // Create Line Items
        const lineItems = [
            lineItemRepo.create({
                invoice: savedInvoice,
                lineNumber: 1,
                description: `Storage Charges (${weight} kg × PKR ${ratePerDay}/kg/day × ${daysStored} days)`,
                quantity: weight,
                unitPrice: ratePerDay * daysStored,
                lineTotal: storageCharges,
                taxRate: 0,
                taxAmount: 0,
            }),
            lineItemRepo.create({
                invoice: savedInvoice,
                lineNumber: 2,
                description: 'Labour Charges',
                quantity: 1,
                unitPrice: labourCharges,
                lineTotal: labourCharges,
                taxRate: 0,
                taxAmount: 0,
            })
        ];

        await lineItemRepo.save(lineItems);

        console.log('✅ Invoice created successfully!');
        console.log('----------------------------------------');
        console.log(`Customer: ${customer.name}`);
        console.log(`Invoice: ${invoiceNumber}`);
        console.log(`Amount: PKR ${totalAmount.toLocaleString()}`);
        console.log('----------------------------------------');

        await dataSource.destroy();
    } catch (error) {
        console.error('❌ Scenario failed:', error);
        if (dataSource.isInitialized) await dataSource.destroy();
        process.exit(1);
    }
};

runScenario();
