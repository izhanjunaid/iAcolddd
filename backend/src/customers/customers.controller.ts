import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Customers')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customers.create')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully (with AR account)',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    return await this.customersService.create(createCustomerDto, req.user.id);
  }

  @Get()
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get all customers with pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(@Query() query: QueryCustomersDto) {
    return await this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id') id: string) {
    return await this.customersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    return await this.customersService.update(id, updateCustomerDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('customers.delete')
  @ApiOperation({ summary: 'Soft delete a customer' })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully (soft delete)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete - customer has active transactions',
  })
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
    return { message: 'Customer deleted successfully' };
  }

  @Get(':id/balance')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get customer account balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getBalance(@Param('id') id: string) {
    return await this.customersService.getBalance(id);
  }
}

