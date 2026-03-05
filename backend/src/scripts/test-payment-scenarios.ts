
const API_URL = 'http://localhost:3000';

async function runTests() {
    console.log('=== Starting Extensive Payment Scenario Tests ===\n');

    // 1. Auth
    console.log('1. Authenticating...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    if (!loginRes.ok) throw new Error('Login failed');
    const { accessToken } = await loginRes.json();
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    console.log('   ✓ Authenticated\n');


    // 2. Find Customer and Create Fresh Invoice
    console.log('2. Creating Fresh Invoice for Testing...');

    // Get Customer
    const custRes = await fetch(`${API_URL}/customers?limit=1`, { headers });
    if (!custRes.ok) throw new Error('Failed to fetch customers');
    const custData = await custRes.json();
    if (!custData.data || custData.data.length === 0) throw new Error('No customers found');
    const customerId = custData.data[0].id;
    const customerName = custData.data[0].name;
    console.log(`   ✓ Using Customer: ${customerName}`);

    // Create Invoice
    const createRes = await fetch(`${API_URL}/invoices/from-billing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            customerId,
            billingData: {
                weight: 1000,
                dateIn: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                dateOut: new Date().toISOString(),
                ratePerKgPerDay: 2,
                loadingCharges: 1000,
                rateType: 'DAILY'
            },
            notes: 'Automated Test Invoice for Payment Scenarios'
        })
    });

    if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(`Failed to create invoice: ${err.message || createRes.statusText}`);
    }

    let invoice = await createRes.json();
    console.log(`   ✓ Created Invoice: ${invoice.invoiceNumber} (Total: ${invoice.totalAmount})`);

    // Send Invoice
    console.log('3. Sending Invoice...');
    const sendRes = await fetch(`${API_URL}/invoices/${invoice.id}/send`, {
        method: 'PATCH',
        headers
    });
    if (!sendRes.ok) throw new Error('Failed to send invoice');
    invoice = await sendRes.json();
    console.log(`   ✓ Invoice Sent. Status: ${invoice.status}`);

    const invoiceId = invoice.id;

    // Helper payment function
    const attemptPayment = async (amount: number, description: string, expectError: boolean = false) => {
        console.log(`\n   > Attempting: ${description} (Amount: ${amount})...`);
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/payment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                amount,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMode: 'CASH'
            })
        });

        if (expectError) {
            if (!res.ok) {
                const err = await res.json();
                console.log(`     ✓ Correctly Blocked: ${err.message}`);
                return true;
            } else {
                console.log(`     ✗ ERROR: Operation succeeded but should have failed!`);
                return false;
            }
        } else {
            if (!res.ok) {
                const err = await res.json();
                console.log(`     ✗ ERROR: Failed to record payment: ${err.message}`);
                return false;
            } else {
                const data = await res.json();
                invoice = data; // Update local invoice state
                console.log(`     ✓ Success. New Status: ${data.status}, Balance: ${data.balanceDue}`);
                return true;
            }
        }
    };

    // Test 4: Negative Amount
    await attemptPayment(-500, 'Negative Payment', true);

    // Test 5: Zero Amount
    await attemptPayment(0, 'Zero Payment', true);

    // Test 6: Overpayment
    // Calculate current balance + 1000
    const balance = Number(invoice.balanceDue);
    if (balance > 0) {
        await attemptPayment(balance + 1000, 'Overpayment', true);
    }

    // Test 7: Valid Partial Payment
    console.log('\n   > Testing Valid Partial Payment (1000)...');
    await attemptPayment(1000, 'Partial Payment 1000', false);
    if (invoice.status !== 'PARTIALLY_PAID') {
        console.log('     ✗ Status did not change to PARTIALLY_PAID');
    }

    // Test 8: Valid Remaining Payment (Full)
    // Pay remaining balance
    const remaining = Number(invoice.balanceDue);
    if (remaining > 0) {
        console.log(`\n   > Testing Full Remaining Payment (${remaining})...`);
        await attemptPayment(remaining, 'Full Remaining Payment', false);

        // Now it should be PAID
        if (invoice.status !== 'PAID') {
            console.log(`     ✗ ERROR: Status should be PAID but is ${invoice.status}`);
        } else {
            console.log(`     ✓ Status correctly updated to PAID`);
        }
    }


    // Test 9: Pay on already PAID invoice (implicitly valid payment of any amount > 0 should fail as overpayment)
    console.log('\n   > Testing payment on PAID invoice...');
    await attemptPayment(100, 'Pay 100 on PAID invoice', true);

    console.log('\n=== GL & Payment Mode Verification ===');
    // Create another fresh invoice for Mode testing
    console.log('10. Creating Fresh Invoice for Mode Testing...');
    const createModeRes = await fetch(`${API_URL}/invoices/from-billing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            customerId,
            billingData: {
                weight: 500,
                dateIn: new Date().toISOString(),
                dateOut: new Date().toISOString(),
                ratePerKgPerDay: 2,
                loadingCharges: 0
            },
            notes: 'Test Invoice for Payment Modes'
        })
    });
    const modeInvoice = await createModeRes.json();
    const modeInvId = modeInvoice.id;
    await fetch(`${API_URL}/invoices/${modeInvId}/send`, { method: 'PATCH', headers });
    console.log(`    Original Invoice Created: ${modeInvoice.invoiceNumber}`);

    // Helpers for Mode Test
    const testMode = async (mode: string, amount: number, expectedAccountId: string, details?: any) => {
        console.log(`\n    > Testing Mode: ${mode} (Amount: ${amount})...`);
        const res = await fetch(`${API_URL}/invoices/${modeInvId}/payment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                amount,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMode: mode,
                ...details
            })
        });
        if (!res.ok) throw new Error(`Payment failed: ${(await res.json()).message}`);

        // Check Voucher
        const vRes = await fetch(`${API_URL}/vouchers?voucherType=RECEIPT&search=${modeInvoice.invoiceNumber}`, { headers });
        const vData = await vRes.json();
        // Get the latest voucher (we might have multiple now)
        // Sort by createdAt desc or trust the order. The API returns default order, likely recent first or oldest first.
        // We assume the API returns most recent or we find the one matching the amount.
        const voucher = vData.data.find((v: any) => Math.abs(Number(v.totalAmount) - amount) < 0.1);

        if (!voucher) throw new Error('Voucher not found for this payment');

        // Fetch full voucher details to see line items
        const fullVoucherRes = await fetch(`${API_URL}/vouchers/${voucher.id}`, { headers });
        const fullVoucher = await fullVoucherRes.json();

        // Find the Debit Line Item
        // Debit line should be the one NOT crediting the customer (or check accountId directly)
        const debitLine = fullVoucher.details.find((l: any) => Number(l.debitAmount) > 0);

        if (!debitLine) throw new Error('No debit line found');

        if (debitLine.accountCode === expectedAccountId) {
            console.log(`      ✓ Verified GL Account Code: ${expectedAccountId} (${mode} -> Correct)`);
        } else {
            console.log(`      ✗ ERROR: Wrong GL Account! Expected ${expectedAccountId}, got ${debitLine.accountCode}`);
        }

        if (mode === 'CHEQUE' && details?.chequeNumber) {
            // Verify cheque details if exposed. Backend might store it in reference or description.
            // Usually description contains "Cheque #..."
            if (fullVoucher.description.includes(details.chequeNumber)) {
                console.log(`      ✓ Verified Cheque Details in Description`);
            }
        }
    };

    const CASH_ACCOUNT_ID = '291698b5-6ae0-4445-a008-7e59bc1e1f86'; // Cash in Hand
    const BANK_ACCOUNT_ID = '3c4b61ec-f549-4269-933a-f0a858830530'; // Cash at Bank

    // Fetch Codes
    const getCode = async (id: string) => {
        const res = await fetch(`${API_URL}/accounts/${id}`, { headers });
        return (await res.json()).code;
    };

    const cashCode = await getCode(CASH_ACCOUNT_ID);
    const bankCode = await getCode(BANK_ACCOUNT_ID);
    console.log(`    Mapping: Cash=${cashCode}, Bank=${bankCode}`);

    // Test Cash
    await testMode('CASH', 100, cashCode);

    // Test Cheque
    await testMode('CHEQUE', 200, bankCode, {
        chequeNumber: 'CHQ-999',
        chequeDate: new Date().toISOString(),
        bankName: 'Test Bank'
    });

    // Test Online Transfer
    await testMode('ONLINE_TRANSFER', 300, bankCode, {
        bankReference: 'REF-888'
    });

    console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
