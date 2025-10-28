import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { WarehousesService } from '../services';
import { Warehouse, Room } from '../entities';

@ApiTags('inventory-warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @RequirePermissions('inventory.items.read') // Using existing inventory permission
  @ApiOperation({ summary: 'Get all active warehouses' })
  @ApiResponse({
    status: 200,
    description: 'List of active warehouses with rooms',
    type: [Warehouse],
  })
  async findAll(): Promise<Warehouse[]> {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse details with rooms',
    type: Warehouse,
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(@Param('id') id: string): Promise<Warehouse | null> {
    return this.warehousesService.findOne(id);
  }

  @Get(':id/rooms')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get all rooms in a warehouse' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms in the warehouse',
    type: [Room],
  })
  async getRooms(@Param('id') warehouseId: string): Promise<Room[]> {
    return this.warehousesService.getRoomsByWarehouse(warehouseId);
  }
}
