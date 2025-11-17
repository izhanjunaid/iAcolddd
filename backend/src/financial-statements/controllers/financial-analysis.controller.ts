import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { FinancialAnalysisService } from '../services/financial-analysis.service';
import { FinancialAnalysisRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Analysis')
@ApiBearerAuth()
@Controller('financial-statements/analysis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialAnalysisController {
  constructor(private readonly financialAnalysisService: FinancialAnalysisService) {}

  @Post('perform')
  @HttpCode(HttpStatus.OK)
  @Permissions('financial-statements.read')
  @ApiOperation({
    summary: 'Perform comprehensive financial analysis with all ratios',
  })
  @ApiResponse({ status: 200, description: 'Financial analysis completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async performFinancialAnalysis(@Body() dto: FinancialAnalysisRequestDto) {
    return this.financialAnalysisService.performFinancialAnalysis(dto);
  }
}
