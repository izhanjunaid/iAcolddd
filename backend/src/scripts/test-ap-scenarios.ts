import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PayablesService } from '../payables/services/payables.service';
import { CreateBillDto } from '../payables/dto/create-bill.dto';
import { RecordPaymentDto } from '../payables/dto/record-payment.dto';
import { ApPaymentMethod } from '../payables/enums/ap-payment-method.enum';
import { ApBillStatus } from '../payables/enums/ap-bill-status.enum';
import { DataSource } from 'typeorm';
import { Account } from '../accounts/entities/account.entity';
import { UsersService } from '../users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const payablesService = app.get(PayablesService);
    const usersService = app.get(UsersService);
    const dataSource = app.get(DataSource);

    console.log('🚀 Starting AP Scenarios Test...');

    try {
        // 0. Setup: Get User, Vendor (Customer), Expense Account
        // Try to find admin, otherwise get first user
        let admin = await usersService.findByEmail('admin@example.com');
        if (!admin) {
            console.warn('⚠️ Admin user not found, fetching first available user...');
            const users = await dataSource.query(`SELECT * FROM users LIMIT 1`);
            if (users.length > 0) {
                admin = users[0];
                console.log(`   Using user: ${(admin as any).email} (${(admin as any).id})`);
            }
        }

        if (!admin) throw new Error('No users found in database. Please run seeds.');

        // Use existing customer as vendor (assuming one exists from seeds)
        const vendors = await dataSource.query(`SELECT id FROM customers LIMIT 1`);
        if (!vendors.length) throw new Error('No customers found to act as vendor');
        const vendorId = vendors[0].id;

        // Get an expense account
        const expenseAccount = await dataSource.getRepository(Account).findOne({
            where: { code: '5-0001-0001-0001' } // Electricity Expense
        });
        if (!expenseAccount) throw new Error('Electricity Expense account not found');

        // 1. Create Purchase Bill
        console.log('\n--- 1. Testing Create Bill ---');
        const billNumber = `BILL-${Date.now()}`;
        const createDto: CreateBillDto = {
            vendorId,
            billNumber,
            vendorInvoiceNumber: `INV-${Date.now()}`,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 86400000 * 30), // 30 days
            lines: [
                {
                    expenseAccountId: expenseAccount.id,
                    description: 'Office Electricity Bill',
                    amount: 1000,
                    taxAmount: 50
                }
            ]
        };

        const bill = await payablesService.createBill(createDto, admin.id);
        console.log(`✅ Bill Created: ${bill.billNumber}, Total: ${bill.totalAmount}, GL: ${bill.glVoucherId}`);

        if (Number(bill.totalAmount) !== 1050) throw new Error('Total amount mismatch');
        if (bill.status !== ApBillStatus.POSTED) throw new Error('Status should be POSTED');
        if (!bill.glVoucherId) throw new Error('GL Voucher not created');

        // Verify GL Voucher Details
        const voucher = await dataSource.query(`SELECT * FROM voucher_detail WHERE voucher_id = $1`, [bill.glVoucherId]);
        console.log(`   GL Entries: ${voucher.length} lines`);
        // Should have Credit AP (1050) and Debit Expense (1050)

        // 2. Record Partial Payment
        console.log('\n--- 2. Testing Partial Payment ---');
        const paymentDto: RecordPaymentDto = {
            vendorId,
            paymentDate: new Date(),
            paymentMethod: ApPaymentMethod.CASH,
            amount: 500,
            notes: 'Partial Payment',
            applications: [
                { billId: bill.id, amountApplied: 500 }
            ]
        };

        const payment = await payablesService.recordPayment(paymentDto, admin.id);
        console.log(`✅ Payment Recorded: ${payment.paymentNumber}, Amount: ${payment.amount}`);

        // Verify Bill Balance
        const updatedBill = await payablesService.findBillOne(bill.id);
        if (!updatedBill) throw new Error('Updated bill not found');
        console.log(`   Updated Bill Balance: ${updatedBill.balanceDue}, Status: ${updatedBill.status}`);

        if (Number(updatedBill.balanceDue) !== 550) throw new Error(`Balance mismatch. Expected 550, got ${updatedBill.balanceDue}`);
        if (updatedBill.status !== ApBillStatus.PARTIALLY_PAID) throw new Error('Status should be PARTIALLY_PAID');

        // 3. Record Remaining Payment
        console.log('\n--- 3. Testing Full Payment ---');
        const paymentDto2: RecordPaymentDto = {
            vendorId,
            paymentDate: new Date(),
            paymentMethod: ApPaymentMethod.CASH,
            amount: 550,
            applications: [
                { billId: bill.id, amountApplied: 550 }
            ]
        };

        await payablesService.recordPayment(paymentDto2, admin.id);
        const finalBill = await payablesService.findBillOne(bill.id);
        if (!finalBill) throw new Error('Final bill not found');
        console.log(`   Final Bill Balance: ${finalBill.balanceDue}, Status: ${finalBill.status}`);

        if (Number(finalBill.balanceDue) !== 0) throw new Error('Balance should be 0');
        if (finalBill.status !== ApBillStatus.PAID) throw new Error('Status should be PAID');

        console.log('\n🎉 ALL SCENARIOS PASSED!');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }

    await app.close();
    process.exit(0);
}

bootstrap();
