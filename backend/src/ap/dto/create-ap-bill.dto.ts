import {
  IsString,
  IsDateString,
  IsNumber,
  IsUUID,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateApBillLineDto {
  @ApiProperty({ description: 'Expense Account ID' })
  @IsUUID()
  expenseAccountId: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Cost Center ID' })
  @IsUUID()
  @IsOptional()
  costCenterId?: string;
}

export class CreateApBillDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsUUID()
  vendorId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vendorInvoiceNumber?: string;

  @ApiProperty({ description: 'Bill Date (YYYY-MM-DD)' })
  @IsDateString()
  billDate: string;

  @ApiProperty({ description: 'Due Date (YYYY-MM-DD)' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateApBillLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateApBillLineDto)
  lines: CreateApBillLineDto[];
}
