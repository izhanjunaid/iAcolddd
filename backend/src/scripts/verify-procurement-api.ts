import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PurchaseOrdersService } from '../procurement/services/purchase-orders.service';
import { VendorsService } from '../vendors/vendors.service';
import { InventoryService } from '../inventory/inventory.service'; // Assuming this exists or repository injection
import { CreatePurchaseOrderDto } from '../procurement/dto/create-purchase-order.dto';
import { PurchaseOrderStatus } from '../procurement/enums/purchase-order-status.enum';
import { DataSource } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity'; // Direct entity access if service limited

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const poService = app.get(PurchaseOrdersService);
        const vendorsService = app.get(VendorsService);
        const dataSource = app.get(DataSource);
        const itemRepo = dataSource.getRepository(InventoryItem);

        console.log('📦 Procurement Module Verification Started');

        // 1. Get a Vendor
        const vendors = await vendorsService.findAll({ limit: 1 });
        if (vendors.items.length === 0) {
            console.error('❌ No vendors found. Please seed vendors first.');
            return;
        }
        const vendor = vendors.items[0];
        console.log(`✅ Using Vendor: ${vendor.name} (${vendor.id})`);

        // 2. Get an Item
        const items = await itemRepo.find({ take: 1 });
        if (items.length === 0) {
            console.error('❌ No inventory items found. Please seed inventory first.');
            return;
        }
        const item = items[0];
        console.log(`✅ Using Item: ${item.name} (${item.id})`);

        // 3. Create PO
        console.log('📝 Creating Purchase Order...');
        const createDto: CreatePurchaseOrderDto = {
            vendorId: vendor.id,
            orderDate: new Date().toISOString(),
            expectedDeliveryDate: new Date().toISOString(),
            notes: 'Verification Script PO',
            items: [
                {
                    itemId: item.id,
                    quantity: 10,
                    unitPrice: 100,
                    description: 'Test Item Description'
                }
            ]
        };

        // Mock User ID (System Admin usually)
        const userId = vendor.createdById || '00000000-0000-0000-0000-000000000000'; // Fallback

        const po = await poService.create(createDto, userId);
        console.log(`✅ PO Created: ${po.poNumber} (ID: ${po.id})`);
        console.log(`   Total Amount: ${po.totalAmount}`);
        console.log(`   Status: ${po.status}`);

        // 4. Retrieve PO
        const retrievedPo = await poService.findOne(po.id);
        if (retrievedPo.items.length !== 1) {
            console.error('❌ PO Items mismatch');
        } else {
            console.log('✅ PO Retrieval Verified (Items included)');
        }

        // 5. Update Status
        console.log('🔄 Updating Status to ISSUED...');
        const updatedPo = await poService.updateStatus(po.id, PurchaseOrderStatus.ISSUED, userId);
        console.log(`✅ New Status: ${updatedPo.status}`);

        console.log('🏁 Verification Completed Successfully');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
