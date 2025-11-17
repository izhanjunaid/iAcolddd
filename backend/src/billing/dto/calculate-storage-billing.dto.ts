import { IsNotEmpty, IsNumber, IsDate, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum RateType {
  DAILY = 'DAILY',
  SEASONAL = 'SEASONAL',
  MONTHLY = 'MONTHLY',
}

export class CalculateStorageBillingDto {
  @ApiProperty({ description: 'Weight in kilograms' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Weight must be greater than 0' })
  weight: number;

  @ApiProperty({ description: 'Date goods were received (date in)' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dateIn: Date;

  @ApiProperty({ description: 'Date goods were delivered (date out)' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dateOut: Date;

  @ApiProperty({ description: 'Rate per kg per day in PKR', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Rate cannot be negative' })
  ratePerKgPerDay?: number;

  @ApiProperty({ description: 'Customer ID for customer-specific rates', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Product category ID for category-specific rates', required: false })
  @IsOptional()
  @IsString()
  productCategoryId?: string;

  @ApiProperty({ description: 'Rate type', enum: RateType, required: false, default: RateType.DAILY })
  @IsOptional()
  @IsEnum(RateType)
  rateType?: RateType;

  @ApiProperty({ description: 'Labour charges for loading', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labourChargesIn?: number;

  @ApiProperty({ description: 'Labour charges for unloading', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labourChargesOut?: number;

  @ApiProperty({ description: 'Loading charges', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loadingCharges?: number;

  @ApiProperty({ description: 'Other miscellaneous charges', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @ApiProperty({ description: 'Apply GST', required: false, default: true })
  @IsOptional()
  applyGst?: boolean;

  @ApiProperty({ description: 'Apply WHT', required: false, default: true })
  @IsOptional()
  applyWht?: boolean;
}
