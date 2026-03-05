import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  Like,
  DataSource,
} from 'typeorm';
import {
  Invoice,
  InvoiceStatus,
  InvoiceType,
} from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { CreateInvoiceFromBillingDto } from '../dto/create-invoice-from-billing.dto';
import { QueryInvoicesDto } from '../dto/query-invoices.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { StorageBillingService } from '../../billing/services/storage-billing.service';
import { CustomersService } from '../../customers/customers.service';
import { InvoiceGLService } from './invoice-gl.service';
import { PaymentGLService } from './payment-gl.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { PaymentMode } from '../../common/enums/payment-mode.enum';
import { CreateCreditNoteDto } from '../dto/create-credit-note.dto';
import { CreateDebitNoteDto } from '../dto/create-debit-note.dto';
import { SequencesService } from '../../sequences/sequences.service';
import {
  ApprovalsService,
  ApprovalHandler,
} from '../../approvals/approvals.service';
import {
  ApprovalAction,
  ApprovalEntityType,
} from '../../approvals/entities/approval-request.entity';
import { AddMiscChargeDto } from '../dto/add-misc-charge.dto';

@Injectable()
export class InvoicesService implements ApprovalHandler {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly billingService: StorageBillingService,
    private readonly customersService: CustomersService,
    private readonly invoiceGLService: InvoiceGLService,
    private readonly paymentGLService: PaymentGLService,
    private readonly sequencesService: SequencesService,
    private readonly approvalsService: ApprovalsService,
    private readonly dataSource: DataSource,
  ) {
    this.approvalsService.registerHandler(ApprovalEntityType.INVOICE, this);
  }

  /**
   * Generate next invoice number
   * Format: PRE-YYYY-NNNN (e.g., INV-2025-0001, CN-2025-0001)
   */
  async generateInvoiceNumber(typePrefix: string = 'INV'): Promise<string> {
    const invoiceNumber =
      await this.sequencesService.generateSequenceNumber(typePrefix);
    this.logger.log(`Generated number: ${invoiceNumber}`);
    return invoiceNumber;
  }

  /**
   * Create invoice from billing calculation
   */
  async createInvoiceFromBilling(
    dto: CreateInvoiceFromBillingDto,
    createdBy?: string,
  ): Promise<Invoice> {
    this.logger.log(`Creating invoice for customer ${dto.customerId}`);

    // Verify customer exists
    const customer = await this.customersService.findOne(dto.customerId);
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    // Workflow Rule: STORAGE invoices must be linked to an APPROVED Outward Gate Pass
    if (!dto.referenceNumber || !dto.referenceNumber.startsWith('GPO')) {
      throw new BadRequestException(
        'STORAGE invoices must reference a valid Outward Gate Pass (GPO) in the referenceNumber field',
      );
    }

    const gatePasses = await this.dataSource.query(
      `SELECT id, status FROM "outward_gate_passes" WHERE "gate_pass_number" = $1`,
      [dto.referenceNumber],
    );

    if (!gatePasses || gatePasses.length === 0) {
      throw new NotFoundException(
        `Outward Gate Pass ${dto.referenceNumber} not found for billing reference`,
      );
    }

    if (gatePasses[0].status !== 'APPROVED') {
      throw new BadRequestException(
        `Outward Gate Pass ${dto.referenceNumber} must be APPROVED to generate an invoice. Current status: ${gatePasses[0].status}`,
      );
    }

    // Calculate billing
    const billingResult = await this.billingService.calculateStorageBilling(
      dto.billingData,
    );

    // Enforce Credit Limit
    if (customer.creditLimit && Number(customer.creditLimit) > 0) {
      const balanceData = await this.customersService.getBalance(customer.id);

      let currentDebt = 0;
      if (balanceData.balanceType === 'DR') {
        currentDebt = Number(balanceData.balance);
      } else if (balanceData.balanceType === 'CR') {
        currentDebt = -Number(balanceData.balance); // Customer has excess credit
      }

      const newDebt = currentDebt + Number(billingResult.totalAmount);

      if (newDebt > Number(customer.creditLimit)) {
        throw new BadRequestException(
          `Invoice creation would exceed credit limit of ${customer.creditLimit} for ${customer.name}. Current balance: ${balanceData.balance} ${balanceData.balanceType}, New invoice: ${billingResult.totalAmount}`,
        );
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Set dates
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const paymentTermsDays = dto.paymentTermsDays || 30;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      invoiceType: InvoiceType.STORAGE,
      status: dto.autoSend ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
      customerId: dto.customerId,
      issueDate,
      dueDate,

      // Storage details
      weight: billingResult.weight,
      daysStored: billingResult.daysStored,
      ratePerKgPerDay: billingResult.ratePerKgPerDay,
      storageDateIn: dto.billingData.dateIn
        ? new Date(dto.billingData.dateIn)
        : null,
      storageDateOut: dto.billingData.dateOut
        ? new Date(dto.billingData.dateOut)
        : null,

      // Financial amounts
      storageCharges: billingResult.storageCharges,
      labourCharges: billingResult.labourCharges,
      loadingCharges: billingResult.loadingCharges,
      subtotal: billingResult.subtotal,
      gstAmount: billingResult.gstAmount || 0,
      gstRate: billingResult.gstRate || 0,
      whtAmount: billingResult.whtAmount || 0,
      whtRate: billingResult.whtRate || 0,
      totalAmount: billingResult.totalAmount,

      // Payment tracking
      amountPaid: 0,
      balanceDue: billingResult.totalAmount,

      // Additional info
      paymentTermsDays,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      breakdown: billingResult.breakdown,

      // Audit
      createdBy,
    });

    // Create line items for transparency
    const lineItems: InvoiceLineItem[] = [];

    // Storage charges line
    if (billingResult.storageCharges > 0) {
      lineItems.push(
        this.lineItemRepository.create({
          lineNumber: 1,
          description: `Storage Charges (${billingResult.weight} kg × PKR ${billingResult.ratePerKgPerDay}/kg/day × ${billingResult.daysStored} days)`,
          quantity: billingResult.weight,
          unitPrice: billingResult.ratePerKgPerDay * billingResult.daysStored,
          lineTotal: billingResult.storageCharges,
          taxRate: 0,
          taxAmount: 0,
        }),
      );
    }

    // Labour charges line
    if (billingResult.labourCharges > 0) {
      lineItems.push(
        this.lineItemRepository.create({
          lineNumber: 2,
          description: 'Labour Charges (Loading & Unloading)',
          quantity: 1,
          unitPrice: billingResult.labourCharges,
          lineTotal: billingResult.labourCharges,
          taxRate: 0,
          taxAmount: 0,
        }),
      );
    }

    // Loading charges line
    if (billingResult.loadingCharges > 0) {
      lineItems.push(
        this.lineItemRepository.create({
          lineNumber: 3,
          description: 'Loading & Handling Charges',
          quantity: 1,
          unitPrice: billingResult.loadingCharges,
          lineTotal: billingResult.loadingCharges,
          taxRate: 0,
          taxAmount: 0,
        }),
      );
    }

    // GST line
    if (billingResult.gstAmount && billingResult.gstAmount > 0) {
      lineItems.push(
        this.lineItemRepository.create({
          lineNumber: lineItems.length + 1,
          description: `GST @ ${billingResult.gstRate}%`,
          quantity: 1,
          unitPrice: billingResult.gstAmount,
          lineTotal: billingResult.gstAmount,
          taxRate: billingResult.gstRate,
          taxAmount: billingResult.gstAmount,
        }),
      );
    }

    // WHT line (as deduction)
    if (billingResult.whtAmount && billingResult.whtAmount > 0) {
      lineItems.push(
        this.lineItemRepository.create({
          lineNumber: lineItems.length + 1,
          description: `WHT @ ${billingResult.whtRate}% (Deducted)`,
          quantity: 1,
          unitPrice: -billingResult.whtAmount, // Negative for deduction
          lineTotal: -billingResult.whtAmount,
          taxRate: billingResult.whtRate,
          taxAmount: -billingResult.whtAmount,
        }),
      );
    }

    invoice.lineItems = lineItems;

    // Save invoice with line items (cascade)
    const savedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(
      `Invoice created: ${invoiceNumber}, Total: PKR ${billingResult.totalAmount.toLocaleString()}`,
    );

    return this.findOne(savedInvoice.id);
  }

  /**
   * Create a Credit Note linked to an invoice
   */
  async createCreditNote(
    dto: CreateCreditNoteDto,
    userId: string,
  ): Promise<Invoice> {
    const originalInvoice = await this.findOne(dto.invoiceId!);

    if (originalInvoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot create Credit Note for Cancelled Invoice',
      );
    }

    // Check if amount exceeds balance - Removed strict check to allow Credit Balance
    // if (dto.amount > originalInvoice.balanceDue) { ... }

    // Apportion amounts based on ratio of CN amount to original invoice total
    const ratio = dto.amount / Number(originalInvoice.totalAmount);
    const subtotalAdj = Number(originalInvoice.subtotal) * ratio;
    const gstAdj = Number(originalInvoice.gstAmount || 0) * ratio;
    const whtAdj = Number(originalInvoice.whtAmount || 0) * ratio;

    const cnNumber = await this.generateInvoiceNumber('CN');

    // Create Credit Note Invoice Entity
    const cn = this.invoiceRepository.create({
      invoiceNumber: cnNumber,
      invoiceType: InvoiceType.CREDIT_NOTE,
      status: InvoiceStatus.PAID, // Recognized immediately
      customer: originalInvoice.customer,
      customerId: originalInvoice.customerId,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
      dueDate: new Date(),
      totalAmount: dto.amount,
      subtotal: subtotalAdj,
      gstAmount: gstAdj,
      whtAmount: whtAdj,
      balanceDue: 0,
      amountPaid: dto.amount, // Fully applied
      referenceInvoice: originalInvoice,
      notes: dto.reason,
      createdBy: userId, // Assuming user ID string is OK for createdBy column
      updatedBy: userId,
    });

    // Line Item
    const lineItem = this.lineItemRepository.create({
      lineNumber: 1,
      description: dto.reason || 'Credit Adjustment',
      quantity: 1,
      unitPrice: dto.amount,
      lineTotal: dto.amount,
      taxRate: 0,
      taxAmount: 0,
    });
    cn.lineItems = [lineItem];

    const savedCN = await this.invoiceRepository.save(cn);

    // Create GL Voucher
    try {
      await this.paymentGLService.createCreditNoteVoucher(savedCN.id, userId);
    } catch (glError) {
      this.logger.error(
        `Failed to create GL Voucher for CN ${savedCN.invoiceNumber}: ${glError.message}`,
      );
      // Should we rollback? Or just log?
      // For robustness, validation should have caught config errors. We proceed but warn.
    }

    // Update Original Invoice
    originalInvoice.creditsApplied =
      Number(originalInvoice.creditsApplied || 0) + Number(dto.amount);
    originalInvoice.balanceDue =
      Number(originalInvoice.totalAmount) -
      Number(originalInvoice.amountPaid) -
      originalInvoice.creditsApplied;

    // Rounding safety
    if (originalInvoice.balanceDue < 0.01 && originalInvoice.balanceDue > -0.01)
      originalInvoice.balanceDue = 0;

    if (originalInvoice.balanceDue <= 0) {
      originalInvoice.status = InvoiceStatus.PAID;
      // Do not set paidDate if settled by credit? Or set it?
      // If fully settled, maybe paidDate = now.
      if (!originalInvoice.paidDate) originalInvoice.paidDate = new Date();
    } else {
      originalInvoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    await this.invoiceRepository.save(originalInvoice);
    this.logger.log(
      `Processed Credit Note ${cnNumber} for Invoice ${originalInvoice.invoiceNumber}`,
    );

    return savedCN;
  }

  /**
   * Create a Debit Note linked to an invoice
   */
  async createDebitNote(
    dto: CreateDebitNoteDto,
    userId: string,
  ): Promise<Invoice> {
    const originalInvoice = await this.findOne(dto.invoiceId!);

    if (originalInvoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot create Debit Note for Cancelled Invoice',
      );
    }

    // Apportion amounts based on ratio of DN amount to original invoice total
    const ratio = dto.amount / Number(originalInvoice.totalAmount);
    const subtotalAdj = Number(originalInvoice.subtotal) * ratio;
    const gstAdj = Number(originalInvoice.gstAmount || 0) * ratio;
    const whtAdj = Number(originalInvoice.whtAmount || 0) * ratio;

    const dnNumber = await this.generateInvoiceNumber('DN');

    // Create Debit Note Invoice Entity
    const dn = this.invoiceRepository.create({
      invoiceNumber: dnNumber,
      invoiceType: InvoiceType.DEBIT_NOTE,
      status: InvoiceStatus.SENT,
      customer: originalInvoice.customer,
      customerId: originalInvoice.customerId,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
      dueDate: new Date(),
      totalAmount: dto.amount,
      subtotal: subtotalAdj,
      gstAmount: gstAdj,
      whtAmount: whtAdj,
      balanceDue: dto.amount,
      amountPaid: 0,
      referenceInvoice: originalInvoice,
      notes: dto.reason,
      createdBy: userId,
      updatedBy: userId,
    });

    const lineItem = this.lineItemRepository.create({
      lineNumber: 1,
      description: dto.reason || 'Debit Note Adjustment',
      quantity: 1,
      unitPrice: dto.amount,
      lineTotal: dto.amount,
      taxRate: 0,
      taxAmount: 0,
    });
    dn.lineItems = [lineItem];

    const savedDN = await this.invoiceRepository.save(dn);

    try {
      await this.paymentGLService.createDebitNoteVoucher(savedDN.id, userId);
    } catch (glError) {
      this.logger.error(
        `Failed to create GL Voucher for DN ${savedDN.invoiceNumber}: ${glError.message}`,
      );
    }

    this.logger.log(
      `Created Debit Note ${dnNumber} for Invoice ${originalInvoice.invoiceNumber}`,
    );

    return savedDN;
  }

  /**
   * Find invoice by ID with relations
   */
  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['customer', 'lineItems'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber },
      relations: ['customer', 'lineItems'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    }

    return invoice;
  }

  /**
   * Query invoices with filters
   */
  async findAll(query: QueryInvoicesDto) {
    const {
      status,
      invoiceType,
      customerId,
      fromDate,
      toDate,
      invoiceNumber,
      referenceNumber,
      overdueOnly,
      page = 1,
      limit = 20,
      sortBy = 'issueDate',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.lineItems', 'lineItems');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (invoiceType) {
      queryBuilder.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType,
      });
    }

    if (customerId) {
      queryBuilder.andWhere('invoice.customerId = :customerId', { customerId });
    }

    if (fromDate && toDate) {
      queryBuilder.andWhere('invoice.issueDate BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      });
    } else if (fromDate) {
      queryBuilder.andWhere('invoice.issueDate >= :fromDate', { fromDate });
    } else if (toDate) {
      queryBuilder.andWhere('invoice.issueDate <= :toDate', { toDate });
    }

    if (invoiceNumber) {
      queryBuilder.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', {
        invoiceNumber: `%${invoiceNumber}%`,
      });
    }

    if (referenceNumber) {
      queryBuilder.andWhere('invoice.referenceNumber LIKE :referenceNumber', {
        referenceNumber: `%${referenceNumber}%`,
      });
    }

    if (overdueOnly) {
      const today = new Date().toISOString().split('T')[0];
      queryBuilder.andWhere('invoice.dueDate < :today', { today });
      queryBuilder.andWhere('invoice.status NOT IN (:...paidStatuses)', {
        paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      });
    }

    // Sorting
    queryBuilder.orderBy(`invoice.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [invoices, total] = await queryBuilder.getManyAndCount();

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update invoice
   */
  async update(
    id: string,
    dto: UpdateInvoiceDto,
    updatedBy?: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // Update status
    if (dto.status) {
      invoice.status = dto.status;

      // If marked as paid, set paid date if not already set
      if (dto.status === InvoiceStatus.PAID && !invoice.paidDate) {
        invoice.paidDate = new Date();
      }
    }

    // Update due date
    if (dto.dueDate) {
      invoice.dueDate = new Date(dto.dueDate);
    }

    // Record payment
    if (dto.amountPaid !== undefined) {
      invoice.amountPaid = dto.amountPaid;
      invoice.balanceDue =
        Number(invoice.totalAmount) -
        Number(invoice.amountPaid) -
        Number(invoice.creditsApplied || 0);

      // Update status based on balance
      if (invoice.balanceDue <= 0) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
      } else if (
        Number(invoice.amountPaid) > 0 ||
        Number(invoice.creditsApplied) > 0
      ) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }
    }

    // Update notes
    if (dto.notes !== undefined) {
      invoice.notes = dto.notes;
    }

    invoice.updatedBy = updatedBy || null;

    await this.invoiceRepository.save(invoice);

    this.logger.log(`Invoice ${invoice.invoiceNumber} updated`);

    return this.findOne(id);
  }

  /**
   * Mark invoice as sent
   */
  /**
   * Mark invoice as sent (follows Maker-Checker)
   */
  async markAsSent(id: string, updatedBy?: string) {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Only Draft invoices can be marked as sent',
      );
    }

    // Directly execute (no Maker-Checker for invoice sending)
    const sent = await this.executeMarkAsSent(id, updatedBy);

    return {
      message: 'Invoice marked as sent and GL voucher posted',
      invoice: sent,
    };
  }


  /**
   * Implementation of ApprovalHandler interface
   */
  async executeApprovalAction(
    action: ApprovalAction,
    entityId: string,
    payload?: any,
  ): Promise<void> {
    if (action === ApprovalAction.MARK_AS_SENT) {
      const approverId = payload?.approverId;
      await this.executeMarkAsSent(entityId, approverId);
    } else if (action === ApprovalAction.ADD_CHARGE) {
      await this.executeAddCharge(entityId, payload);
    }
  }

  /**
   * EXECUTE Mark as Sent (Internal logic)
   */
  async executeMarkAsSent(id: string, updatedBy?: string): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOne(Invoice, {
        where: { id },
        relations: ['customer', 'lineItems'],
      });

      if (!invoice)
        throw new NotFoundException(`Invoice with ID ${id} not found`);

      invoice.status = InvoiceStatus.SENT;
      invoice.updatedBy = updatedBy || null;

      await manager.save(Invoice, invoice);

      // Create GL Voucher
      try {
        await this.invoiceGLService.createInvoiceVoucher(
          id,
          updatedBy || 'system',
          manager,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create GL voucher for invoice ${id}: ${error.message}`,
        );
        // We throw here to rollback the entire transaction, ensuring atomic consistency
        throw error;
      }

      return invoice;
    });
  }

  /**
   * Record payment for invoice with GL voucher creation
   */
  /**
   * Record payment for invoice with GL voucher creation
   */
  async recordPayment(dto: RecordPaymentDto, userId: string): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const {
        invoiceId,
        amount,
        paymentDate,
        paymentMode,
        chequeNumber,
        chequeDate,
        bankName,
        bankReference,
      } = dto;
      const invoice = await manager.findOne(Invoice, {
        where: { id: invoiceId },
        relations: ['customer', 'lineItems'],
      });

      if (!invoice)
        throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException(
          'Cannot record payment for cancelled invoice',
        );
      }

      if (amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      const balanceDue =
        Number(invoice.totalAmount) -
        Number(invoice.amountPaid) -
        Number(invoice.creditsApplied || 0);
      if (amount > balanceDue) {
        throw new BadRequestException(
          `Payment amount (PKR ${amount}) cannot exceed balance due (PKR ${balanceDue})`,
        );
      }

      const totalPaid = Number(invoice.amountPaid) + amount;

      // Create Receipt Voucher for the payment
      try {
        await this.paymentGLService.createPaymentVoucher(dto, userId, manager);
        this.logger.log(
          `Created Receipt Voucher for invoice ${invoice.invoiceNumber} - Amount: ${amount}`,
        );
      } catch (error) {
        this.logger.error(`Failed to create voucher: ${error.message}`);
        // Throw to rollback payment update if GL fails
        throw error;
      }

      invoice.amountPaid = totalPaid;
      invoice.balanceDue =
        Number(invoice.totalAmount) -
        Number(totalPaid) -
        Number(invoice.creditsApplied || 0);

      // Rounding safety
      if (invoice.balanceDue < 0.01 && invoice.balanceDue > -0.01)
        invoice.balanceDue = 0;

      if (invoice.balanceDue <= 0) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = paymentDate ? new Date(paymentDate) : new Date();
      } else if (
        Number(invoice.amountPaid) > 0 ||
        Number(invoice.creditsApplied) > 0
      ) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }

      invoice.updatedBy = userId;
      await manager.save(Invoice, invoice);

      return invoice;
    });
  }

  /**
   * Request adding a miscellaneous charge to an invoice (Maker-Checker)
   */
  async requestAddCharge(
    invoiceId: string,
    dto: AddMiscChargeDto,
    requestedById: string,
  ) {
    const invoice = await this.findOne(invoiceId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot add charge to cancelled invoice');
    }
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Invoice must be SENT before adding charges',
      );
    }

    const lineTotal = dto.quantity * dto.unitPrice;
    const taxAmount = dto.taxRate ? lineTotal * (dto.taxRate / 100) : 0;

    const payload = {
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      lineTotal,
      taxRate: dto.taxRate || 0,
      taxAmount,
      reason: dto.reason,
    };

    const request = await this.approvalsService.createRequest(
      ApprovalEntityType.INVOICE,
      invoiceId,
      ApprovalAction.ADD_CHARGE,
      requestedById,
      payload,
    );

    this.logger.log(
      `Misc charge requested for invoice ${invoice.invoiceNumber} — approval ID: ${request.id}`,
    );
    return { message: 'Charge submitted for approval', requestId: request.id };
  }

  /**
   * Execute adding a miscellaneous charge (called by ApprovalsService after approval)
   */
  private async executeAddCharge(
    invoiceId: string,
    payload: any,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOne(Invoice, {
        where: { id: invoiceId },
        relations: ['lineItems'],
      });

      if (!invoice)
        throw new BadRequestException(`Invoice ${invoiceId} not found`);

      // Determine next line number
      const maxLine = invoice.lineItems?.length
        ? Math.max(...invoice.lineItems.map((li) => li.lineNumber))
        : 0;

      const lineItem = manager.create(InvoiceLineItem, {
        invoiceId,
        lineNumber: maxLine + 1,
        description: `[MISC] ${payload.description}`,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        lineTotal: payload.lineTotal,
        taxRate: payload.taxRate,
        taxAmount: payload.taxAmount,
      });

      await manager.save(InvoiceLineItem, lineItem);

      // Update invoice totals
      const chargeWithTax = payload.lineTotal + (payload.taxAmount || 0);
      invoice.subtotal = Number(invoice.subtotal) + payload.lineTotal;
      invoice.gstAmount =
        Number(invoice.gstAmount || 0) + (payload.taxAmount || 0);
      invoice.totalAmount = Number(invoice.totalAmount) + chargeWithTax;
      invoice.balanceDue = Number(invoice.balanceDue || 0) + chargeWithTax;

      await manager.save(Invoice, invoice);

      this.logger.log(
        `Applied misc charge to ${invoice.invoiceNumber}: +${chargeWithTax} (line ${maxLine + 1})`,
      );
    });
  }

  /**
   * Cancel invoice
   */
  async cancel(id: string, updatedBy?: string): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel paid invoice');
    }

    return this.update(id, { status: InvoiceStatus.CANCELLED }, updatedBy);
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(customerId?: string) {
    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');

    if (customerId) {
      queryBuilder.where('invoice.customerId = :customerId', { customerId });
    }

    const [total, draft, sent, paid, overdue] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .where('invoice.status = :status', { status: InvoiceStatus.DRAFT })
        .getCount(),
      queryBuilder
        .clone()
        .where('invoice.status = :status', { status: InvoiceStatus.SENT })
        .getCount(),
      queryBuilder
        .clone()
        .where('invoice.status = :status', { status: InvoiceStatus.PAID })
        .getCount(),
      queryBuilder
        .clone()
        .where('invoice.status = :status', { status: InvoiceStatus.OVERDUE })
        .getCount(),
    ]);

    const totalAmount = await queryBuilder
      .select('SUM(invoice.totalAmount)', 'total')
      .getRawOne();

    const paidAmount = await queryBuilder
      .clone()
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .select('SUM(invoice.totalAmount)', 'total')
      .getRawOne();

    const outstandingAmount = await queryBuilder
      .clone()
      .where('invoice.status NOT IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      })
      .select('SUM(invoice.balanceDue)', 'total')
      .getRawOne();

    return {
      count: {
        total,
        draft,
        sent,
        paid,
        overdue,
      },
      amount: {
        total: parseFloat(totalAmount?.total || '0'),
        paid: parseFloat(paidAmount?.total || '0'),
        outstanding: parseFloat(outstandingAmount?.total || '0'),
      },
    };
  }
}
