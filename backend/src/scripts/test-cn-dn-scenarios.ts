/**
 * Extensive Credit Note & Debit Note Testing
 * Phase 2 Verification Script
 */

const API_URL = 'http://localhost:3000';

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
}

const results: TestResult[] = [];

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     PHASE 2: CREDIT & DEBIT NOTES - EXTENSIVE TESTING          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // 1. Authentication
    console.log('🔐 1. Authenticating...');
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

    // Get Customer
    const custRes = await fetch(`${API_URL}/customers?limit=1`, { headers });
    const custData = await custRes.json();
    if (!custData.data?.length) throw new Error('No customers found');
    const customerId = custData.data[0].id;
    const customerName = custData.data[0].name;
    console.log(`📋 Using Customer: ${customerName}\n`);

    // Helper: Create and Send Invoice
    const createInvoice = async (amount: number = 10000): Promise<any> => {
        const res = await fetch(`${API_URL}/invoices/from-billing`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                customerId,
                billingData: {
                    weight: amount / 10,
                    dateIn: new Date().toISOString(),
                    dateOut: new Date().toISOString(),
                    ratePerKgPerDay: 10,
                    loadingCharges: 0
                },
                notes: 'Test Invoice for CN/DN'
            })
        });
        let inv = await res.json();
        await fetch(`${API_URL}/invoices/${inv.id}/send`, { method: 'PATCH', headers });
        inv = await (await fetch(`${API_URL}/invoices/${inv.id}`, { headers })).json();
        return inv;
    };

    // Helper: Create Credit Note
    const createCN = async (invoiceId: string, amount: number, reason: string): Promise<any> => {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/credit-note`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount, reason })
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
    };

    // Helper: Create Debit Note
    const createDN = async (invoiceId: string, amount: number, reason: string): Promise<any> => {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/debit-note`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount, reason })
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
    };

    // Helper: Get Invoice
    const getInvoice = async (id: string): Promise<any> => {
        const res = await fetch(`${API_URL}/invoices/${id}`, { headers });
        return res.json();
    };

    // Helper: Get Vouchers for Invoice
    const getVouchers = async (invoiceNumber: string): Promise<any[]> => {
        const res = await fetch(`${API_URL}/vouchers?search=${invoiceNumber}`, { headers });
        const data = await res.json();
        return data.data || [];
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEST SUITE 1: CREDIT NOTE SCENARIOS
    // ═══════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST SUITE 1: CREDIT NOTE SCENARIOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 1.1: Partial Credit Note
    console.log('📝 Test 1.1: Partial Credit Note');
    let inv1 = await createInvoice(10000);
    console.log(`   Created Invoice: ${inv1.invoiceNumber} (Total: ${inv1.totalAmount}, Balance: ${inv1.balanceDue})`);

    const cn1 = await createCN(inv1.id, 3000, 'Partial return - damaged goods');
    inv1 = await getInvoice(inv1.id);

    if (cn1.ok && cn1.data.invoiceType === 'CREDIT_NOTE') {
        console.log(`   ✓ CN Created: ${cn1.data.invoiceNumber}`);
        console.log(`   ✓ Original Invoice Balance Updated: ${inv1.balanceDue}`);
        console.log(`   ✓ Credits Applied: ${inv1.creditsApplied}`);
        const expectedBalance = Number(inv1.totalAmount) - Number(inv1.creditsApplied);
        if (Math.abs(Number(inv1.balanceDue) - expectedBalance) < 0.01) {
            results.push({ name: 'Partial CN Balance Calculation', passed: true, details: `Balance correctly updated to ${inv1.balanceDue}` });
        } else {
            results.push({ name: 'Partial CN Balance Calculation', passed: false, details: `Expected ${expectedBalance}, got ${inv1.balanceDue}` });
        }
    } else {
        results.push({ name: 'Partial CN Creation', passed: false, details: cn1.data.message || 'Failed' });
    }

    // Test 1.2: Full Credit Note (Should set status to PAID)
    console.log('\n📝 Test 1.2: Full Credit Note (Remaining Balance)');
    const remainingBalance = Number(inv1.balanceDue);
    const cn2 = await createCN(inv1.id, remainingBalance, 'Full refund - product recalled');
    inv1 = await getInvoice(inv1.id);

    if (cn2.ok && inv1.status === 'PAID') {
        console.log(`   ✓ CN Created: ${cn2.data.invoiceNumber}`);
        console.log(`   ✓ Invoice Status: ${inv1.status} (Expected: PAID)`);
        console.log(`   ✓ Final Balance: ${inv1.balanceDue}`);
        results.push({ name: 'Full CN Sets Status to PAID', passed: true, details: `Status: ${inv1.status}` });
    } else {
        results.push({ name: 'Full CN Sets Status to PAID', passed: false, details: `Status: ${inv1.status}, Expected: PAID` });
    }

    // Test 1.3: Credit Note Exceeding Balance (Credit Balance Scenario)
    console.log('\n📝 Test 1.3: Credit Note Exceeding Balance (Credit Balance)');
    let inv2 = await createInvoice(5000);
    console.log(`   Created Invoice: ${inv2.invoiceNumber} (Total: ${inv2.totalAmount})`);

    const cn3 = await createCN(inv2.id, 7000, 'Overpayment refund - customer credit');
    inv2 = await getInvoice(inv2.id);

    if (cn3.ok) {
        console.log(`   ✓ CN Created: ${cn3.data.invoiceNumber}`);
        console.log(`   ✓ Balance Due: ${inv2.balanceDue} (Negative = Credit Balance)`);
        if (Number(inv2.balanceDue) < 0) {
            results.push({ name: 'CN Allows Credit Balance', passed: true, details: `Balance: ${inv2.balanceDue}` });
        } else {
            results.push({ name: 'CN Allows Credit Balance', passed: false, details: `Balance should be negative` });
        }
    } else {
        results.push({ name: 'CN Exceeding Balance', passed: false, details: cn3.data.message });
    }

    // Test 1.4: Credit Note on Cancelled Invoice (Should Fail)
    console.log('\n📝 Test 1.4: Credit Note on Cancelled Invoice (Should Fail)');
    let inv3 = await createInvoice(2000);
    await fetch(`${API_URL}/invoices/${inv3.id}/cancel`, { method: 'PATCH', headers });
    inv3 = await getInvoice(inv3.id);
    console.log(`   Invoice ${inv3.invoiceNumber} Status: ${inv3.status}`);

    const cn4 = await createCN(inv3.id, 500, 'Should fail');
    if (!cn4.ok && cn4.status === 400) {
        console.log(`   ✓ Correctly rejected: ${cn4.data.message}`);
        results.push({ name: 'CN on Cancelled Invoice Blocked', passed: true, details: 'Request rejected as expected' });
    } else {
        results.push({ name: 'CN on Cancelled Invoice Blocked', passed: false, details: 'Should have been rejected' });
    }

    // Test 1.5: Credit Note GL Verification
    console.log('\n📝 Test 1.5: Credit Note GL Voucher Verification');
    let inv4 = await createInvoice(8000);
    const cn5 = await createCN(inv4.id, 2000, 'GL Test');

    if (cn5.ok) {
        const vouchers = await getVouchers(cn5.data.invoiceNumber);
        if (vouchers.length > 0) {
            console.log(`   ✓ GL Voucher Created for CN`);
            console.log(`   ✓ Voucher Type: ${vouchers[0].voucherType}`);
            results.push({ name: 'CN GL Voucher Created', passed: true, details: `Voucher: ${vouchers[0].voucherNumber}` });
        } else {
            results.push({ name: 'CN GL Voucher Created', passed: false, details: 'No voucher found' });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST SUITE 2: DEBIT NOTE SCENARIOS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST SUITE 2: DEBIT NOTE SCENARIOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 2.1: Basic Debit Note Creation
    console.log('📝 Test 2.1: Basic Debit Note Creation');
    let inv5 = await createInvoice(6000);
    console.log(`   Created Invoice: ${inv5.invoiceNumber} (Total: ${inv5.totalAmount})`);

    const dn1 = await createDN(inv5.id, 1500, 'Late payment penalty');

    if (dn1.ok && dn1.data.invoiceType === 'DEBIT_NOTE') {
        console.log(`   ✓ DN Created: ${dn1.data.invoiceNumber}`);
        console.log(`   ✓ DN Type: ${dn1.data.invoiceType}`);
        console.log(`   ✓ DN Status: ${dn1.data.status}`);
        console.log(`   ✓ DN Amount: ${dn1.data.totalAmount}`);
        results.push({ name: 'DN Creation', passed: true, details: `DN: ${dn1.data.invoiceNumber}` });
    } else {
        results.push({ name: 'DN Creation', passed: false, details: dn1.data.message || 'Failed' });
    }

    // Test 2.2: Debit Note Has Correct Status (SENT)
    console.log('\n📝 Test 2.2: Debit Note Status Verification');
    if (dn1.data.status === 'SENT') {
        console.log(`   ✓ DN Status is SENT (payable)`);
        results.push({ name: 'DN Status is SENT', passed: true, details: `Status: ${dn1.data.status}` });
    } else {
        results.push({ name: 'DN Status is SENT', passed: false, details: `Expected SENT, got ${dn1.data.status}` });
    }

    // Test 2.3: Debit Note Reference Invoice
    console.log('\n📝 Test 2.3: Debit Note Reference Invoice');
    if (dn1.data.referenceInvoiceId === inv5.id) {
        console.log(`   ✓ DN correctly linked to original invoice`);
        results.push({ name: 'DN Reference Link', passed: true, details: 'Correct reference' });
    } else {
        results.push({ name: 'DN Reference Link', passed: false, details: 'Reference mismatch' });
    }

    // Test 2.4: Debit Note on Cancelled Invoice (Should Fail)
    console.log('\n📝 Test 2.4: Debit Note on Cancelled Invoice (Should Fail)');
    let inv6 = await createInvoice(3000);
    await fetch(`${API_URL}/invoices/${inv6.id}/cancel`, { method: 'PATCH', headers });

    const dn2 = await createDN(inv6.id, 500, 'Should fail');
    if (!dn2.ok && dn2.status === 400) {
        console.log(`   ✓ Correctly rejected: ${dn2.data.message}`);
        results.push({ name: 'DN on Cancelled Invoice Blocked', passed: true, details: 'Rejected as expected' });
    } else {
        results.push({ name: 'DN on Cancelled Invoice Blocked', passed: false, details: 'Should have been rejected' });
    }

    // Test 2.5: Debit Note GL Verification
    console.log('\n📝 Test 2.5: Debit Note GL Voucher Verification');
    let inv7 = await createInvoice(5000);
    const dn3 = await createDN(inv7.id, 1000, 'GL Test DN');

    if (dn3.ok) {
        const vouchers = await getVouchers(dn3.data.invoiceNumber);
        if (vouchers.length > 0) {
            console.log(`   ✓ GL Voucher Created for DN`);
            console.log(`   ✓ Voucher Type: ${vouchers[0].voucherType}`);
            results.push({ name: 'DN GL Voucher Created', passed: true, details: `Voucher: ${vouchers[0].voucherNumber}` });
        } else {
            results.push({ name: 'DN GL Voucher Created', passed: false, details: 'No voucher found' });
        }
    }

    // Test 2.6: Debit Note Payment
    console.log('\n📝 Test 2.6: Payment on Debit Note');
    const payRes = await fetch(`${API_URL}/invoices/${dn3.data.id}/payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: 1000,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMode: 'CASH'
        })
    });

    if (payRes.ok) {
        const paidDN = await payRes.json();
        console.log(`   ✓ Payment recorded on DN`);
        console.log(`   ✓ DN Status: ${paidDN.status}`);
        results.push({ name: 'DN Payment', passed: paidDN.status === 'PAID', details: `Status: ${paidDN.status}` });
    } else {
        results.push({ name: 'DN Payment', passed: false, details: 'Payment failed' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST SUITE 3: COMBINED SCENARIOS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST SUITE 3: COMBINED SCENARIOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 3.1: Invoice with both Payment and Credit Note
    console.log('📝 Test 3.1: Invoice with Payment + Credit Note');
    let inv8 = await createInvoice(10000);
    console.log(`   Invoice: ${inv8.invoiceNumber} (Balance: ${inv8.balanceDue})`);

    // Partial payment
    await fetch(`${API_URL}/invoices/${inv8.id}/payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: 4000, paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH' })
    });
    inv8 = await getInvoice(inv8.id);
    console.log(`   After Payment: Balance = ${inv8.balanceDue}, AmountPaid = ${inv8.amountPaid}`);

    // Credit Note
    await createCN(inv8.id, 3000, 'Goods return');
    inv8 = await getInvoice(inv8.id);
    console.log(`   After CN: Balance = ${inv8.balanceDue}, CreditsApplied = ${inv8.creditsApplied}`);

    const expectedBal = Number(inv8.totalAmount) - Number(inv8.amountPaid) - Number(inv8.creditsApplied);
    if (Math.abs(Number(inv8.balanceDue) - expectedBal) < 0.01) {
        console.log(`   ✓ Balance correctly calculated`);
        results.push({ name: 'Payment + CN Balance', passed: true, details: `Balance: ${inv8.balanceDue}` });
    } else {
        results.push({ name: 'Payment + CN Balance', passed: false, details: `Expected ${expectedBal}` });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.name}: ${r.details}`);
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Phase 2 CN/DN functionality is working as expected.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
}

runTests().catch(console.error);
