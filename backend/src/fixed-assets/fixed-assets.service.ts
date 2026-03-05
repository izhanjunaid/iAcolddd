import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { FixedAsset, DepreciationMethod, AssetStatus } from './entities';
import { CreateFixedAssetDto } from './dto';
import { VouchersService } from '../vouchers/vouchers.service';
import { SequencesService } from '../sequences/sequences.service';
import { CreateVoucherDto } from '../vouchers/dto/create-voucher.dto';
import { VoucherLineItemDto } from '../vouchers/dto/voucher-line-item.dto';
import { VoucherType } from '../common/enums/voucher-type.enum';

export interface DepreciationRunResult {
  periodDate: string;
  assetsProcessed: number;
  totalDepreciation: number;
  voucherId: string;
  voucherNumber: string;
  details: Array<{
    assetCode: string;
    assetName: string;
    depreciationAmount: number;
    newAccumulatedDepreciation: number;
    newNetBookValue: number;
  }>;
}

@Injectable()
export class FixedAssetsService {
  private readonly logger = new Logger(FixedAssetsService.name);

  constructor(
    @InjectRepository(FixedAsset)
    private readonly fixedAssetRepository: Repository<FixedAsset>,
    private readonly vouchersService: VouchersService,
    private readonly sequencesService: SequencesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Register a new fixed asset
   */
  async create(dto: CreateFixedAssetDto, userId: string): Promise<FixedAsset> {
    const assetCode = await this.sequencesService.generateSequenceNumber(
      'FA',
      6,
    );

    const asset = this.fixedAssetRepository.create({
      ...dto,
      assetCode,
      purchaseDate: new Date(dto.purchaseDate),
      accumulatedDepreciation: 0,
      netBookValue: dto.purchaseCost,
      status: AssetStatus.ACTIVE,
      createdById: userId,
    });

    return await this.fixedAssetRepository.save(asset);
  }

  async findAll(): Promise<FixedAsset[]> {
    return await this.fixedAssetRepository.find({
      order: { assetCode: 'ASC' },
    });
  }

  async findOne(id: string): Promise<FixedAsset> {
    const asset = await this.fixedAssetRepository.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Fixed asset ${id} not found`);
    return asset;
  }

  /**
   * Calculate monthly depreciation for a single asset
   */
  calculateMonthlyDepreciation(asset: FixedAsset): number {
    if (asset.status !== AssetStatus.ACTIVE) return 0;

    const depreciableAmount =
      Number(asset.purchaseCost) - Number(asset.salvageValue);
    const accumulated = Number(asset.accumulatedDepreciation);
    const remaining = depreciableAmount - accumulated;

    if (remaining <= 0) return 0;

    let monthlyAmount: number;

    if (asset.depreciationMethod === DepreciationMethod.STRAIGHT_LINE) {
      monthlyAmount = depreciableAmount / asset.usefulLifeMonths;
    } else {
      // Declining Balance: annual rate / 12
      const annualRate = (asset.decliningRate || 20) / 100;
      const currentBookValue = Number(asset.purchaseCost) - accumulated;
      monthlyAmount = (currentBookValue * annualRate) / 12;
    }

    // Don't depreciate below salvage value
    return Math.min(monthlyAmount, remaining);
  }

  /**
   * Run monthly depreciation for all active assets.
   * Creates a single consolidated GL voucher.
   */
  async runMonthlyDepreciation(
    periodEndDate: string,
    userId: string,
  ): Promise<DepreciationRunResult> {
    const endDate = new Date(periodEndDate);

    // Get all ACTIVE assets that haven't been depreciated for this period yet
    const activeAssets = await this.fixedAssetRepository.find({
      where: { status: AssetStatus.ACTIVE },
    });

    if (activeAssets.length === 0) {
      throw new BadRequestException('No active assets to depreciate');
    }

    // Filter assets eligible for depreciation this period
    const eligible = activeAssets.filter((a) => {
      // Skip if already depreciated this month
      if (a.lastDepreciationDate) {
        const lastMonth = new Date(a.lastDepreciationDate);
        if (
          lastMonth.getFullYear() === endDate.getFullYear() &&
          lastMonth.getMonth() === endDate.getMonth()
        ) {
          return false;
        }
      }
      // Skip if purchase date is after period end
      if (new Date(a.purchaseDate) > endDate) return false;
      return true;
    });

    if (eligible.length === 0) {
      throw new BadRequestException(
        'All eligible assets have already been depreciated for this period',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const voucherDetails: VoucherLineItemDto[] = [];
      const resultDetails: DepreciationRunResult['details'] = [];
      let lineNumber = 1;
      let totalDepreciation = 0;

      for (const asset of eligible) {
        const depAmount = this.calculateMonthlyDepreciation(asset);
        if (depAmount <= 0) {
          // Mark as fully depreciated
          asset.status = AssetStatus.FULLY_DEPRECIATED;
          await manager.save(FixedAsset, asset);
          continue;
        }

        const roundedAmount = Math.round(depAmount * 100) / 100;
        totalDepreciation += roundedAmount;

        // DR Depreciation Expense
        voucherDetails.push({
          accountCode: asset.depreciationExpenseCode,
          description: `Depreciation: ${asset.name} (${asset.assetCode})`,
          debitAmount: roundedAmount,
          creditAmount: 0,
          lineNumber: lineNumber++,
          metadata: { fixedAssetId: asset.id },
        });

        // CR Accumulated Depreciation
        voucherDetails.push({
          accountCode: asset.accumulatedDepreciationCode,
          description: `Accum. Depreciation: ${asset.name} (${asset.assetCode})`,
          debitAmount: 0,
          creditAmount: roundedAmount,
          lineNumber: lineNumber++,
          metadata: { fixedAssetId: asset.id },
        });

        // Update asset record
        const newAccum = Number(asset.accumulatedDepreciation) + roundedAmount;
        const newNBV = Number(asset.purchaseCost) - newAccum;

        asset.accumulatedDepreciation = newAccum;
        asset.netBookValue = newNBV;
        asset.lastDepreciationDate = endDate;

        if (newNBV <= Number(asset.salvageValue)) {
          asset.status = AssetStatus.FULLY_DEPRECIATED;
        }

        await manager.save(FixedAsset, asset);

        resultDetails.push({
          assetCode: asset.assetCode,
          assetName: asset.name,
          depreciationAmount: roundedAmount,
          newAccumulatedDepreciation: newAccum,
          newNetBookValue: newNBV,
        });
      }

      if (voucherDetails.length < 2) {
        throw new BadRequestException('No depreciation entries to post');
      }

      // Create consolidated voucher
      const voucherDto: CreateVoucherDto = {
        voucherType: VoucherType.JOURNAL,
        voucherDate: periodEndDate,
        description: `Monthly Depreciation — ${endDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        referenceType: 'DEPRECIATION',
        details: voucherDetails,
      };

      const voucher = await this.vouchersService.create(
        voucherDto,
        userId,
        manager,
      );
      const postedVoucher = await this.vouchersService.postVoucher(
        voucher.id,
        userId,
        manager,
      );

      this.logger.log(
        `Depreciation run complete: ${resultDetails.length} assets, total ${totalDepreciation.toFixed(2)}`,
      );

      return {
        periodDate: periodEndDate,
        assetsProcessed: resultDetails.length,
        totalDepreciation,
        voucherId: postedVoucher.id,
        voucherNumber: postedVoucher.voucherNumber,
        details: resultDetails,
      };
    });
  }
}
