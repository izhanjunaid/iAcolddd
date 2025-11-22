import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, Like } from 'typeorm';
import { Invoice, InvoiceStatus, InvoiceType } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { CreateInvoiceFromBillingDto } from '../dto/create-invoice-from-billing.dto';
import { QueryInvoicesDto } from '../dto/query-invoices.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { StorageBillingService } from '../../billing/services/storage-billing.service';
import { CustomersService } from '../../customers/customers.service';
import { InvoiceGLService } from './invoice-gl.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly billingService: StorageBillingService,
    private readonly customersService: CustomersService,
    private readonly invoiceGLService: InvoiceGLService,
  ) { }

  /**
   * Generate next invoice number
   * Format: INV-YYYY-NNNN (e.g., INV-2025-0001)
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Find the latest invoice for this year
    const latestInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (latestInvoice) {
      // Extract the number part and increment
      const currentNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
      nextNumber = currentNumber + 1;
    }

    // Pad with zeros (4 digits)
    const invoiceNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    this.logger.log(`Generated invoice number: ${invoiceNumber}`);

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
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    // Calculate billing
    const billingResult = await this.billingService.calculateStorageBilling(dto.billingData);

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
      storageDateIn: dto.billingData.dateIn ? new Date(dto.billingData.dateIn) : null,
      storageDateOut: dto.billingData.dateOut ? new Date(dto.billingData.dateOut) : null,

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

    this.logger.log(`Invoice created: ${invoiceNumber}, Total: PKR ${billingResult.totalAmount.toLocaleString()}`);

    return this.findOne(savedInvoice.id);
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
      queryBuilder.andWhere('invoice.invoiceType = :invoiceType', { invoiceType });
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
  async update(id: string, dto: UpdateInvoiceDto, updatedBy?: string): Promise<Invoice> {
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
      invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

      // Update status based on payment
      if (invoice.amountPaid >= invoice.totalAmount) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
      } else if (invoice.amountPaid > 0) {
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
  async markAsSent(id: string, updatedBy?: string): Promise<Invoice> {
    const invoice = await this.update(id, { status: InvoiceStatus.SENT }, updatedBy);

    // Create GL Voucher
    try {
      await this.invoiceGLService.createInvoiceVoucher(id, updatedBy || 'system');
    } catch (error) {
      this.logger.error(`Failed to create GL voucher for invoice ${id}: ${error.message}`);
      // We don't throw here to avoid rolling back the "Sent" status, but we should alert or handle it.
      // Ideally, this should be transactional.
    }

    return invoice;
  }

  /**
   * Record payment for invoice
   */
  async recordPayment(id: string, amount: number, paymentDate?: string, updatedBy?: string): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot record payment for cancelled invoice');
    }

    const totalPaid = invoice.amountPaid + amount;

    return this.update(
      id,
      {
        amountPaid: totalPaid,
        paidDate: paymentDate,
      },
      updatedBy,
    );
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
      queryBuilder.clone().where('invoice.status = :status', { status: InvoiceStatus.DRAFT }).getCount(),
      queryBuilder.clone().where('invoice.status = :status', { status: InvoiceStatus.SENT }).getCount(),
      queryBuilder.clone().where('invoice.status = :status', { status: InvoiceStatus.PAID }).getCount(),
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
      .where('invoice.status NOT IN (:...statuses)', { statuses: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] })
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
