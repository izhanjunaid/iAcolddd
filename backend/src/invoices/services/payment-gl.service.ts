import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { VouchersService } from '../../vouchers/vouchers.service';
import { GlAccountConfiguration } from '../../common/entities/gl-account-configuration.entity';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { PaymentMode } from '../../common/enums/payment-mode.enum';

import { RecordPaymentDto } from '../dto/record-payment.dto';

@Injectable()
export class PaymentGLService {
  private readonly logger = new Logger(PaymentGLService.name);

  constructor(
    private readonly vouchersService: VouchersService,
    @InjectRepository(GlAccountConfiguration)
    private readonly glConfigRepository: Repository<GlAccountConfiguration>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * Create a Receipt Voucher when payment is received on an invoice
   *
   * Double-Entry:
   *   Debit: Cash/Bank Account (based on payment mode)
   *   Credit: Customer Accounts Receivable
   */
  async createPaymentVoucher(
    dto: RecordPaymentDto,
    userId: string,
    existingManager?: any,
  ): Promise<void> {
    const manager = existingManager || this.invoiceRepository.manager;
    const invoice = await manager.findOne(Invoice, {
      where: { id: dto.invoiceId },
      relations: ['customer', 'customer.receivableAccount'],
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (!invoice.customer?.receivableAccount) {
      throw new BadRequestException(
        `Customer ${invoice.customer?.name} does not have a linked Accounts Receivable account`,
      );
    }

    // Determine which account to debit based on payment mode
    const cashBankAccount = await this.getCashBankAccount(
      dto.paymentMode,
      manager,
    );

    const voucherDetails: VoucherLineItemDto[] = [];

    // Line 1: Debit Cash/Bank Account
    voucherDetails.push({
      lineNumber: 1,
      accountCode: cashBankAccount.code,
      description: `Payment received - ${invoice.invoiceNumber}`,
      debitAmount: dto.amount,
      creditAmount: 0,
    });

    // Line 2: Credit Customer A/R
    voucherDetails.push({
      lineNumber: 2,
      accountCode: invoice.customer.receivableAccount.code,
      description: `Payment from ${invoice.customer.name} - ${invoice.invoiceNumber}`,
      debitAmount: 0,
      creditAmount: dto.amount,
    });

    // Build voucher description
    let description = `Receipt for Invoice ${invoice.invoiceNumber} from ${invoice.customer.name}`;
    if (dto.paymentMode === PaymentMode.CHEQUE && dto.chequeNumber) {
      description += ` (Cheque: ${dto.chequeNumber})`;
    } else if (
      dto.paymentMode === PaymentMode.ONLINE_TRANSFER &&
      dto.bankReference
    ) {
      description += ` (Ref: ${dto.bankReference})`;
    }

    // Create Voucher DTO
    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.RECEIPT,
      voucherDate: dto.paymentDate.toISOString(),
      description,
      referenceNumber: invoice.invoiceNumber,
      referenceType: 'INVOICE_PAYMENT',
      referenceId: invoice.id,
      paymentMode: dto.paymentMode,
      chequeNumber: dto.chequeNumber,
      chequeDate: dto.chequeDate?.toISOString(),
      bankName: dto.bankName,
      details: voucherDetails,
    };

    try {
      // Create and post the voucher
      const voucher = await this.vouchersService.create(
        createVoucherDto,
        userId,
        manager,
      );

      if (voucher) {
        await this.vouchersService.postVoucher(voucher.id, userId, manager);
        this.logger.log(
          `Created Receipt Voucher ${voucher.voucherNumber} for Invoice ${invoice.invoiceNumber} - Amount: ${dto.amount}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create receipt voucher for invoice ${invoice.invoiceNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Create a Credit Note Voucher (CN)
   *
   * Double-Entry:
   *   Debit: Sales Return Account (Contra-Revenue)
   *   Credit: Customer Accounts Receivable (Reduces debt)
   */
  async createCreditNoteVoucher(
    creditNoteId: string,
    userId: string,
    existingManager?: any,
  ): Promise<void> {
    const manager = existingManager || this.invoiceRepository.manager;
    const creditNote = await manager.findOne(Invoice, {
      where: { id: creditNoteId },
      relations: ['customer', 'customer.receivableAccount'],
    });

    if (!creditNote) throw new BadRequestException('Credit Note invalid');

    if (!creditNote.customer?.receivableAccount) {
      throw new BadRequestException(
        `Customer AR Account missing for ${creditNote.customer?.name}`,
      );
    }

    // Get Sales Return GL Account
    const salesReturnAccount = await this.getSalesReturnAccount(manager);
    let taxAccount, whtAccount;
    if (Number(creditNote.gstAmount) > 0) {
      taxAccount = await this.getGlAccount('GST_PAYABLE', manager);
    }
    if (Number(creditNote.whtAmount) > 0) {
      whtAccount = await this.getGlAccount('WHT_RECEIVABLE', manager);
    }

    const voucherDetails: VoucherLineItemDto[] = [];
    let lineNumber = 1;

    // Debit Sales Return
    if (Number(creditNote.subtotal) > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: salesReturnAccount.code,
        description: `Sales Return - ${creditNote.invoiceNumber}`,
        debitAmount: Number(creditNote.subtotal),
        creditAmount: 0,
      });
    }

    // Debit GST Payable
    if (Number(creditNote.gstAmount) > 0 && taxAccount) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: taxAccount.code,
        description: `GST Reversal - ${creditNote.invoiceNumber}`,
        debitAmount: Number(creditNote.gstAmount),
        creditAmount: 0,
      });
    }

    // Credit WHT Receivable
    if (Number(creditNote.whtAmount) > 0 && whtAccount) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: whtAccount.code,
        description: `WHT Reversal - ${creditNote.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(creditNote.whtAmount),
      });
    }

    // Credit Customer AR
    if (Number(creditNote.totalAmount) > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: creditNote.customer.receivableAccount.code,
        description: `Credit Note Adjustment - ${creditNote.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(creditNote.totalAmount),
      });
    }

    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.CREDIT_NOTE,
      voucherDate: new Date().toISOString(), // Or creditNote.issueDate?
      description: `Credit Note ${creditNote.invoiceNumber} for ${creditNote.customer.name}`,
      referenceNumber: creditNote.invoiceNumber,
      referenceType: 'CREDIT_NOTE',
      referenceId: creditNote.id,
      details: voucherDetails,
    };

    try {
      const voucher = await this.vouchersService.create(
        createVoucherDto,
        userId,
        manager,
      );
      if (voucher) {
        await this.vouchersService.postVoucher(voucher.id, userId, manager);
        this.logger.log(`Created CN Voucher ${voucher.voucherNumber}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create CN Voucher: ${error.message}`);
      throw error;
    }
  }

  async createDebitNoteVoucher(
    debitNoteId: string,
    userId: string,
    existingManager?: any,
  ): Promise<void> {
    const manager = existingManager || this.invoiceRepository.manager;
    const debitNote = await manager.findOne(Invoice, {
      where: { id: debitNoteId },
      relations: ['customer', 'customer.receivableAccount'],
    });

    if (!debitNote) throw new BadRequestException('Debit Note invalid');

    if (!debitNote.customer?.receivableAccount) {
      throw new BadRequestException(
        `Customer AR Account missing for ${debitNote.customer?.name}`,
      );
    }

    const revenueAccount = await this.getGlAccount('SERVICE_REVENUE', manager);
    let taxAccount, whtAccount;
    if (Number(debitNote.gstAmount) > 0) {
      taxAccount = await this.getGlAccount('GST_PAYABLE', manager);
    }
    if (Number(debitNote.whtAmount) > 0) {
      whtAccount = await this.getGlAccount('WHT_RECEIVABLE', manager);
    }

    const voucherDetails: VoucherLineItemDto[] = [];
    let lineNumber = 1;

    // Debit Customer AR
    if (Number(debitNote.totalAmount) > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: debitNote.customer.receivableAccount.code,
        description: `Debit Note Adjustment - ${debitNote.invoiceNumber}`,
        debitAmount: Number(debitNote.totalAmount),
        creditAmount: 0,
      });
    }

    // Debit WHT Receivable
    if (Number(debitNote.whtAmount) > 0 && whtAccount) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: whtAccount.code,
        description: `WHT Deduction - ${debitNote.invoiceNumber}`,
        debitAmount: Number(debitNote.whtAmount),
        creditAmount: 0,
      });
    }

    // Credit Revenue
    if (Number(debitNote.subtotal) > 0) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: revenueAccount.code,
        description: `Debit Note Income - ${debitNote.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(debitNote.subtotal),
      });
    }

    // Credit GST Payable
    if (Number(debitNote.gstAmount) > 0 && taxAccount) {
      voucherDetails.push({
        lineNumber: lineNumber++,
        accountCode: taxAccount.code,
        description: `GST Payable - ${debitNote.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: Number(debitNote.gstAmount),
      });
    }

    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.DEBIT_NOTE,
      voucherDate: debitNote.issueDate
        ? new Date(debitNote.issueDate).toISOString()
        : new Date().toISOString(),
      description: `Debit Note ${debitNote.invoiceNumber} for ${debitNote.customer.name}`,
      referenceNumber: debitNote.invoiceNumber,
      referenceType: 'DEBIT_NOTE',
      referenceId: debitNote.id,
      details: voucherDetails,
    };

    try {
      const voucher = await this.vouchersService.create(
        createVoucherDto,
        userId,
        manager,
      );
      if (voucher) {
        await this.vouchersService.postVoucher(voucher.id, userId, manager);
        this.logger.log(`Created DN Voucher ${voucher.voucherNumber}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create DN Voucher: ${error.message}`);
      throw error;
    }
  }

  private async getGlAccount(configKey: string, manager: any) {
    const config = await manager.findOne(GlAccountConfiguration, {
      where: { configKey, isActive: true },
      relations: ['account'],
    });
    if (!config || !config.account) {
      throw new BadRequestException(`GL Config missing for ${configKey}`);
    }
    return config.account;
  }

  private async getSalesReturnAccount(manager: any) {
    const config = await manager.findOne(GlAccountConfiguration, {
      where: { configKey: 'SALES_RETURN', isActive: true },
      relations: ['account'],
    });
    if (!config || !config.account) {
      throw new BadRequestException('GL Config missing for SALES_RETURN');
    }
    return config.account;
  }

  /**
   * Get the appropriate Cash/Bank account based on payment mode
   */
  private async getCashBankAccount(paymentMode: PaymentMode, manager: any) {
    let configKey: string;

    switch (paymentMode) {
      case PaymentMode.CASH:
        configKey = 'CASH_ACCOUNT';
        break;
      case PaymentMode.CHEQUE:
      case PaymentMode.ONLINE_TRANSFER:
        configKey = 'BANK_ACCOUNT';
        break;
      default:
        configKey = 'CASH_ACCOUNT';
    }

    const config = await manager.findOne(GlAccountConfiguration, {
      where: { configKey, isActive: true },
      relations: ['account'],
    });

    if (!config || !config.account) {
      throw new BadRequestException(
        `GL Configuration missing for key: ${configKey}. Please configure the ${configKey} in GL Account Settings.`,
      );
    }

    return config.account;
  }
}
