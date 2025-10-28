import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYear, FiscalPeriod } from './entities';
import {
  CreateFiscalYearDto,
  CloseFiscalPeriodDto,
  QueryFiscalPeriodsDto,
} from './dto';

@Injectable()
export class FiscalPeriodsService {
  constructor(
    @InjectRepository(FiscalYear)
    private readonly fiscalYearRepository: Repository<FiscalYear>,
    @InjectRepository(FiscalPeriod)
    private readonly fiscalPeriodRepository: Repository<FiscalPeriod>,
  ) {}

  /**
   * Create a new fiscal year with 12 monthly periods
   * Fiscal year runs from July 1 to June 30
   */
  async createFiscalYear(
    createDto: CreateFiscalYearDto,
    userId: string,
  ): Promise<FiscalYear> {
    // Check if year already exists
    const existing = await this.fiscalYearRepository.findOne({
      where: { year: createDto.year },
    });

    if (existing) {
      throw new ConflictException(
        `Fiscal year ${createDto.year} already exists`,
      );
    }

    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Validate July 1 - June 30
    if (startDate.getMonth() !== 6 || startDate.getDate() !== 1) {
      throw new BadRequestException('Fiscal year must start on July 1');
    }

    if (endDate.getMonth() !== 5 || endDate.getDate() !== 30) {
      throw new BadRequestException('Fiscal year must end on June 30');
    }

    // Create fiscal year
    const fiscalYear = this.fiscalYearRepository.create({
      year: createDto.year,
      startDate: startDate,
      endDate: endDate,
      isClosed: false,
    });

    await this.fiscalYearRepository.save(fiscalYear);

    // Create 12 monthly periods
    const periods = this.generateMonthlyPeriods(fiscalYear, startDate);
    await this.fiscalPeriodRepository.save(periods);

    // Return with periods
    const createdFiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: fiscalYear.id },
      relations: ['periods'],
    });

    if (!createdFiscalYear) {
      throw new Error('Failed to retrieve created fiscal year');
    }

    return createdFiscalYear;
  }

  /**
   * Generate 12 monthly periods for a fiscal year
   * July = 1, August = 2, ..., June = 12
   */
  private generateMonthlyPeriods(
    fiscalYear: FiscalYear,
    startDate: Date,
  ): FiscalPeriod[] {
    const periods: FiscalPeriod[] = [];
    const monthNames = [
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
    ];

    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(startDate.getMonth() + i);
      periodStart.setDate(1);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Last day of month

      const periodYear =
        periodStart.getMonth() >= 6 ? fiscalYear.year : fiscalYear.year + 1;

      const period = this.fiscalPeriodRepository.create({
        fiscalYearId: fiscalYear.id,
        periodNumber: i + 1,
        periodName: `${monthNames[i]} ${periodYear}`,
        startDate: periodStart,
        endDate: periodEnd,
        isClosed: false,
      });

      periods.push(period);
    }

    return periods;
  }

  /**
   * Get all fiscal years with optional filters
   */
  async findAll(query: QueryFiscalPeriodsDto): Promise<{
    data: FiscalYear[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, year, isClosed } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.fiscalYearRepository
      .createQueryBuilder('fy')
      .leftJoinAndSelect('fy.periods', 'period')
      .orderBy('fy.year', 'DESC')
      .addOrderBy('period.periodNumber', 'ASC');

    if (year !== undefined) {
      queryBuilder.andWhere('fy.year = :year', { year });
    }

    if (isClosed !== undefined) {
      queryBuilder.andWhere('fy.isClosed = :isClosed', { isClosed });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a fiscal year by ID
   */
  async findOne(id: string): Promise<FiscalYear> {
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id },
      relations: ['periods'],
    });

    if (!fiscalYear) {
      throw new NotFoundException(`Fiscal year with ID ${id} not found`);
    }

    return fiscalYear;
  }

  /**
   * Get a fiscal period by ID
   */
  async findPeriod(id: string): Promise<FiscalPeriod> {
    const period = await this.fiscalPeriodRepository.findOne({
      where: { id },
      relations: ['fiscalYear'],
    });

    if (!period) {
      throw new NotFoundException(`Fiscal period with ID ${id} not found`);
    }

    return period;
  }

  /**
   * Find the fiscal period that contains a given date
   */
  async findPeriodByDate(date: Date): Promise<FiscalPeriod | null> {
    const period = await this.fiscalPeriodRepository
      .createQueryBuilder('period')
      .where('period.startDate <= :date', { date })
      .andWhere('period.endDate >= :date', { date })
      .getOne();

    return period;
  }

  /**
   * Close a fiscal period
   * Validates that the period is not already closed and that no prior periods are open
   */
  async closePeriod(
    closeDto: CloseFiscalPeriodDto,
    userId: string,
  ): Promise<FiscalPeriod> {
    const period = await this.findPeriod(closeDto.periodId);

    if (period.isClosed) {
      throw new BadRequestException(
        `Period ${period.periodName} is already closed`,
      );
    }

    // Check that all prior periods in the same fiscal year are closed
    const priorOpenPeriods = await this.fiscalPeriodRepository
      .createQueryBuilder('period')
      .where('period.fiscalYearId = :fiscalYearId', {
        fiscalYearId: period.fiscalYearId,
      })
      .andWhere('period.periodNumber < :periodNumber', {
        periodNumber: period.periodNumber,
      })
      .andWhere('period.isClosed = FALSE')
      .getCount();

    if (priorOpenPeriods > 0) {
      throw new BadRequestException(
        'Cannot close period. Prior periods are still open.',
      );
    }

    // Close the period
    period.isClosed = true;
    period.closedById = userId;
    period.closedAt = new Date();

    await this.fiscalPeriodRepository.save(period);

    // Check if all periods are closed, then close the fiscal year
    const allPeriodsClosed = await this.fiscalPeriodRepository
      .createQueryBuilder('period')
      .where('period.fiscalYearId = :fiscalYearId', {
        fiscalYearId: period.fiscalYearId,
      })
      .andWhere('period.isClosed = FALSE')
      .getCount();

    if (allPeriodsClosed === 0) {
      const fiscalYear = await this.fiscalYearRepository.findOne({
        where: { id: period.fiscalYearId },
      });

      if (fiscalYear) {
        fiscalYear.isClosed = true;
        fiscalYear.closedById = userId;
        fiscalYear.closedAt = new Date();
        await this.fiscalYearRepository.save(fiscalYear);
      }
    }

    return await this.findPeriod(period.id);
  }

  /**
   * Reopen a fiscal period
   * For error correction purposes
   */
  async reopenPeriod(periodId: string): Promise<FiscalPeriod> {
    const period = await this.findPeriod(periodId);

    if (!period.isClosed) {
      throw new BadRequestException(
        `Period ${period.periodName} is not closed`,
      );
    }

    // Check that no subsequent periods are closed
    const subsequentClosedPeriods = await this.fiscalPeriodRepository
      .createQueryBuilder('period')
      .where('period.fiscalYearId = :fiscalYearId', {
        fiscalYearId: period.fiscalYearId,
      })
      .andWhere('period.periodNumber > :periodNumber', {
        periodNumber: period.periodNumber,
      })
      .andWhere('period.isClosed = TRUE')
      .getCount();

    if (subsequentClosedPeriods > 0) {
      throw new BadRequestException(
        'Cannot reopen period. Subsequent periods are closed.',
      );
    }

    // Reopen the period
    period.isClosed = false;
    period.closedById = null;
    period.closedAt = null;

    await this.fiscalPeriodRepository.save(period);

    // Reopen fiscal year if it was closed
    const fiscalYear = await this.fiscalYearRepository.findOne({
      where: { id: period.fiscalYearId },
    });

    if (fiscalYear && fiscalYear.isClosed) {
      fiscalYear.isClosed = false;
      fiscalYear.closedById = null;
      fiscalYear.closedAt = null;
      await this.fiscalYearRepository.save(fiscalYear);
    }

    return await this.findPeriod(period.id);
  }

  /**
   * Get current open period
   */
  async getCurrentPeriod(): Promise<FiscalPeriod | null> {
    const today = new Date();
    return await this.findPeriodByDate(today);
  }
}

