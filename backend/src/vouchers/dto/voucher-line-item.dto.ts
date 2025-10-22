import { IsString, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoucherLineItemDto {
  @ApiProperty({ description: 'Account code', example: '1-0001-0001-0001' })
  @IsString()
  accountCode: string;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Debit amount', example: 1000.00, default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount: number;

  @ApiProperty({ description: 'Credit amount', example: 0, default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount: number;

  @ApiProperty({ description: 'Line number (for ordering)', example: 1 })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

