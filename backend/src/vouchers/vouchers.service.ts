import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { VoucherMaster, VoucherDetail } from './entities';
import { CreateVoucherDto, UpdateVoucherDto, QueryVouchersDto } from './dto';
import { VoucherType, getVoucherPrefix } from '../common/enums/voucher-type.enum';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(VoucherMaster)
    private readonly voucherMasterRepository: Repository<VoucherMaster>,
    @InjectRepository(VoucherDetail)
    private readonly voucherDetailRepository: Repository<VoucherDetail>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new voucher with validation
   */
  async create(createVoucherDto: CreateVoucherDto, userId: string) {
    // Validate voucher
    this.validateVoucher(createVoucherDto);

    // Generate voucher number
    const voucherNumber = await this.generateVoucherNumber(
      createVoucherDto.voucherType,
    );

    // Calculate total amount
    const totalAmount = createVoucherDto.details.reduce(
      (sum, detail) => sum + Number(detail.debitAmount),
      0,
    );

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Create voucher master
      const voucherMaster = manager.create(VoucherMaster, {
        voucherNumber,
        voucherType: createVoucherDto.voucherType,
        voucherDate: new Date(createVoucherDto.voucherDate),
        description: createVoucherDto.description,
        paymentMode: createVoucherDto.paymentMode,
        chequeNumber: createVoucherDto.chequeNumber,
        chequeDate: createVoucherDto.chequeDate
          ? new Date(createVoucherDto.chequeDate)
          : undefined,
        bankName: createVoucherDto.bankName,
        referenceId: createVoucherDto.referenceId,
        referenceType: createVoucherDto.referenceType,
        referenceNumber: createVoucherDto.referenceNumber,
        totalAmount,
        isPosted: false,
        createdById: userId,
      });

      const savedVoucher = await manager.save(VoucherMaster, voucherMaster);

      // Create voucher details
      const details = createVoucherDto.details.map((detail) =>
        manager.create(VoucherDetail, {
          voucherId: savedVoucher.id,
          accountCode: detail.accountCode,
          description: detail.description,
          debitAmount: Number(detail.debitAmount),
          creditAmount: Number(detail.creditAmount),
          lineNumber: detail.lineNumber,
          metadata: detail.metadata,
        }),
      );

      await manager.save(VoucherDetail, details);

      // Return complete voucher with details
      return await manager.findOne(VoucherMaster, {
        where: { id: savedVoucher.id },
        relations: ['details'],
      });
    });
  }

  /**
   * Find all vouchers with filters and pagination
   */
  async findAll(query: QueryVouchersDto) {
    const {
      voucherType,
      fromDate,
      toDate,
      isPosted,
      search,
      page = 1,
      limit = 50,
      sortBy = 'voucherDate',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.voucherMasterRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.details', 'details')
      .leftJoinAndSelect('voucher.createdBy', 'creator')
      .leftJoinAndSelect('voucher.postedBy', 'poster')
      .where('voucher.deletedAt IS NULL');

    // Apply filters
    if (voucherType) {
      queryBuilder.andWhere('voucher.voucherType = :voucherType', {
        voucherType,
      });
    }

    if (fromDate) {
      queryBuilder.andWhere('voucher.voucherDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('voucher.voucherDate <= :toDate', { toDate });
    }

    if (isPosted !== undefined) {
      queryBuilder.andWhere('voucher.isPosted = :isPosted', { isPosted });
    }

    if (search) {
      queryBuilder.andWhere(
        '(voucher.voucherNumber ILIKE :search OR voucher.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const orderDirection = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`voucher.${sortBy}`, orderDirection);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find single voucher by ID
   */
  async findOne(id: string) {
    const voucher = await this.voucherMasterRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: ['details', 'createdBy', 'updatedBy', 'postedBy'],
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    return voucher;
  }

  /**
   * Update voucher (only if not posted)
   */
  async update(
    id: string,
    updateVoucherDto: UpdateVoucherDto,
    userId: string,
  ) {
    const voucher = await this.findOne(id);

    // Cannot update posted voucher
    if (voucher.isPosted) {
      throw new BadRequestException(
        'Cannot update posted voucher. Please unpost first.',
      );
    }

    // Validate if details provided
    if (updateVoucherDto.details) {
      this.validateVoucher({
        ...updateVoucherDto,
        voucherType: voucher.voucherType,
      } as CreateVoucherDto);
    }

    return await this.dataSource.transaction(async (manager) => {
      // Update master
      const updateData: any = {
        ...updateVoucherDto,
        updatedById: userId,
      };

      // Convert date strings to Date objects
      if (updateVoucherDto.voucherDate) {
        updateData.voucherDate = new Date(updateVoucherDto.voucherDate);
      }
      if (updateVoucherDto.chequeDate) {
        updateData.chequeDate = new Date(updateVoucherDto.chequeDate);
      }

      // Remove details from update data (handle separately)
      const details = updateData.details;
      delete updateData.details;

      await manager.update(VoucherMaster, { id }, updateData);

      // Update details if provided
      if (details) {
        // Delete existing details
        await manager.delete(VoucherDetail, { voucherId: id });

        // Create new details
        const newDetails = details.map((detail: any) =>
          manager.create(VoucherDetail, {
            voucherId: id,
            accountCode: detail.accountCode,
            description: detail.description,
            debitAmount: Number(detail.debitAmount),
            creditAmount: Number(detail.creditAmount),
            lineNumber: detail.lineNumber,
            metadata: detail.metadata,
          }),
        );

        await manager.save(VoucherDetail, newDetails);

        // Update total amount
        const totalAmount = details.reduce(
          (sum: number, detail: any) => sum + Number(detail.debitAmount),
          0,
        );
        await manager.update(VoucherMaster, { id }, { totalAmount });
      }

      // Return updated voucher
      return await manager.findOne(VoucherMaster, {
        where: { id },
        relations: ['details'],
      });
    });
  }

  /**
   * Soft delete voucher (only if not posted)
   */
  async remove(id: string) {
    const voucher = await this.findOne(id);

    if (voucher.isPosted) {
      throw new BadRequestException(
        'Cannot delete posted voucher. Please unpost first.',
      );
    }

    await this.voucherMasterRepository.update(
      { id },
      { deletedAt: new Date() },
    );

    return { message: 'Voucher deleted successfully' };
  }

  /**
   * Post voucher (mark as final)
   */
  async postVoucher(id: string, userId: string) {
    const voucher = await this.findOne(id);

    if (voucher.isPosted) {
      throw new BadRequestException('Voucher is already posted');
    }

    // Re-validate before posting
    this.validateVoucherBalance(voucher.details);

    // Update voucher
    await this.voucherMasterRepository.update(
      { id },
      {
        isPosted: true,
        postedAt: new Date(),
        postedById: userId,
      },
    );

    return await this.findOne(id);
  }

  /**
   * Unpost voucher (admin only)
   */
  async unpostVoucher(id: string, userId: string) {
    const voucher = await this.findOne(id);

    if (!voucher.isPosted) {
      throw new BadRequestException('Voucher is not posted');
    }

    // Update voucher
    await this.voucherMasterRepository.update(
      { id },
      {
        isPosted: false,
        postedAt: undefined as any,
        postedById: undefined as any,
        updatedById: userId,
      },
    );

    return await this.findOne(id);
  }

  /**
   * Generate voucher number in format: {PREFIX}-{YEAR}-{SEQUENCE}
   * Example: JV-2025-0001, PV-2025-0001
   */
  async generateVoucherNumber(voucherType: VoucherType): Promise<string> {
    const prefix = getVoucherPrefix(voucherType);
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    // Find last voucher number for this type and year
    const lastVoucher = await this.voucherMasterRepository
      .createQueryBuilder('voucher')
      .where('voucher.voucherNumber LIKE :pattern', { pattern })
      .orderBy('voucher.voucherNumber', 'DESC')
      .getOne();

    let sequence = 1;

    if (lastVoucher) {
      // Extract sequence from last voucher number
      const lastNumber = lastVoucher.voucherNumber;
      const parts = lastNumber.split('-');
      const lastSequence = parseInt(parts[2], 10);
      sequence = lastSequence + 1;
    }

    // Format: PREFIX-YEAR-SEQUENCE (sequence padded to 4 digits)
    return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Validate voucher business rules
   */
  private validateVoucher(dto: CreateVoucherDto) {
    // Must have at least 2 lines (1 DR + 1 CR minimum)
    if (dto.details.length < 2) {
      throw new BadRequestException(
        'Voucher must have at least 2 line items (one debit and one credit)',
      );
    }

    // Validate each line
    for (const detail of dto.details) {
      // Must have either debit OR credit (not both, not neither)
      if (
        (detail.debitAmount > 0 && detail.creditAmount > 0) ||
        (detail.debitAmount === 0 && detail.creditAmount === 0)
      ) {
        throw new BadRequestException(
          `Line ${detail.lineNumber}: Must have either debit OR credit amount (not both, not neither)`,
        );
      }

      // Amounts must be positive
      if (detail.debitAmount < 0 || detail.creditAmount < 0) {
        throw new BadRequestException(
          `Line ${detail.lineNumber}: Amounts cannot be negative`,
        );
      }
    }

    // Validate balance
    this.validateVoucherBalance(dto.details);

    // Must have at least one debit and one credit
    const hasDebit = dto.details.some((d) => d.debitAmount > 0);
    const hasCredit = dto.details.some((d) => d.creditAmount > 0);

    if (!hasDebit || !hasCredit) {
      throw new BadRequestException(
        'Voucher must have at least one debit entry and one credit entry',
      );
    }

    // Validate voucher date (not in future, not too far back)
    const voucherDate = new Date(dto.voucherDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (voucherDate > today) {
      throw new BadRequestException('Voucher date cannot be in the future');
    }

    // Don't allow dates more than 2 years in the past
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (voucherDate < twoYearsAgo) {
      throw new BadRequestException(
        'Voucher date cannot be more than 2 years in the past',
      );
    }
  }

  /**
   * Validate that total debits = total credits
   * This is the CORE principle of double-entry bookkeeping
   */
  private validateVoucherBalance(details: any[]) {
    const totalDebits = details.reduce(
      (sum, detail) => sum + Number(detail.debitAmount),
      0,
    );

    const totalCredits = details.reduce(
      (sum, detail) => sum + Number(detail.creditAmount),
      0,
    );

    // Use fixed decimal comparison to avoid floating point issues
    const debitsFixed = totalDebits.toFixed(2);
    const creditsFixed = totalCredits.toFixed(2);

    if (debitsFixed !== creditsFixed) {
      throw new BadRequestException(
        `Voucher is not balanced. Total Debits: ${debitsFixed}, Total Credits: ${creditsFixed}, Difference: ${(totalDebits - totalCredits).toFixed(2)}`,
      );
    }
  }

  /**
   * Get next voucher number (for preview/UI)
   */
  async getNextVoucherNumber(voucherType: VoucherType): Promise<string> {
    return await this.generateVoucherNumber(voucherType);
  }
}
