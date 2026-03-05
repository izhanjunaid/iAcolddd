
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars
config({ path: resolve(__dirname, '../../.env') });

const BASE_URL = 'http://127.0.0.1:3000';
const USERNAME = 'admin';
const PASSWORD = 'Admin@123';

async function main() {
    console.log('🚀 Starting Valuation Verification...');

    try {
        // 1. Login
        console.log('\n🔐 Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

        const loginData: any = await loginRes.json();
        const accessToken = loginData.accessToken;
        console.log('✅ Login successful');

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };

        // 2. Setup Data
        // Create a dedicated item for valuation testing to avoid noise
        const sku = `VAL-TEST-${Date.now()}`;
        console.log(`\n📦 Creating Test Item: ${sku}...`);
        const itemRes = await fetch(`${BASE_URL}/inventory/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                sku: sku,
                name: `Valuation Test Item ${Date.now()}`,
                description: 'Item for valuation testing',
                category: 'Testing',
                unitOfMeasure: 'KG',
                standardCost: 100,
                isPerishable: false
            })
        });

        if (!itemRes.ok) throw new Error(`Create Item failed: ${itemRes.status}`);
        const item: any = await itemRes.json();
        console.log(`✅ Item Created: ${item.id}`);

        // Get a warehouse and room
        const warehouseId = 'efd81205-60f0-4e50-9014-39ac30ae3cb5'; // WH1 from verify-inventory-flow.ts
        const roomId = '638e1b70-c425-44f9-a283-d72d0e58cb9e'; // Room 1 from verify-inventory-flow.ts

        console.log(`Using Warehouse: ${warehouseId}, Room: ${roomId}`);

        // 3. Test Case 1: Receipt (AVCO & FIFO Layer Creation)
        // Receipt 1: 10 units @ $10 = $100
        console.log('\n📥 processing Receipt 1: 10 units @ $10...');
        const receipt1Res = await fetch(`${BASE_URL}/inventory/transactions/receipt`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: item.id,
                warehouseId,
                roomId,
                quantity: 10,
                unitCost: 10,
                unitOfMeasure: 'KG',
                transactionType: 'RECEIPT',
                transactionDate: new Date().toISOString()
            })
        });
        if (!receipt1Res.ok) {
            const errBody = await receipt1Res.text();
            throw new Error(`Receipt 1 failed: ${receipt1Res.status} - ${errBody}`);
        }
        const receipt1Data: any = await receipt1Res.json();
        console.log(`   Receipt 1 processed: ${receipt1Data.transactionNumber || receipt1Data.id}`);

        // Verify Balance — include roomId and onlyWithStock=false to ensure we find the record
        let balanceRes = await fetch(`${BASE_URL}/inventory/balances?itemId=${item.id}&warehouseId=${warehouseId}&roomId=${roomId}&onlyWithStock=false`, { headers });
        let balanceData: any = await balanceRes.json();
        console.log(`   DEBUG balances count: ${balanceData.balances?.length ?? 'N/A'}`);
        if (balanceData.balances?.length > 0) {
            console.log(`   DEBUG first balance:`, JSON.stringify(balanceData.balances[0], null, 2).substring(0, 500));
        }
        let balance = balanceData.balances?.[0];
        console.log(`   Balance: Qty=${balance.quantityOnHand}, Value=${balance.totalValue}, AvgCost=${balance.weightedAverageCost}`);

        if (Number(balance.totalValue) !== 100) throw new Error(`Expected Value 100, got ${balance.totalValue}`);
        if (Number(balance.weightedAverageCost) !== 10) throw new Error(`Expected AvgCost 10, got ${balance.weightedAverageCost}`);

        // Receipt 2: 10 units @ $20 = $200
        console.log('\n📥 processing Receipt 2: 10 units @ $20...');
        const receipt2Res = await fetch(`${BASE_URL}/inventory/transactions/receipt`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: item.id,
                warehouseId,
                roomId,
                quantity: 10,
                unitCost: 20,
                unitOfMeasure: 'KG',
                transactionType: 'RECEIPT',
                transactionDate: new Date().toISOString()
            })
        });
        if (!receipt2Res.ok) {
            const errBody = await receipt2Res.text();
            throw new Error(`Receipt 2 failed: ${receipt2Res.status} - ${errBody}`);
        }
        console.log('   Receipt 2 processed.');

        // Verify Balance (AVCO Update)
        // Total Qty = 20
        // Total Value = 100 + 200 = 300
        // Avg Cost = 300 / 20 = 15
        balanceRes = await fetch(`${BASE_URL}/inventory/balances?itemId=${item.id}&warehouseId=${warehouseId}&roomId=${roomId}&onlyWithStock=false`, { headers });
        balanceData = await balanceRes.json();
        balance = balanceData.balances?.[0];
        console.log(`   Balance: Qty=${balance.quantityOnHand}, Value=${balance.totalValue}, AvgCost=${balance.weightedAverageCost}`);

        if (Number(balance.totalValue) !== 300) throw new Error(`Expected Value 300, got ${balance.totalValue}`);
        if (Number(balance.weightedAverageCost) !== 15) throw new Error(`Expected AvgCost 15, got ${balance.weightedAverageCost}`);

        // 4. Test Case 2: Issue (FIFO Consumption)
        // Issue 5 units. Should consume from Receipt 1 (Cost $10).
        // Cost of Issue = 5 * 10 = $50.
        // Remaining Value = 300 - 50 = 250.
        // Reamining Qty = 15.
        // New Avg Cost = 250 / 15 = 16.666...
        console.log('\n📤 Processing Issue: 5 units...');
        const issueRes = await fetch(`${BASE_URL}/inventory/transactions/issue`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: item.id,
                warehouseId,
                roomId,
                quantity: 5,
                unitOfMeasure: 'KG',
                transactionType: 'ISSUE',
                transactionDate: new Date().toISOString()
            })
        });
        if (!issueRes.ok) {
            const errBody = await issueRes.text();
            throw new Error(`Issue failed: ${issueRes.status} - ${errBody}`);
        }
        const issueTx: any = await issueRes.json();
        console.log(`   Issue transaction: ${issueTx.transactionNumber || issueTx.id}`);
        console.log(`   Issue totalCost from response: ${issueTx.totalCost}`);

        // Validate via balance delta: 300 - 50 (FIFO: 5 units @ $10) = 250
        balanceRes = await fetch(`${BASE_URL}/inventory/balances?itemId=${item.id}&warehouseId=${warehouseId}&roomId=${roomId}&onlyWithStock=false`, { headers });
        balanceData = await balanceRes.json();
        balance = balanceData.balances?.[0];
        console.log(`   Balance: Qty=${balance.quantityOnHand}, Value=${balance.totalValue}, AvgCost=${balance.weightedAverageCost}`);

        // FIFO validation: 5 units issued should cost 5*$10 = $50 (from first layer)
        // Remaining value: 300 - 50 = 250
        if (Number(balance.totalValue) !== 250) throw new Error(`FIFO Fail: Expected Value 250 (300-50), got ${balance.totalValue}`);

        // 5. Test Case 3: Sales Return (Original Cost)
        // Return 1 unit from the Issue.
        // Should look up Original Issue Cost ($10).
        // New Value = 250 + 10 = 260.
        // New Qty = 16.
        console.log('\n↩️ Processing Sales Return: 1 unit...');
        const returnRes = await fetch(`${BASE_URL}/inventory/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: item.id,
                warehouseId,
                roomId,
                quantity: 1,
                unitOfMeasure: 'KG',
                transactionType: 'SALES_RETURN',
                referenceId: issueTx.id, // Reference the issue
                transactionDate: new Date().toISOString()
            })
        });
        if (!returnRes.ok) {
            const errBody = await returnRes.text();
            throw new Error(`Sales Return failed: ${returnRes.status} - ${errBody}`);
        }
        const returnTx: any = await returnRes.json();
        console.log(`   Sales Return processed: ${returnTx.transactionNumber || returnTx.id}`);
        console.log(`   Return unitCost: ${returnTx.unitCost}, totalCost: ${returnTx.totalCost}`);

        balanceRes = await fetch(`${BASE_URL}/inventory/balances?itemId=${item.id}&warehouseId=${warehouseId}&roomId=${roomId}&onlyWithStock=false`, { headers });
        balanceData = await balanceRes.json();
        balance = balanceData.balances?.[0];
        console.log(`   Balance: Qty=${balance.quantityOnHand}, Value=${balance.totalValue}, AvgCost=${balance.weightedAverageCost}`);

        if (Number(balance.totalValue) !== 260) throw new Error(`Expected Value 260, got ${balance.totalValue}`);

        // 6. Test Valuation Report
        console.log('\n📊 Checking Valuation Report...');
        const valuationRes = await fetch(`${BASE_URL}/inventory/valuation?itemId=${item.id}`, { headers });
        const valData: any = await valuationRes.json();
        console.log(`   Valuation Summary:`, JSON.stringify(valData, null, 2));

        if (valData.totalInventoryValue !== 260) throw new Error(`Valuation Report Mismatch`);

        // 7. Test Audit
        console.log('\n🔍 Running Audit...');
        const auditRes = await fetch(`${BASE_URL}/inventory/valuation/audit?warehouseId=${warehouseId}`, { headers });
        const auditData: any = await auditRes.json();
        if (!auditData.passed) {
            console.warn('Audit Failed:', JSON.stringify(auditData.discrepancies, null, 2));
            // Verify if it's our item
            const myItemDesc = auditData.discrepancies.find((d: any) => d.itemId === item.id);
            if (myItemDesc) throw new Error('Audit failed for Test Item!');
        } else {
            console.log('✅ Audit Passed');
        }

        console.log('\n🎉 ALL VALUATION TESTS PASSED!');

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

main();
