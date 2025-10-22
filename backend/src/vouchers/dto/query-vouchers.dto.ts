import { IsOptional, IsEnum, IsDateString, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../../common/enums/voucher-type.enum';

export class QueryVouchersDto {
  @ApiPropertyOptional({ enum: VoucherType, description: 'Filter by voucher type' })
  @IsEnum(VoucherType)
  @IsOptional()
  voucherType?: VoucherType;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by posted status' })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isPosted?: boolean;

  @ApiPropertyOptional({ description: 'Search by voucher number or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'voucherDate' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'voucherDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

