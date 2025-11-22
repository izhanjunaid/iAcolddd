import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { FinancialAnalysisService } from '../services/financial-analysis.service';
import { FinancialStatementsPdfService } from '../services/financial-statements-pdf.service';
import { FinancialAnalysisRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Analysis')
@ApiBearerAuth()
@Controller('financial-statements/analysis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialAnalysisController {
  constructor(
    private readonly financialAnalysisService: FinancialAnalysisService,
    private readonly pdfService: FinancialStatementsPdfService,
  ) {}

  @Post('perform')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.read')
  @ApiOperation({
    summary: 'Perform comprehensive financial analysis with all ratios',
  })
  @ApiResponse({ status: 200, description: 'Financial analysis completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async performFinancialAnalysis(@Body() dto: FinancialAnalysisRequestDto) {
    return this.financialAnalysisService.performFinancialAnalysis(dto);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.export')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="financial-analysis.pdf"')
  @ApiOperation({ summary: 'Export Financial Analysis as PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportFinancialAnalysisPdf(
    @Body() dto: FinancialAnalysisRequestDto,
    @Res() res: Response,
  ) {
    const analysis = await this.financialAnalysisService.performFinancialAnalysis(dto);
    const pdfBuffer = await this.pdfService.generateFinancialAnalysisPdf(analysis);

    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}
