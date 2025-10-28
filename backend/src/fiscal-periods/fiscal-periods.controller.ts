import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalPeriodsService } from './fiscal-periods.service';
import {
  CreateFiscalYearDto,
  CloseFiscalPeriodDto,
  QueryFiscalPeriodsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Fiscal Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fiscal-periods')
export class FiscalPeriodsController {
  constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

  @Post('years')
  @RequirePermissions('fiscal-periods.create')
  @ApiOperation({ summary: 'Create a new fiscal year with 12 monthly periods' })
  @ApiResponse({
    status: 201,
    description: 'Fiscal year created successfully',
  })
  @ApiResponse({ status: 409, description: 'Fiscal year already exists' })
  async createFiscalYear(
    @Body() createDto: CreateFiscalYearDto,
    @Req() req: any,
  ) {
    return await this.fiscalPeriodsService.createFiscalYear(
      createDto,
      req.user.id,
    );
  }

  @Get('years')
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get all fiscal years with periods' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated fiscal years',
  })
  async findAll(@Query() query: QueryFiscalPeriodsDto) {
    return await this.fiscalPeriodsService.findAll(query);
  }

  @Get('years/:id')
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get a fiscal year by ID' })
  @ApiResponse({ status: 200, description: 'Returns the fiscal year' })
  @ApiResponse({ status: 404, description: 'Fiscal year not found' })
  async findOne(@Param('id') id: string) {
    return await this.fiscalPeriodsService.findOne(id);
  }

  @Get('periods/:id')
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get a fiscal period by ID' })
  @ApiResponse({ status: 200, description: 'Returns the fiscal period' })
  @ApiResponse({ status: 404, description: 'Fiscal period not found' })
  async findPeriod(@Param('id') id: string) {
    return await this.fiscalPeriodsService.findPeriod(id);
  }

  @Get('current')
  @RequirePermissions('fiscal-periods.read')
  @ApiOperation({ summary: 'Get the current open fiscal period' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current fiscal period',
  })
  async getCurrentPeriod() {
    return await this.fiscalPeriodsService.getCurrentPeriod();
  }

  @Post('periods/close')
  @RequirePermissions('fiscal-periods.close')
  @ApiOperation({ summary: 'Close a fiscal period' })
  @ApiResponse({
    status: 200,
    description: 'Fiscal period closed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Period already closed or prior periods are open',
  })
  async closePeriod(@Body() closeDto: CloseFiscalPeriodDto, @Req() req: any) {
    return await this.fiscalPeriodsService.closePeriod(
      closeDto,
      req.user.id,
    );
  }

  @Post('periods/:id/reopen')
  @RequirePermissions('fiscal-periods.close')
  @ApiOperation({ summary: 'Reopen a closed fiscal period' })
  @ApiResponse({
    status: 200,
    description: 'Fiscal period reopened successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Period is not closed or subsequent periods are closed',
  })
  async reopenPeriod(@Param('id') id: string) {
    return await this.fiscalPeriodsService.reopenPeriod(id);
  }
}

