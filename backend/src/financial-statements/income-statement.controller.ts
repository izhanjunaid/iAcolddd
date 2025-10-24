import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IncomeStatementService } from './income-statement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('financial-statements')
@Controller('financial-statements/income-statement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class IncomeStatementController {
  constructor(private readonly incomeStatementService: IncomeStatementService) {}

  @Get()
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Generate Income Statement for a period' })
  @ApiQuery({ name: 'fromDate', required: true, type: String, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, type: String, description: 'To date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'companyName', required: false, type: String, description: 'Company name for report header' })
  @ApiResponse({ status: 200, description: 'Income statement generated successfully' })
  async generateIncomeStatement(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('companyName') companyName?: string,
  ) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return this.incomeStatementService.generateIncomeStatement(
      from,
      to,
      companyName,
    );
  }

  @Get('comparison')
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Generate Income Statement with previous period comparison' })
  @ApiQuery({ name: 'fromDate', required: true, type: String, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, type: String, description: 'To date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'companyName', required: false, type: String, description: 'Company name for report header' })
  @ApiResponse({ status: 200, description: 'Income statement with comparison generated successfully' })
  async generateIncomeStatementWithComparison(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('companyName') companyName?: string,
  ) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return this.incomeStatementService.generateIncomeStatementWithComparison(
      from,
      to,
      companyName,
    );
  }

  @Get('revenue-breakdown')
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Get detailed revenue breakdown by account' })
  @ApiQuery({ name: 'fromDate', required: true, type: String, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, type: String, description: 'To date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Revenue breakdown retrieved successfully' })
  async getRevenueBreakdown(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return this.incomeStatementService.getRevenueBreakdown(from, to);
  }

  @Get('expense-breakdown')
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Get detailed expense breakdown by account' })
  @ApiQuery({ name: 'fromDate', required: true, type: String, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, type: String, description: 'To date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Expense breakdown retrieved successfully' })
  async getExpenseBreakdown(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return this.incomeStatementService.getExpenseBreakdown(from, to);
  }

  @Get('monthly/:year')
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Get monthly income statements for a year' })
  @ApiQuery({ name: 'companyName', required: false, type: String, description: 'Company name for report header' })
  @ApiResponse({ status: 200, description: 'Monthly income statements retrieved successfully' })
  async getMonthlyIncomeStatements(
    @Param('year', ParseIntPipe) year: number,
    @Query('companyName') companyName?: string,
  ) {
    return this.incomeStatementService.getMonthlyIncomeStatements(
      year,
      companyName,
    );
  }

  @Get('quarterly/:year')
  @RequirePermissions('reports.generate')
  @ApiOperation({ summary: 'Get quarterly income statements for a year' })
  @ApiQuery({ name: 'companyName', required: false, type: String, description: 'Company name for report header' })
  @ApiResponse({ status: 200, description: 'Quarterly income statements retrieved successfully' })
  async getQuarterlyIncomeStatements(
    @Param('year', ParseIntPipe) year: number,
    @Query('companyName') companyName?: string,
  ) {
    return this.incomeStatementService.getQuarterlyIncomeStatements(
      year,
      companyName,
    );
  }
}