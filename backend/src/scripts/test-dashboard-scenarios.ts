import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DashboardController } from '../dashboard/dashboard.controller';
import { InvoicesService } from '../invoices/services/invoices.service';
import { PayablesService } from '../payables/services/payables.service';
import { CreateBillDto } from '../payables/dto/create-bill.dto';
import { InventoryItemsService } from '../inventory/services/inventory-items.service';
import { CreateInventoryItemDto } from '../inventory/dto/create-inventory-item.dto';
import { PaymentMode } from '../common/enums/payment-mode.enum';
import { ApBillStatus } from '../payables/enums/ap-bill-status.enum';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dashboardController = app.get(DashboardController);
    const invoicesService = app.get(InvoicesService);
    const payablesService = app.get(PayablesService);
    const inventoryService = app.get(InventoryItemsService);

    // Authenticated User Mock
    const userId = 'dashboard-test-user';

    console.log('--- Starting Dashboard Verification ---');

    try {
        // 3. Call Dashboard API
        console.log('Fetching Dashboard KPIs...');
        const kpis = await dashboardController.getKPIs();
        console.log('KPIs Received:', kpis);



        // 4. Validate
        if (kpis.totalRevenue >= 0 && kpis.totalPayables >= 0) {
            console.log('✅ KPI Data Structure Valid');
        } else {
            console.error('❌ KPI Data Invalid');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
