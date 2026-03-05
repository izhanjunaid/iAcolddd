
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InventoryItemsService } from '../inventory/services/inventory-items.service';
import { InventoryTransactionsService } from '../inventory/services/inventory-transactions.service';
import { CreateInventoryItemDto } from '../inventory/dto/create-inventory-item.dto';
import { CreateInventoryTransactionDto } from '../inventory/dto/create-inventory-transaction.dto';
import { InventoryTransactionType } from '../common/enums/inventory-transaction-type.enum';
import { UnitOfMeasure } from '../common/enums/unit-of-measure.enum';
import { InventoryValuationReportDto } from '../inventory/dto/inventory-valuation-report.dto';
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const itemsService = app.get(InventoryItemsService);
    const transactionsService = app.get(InventoryTransactionsService);
    const dataSource = app.get(DataSource);

    console.log('🚀 Starting FIFO Valuation Logic Test...');

    // 1. Setup Data
    const timestamp = Date.now();
    const testSku = `RICE-FIFO-${timestamp}`;
    const userId = 'ca080091-4f57-45e5-a21f-14634a5136e6'; // Admin

    // Ensure valid Warehouse
    const warehouseRepo = dataSource.getRepository('Warehouse');
    let warehouse = await warehouseRepo.findOne({ where: { code: 'WH-TEST-FIFO' } });
    if (!warehouse) {
        warehouse = warehouseRepo.create({
            code: 'WH-TEST-FIFO',
            name: 'FIFO Test Warehouse',
            isActive: true
        });
        await warehouseRepo.save(warehouse);
        console.log('✅ Created Test Warehouse: WH-TEST-FIFO');
    } else {
        console.log('✅ Using Existing Test Warehouse: WH-TEST-FIFO');
    }
    const warehouseId = warehouse.id;

    try {
        // Create Item
        console.log(`\n📦 Creating Test Item: ${testSku}`);
        const itemDto: CreateInventoryItemDto = {
            sku: testSku,
            name: `Basmati Rice (FIFO Test ${timestamp})`,
            category: 'Grains',
            unitOfMeasure: UnitOfMeasure.KG,
            description: 'Test item for FIFO valuation',
            isActive: true, // properties required by DTO
            isPerishable: false
        };

        // Check if DTO matches expected signature (some optional fields might be missing in my quick object above)
        // Actually itemsService.create expects userId as second arg
        const item = await itemsService.create(itemDto as any, userId);
        console.log(`✅ Item created: ${item.id}`);

        // 2. Receipt 1: 100 units @ $10
        console.log('\n📥 Receipt 1: 100 units @ $10');
        const receipt1: CreateInventoryTransactionDto = {
            itemId: item.id,
            transactionType: InventoryTransactionType.RECEIPT,
            quantity: 100,
            unitCost: 10,
            transactionDate: new Date().toISOString(),
            warehouseId: warehouseId,
            unitOfMeasure: UnitOfMeasure.KG,
            notes: 'Initial stock',
            // Optional fields
            roomId: null,
            customerId: null
        } as any;

        await transactionsService.processTransaction(receipt1, userId);

        // 3. Receipt 2: 50 units @ $12
        console.log('📥 Receipt 2: 50 units @ $12');
        const receipt2: CreateInventoryTransactionDto = {
            itemId: item.id,
            transactionType: InventoryTransactionType.RECEIPT,
            quantity: 50,
            unitCost: 12,
            transactionDate: new Date().toISOString(),
            warehouseId: warehouseId,
            unitOfMeasure: UnitOfMeasure.KG,
            notes: 'Restock'
        } as any;

        await transactionsService.processTransaction(receipt2, userId);

        // Verify Valuation BEFORE Issue
        console.log('\n📊 Verifying Valuation (Before Issue)...');
        let report = await transactionsService.getValuationReport({
            groupBy: 'none',
            category: 'Grains'
        } as InventoryValuationReportDto);

        let itemValuation = report.valuation.find(v => v.sku === testSku);
        console.log(`   Expected: Qty 150, Value 1600 (100*10 + 50*12)`);
        console.log(`   Actual:   Qty ${itemValuation.totalQuantity}, Value ${itemValuation.totalValue}`);

        if (Math.abs(itemValuation.totalValue - 1600) > 0.01) {
            throw new Error('Valuation mismatch before issue');
        }

        // 4. Issue 1: 120 units
        // FIFO Expectation: 
        // - 100 units from Receipt 1 (@ $10) = $1000
        // - 20 units from Receipt 2 (@ $12) = $240 (Remaining 30 units @ $12)
        // Total COGS issues = $1240.
        // Remaining Value = 30 * $12 = $360.
        console.log('\n📤 Issue 1: 120 units (Should trigger FIFO)');
        const issue1: CreateInventoryTransactionDto = {
            itemId: item.id,
            transactionType: InventoryTransactionType.ISSUE,
            quantity: 120,
            unitCost: 0, // Should be calculated by system
            transactionDate: new Date().toISOString(),
            warehouseId: warehouseId,
            unitOfMeasure: UnitOfMeasure.KG,
            notes: 'FIFO Test Issue'
        } as any;

        const issueTx = await transactionsService.processTransaction(issue1, userId);
        console.log(`   Transaction Processed. Unit Cost Assigned: ${issueTx.unitCost} (Avg), Total Cost: ${issueTx.totalCost}`);

        // Verify Valuation AFTER Issue
        console.log('\n📊 Verifying Valuation (After Issue)...');
        report = await transactionsService.getValuationReport({
            groupBy: 'none',
            category: 'Grains'
        } as InventoryValuationReportDto);

        itemValuation = report.valuation.find(v => v.sku === testSku);
        console.log(`   Expected Remaining: Qty 30, Value 360 (30 * $12)`);
        console.log(`   Actual Remaining:   Qty ${itemValuation?.totalQuantity}, Value ${itemValuation?.totalValue}`);

        if (Math.abs(itemValuation.totalValue - 360) > 0.01) {
            throw new Error('FIFO Valuation mismatch! Old layers might not have been consumed correctly.');
        }

        console.log('\n✅ TEST PASSED: FIFO Logic Verified Successfully.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) console.error(error.response);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
