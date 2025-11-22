import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Header } from '@nestjs/common';
import type { Response} from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CashFlowService } from '../services/cash-flow.service';
import { FinancialStatementsPdfService } from '../services/financial-statements-pdf.service';
import { CashFlowStatementRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Cash Flow')
@ApiBearerAuth()
@Controller('financial-statements/cash-flow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashFlowController {
  constructor(
    private readonly cashFlowService: CashFlowService,
    private readonly pdfService: FinancialStatementsPdfService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Cash Flow Statement (Indirect Method)' })
  @ApiResponse({ status: 200, description: 'Cash Flow Statement generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateCashFlowStatement(@Body() dto: CashFlowStatementRequestDto) {
    return this.cashFlowService.generateCashFlowStatement(dto);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('financial-statements.export')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="cash-flow-statement.pdf"')
  @ApiOperation({ summary: 'Export Cash Flow Statement as PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportCashFlowPdf(
    @Body() dto: CashFlowStatementRequestDto,
    @Res() res: Response,
  ) {
    const cashFlow = await this.cashFlowService.generateCashFlowStatement(dto);
    const pdfBuffer = await this.pdfService.generateCashFlowPdf(cashFlow);

    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}
