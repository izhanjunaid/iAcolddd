import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { FinancialStatementsPdfService } from '../services/financial-statements-pdf.service';
import { BalanceSheetRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Balance Sheet')
@ApiBearerAuth()
@Controller('financial-statements/balance-sheet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BalanceSheetController {
  constructor(
    private readonly balanceSheetService: BalanceSheetService,
    private readonly pdfService: FinancialStatementsPdfService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Balance Sheet (Statement of Financial Position)' })
  @ApiResponse({ status: 200, description: 'Balance Sheet generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateBalanceSheet(@Body() dto: BalanceSheetRequestDto) {
    return this.balanceSheetService.generateBalanceSheet(dto);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.export')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="balance-sheet.pdf"')
  @ApiOperation({ summary: 'Export Balance Sheet as PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportBalanceSheetPdf(
    @Body() dto: BalanceSheetRequestDto,
    @Res() res: Response,
  ) {
    const balanceSheet = await this.balanceSheetService.generateBalanceSheet(dto);
    const pdfBuffer = await this.pdfService.generateBalanceSheetPdf(balanceSheet);

    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}
