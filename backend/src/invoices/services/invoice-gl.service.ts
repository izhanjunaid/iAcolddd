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
    ) { }

    /**
     * Create and post a GL voucher for a finalized invoice
     */
    async createInvoiceVoucher(invoiceId: string, userId: string): Promise<void> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ['customer', 'customer.receivableAccount'],
        });

        if (!invoice) {
            throw new BadRequestException('Invoice not found');
        }

        if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.PAID) {
            this.logger.warn(`Attempted to create voucher for invoice ${invoice.invoiceNumber} with status ${invoice.status}`);
            return;
        }

        // Check if already has a voucher (assuming we add a voucherId column later, or check via reference)
        // For now, we'll check if a voucher exists with this reference
        const existingVoucher = await this.vouchersService.findAll({
            search: invoice.invoiceNumber,
            limit: 1,
        });

        if (existingVoucher.total > 0) {
            this.logger.warn(`Voucher already exists for invoice ${invoice.invoiceNumber}`);
            return;
        }

        // Get GL Account Configurations
        const revenueAccount = await this.getGlAccount('SERVICE_REVENUE');
        const taxAccount = await this.getGlAccount('GST_PAYABLE');
        const whtAccount = await this.getGlAccount('WHT_RECEIVABLE'); // Asset account for tax deducted at source

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
            if (!invoice.customer.receivableAccount) {
                throw new BadRequestException(`Customer ${invoice.customer.name} does not have a linked AR account`);
            }

            voucherDetails.push({
                lineNumber: lineNumber++,
                accountCode: invoice.customer.receivableAccount.code,
                description: `Invoice ${invoice.invoiceNumber}`,
                debitAmount: Number(invoice.totalAmount),
                creditAmount: 0,
            });
        }

        // Create Voucher DTO
        const createVoucherDto: CreateVoucherDto = {
            voucherType: VoucherType.SALES,
            voucherDate: invoice.issueDate.toISOString(),
            description: `Invoice ${invoice.invoiceNumber} for ${invoice.customer.name}`,
            referenceNumber: invoice.invoiceNumber,
            referenceType: 'INVOICE',
            referenceId: invoice.id,
            details: voucherDetails,
        };

        try {
            // Create Voucher
            const voucher = await this.vouchersService.create(createVoucherDto, userId);

            if (voucher) {
                // Post Voucher
                await this.vouchersService.postVoucher(voucher.id, userId);
                this.logger.log(`Generated Voucher ${voucher.voucherNumber} for Invoice ${invoice.invoiceNumber}`);
            }
        } catch (error) {
            this.logger.error(`Failed to create voucher for invoice ${invoice.invoiceNumber}: ${error.message}`);
            throw error;
        }
    }

    private async getGlAccount(configKey: string) {
        const config = await this.glConfigRepository.findOne({
            where: { configKey },
            relations: ['account'],
        });

        if (!config || !config.account) {
            throw new BadRequestException(`GL Configuration missing for key: ${configKey}`);
        }

        return config.account;
    }
}
