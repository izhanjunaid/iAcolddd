const API_URL = 'http://localhost:3000';

async function testPayment() {
    console.log('=== Testing Payment-Receipt Voucher Integration ===\n');

    // 1. Login to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'Admin@123'
        })
    });

    if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log(`   ✓ Login successful. Token obtained.\n`);

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Get invoices to find Rana Pool invoice
    console.log('2. Finding Rana Pool invoice (INV-2025-0002)...');
    const invoicesResponse = await fetch(`${API_URL}/invoices?invoiceNumber=INV-2025-0002`, {
        headers
    });

    const invoicesData = await invoicesResponse.json();

    if (invoicesData.data.length === 0) {
        console.log('   ✗ Invoice not found');
        return;
    }

    const invoice = invoicesData.data[0];
    console.log(`   ✓ Found invoice: ${invoice.invoiceNumber}`);
    console.log(`     - Status: ${invoice.status}`);
    console.log(`     - Total: PKR ${invoice.totalAmount}`);
    console.log(`     - Paid: PKR ${invoice.amountPaid}`);
    console.log(`     - Balance: PKR ${invoice.totalAmount - invoice.amountPaid}\n`);

    // 3. Record a partial payment
    console.log('3. Recording partial payment of PKR 50,000...');
    try {
        const paymentResponse = await fetch(
            `${API_URL}/invoices/${invoice.id}/payment`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    amount: 50000,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMode: 'CASH'
                })
            }
        );

        if (!paymentResponse.ok) {
            const err = await paymentResponse.json();
            throw new Error(err.message || paymentResponse.statusText);
        }

        const paymentData = await paymentResponse.json();

        console.log(`   ✓ Payment recorded successfully!`);
        console.log(`     - New Status: ${paymentData.status}`);
        console.log(`     - Amount Paid: PKR ${paymentData.amountPaid}`);
        console.log(`     - Balance Due: PKR ${paymentData.totalAmount - paymentData.amountPaid}\n`);
    } catch (error: any) {
        console.log(`   ✗ Payment failed: ${error.message}`);
        return;
    }

    // 4. Check if Receipt Voucher was created
    console.log('4. Checking for Receipt Voucher...');
    // Note: Assuming the vouchers endpoint supports filtering by search term like invoice number
    const vouchersResponse = await fetch(`${API_URL}/vouchers?voucherType=RECEIPT&search=INV-2025-0002`, {
        headers
    });

    const vouchersData = await vouchersResponse.json();

    if (vouchersData.data.length > 0) {
        const voucher = vouchersData.data[0];
        console.log(`   ✓ Receipt Voucher created!`);
        console.log(`     - Voucher Number: ${voucher.voucherNumber}`);
        console.log(`     - Amount: PKR ${voucher.totalAmount}`);
        console.log(`     - Status: ${voucher.isPosted ? 'Posted' : 'Draft'}`);
        console.log(`     - Description: ${voucher.description}\n`);
    } else {
        console.log(`   ✗ No Receipt Voucher found for this invoice\n`);
    }

    console.log('=== Test Complete ===');
}

testPayment().catch(console.error);
