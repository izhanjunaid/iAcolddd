import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryValuationService } from '../services/inventory-valuation.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Inventory Valuation')
@ApiBearerAuth()
@Controller('inventory/valuation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryValuationController {
  constructor(private readonly valuationService: InventoryValuationService) {}

  @Get()
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({ summary: 'Get inventory valuation summary' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Valuation summary retrieved successfully',
  })
  async getValuationHelper(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.valuationService.getValuationSummary(warehouseId, itemId);
  }

  @Get('audit')
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({
    summary: 'Audit inventory integrity (Balance vs Cost Layers)',
  })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiResponse({ status: 200, description: 'Audit complete' })
  async auditInventory(@Query('warehouseId') warehouseId?: string) {
    return this.valuationService.validateInventoryIntegrity(warehouseId);
  }
}
