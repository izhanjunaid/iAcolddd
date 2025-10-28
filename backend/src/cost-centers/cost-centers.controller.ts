import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CostCentersService } from './cost-centers.service';
import {
  CreateCostCenterDto,
  UpdateCostCenterDto,
  QueryCostCentersDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Cost Centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @RequirePermissions('cost-centers.create')
  @ApiOperation({ summary: 'Create a new cost center' })
  @ApiResponse({ status: 201, description: 'Cost center created successfully' })
  @ApiResponse({ status: 409, description: 'Cost center code already exists' })
  async create(@Body() createDto: CreateCostCenterDto, @Req() req: any) {
    return await this.costCentersService.create(createDto, req.user.id);
  }

  @Get()
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get all cost centers with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated cost centers' })
  async findAll(@Query() query: QueryCostCentersDto) {
    return await this.costCentersService.findAll(query);
  }

  @Get('tree')
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get cost centers in tree structure' })
  @ApiResponse({
    status: 200,
    description: 'Returns hierarchical cost centers',
  })
  async findTree() {
    return await this.costCentersService.findTree();
  }

  @Get(':id')
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get a cost center by ID' })
  @ApiResponse({ status: 200, description: 'Returns the cost center' })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async findOne(@Param('id') id: string) {
    return await this.costCentersService.findOne(id);
  }

  @Get(':id/ancestors')
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get all ancestors of a cost center' })
  @ApiResponse({
    status: 200,
    description: 'Returns parent, grandparent, etc.',
  })
  async getAncestors(@Param('id') id: string) {
    return await this.costCentersService.getAncestors(id);
  }

  @Get(':id/descendants')
  @RequirePermissions('cost-centers.read')
  @ApiOperation({ summary: 'Get all descendants of a cost center' })
  @ApiResponse({
    status: 200,
    description: 'Returns children, grandchildren, etc.',
  })
  async getDescendants(@Param('id') id: string) {
    return await this.costCentersService.getDescendants(id);
  }

  @Patch(':id')
  @RequirePermissions('cost-centers.update')
  @ApiOperation({ summary: 'Update a cost center' })
  @ApiResponse({ status: 200, description: 'Cost center updated successfully' })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCostCenterDto,
    @Req() req: any,
  ) {
    return await this.costCentersService.update(
      id,
      updateDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @RequirePermissions('cost-centers.delete')
  @ApiOperation({ summary: 'Delete a cost center' })
  @ApiResponse({ status: 200, description: 'Cost center deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete cost center with children',
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async remove(@Param('id') id: string) {
    await this.costCentersService.remove(id);
    return { message: 'Cost center deleted successfully' };
  }
}

