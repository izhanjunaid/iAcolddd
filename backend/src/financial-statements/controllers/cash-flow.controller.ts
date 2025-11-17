import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CashFlowService } from '../services/cash-flow.service';
import { CashFlowStatementRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Cash Flow')
@ApiBearerAuth()
@Controller('financial-statements/cash-flow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Permissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Cash Flow Statement (Indirect Method)' })
  @ApiResponse({ status: 200, description: 'Cash Flow Statement generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateCashFlowStatement(@Body() dto: CashFlowStatementRequestDto) {
    return this.cashFlowService.generateCashFlowStatement(dto);
  }
}
