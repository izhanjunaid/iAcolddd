import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { InventoryItemsService } from '../services/inventory-items.service';
import { 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto, 
  QueryInventoryItemsDto 
} from '../dto';
import { InventoryItem } from '../entities/inventory-item.entity';

@ApiTags('Inventory Items')
@ApiBearerAuth()
@Controller('inventory/items')
@UseGuards(JwtAuthGuard)
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  @RequirePermissions('inventory.items.create')
  @ApiOperation({ summary: 'Create a new inventory item' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Inventory item created successfully',
    type: InventoryItem 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid data or duplicate SKU' 
  })
  async create(
    @Body() createDto: CreateInventoryItemDto,
    @Req() req: any
  ): Promise<InventoryItem> {
    return await this.inventoryItemsService.create(createDto, req.user.id);
  }

  @Get()
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get all inventory items with filtering and pagination' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of inventory items retrieved successfully' 
  })
  @ApiQuery({ name: 'sku', required: false, description: 'Filter by SKU (partial match)' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by name (partial match)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'unitOfMeasure', required: false, description: 'Filter by unit of measure' })
  @ApiQuery({ name: 'isPerishable', required: false, description: 'Filter by perishable status' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', default: true })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', default: 50 })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of items to skip', default: 0 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', default: 'name' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['ASC', 'DESC'], default: 'ASC' })
  async findAll(
    @Query() queryDto: QueryInventoryItemsDto
  ): Promise<{
    items: InventoryItem[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    const result = await this.inventoryItemsService.findAll(queryDto);
    const currentPage = Math.floor((queryDto.offset || 0) / (queryDto.limit || 50)) + 1;
    const hasMore = (queryDto.offset || 0) + (queryDto.limit || 50) < result.total;
    
    return {
      ...result,
      currentPage,
      hasMore,
    };
  }

  @Get('categories')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get all item categories' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of categories retrieved successfully',
    type: [String]
  })
  async getCategories(): Promise<string[]> {
    return await this.inventoryItemsService.getCategories();
  }

  @Get('stats')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get inventory items statistics' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Statistics retrieved successfully' 
  })
  async getStats(): Promise<{
    totalItems: number;
    activeItems: number;
    perishableItems: number;
    categories: number;
  }> {
    return await this.inventoryItemsService.getStats();
  }

  @Get(':id')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory item retrieved successfully',
    type: InventoryItem 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Inventory item not found' 
  })
  async findOne(@Param('id') id: string): Promise<InventoryItem> {
    return await this.inventoryItemsService.findOne(id);
  }

  @Get('sku/:sku')
  @RequirePermissions('inventory.items.read')
  @ApiOperation({ summary: 'Get inventory item by SKU' })
  @ApiParam({ name: 'sku', description: 'Inventory item SKU' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory item retrieved successfully',
    type: InventoryItem 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Inventory item not found' 
  })
  async findBySku(@Param('sku') sku: string): Promise<InventoryItem> {
    return await this.inventoryItemsService.findBySku(sku);
  }

  @Patch(':id')
  @RequirePermissions('inventory.items.update')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory item updated successfully',
    type: InventoryItem 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Inventory item not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid data' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryItemDto,
    @Req() req: any
  ): Promise<InventoryItem> {
    return await this.inventoryItemsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('inventory.items.delete')
  @ApiOperation({ summary: 'Soft delete inventory item (set inactive)' })
  @ApiParam({ name: 'id', description: 'Inventory item ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory item deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Inventory item not found' 
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.inventoryItemsService.remove(id);
    return { message: 'Inventory item deleted successfully' };
  }

  @Post('bulk-update-cost')
  @RequirePermissions('inventory.items.update')
  @ApiOperation({ summary: 'Bulk update standard costs for multiple items' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Standard costs updated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid data' 
  })
  async bulkUpdateStandardCost(
    @Body() updates: Array<{ id: string; standardCost: number }>,
    @Req() req: any
  ): Promise<{ message: string; updatedCount: number }> {
    await this.inventoryItemsService.bulkUpdateStandardCost(updates, req.user.id);
    return { 
      message: 'Standard costs updated successfully',
      updatedCount: updates.length 
    };
  }
}

