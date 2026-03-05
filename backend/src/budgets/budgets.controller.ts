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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post(':fiscalYearId')
  @RequirePermissions('budgets.create')
  @ApiOperation({
    summary: 'Create or update budget entries for a fiscal year',
  })
  async upsertBudget(
    @Param('fiscalYearId') fiscalYearId: string,
    @Body()
    body: {
      accountCode: string;
      entries: Array<{ month: number; amount: number; notes?: string }>;
      costCenterId?: string;
    },
    @Req() req: any,
  ) {
    return this.budgetsService.upsertBudget(
      fiscalYearId,
      body.accountCode,
      body.entries,
      req.user.id,
      body.costCenterId,
    );
  }

  @Get(':fiscalYearId')
  @RequirePermissions('budgets.read')
  @ApiOperation({ summary: 'Get all budgets for a fiscal year' })
  async findByFiscalYear(@Param('fiscalYearId') fiscalYearId: string) {
    return this.budgetsService.findByFiscalYear(fiscalYearId);
  }

  @Get(':fiscalYearId/vs-actual')
  @RequirePermissions('budgets.read')
  @ApiOperation({ summary: 'Budget vs Actual variance report' })
  async budgetVsActual(
    @Param('fiscalYearId') fiscalYearId: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    return this.budgetsService.getBudgetVsActual(fiscalYearId, costCenterId);
  }
}
