import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepreciationMethod } from '../entities';

export class CreateFixedAssetDto {
  @ApiProperty({ example: 'Cold Room Compressor Unit' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  purchaseCost: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  salvageValue: number;

  @ApiProperty({ example: 60, description: 'Useful life in months' })
  @IsNumber()
  @Min(1)
  usefulLifeMonths: number;

  @ApiProperty({
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
  })
  @IsEnum(DepreciationMethod)
  depreciationMethod: DepreciationMethod;

  @ApiPropertyOptional({
    example: 20.0,
    description: 'Rate for declining balance method (%)',
  })
  @IsOptional()
  @IsNumber()
  decliningRate?: number;

  @ApiProperty({
    example: '1-0001-0002-0001',
    description: 'Asset GL account code',
  })
  @IsString()
  assetAccountCode: string;

  @ApiProperty({
    example: '5-0001-0001-0004',
    description: 'Depreciation Expense GL code',
  })
  @IsString()
  depreciationExpenseCode: string;

  @ApiProperty({
    example: '1-0001-0002-0002',
    description: 'Accumulated Depreciation GL code',
  })
  @IsString()
  accumulatedDepreciationCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenterId?: string;
}
