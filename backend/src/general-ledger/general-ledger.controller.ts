import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GeneralLedgerService } from './general-ledger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('general-ledger')
@Controller('general-ledger')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class GeneralLedgerController {
  constructor(private readonly glService: GeneralLedgerService) {}

  @Get('account-balance/:accountCode')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get current balance for an account' })
  @ApiQuery({ name: 'asOfDate', required: false, type: String, description: 'As of date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
  async getAccountBalance(
    @Param('accountCode') accountCode: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.glService.getAccountBalance(accountCode, date);
  }

  @Get('account-ledger/:accountCode')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get account ledger (all transactions for an account)' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'To date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Account ledger retrieved successfully' })
  async getAccountLedger(
    @Param('accountCode') accountCode: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    return this.glService.getAccountLedger(accountCode, from, to);
  }

  @Get('trial-balance')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get trial balance (all accounts with balances)' })
  @ApiQuery({ name: 'asOfDate', required: false, type: String, description: 'As of date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Trial balance retrieved successfully' })
  async getTrialBalance(@Query('asOfDate') asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.glService.getTrialBalance(date);
  }

  @Get('category-summary')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get category summary (for financial statements)' })
  @ApiQuery({ name: 'asOfDate', required: false, type: String, description: 'As of date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Category summary retrieved successfully' })
  async getCategorySummary(@Query('asOfDate') asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.glService.getCategorySummary(date);
  }
}

