import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InvoicesService, InvoicePdfService } from '../services';
import { CreateInvoiceFromBillingDto, QueryInvoicesDto, UpdateInvoiceDto } from '../dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  @Post('from-billing')
  @RequirePermissions('invoices.create')
  @ApiOperation({
    summary: 'Create invoice from billing calculation',
    description: 'Generates an invoice from a storage billing calculation with automatic invoice number generation',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async createFromBilling(
    @Body() dto: CreateInvoiceFromBillingDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Creating invoice from billing for customer ${dto.customerId}`);
    return this.invoicesService.createInvoiceFromBilling(dto, user?.username);
  }

  @Get()
  @RequirePermissions('invoices.read')
  @ApiOperation({
    summary: 'Get all invoices with filters',
    description: 'Retrieve invoices with optional filtering, sorting, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
  })
  async findAll(@Query() query: QueryInvoicesDto) {
    this.logger.log('Fetching invoices with filters');
    return this.invoicesService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions('invoices.read')
  @ApiOperation({
    summary: 'Get invoice statistics',
    description: 'Get count and amount statistics for invoices',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Query('customerId') customerId?: string) {
    this.logger.log('Fetching invoice statistics');
    return this.invoicesService.getStatistics(customerId);
  }

  @Get(':id')
  @RequirePermissions('invoices.read')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Retrieve a single invoice with all details including line items',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching invoice ${id}`);
    return this.invoicesService.findOne(id);
  }

  @Get('by-number/:invoiceNumber')
  @RequirePermissions('invoices.read')
  @ApiOperation({
    summary: 'Get invoice by invoice number',
    description: 'Retrieve invoice using the invoice number (e.g., INV-2025-0001)',
  })
  @ApiParam({
    name: 'invoiceNumber',
    description: 'Invoice number',
    example: 'INV-2025-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async findByNumber(@Param('invoiceNumber') invoiceNumber: string) {
    this.logger.log(`Fetching invoice by number ${invoiceNumber}`);
    return this.invoicesService.findByInvoiceNumber(invoiceNumber);
  }

  @Get(':id/pdf')
  @RequirePermissions('invoices.read')
  @ApiOperation({
    summary: 'Download invoice PDF',
    description: 'Generate and download a professional PDF for the invoice',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async downloadPdf(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Generating PDF for invoice ${id}`);

    const invoice = await this.invoicesService.findOne(id);
    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Put(':id')
  @RequirePermissions('invoices.update')
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Update invoice details, status, or payment information',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Updating invoice ${id}`);
    return this.invoicesService.update(id, dto, user?.username);
  }

  @Patch(':id/send')
  @RequirePermissions('invoices.update')
  @ApiOperation({
    summary: 'Mark invoice as sent',
    description: 'Change invoice status to SENT',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice marked as sent',
  })
  @HttpCode(HttpStatus.OK)
  async markAsSent(@Param('id') id: string, @CurrentUser() user: any) {
    this.logger.log(`Marking invoice ${id} as sent`);
    return this.invoicesService.markAsSent(id, user?.username);
  }

  @Post(':id/payment')
  @RequirePermissions('invoices.update')
  @ApiOperation({
    summary: 'Record payment for invoice',
    description: 'Record a payment against an invoice, updating balance and status',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment amount or cancelled invoice',
  })
  async recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; paymentDate?: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Recording payment of PKR ${body.amount} for invoice ${id}`);
    return this.invoicesService.recordPayment(id, body.amount, body.paymentDate, user?.username);
  }

  @Patch(':id/cancel')
  @RequirePermissions('invoices.delete')
  @ApiOperation({
    summary: 'Cancel invoice',
    description: 'Cancel an invoice (cannot cancel paid invoices)',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel paid invoice',
  })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    this.logger.log(`Cancelling invoice ${id}`);
    return this.invoicesService.cancel(id, user?.username);
  }
}
