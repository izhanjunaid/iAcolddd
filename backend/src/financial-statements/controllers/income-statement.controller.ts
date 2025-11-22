import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { IncomeStatementService } from '../services/income-statement.service';
import { FinancialStatementsPdfService } from '../services/financial-statements-pdf.service';
import { IncomeStatementRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Income Statement')
@ApiBearerAuth()
@Controller('financial-statements/income-statement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncomeStatementController {
  constructor(
    private readonly incomeStatementService: IncomeStatementService,
    private readonly pdfService: FinancialStatementsPdfService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Income Statement (Profit & Loss)' })
  @ApiResponse({ status: 200, description: 'Income Statement generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateIncomeStatement(@Body() dto: IncomeStatementRequestDto) {
    return this.incomeStatementService.generateIncomeStatement(dto);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.export')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="income-statement.pdf"')
  @ApiOperation({ summary: 'Export Income Statement as PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportIncomeStatementPdf(
    @Body() dto: IncomeStatementRequestDto,
    @Res() res: Response,
  ) {
    const incomeStatement = await this.incomeStatementService.generateIncomeStatement(dto);
    const pdfBuffer = await this.pdfService.generateIncomeStatementPdf(incomeStatement);

    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}
