import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ApBill,
  ApBillLine,
  ApPayment,
  ApPaymentApplication,
} from '../entities';
import { CreateBillDto } from '../dto/create-bill.dto';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { ApBillStatus } from '../enums/ap-bill-status.enum';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherMaster } from '../../vouchers/entities/voucher-master.entity';
import { VoucherDetail } from '../../vouchers/entities/voucher-detail.entity';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { ApPaymentMethod } from '../enums/ap-payment-method.enum';

@Injectable()
export class PayablesService {
  private readonly logger = new Logger(PayablesService.name);

  // Hardcoded AP Control Account Code (from Seed)
  private readonly AP_ACCOUNT_CODE = '2-0001-0001-0001';

  constructor(
    @InjectRepository(ApBill)
    private readonly billRepository: Repository<ApBill>,
    @InjectRepository(ApBillLine)
    private readonly billLineRepository: Repository<ApBillLine>,
    @InjectRepository(ApPayment)
    private readonly paymentRepository: Repository<ApPayment>,
    private readonly dataSource: DataSource,
  ) {}

  async createBill(dto: CreateBillDto, userId: string): Promise<ApBill> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Validate Vendor & AP Account
      // Ensure AP Account exists
      const apAccount = await queryRunner.manager.findOne(Account, {
        where: { code: this.AP_ACCOUNT_CODE },
      });
      if (!apAccount)
        throw new BadRequestException(
          `AP Control Account ${this.AP_ACCOUNT_CODE} not found`,
        );

      // 1. Create Bill Header
      const bill = queryRunner.manager.create(ApBill, {
        vendorId: dto.vendorId,
        billNumber: dto.billNumber,
        vendorInvoiceNumber: dto.vendorInvoiceNumber,
        billDate: dto.billDate,
        dueDate: dto.dueDate,
        notes: dto.notes,
        status: ApBillStatus.POSTED, // Auto-post for now
        createdBy: userId,
      });

      // 2. Create Lines & Calculate Totals
      let totalAmount = 0;
      bill.lines = dto.lines.map((lineDto) => {
        const line = queryRunner.manager.create(ApBillLine, {
          expenseAccountId: lineDto.expenseAccountId,
          description: lineDto.description,
          amount: lineDto.amount,
          taxAmount: lineDto.taxAmount || 0,
          costCenterId: lineDto.costCenterId,
        });
        totalAmount += Number(line.amount) + Number(line.taxAmount || 0);
        return line;
      });

      bill.totalAmount = totalAmount;
      bill.balanceDue = totalAmount;
      bill.amountPaid = 0;

      const savedBill = await queryRunner.manager.save(ApBill, bill);

      // 3. Create GL Voucher (Debit Expense, Credit AP Payable)
      const voucher = await this.createBillVoucher(
        queryRunner,
        savedBill,
        userId,
        apAccount,
      );

      // Update bill with voucher ID
      savedBill.glVoucherId = voucher.id;
      await queryRunner.manager.save(ApBill, savedBill);

      await queryRunner.commitTransaction();
      return savedBill;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create bill', err.stack);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async recordPayment(
    dto: RecordPaymentDto,
    userId: string,
  ): Promise<ApPayment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Payment
      const payment = queryRunner.manager.create(ApPayment, {
        vendorId: dto.vendorId,
        paymentNumber: `PAY-${Date.now()}`, // Simple generation
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        amount: dto.amount,
        notes: dto.notes,
        bankAccountId: dto.bankAccountId,
        createdBy: userId,
      });

      const savedPayment = await queryRunner.manager.save(ApPayment, payment);

      // 2. Apply to bills (if specified OR FIFO auto-apply could be implemented)
      // For now, simpler: user must specify bills via applications,
      // OR if not specified, it's just an unallocated payment (On Account).
      // Let's implement Application Logic if provided.
      if (dto.applications && dto.applications.length > 0) {
        let totalApplied = 0;
        for (const appDto of dto.applications) {
          const bill = await queryRunner.manager.findOne(ApBill, {
            where: { id: appDto.billId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!bill)
            throw new NotFoundException(`Bill ${appDto.billId} not found`);

          if (bill.balanceDue < appDto.amountApplied) {
            throw new BadRequestException(
              `Amount applied exceeds balance due for bill ${bill.billNumber}`,
            );
          }

          const application = queryRunner.manager.create(ApPaymentApplication, {
            paymentId: savedPayment.id,
            billId: bill.id,
            amountApplied: appDto.amountApplied,
          });
          await queryRunner.manager.save(ApPaymentApplication, application);

          // Update Bill Balance
          bill.amountPaid =
            Number(bill.amountPaid) + Number(appDto.amountApplied);
          bill.balanceDue =
            Number(bill.balanceDue) - Number(appDto.amountApplied);

          if (bill.balanceDue <= 0.01) {
            // Floating point tolerance
            bill.status = ApBillStatus.PAID;
            bill.balanceDue = 0;
          } else {
            bill.status = ApBillStatus.PARTIALLY_PAID;
          }

          await queryRunner.manager.save(ApBill, bill);
          totalApplied += Number(appDto.amountApplied);
        }

        if (totalApplied > dto.amount) {
          throw new BadRequestException(
            'Total applied amount exceeds payment amount',
          );
        }
      }

      // 3. Create GL Voucher (Debit AP Control, Credit Bank)
      await this.createPaymentVoucher(queryRunner, savedPayment, userId);

      await queryRunner.commitTransaction();
      return savedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to record payment', err.stack);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllBills() {
    return this.billRepository.find({
      relations: ['lines', 'lines.expenseAccount', 'glVoucher'],
    });
  }

  async findBillOne(id: string) {
    return this.billRepository.findOne({
      where: { id },
      relations: ['lines', 'lines.expenseAccount', 'glVoucher'],
    });
  }

  // --- GL Helpers ---

  private async createBillVoucher(
    queryRunner: any,
    bill: ApBill,
    userId: string,
    apAccount: Account,
  ): Promise<VoucherMaster> {
    // 1. Find Open Fiscal Period
    const period = await queryRunner.manager.findOne(FiscalPeriod, {
      where: { isClosed: false }, // Should verify date range
      order: { endDate: 'DESC' },
    });
    // For simplicity, using the first open period or assuming logic. Ideally, verify billDate falls in period.

    const voucherNumber = `PI-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 10000,
    )
      .toString()
      .padStart(4, '0')}`; // TODO: Use sequence generator

    const voucher = queryRunner.manager.create(VoucherMaster, {
      voucherNumber,
      voucherType: VoucherType.PURCHASE,
      voucherDate: bill.billDate,
      fiscalPeriodId: period?.id,
      description: `Supplier Bill #${bill.billNumber}`,
      referenceType: 'AP_BILL',
      referenceId: bill.id,
      referenceNumber: bill.billNumber,
      totalAmount: bill.totalAmount,
      isPosted: true,
      postedAt: new Date(),
      postedById: userId,
      createdById: userId,
    });

    const savedVoucher = await queryRunner.manager.save(VoucherMaster, voucher);

    // Details:
    // 1. Credit AP Control (Liability)
    const crDetail = queryRunner.manager.create(VoucherDetail, {
      voucherId: savedVoucher.id,
      accountCode: apAccount.code,
      description: `Payable for Bill #${bill.billNumber}`,
      debitAmount: 0,
      creditAmount: bill.totalAmount,
      lineNumber: 1,
    });
    await queryRunner.manager.save(VoucherDetail, crDetail);

    // 2. Debit Expense Accounts (from lines)
    let lineNum = 2;
    for (const line of bill.lines) {
      let accountCode = line.expenseAccount?.code;
      if (!accountCode) {
        const acc = await queryRunner.manager.findOne(Account, {
          where: { id: line.expenseAccountId },
        });
        if (!acc)
          throw new BadRequestException(
            `Expense account ${line.expenseAccountId} not found`,
          );
        accountCode = acc.code;
      }

      const drDetail = queryRunner.manager.create(VoucherDetail, {
        voucherId: savedVoucher.id,
        accountCode: accountCode,
        description: line.description,
        debitAmount: Number(line.amount) + Number(line.taxAmount || 0),
        creditAmount: 0,
        lineNumber: lineNum++,
      });

      await queryRunner.manager.save(VoucherDetail, drDetail);
    }

    return savedVoucher;
  }

  private async createPaymentVoucher(
    queryRunner: any,
    payment: ApPayment,
    userId: string,
  ): Promise<VoucherMaster> {
    const voucherNumber = `PV-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 10000,
    )
      .toString()
      .padStart(4, '0')}`;

    // Debit AP Control, Credit Bank
    const apAccount = await queryRunner.manager.findOne(Account, {
      where: { code: this.AP_ACCOUNT_CODE },
    });

    let bankAccountCode = '1-0001-0001-0001'; // Default Cash
    if (payment.bankAccountId) {
      const acc = await queryRunner.manager.findOne(Account, {
        where: { id: payment.bankAccountId },
      });
      if (acc) bankAccountCode = acc.code;
    } else if (payment.paymentMethod !== ApPaymentMethod.CASH) {
      // Fallback or error
    }

    const voucher = queryRunner.manager.create(VoucherMaster, {
      voucherNumber,
      voucherType: VoucherType.PAYMENT,
      voucherDate: payment.paymentDate,
      description: `Payment to Supplier`,
      referenceType: 'AP_PAYMENT',
      referenceId: payment.id,
      referenceNumber: payment.referenceNumber,
      totalAmount: payment.amount,
      isPosted: true,
      postedAt: new Date(),
      postedById: userId,
      createdById: userId,
    });

    const savedVoucher = await queryRunner.manager.save(VoucherMaster, voucher);

    // Debit AP (Decrease Liability)
    const drDetail = queryRunner.manager.create(VoucherDetail, {
      voucherId: savedVoucher.id,
      accountCode: apAccount.code,
      description: `Payment for Vendor`,
      debitAmount: payment.amount,
      creditAmount: 0,
      lineNumber: 1,
    });

    // Credit Bank (Decrease Asset)
    const crDetail = queryRunner.manager.create(VoucherDetail, {
      voucherId: savedVoucher.id,
      accountCode: bankAccountCode,
      description: `Payment Out`,
      debitAmount: 0,
      creditAmount: payment.amount,
      lineNumber: 2,
    });

    await queryRunner.manager.save(VoucherDetail, [drDetail, crDetail]);
    return savedVoucher;
  }
}
