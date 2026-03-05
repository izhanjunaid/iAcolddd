import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { VouchersService } from '../../vouchers/vouchers.service';
import { GlAccountConfiguration } from '../../common/entities/gl-account-configuration.entity';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';

@Injectable()
export class InvoiceGLService {
  private readonly logger = new Logger(InvoiceGLService.name);

  constructor(
    private readonly vouchersService: VouchersService,
    @InjectRepository(GlAccountConfiguration)
    private readonly glConfigRepository: Repository<GlAccountConfiguration>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * Create and post a GL voucher for a finalized invoice
   */
  async createInvoiceVoucher(
    invoiceId: string,
    userId: string,
    existingManager?: any,
  ): Promise<void> {
    const manager = existingManager || this.invoiceRepository.manager;

    const invoice = await manager.findOne(Invoice, {
      where: { id: invoiceId },
      relations: ['customer', 'customer.receivableAccount'],
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (
      invoice.status !== InvoiceStatus.SENT &&
      invoice.status !== InvoiceStatus.PAID
    ) {
      this.logger.warn(
        `Attempted to create voucher for invoice ${invoice.invoiceNumber} with status ${invoice.status}`,
      );
      return;
    }

    // Check if already has a voucher
    if (invoice.voucherId) {
      this.logger.warn(
        `Invoice ${invoice.invoiceNumber} already has a linked voucher: ${invoice.voucherId}`,
      );
      return;
    }

    // Double check via reference (legacy/safety)
    const existingVoucher = await this.vouchersService.findAll({
      search: invoice.invoiceNumber,
      limit: 1,
    });

    if (existingVoucher.total > 0) {
      this.logger.warn(
        `Voucher already exists for invoice ${invoice.invoiceNumber} (checked by reference)`,
      );
      // Link it if missing? For now, just return to avoid duplicate
      return;
    }

    // Get GL Account Configurations
    const revenueAccount = await this.getGlAccount('SERVICE_REVENUE', manager);
    const taxAccount = await this.getGlAccount('GST_PAYABLE', manager);
    const whtAccount = await this.getGlAccount('WHT_RECEIVABLE', manager); // Asset account for tax deducted at source

    const voucherDetails: VoucherLineItemDto[] = [];
    let lineNumber = 1;

    // 1. Credit Revenue (Subtotal)
    if (invoice.subtotal > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: revenueAccount.code,
        description: `Revenue - ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(invoice.subtotal),
      });
    }

    // 2. Credit Tax Payable (GST)
    if (invoice.gstAmount > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: taxAccount.code,
        description: `GST Output - ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(invoice.gstAmount),
      });
    }

    // 3. Debit WHT Receivable (if any)
    if (invoice.whtAmount > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: whtAccount.code,
        description: `WHT Deducted - ${invoice.invoiceNumber}`,
        debitAmount: Number(invoice.whtAmount),
        creditAmount: 0,
      });
    }

    // 4. Debit Customer AR (Net Total)
    // Total Amount = Subtotal + GST - WHT
    if (invoice.totalAmount > 0) {
      let arAccountCode: string | undefined;

      if (invoice.customer.receivableAccount) {
        arAccountCode = invoice.customer.receivableAccount.code;
      } else {
        // Fallback to strict GAAP unified AR account from config
        const arConfigAccount = await this.getGlAccount(
          'CUSTOMER_RECEIVABLES',
          manager,
        );
        arAccountCode = arConfigAccount.code;
      }

      if (!arAccountCode) {
        throw new BadRequestException(
          `Unable to resolve AR account for customer ${invoice.customer.name}`,
        );
      }

      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: arAccountCode,
        description: `Invoice ${invoice.invoiceNumber}`,
        debitAmount: Number(invoice.totalAmount),
        creditAmount: 0,
        // Passing customer ID explicitly for the new unified control account aging
        metadata: { customerId: invoice.customer.id },
      });
    }

    // Create Voucher DTO
    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.SALES,
      voucherDate: new Date(invoice.issueDate).toISOString(),
      description: `Invoice ${invoice.invoiceNumber} for ${invoice.customer.name}`,
      referenceNumber: invoice.invoiceNumber,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      details: voucherDetails,
    };

    try {
      // Create Voucher
      const voucher = await this.vouchersService.create(
        createVoucherDto,
        userId,
        manager,
      );

      if (voucher) {
        // Post Voucher
        await this.vouchersService.postVoucher(voucher.id, userId, manager);
        this.logger.log(
          `Generated Voucher ${voucher.voucherNumber} for Invoice ${invoice.invoiceNumber}`,
        );

        // Update Invoice with Voucher ID
        await manager.update(Invoice, invoice.id, { voucherId: voucher.id });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create voucher for invoice ${invoice.invoiceNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  private async getGlAccount(configKey: string, manager: any) {
    const config = await manager.findOne(GlAccountConfiguration, {
      where: { configKey },
      relations: ['account'],
    });

    if (!config || !config.account) {
      throw new BadRequestException(
        `GL Configuration missing for key: ${configKey}`,
      );
    }

    return config.account;
  }
}
