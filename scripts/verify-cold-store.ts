
import axios from 'axios';

const API_URL = 'http://localhost:3000';
const USERNAME = 'admin';
const PASSWORD = 'Admin@123'; // The correct password from seed

// DTO Defaults
const INWARD_GP = {
    commodity: 'Potato',
    variety: 'Desi',
    vehicleNumber: 'ABC-1234',
    driverName: 'John Doe',
    bagsReceived: 100,
    grossWeightKg: 5000,
    tareWeightKg: 2000,
    inwardDate: new Date().toISOString(),
    billingUnit: 'PER_BAG', // Matches BillingUnitType enum
    ratePerBagPerSeason: 100,
    notes: 'API Verification Test',
};

const OUTWARD_GP = {
    driverName: 'Jane Doe',
    vehicleNumber: 'XYZ-9876',
    bagsReleased: 50,
    grossWeightKg: 2500,
    tareWeightKg: 1000,
    outwardDate: new Date().toISOString(),
    notes: 'Partial Release API Test',
    // lotId will be set dynamically
};

async function run() {
    try {
        console.log('🚀 Starting Cold Store Verification...');

        // 1. Authenticate
        console.log('🔑 Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: USERNAME,
            password: PASSWORD,
        });
        const token = loginRes.data.access_token;
        console.log('✅ Login successful. Token obtained.');

        const axiosAuth = axios.create({
            baseURL: API_URL,
            headers: { Authorization: `Bearer ${token}` },
        });

        // 2. Get Customer
        console.log('👤 Fetching customers...');
        const customersRes = await axiosAuth.get('/customers');
        let customerId;
        if (customersRes.data.data && customersRes.data.data.length > 0) {
            customerId = customersRes.data.data[0].id; // Use first existing customer
            console.log(`✅ Customer found: ${customerId} (${customersRes.data.data[0].name})`);
        } else {
            console.log('⚠️ No customers found. Creating one...');
            const newCustomer = await axiosAuth.post('/customers', {
                name: 'Test Customer API',
                phone: '+9999999999',
                email: 'testcustomer@example.com',
                address: 'Test Address'
            });
            customerId = newCustomer.data.id;
            console.log(`✅ Customer created: ${customerId}`);
        }

        // 3. Create Inward GP
        console.log('📥 Creating Inward Gate Pass...');
        const inwardDto = { ...INWARD_GP, customerId };

        let inwardId;
        let lotId;
        try {
            const inwardRes = await axiosAuth.post('/cold-store/inward-gate-passes', inwardDto);
            inwardId = inwardRes.data.id;
            // Assuming the create response returns the full entity with lot relation?
            // If not, we might need to fetch it.
            // But let's check creating output.
            console.log(`✅ Inward GP created: ${inwardId}`);

            // Fetch inward detail to get lot ID if not in response
            const detailRes = await axiosAuth.get(`/cold-store/inward-gate-passes/${inwardId}`);
            lotId = detailRes.data.lot?.id;
            console.log(`✅ Inward GP details fetched. Lot ID: ${lotId}`);

            if (!lotId) {
                // Try approving first? Maybe lot is created on approval?
                // Wait, InwardGatePassService logic: usually lot created on approval or creation?
                // Let's assume on creation (DRAFT status).
            }

        } catch (err: any) {
            console.error('Failed to create inward GP:', err.response?.data || err.message);
            throw err;
        }


        // 4. Approve Inward GP
        console.log('✅ Approving Inward Gate Pass...');
        const approvedInward = await axiosAuth.patch(`/cold-store/inward-gate-passes/${inwardId}/approve`);
        // If lot was not created on creation, it MUST be created on approval.
        if (!lotId) {
            const detailRes = await axiosAuth.get(`/cold-store/inward-gate-passes/${inwardId}`);
            lotId = detailRes.data.lot?.id;
            console.log(`✅ Lot ID after approval: ${lotId}`);
        }

        console.log('✅ Inward GP approved.');

        if (!lotId) {
            throw new Error('Lot ID was not generated!');
        }

        // 5. Check Initial Billing/Lot Status
        console.log('🔍 Checking Lot Status & Accrued Charges...');
        // Wait 1 sec for any possible async side effects (though backend should be sync usually)
        await new Promise(r => setTimeout(r, 1000));

        const lotRes = await axiosAuth.get(`/cold-store/lots/${lotId}/accrued-charges`);
        console.log(`   Lot Status: ${lotRes.data.status}`);
        console.log(`   Accrued Charges: ${JSON.stringify(lotRes.data.accruedCharges)}`);

        // 6. Create Outward GP (Partial)
        console.log('📤 Creating Partial Outward Gate Pass...');
        const outwardDto = { ...OUTWARD_GP, lotId };
        const outwardRes = await axiosAuth.post('/cold-store/outward-gate-passes', outwardDto);
        const outwardId = outwardRes.data.id;
        console.log(`✅ Partial Outward GP created: ${outwardId}`);

        // 7. Approve Outward GP
        console.log('✅ Approving Outward Gate Pass...');
        await axiosAuth.patch(`/cold-store/outward-gate-passes/${outwardId}/approve`);
        console.log('✅ Outward GP approved.');

        // 8. Verify Remaining Stock
        console.log('🔍 Verifying Remaining Stock...');
        const lotAfterRes = await axiosAuth.get(`/cold-store/lots/${lotId}/accrued-charges`);
        const currentQty = lotAfterRes.data.currentQuantity;
        console.log(`   Current Quantity: ${currentQty} / 100`);

        if (currentQty === 50) {
            console.log('✅ Stock matches expected (50 bags).');
        } else {
            // It might be 50.0 depending on type
            console.error(`❌ Stock mismatch! Expected 50, got ${currentQty}`);
            process.exit(1);
        }

        console.log('🎉 Verification COMPLETE! System is functioning correctly.');

    } catch (error: any) {
        console.error('❌ Verification FAILED:', error.response?.data || error.message);
        process.exit(1);
    }
}

run();
