import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { IncomeStatementService } from '../services/income-statement.service';
import { IncomeStatementRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Income Statement')
@ApiBearerAuth()
@Controller('financial-statements/income-statement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncomeStatementController {
  constructor(private readonly incomeStatementService: IncomeStatementService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Permissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Income Statement (Profit & Loss)' })
  @ApiResponse({ status: 200, description: 'Income Statement generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateIncomeStatement(@Body() dto: IncomeStatementRequestDto) {
    return this.incomeStatementService.generateIncomeStatement(dto);
  }
}
