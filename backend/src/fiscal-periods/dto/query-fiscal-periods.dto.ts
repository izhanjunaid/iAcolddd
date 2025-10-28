import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryFiscalPeriodsDto {
  @ApiPropertyOptional({ description: 'Filter by fiscal year', example: 2025 })
  @IsOptional()
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by closed status', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isClosed?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

