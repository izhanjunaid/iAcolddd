import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { VendorsService } from '../vendors/vendors.service';
import { InventoryItemsService } from '../inventory/services/inventory-items.service';
import { DataSource } from 'typeorm';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';
import { UnitOfMeasure } from '../common/enums/unit-of-measure.enum';
import { CreateVendorDto } from '../vendors/dto/create-vendor.dto';
import { CreateInventoryItemDto } from '../inventory/dto/create-inventory-item.dto';

describe('Procurement Integration', () => {
  let app: TestingModule;
  let poService: PurchaseOrdersService;
  let vendorsService: VendorsService;
  let itemsService: InventoryItemsService;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    poService = app.get(PurchaseOrdersService);
    vendorsService = app.get(VendorsService);
    // Use InventoryItemsService instead of Repository for proper validation/logic
    itemsService = app.get(InventoryItemsService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should promote a PO from DRAFT to ISSUED', async () => {
    // 1. Get or Create Vendor
    let vendor;
    const vendors = await vendorsService.findAll();
    // vendors is { items: [], ... } or []?
    // VendorsService.findAll returns Vendor[] directly in the code I viewed earlier:
    // return await this.vendorsRepository.find(...)
    // Wait, the previous script assumed { items: [] }. Let's re-verify VendorsService.
    // Viewed file says: async findAll() { return await this.vendorsRepository.find(...) }
    // So it returns an array! My previous script was wrong about the shape!

    // Let's handle both just in case, but code says array.
    const vendorList = Array.isArray(vendors)
      ? vendors
      : (vendors as any).items;

    if (vendorList && vendorList.length > 0) {
      vendor = vendorList[0];
    } else {
      const createVendorDto: CreateVendorDto = {
        name: 'Integration Test Vendor ' + Date.now(),
        contactPerson: 'Test Person',
        email: 'test@vendor.com',
        paymentTerms: 30,
        vendorType: 'Supplies',
      };
      // Mock User ID (System Admin usually)
      // If users table is empty, this might fail foreign key?
      // existing migrations reference users(id).
      // create-vendors-table... created_by REFERENCES users(id).
      // We know Admin user exists from seed output.
      // We need an admin ID.
      const adminUser = await dataSource.query(
        `SELECT id FROM users WHERE username = 'admin' LIMIT 1`,
      );
      const userId = adminUser[0]?.id || '00000000-0000-0000-0000-000000000000'; // Fallback might fail constraint

      vendor = await vendorsService.create(createVendorDto, userId);
    }

    // 2. Get or Create Item
    let item;
    const itemsResult = await itemsService.findAll({ limit: 1 });
    // InventoryItemsService.findAll returns { items: [], total, ... }
    if (itemsResult.items.length > 0) {
      item = itemsResult.items[0];
    } else {
      const createItemDto: CreateInventoryItemDto = {
        sku: 'TEST-SKU-' + Date.now(),
        name: 'Test Item ' + Date.now(),
        description: 'Integration Test Item',
        unitOfMeasure: UnitOfMeasure.UNIT, // Assuming UNIT exists in enum
        category: 'Test Category',
        standardCost: 100,
        isActive: true,
      };
      const adminUser = await dataSource.query(
        `SELECT id FROM users WHERE username = 'admin' LIMIT 1`,
      );
      const userId = adminUser[0]?.id || '00000000-0000-0000-0000-000000000000';

      item = await itemsService.create(createItemDto, userId);
    }

    // 3. Create PO
    const createDto: CreatePurchaseOrderDto = {
      vendorId: vendor.id,
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: new Date().toISOString(),
      notes: 'Integration Test PO',
      items: [
        {
          itemId: item.id,
          quantity: 10,
          unitPrice: 100,
          description: 'Test Item',
        },
      ],
    };

    const adminUser = await dataSource.query(
      `SELECT id FROM users WHERE username = 'admin' LIMIT 1`,
    );
    const userId = adminUser[0]?.id || '00000000-0000-0000-0000-000000000000';

    const po = await poService.create(createDto, userId);

    expect(po).toBeDefined();
    expect(po.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(Number(po.totalAmount)).toBe(1000);
    expect(po.status).toBe(PurchaseOrderStatus.DRAFT);

    // 4. Update Status
    const updatedPo = await poService.updateStatus(
      po.id,
      PurchaseOrderStatus.ISSUED,
      userId,
    );

    expect(updatedPo.status).toBe(PurchaseOrderStatus.ISSUED);
  });
});
