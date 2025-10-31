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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  QueryTaxRatesDto,
  CalculateTaxDto,
  CalculateInvoiceTaxDto,
  CreateTaxConfigurationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { TaxEntityType } from '../common/enums/tax-applicability.enum';

@ApiTags('Tax Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  // ==========================================
  // TAX RATE CRUD
  // ==========================================

  @Post('rates')
  @RequirePermissions('tax:create')
  @ApiOperation({ summary: 'Create a new tax rate' })
  @ApiResponse({ status: 201, description: 'Tax rate created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Default rate already exists' })
  async createTaxRate(@Body() createDto: CreateTaxRateDto, @Request() req) {
    return await this.taxService.createTaxRate(createDto, req.user.sub);
  }

  @Get('rates')
  @RequirePermissions('tax:view')
  @ApiOperation({ summary: 'Get all tax rates with filters' })
  @ApiResponse({ status: 200, description: 'Tax rates retrieved successfully' })
  async findAllTaxRates(@Query() query: QueryTaxRatesDto) {
    return await this.taxService.findAllTaxRates(query);
  }

  @Get('rates/:id')
  @RequirePermissions('tax:view')
  @ApiOperation({ summary: 'Get a single tax rate by ID' })
  @ApiResponse({ status: 200, description: 'Tax rate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  async findOneTaxRate(@Param('id') id: string) {
    return await this.taxService.findOneTaxRate(id);
  }

  @Patch('rates/:id')
  @RequirePermissions('tax:update')
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate updated successfully' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  @ApiResponse({ status: 409, description: 'Default rate conflict' })
  async updateTaxRate(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaxRateDto,
    @Request() req
  ) {
    return await this.taxService.updateTaxRate(id, updateDto, req.user.sub);
  }

  @Delete('rates/:id')
  @RequirePermissions('tax:delete')
  @ApiOperation({ summary: 'Delete a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  @ApiResponse({ status: 400, description: 'Tax rate is in use' })
  async deleteTaxRate(@Param('id') id: string) {
    await this.taxService.deleteTaxRate(id);
    return { message: 'Tax rate deleted successfully' };
  }

  // ==========================================
  // TAX CALCULATION ENDPOINTS
  // ==========================================

  @Post('calculate')
  @RequirePermissions('tax:calculate')
  @ApiOperation({ summary: 'Calculate tax for a given amount' })
  @ApiResponse({ status: 200, description: 'Tax calculated successfully' })
  @ApiResponse({ status: 404, description: 'No applicable tax rate found' })
  async calculateTax(@Body() calculateDto: CalculateTaxDto) {
    return await this.taxService.calculateTax(calculateDto);
  }

  @Post('calculate-invoice')
  @RequirePermissions('tax:calculate')
  @ApiOperation({ summary: 'Calculate all taxes for an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice taxes calculated successfully' })
  async calculateInvoiceTaxes(@Body() calculateDto: CalculateInvoiceTaxDto) {
    return await this.taxService.calculateInvoiceTaxes(calculateDto);
  }

  // ==========================================
  // TAX CONFIGURATION ENDPOINTS
  // ==========================================

  @Post('configurations')
  @RequirePermissions('tax:configure')
  @ApiOperation({ summary: 'Create entity-specific tax configuration' })
  @ApiResponse({ status: 201, description: 'Tax configuration created successfully' })
  async createTaxConfiguration(
    @Body() createDto: CreateTaxConfigurationDto,
    @Request() req
  ) {
    return await this.taxService.createTaxConfiguration(createDto, req.user.sub);
  }

  @Get('configurations/:entityType/:entityId')
  @RequirePermissions('tax:view')
  @ApiOperation({ summary: 'Get tax configurations for an entity' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  async findTaxConfigurationsForEntity(
    @Param('entityType') entityType: TaxEntityType,
    @Param('entityId') entityId: string
  ) {
    return await this.taxService.findTaxConfigurationsForEntity(entityType, entityId);
  }

  @Delete('configurations/:id')
  @RequirePermissions('tax:configure')
  @ApiOperation({ summary: 'Delete a tax configuration' })
  @ApiResponse({ status: 200, description: 'Tax configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tax configuration not found' })
  async deleteTaxConfiguration(@Param('id') id: string) {
    await this.taxService.deleteTaxConfiguration(id);
    return { message: 'Tax configuration deleted successfully' };
  }
}
