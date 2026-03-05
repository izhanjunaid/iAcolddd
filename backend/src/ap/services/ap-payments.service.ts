import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApPayment } from '../entities/ap-payment.entity';
import { ApPaymentApplication } from '../entities/ap-payment-application.entity';
import { ApBill } from '../entities/ap-bill.entity';
import { CreateApPaymentDto } from '../dto/create-ap-payment.dto';
import { ApplyPaymentDto } from '../dto/apply-payment.dto';
import { ApBillStatus } from '../enums/ap-bill-status.enum';
import { SequencesService } from '../../sequences/sequences.service';
import { VendorsService } from '../../vendors/vendors.service';
import { VouchersService } from '../../vouchers/vouchers.service';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';

@Injectable()
export class ApPaymentsService {
  constructor(
    @InjectRepository(ApPayment)
    private readonly apPaymentsRepository: Repository<ApPayment>,
    @InjectRepository(ApPaymentApplication)
    private readonly apApplicationsRepository: Repository<ApPaymentApplication>,
    @InjectRepository(ApBill)
    private readonly apBillsRepository: Repository<ApBill>,
    private readonly sequencesService: SequencesService,
    private readonly vendorsService: VendorsService,
    private readonly vouchersService: VouchersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Record a payment associated with a Vendor.
   * Creates a GL Voucher: Dr Vendor Payable, Cr Bank/Cash.
   */
  async create(createDto: CreateApPaymentDto, userId: string) {
    const vendor = await this.vendorsService.findOne(createDto.vendorId);
    if (!vendor.payableAccountId) {
      throw new BadRequestException(
        `Vendor ${vendor.name} has no Payable Account configured`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Generate Payment Number
      const paymentNumber = await this.sequencesService.generateSequenceNumber(
        'PAY',
        6,
      );

      // 2. Create Payment Record
      const payment = this.apPaymentsRepository.create({
        ...createDto,
        paymentNumber,
        createdById: userId,
      });

      const savedPayment = await manager.save(payment);

      // 3. Create GL Voucher (Payment)
      const voucherDetails: VoucherLineItemDto[] = [
        {
          // Debit: Vendor Payable (Liability decreases)
          accountCode: vendor.payableAccount.code,
          description: `Payment to ${vendor.name}`,
          debitAmount: Number(createDto.amount),
          creditAmount: 0,
          lineNumber: 1,
        },
        {
          // Credit: Bank/Cash (Asset decreases)
          // We need the bank account code.
          accountCode: (
            await manager.query(`SELECT code FROM accounts WHERE id = $1`, [
              createDto.bankAccountId,
            ])
          )[0].code,
          description: `Payment ${paymentNumber}`,
          debitAmount: 0,
          creditAmount: Number(createDto.amount),
          lineNumber: 2,
        },
      ];

      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.PAYMENT,
        voucherDate: createDto.paymentDate,
        description: `Payment ${paymentNumber} to ${vendor.name}`,
        referenceType: 'AP_PAYMENT',
        referenceId: savedPayment.id,
        referenceNumber: paymentNumber,
        details: voucherDetails,
      };

      const voucher = await this.vouchersService.create(
        voucherDto,
        userId,
        manager,
      );
      if (!voucher) throw new Error('Failed to create GL Voucher');

      const postedVoucher = await this.vouchersService.postVoucher(
        voucher.id,
        userId,
        manager,
      );

      // 4. Update Payment with Voucher Link
      savedPayment.glVoucher = postedVoucher;
      savedPayment.glVoucherId = postedVoucher.id;

      return await manager.save(savedPayment);
    });
  }

  /**
   * Apply a payment to a specific Bill.
   * Reduces Bill balance and updates status.
   */
  async applyPayment(
    paymentId: string,
    applyDto: ApplyPaymentDto,
    userId: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const payment = await this.apPaymentsRepository.findOne({
        where: { id: paymentId },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      const bill = await this.apBillsRepository.findOne({
        where: { id: applyDto.billId },
      });
      if (!bill) throw new NotFoundException('Bill not found');

      if (bill.vendorId !== payment.vendorId) {
        throw new BadRequestException(
          'Payment and Bill must belong to the same Vendor',
        );
      }

      if (Number(bill.balanceDue) < Number(applyDto.amountToApply)) {
        throw new BadRequestException(
          `Amount to apply (${applyDto.amountToApply}) exceeds Bill balance (${bill.balanceDue})`,
        );
      }

      // Check if payment has enough unapplied amount?
      // For MVP, we presume user checks. But we should calculate 'Unapplied Amount' of payment.
      // const appliedTotal = ... sum of existing applications ...
      // For now, assuming infinite application or user managed.
      // ideally: calculate `payment.amount - sum(applications)`

      // Create Application
      const application = this.apApplicationsRepository.create({
        paymentId,
        billId: bill.id,
        amountApplied: applyDto.amountToApply,
      });
      await manager.save(application);

      // Update Bill
      bill.amountPaid =
        Number(bill.amountPaid) + Number(applyDto.amountToApply);
      bill.balanceDue = Number(bill.totalAmount) - Number(bill.amountPaid);

      if (Number(bill.balanceDue) <= 0) {
        bill.status = ApBillStatus.PAID;
        bill.balanceDue = 0; // Floating point safety
      } else {
        bill.status = ApBillStatus.PARTIALLY_PAID;
      }

      return await manager.save(bill);
    });
  }

  async findAll() {
    return await this.apPaymentsRepository.find({
      relations: ['vendor', 'bankAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    return await this.apPaymentsRepository.findOne({
      where: { id },
      relations: ['vendor', 'bankAccount', 'glVoucher'],
    });
  }
}
