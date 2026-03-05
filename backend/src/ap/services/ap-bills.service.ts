import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApBill } from '../entities/ap-bill.entity';
import { ApBillLine } from '../entities/ap-bill-line.entity';
import { CreateApBillDto } from '../dto/create-ap-bill.dto';
import { UpdateApBillDto } from '../dto/update-ap-bill.dto';
import { ApBillStatus } from '../enums/ap-bill-status.enum';
import { SequencesService } from '../../sequences/sequences.service';
import { VendorsService } from '../../vendors/vendors.service';
import { VouchersService } from '../../vouchers/vouchers.service';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../../common/enums/voucher-type.enum';

@Injectable()
export class ApBillsService {
  constructor(
    @InjectRepository(ApBill)
    private readonly apBillsRepository: Repository<ApBill>,
    @InjectRepository(ApBillLine)
    private readonly apBillLinesRepository: Repository<ApBillLine>,
    private readonly sequencesService: SequencesService,
    private readonly vendorsService: VendorsService,
    private readonly vouchersService: VouchersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateApBillDto, userId: string) {
    const vendor = await this.vendorsService.findOne(createDto.vendorId);

    // Generate Bill Number
    const billNumber = await this.sequencesService.generateSequenceNumber(
      'BILL',
      6,
    );

    // Calculate totals
    const totalAmount = createDto.lines.reduce(
      (sum, line) => sum + line.amount + (line.taxAmount || 0),
      0,
    );

    const bill = this.apBillsRepository.create({
      ...createDto,
      billNumber,
      totalAmount,
      balanceDue: totalAmount,
      amountPaid: 0,
      status: ApBillStatus.DRAFT,
      createdById: userId,
      lines: createDto.lines.map((line) =>
        this.apBillLinesRepository.create(line),
      ),
    });

    return await this.apBillsRepository.save(bill);
  }

  async findAll() {
    return await this.apBillsRepository.find({
      relations: ['vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const bill = await this.apBillsRepository.findOne({
      where: { id },
      relations: ['vendor', 'lines', 'lines.expenseAccount', 'glVoucher'],
    });
    if (!bill) throw new NotFoundException(`AP Bill ${id} not found`);
    return bill;
  }

  async update(id: string, updateDto: UpdateApBillDto, userId: string) {
    const bill = await this.findOne(id);
    if (bill.status !== ApBillStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot update a bill that is not in DRAFT status',
      );
    }

    // Full replacement of lines if provided (simplistic approach for MVP)
    if (updateDto.lines) {
      await this.apBillLinesRepository.delete({ billId: id });
      bill.lines = updateDto.lines.map((line) =>
        this.apBillLinesRepository.create(line),
      );
    }

    const updated = this.apBillsRepository.merge(bill, {
      ...updateDto,
      // Recalculate if lines changed ( omitted for brevity in this snippet, ideally would re-sum)
    });

    // Re-calc total if lines updated
    if (updateDto.lines) {
      updated.totalAmount = updated.lines.reduce(
        (sum, line) => sum + Number(line.amount) + Number(line.taxAmount || 0),
        0,
      );
      updated.balanceDue = updated.totalAmount; // Reset balance on edit
    }

    return await this.apBillsRepository.save(updated);
  }

  /**
   * Post Bill -> Creates GL Voucher
   */
  async postBill(id: string, userId: string) {
    const bill = await this.findOne(id);
    if (bill.status !== ApBillStatus.DRAFT) {
      throw new BadRequestException('Bill is already posted or voided');
    }

    if (!bill.vendor.payableAccountId) {
      throw new BadRequestException(
        `Vendor ${bill.vendor.name} does not have a Payable GL Account configured`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Create Voucher DTO
      const voucherDetails: VoucherLineItemDto[] = [];
      let lineRef = 1;

      // Debits (Expenses)
      for (const line of bill.lines) {
        voucherDetails.push({
          accountCode: line.expenseAccount.code, // Assuming we loaded relations
          description: line.description || `Bill ${bill.billNumber} Expense`,
          debitAmount: Number(line.amount) + Number(line.taxAmount || 0),
          creditAmount: 0,
          lineNumber: lineRef++,
          metadata: { billLineId: line.id },
        });
      }

      // Credit (Payable Liability)
      // We need the Account CODE for the vendor's payable account.
      // The relation loaded 'vendor', assuming we can get the account code.
      // Wait, 'vendor' entity in previous steps loaded 'payableAccount' relation?
      // Let's check VendorsService.findOne or just fetch it here.

      // We assume vendor was loaded. We need to load its account to get the code.
      // Optimization: In findOne, we should include 'vendor.payableAccount'.
      // Or fetch it now.
      const vendorWithAccount = await this.vendorsService.findOne(
        bill.vendorId,
      );
      if (!vendorWithAccount.payableAccount) {
        throw new BadRequestException(
          `Vendor ${bill.vendor.name} missing Payable Account relation`,
        );
      }

      voucherDetails.push({
        accountCode: vendorWithAccount.payableAccount.code,
        description: `Bill ${bill.billNumber} Payable`,
        debitAmount: 0,
        creditAmount: Number(bill.totalAmount),
        lineNumber: lineRef++,
      });

      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.PURCHASE,
        voucherDate: bill.billDate as unknown as string,
        description: `AP Bill ${bill.billNumber} - ${bill.vendor.name}`,
        referenceNumber: bill.vendorInvoiceNumber,
        referenceType: 'AP_BILL',
        referenceId: bill.id,
        details: voucherDetails,
      };

      // 2. Create and Post Voucher (ATOMIC — passing manager for transaction safety)
      const voucher = await this.vouchersService.create(
        voucherDto,
        userId,
        manager,
      );
      if (!voucher) {
        throw new Error('Failed to create GL Voucher');
      }

      const postedVoucher = await this.vouchersService.postVoucher(
        voucher.id,
        userId,
        manager,
      );

      // 3. Update Bill
      bill.status = ApBillStatus.POSTED;
      bill.glVoucher = postedVoucher;
      bill.glVoucherId = postedVoucher.id;

      return await manager.save(bill);
    });
  }
}
