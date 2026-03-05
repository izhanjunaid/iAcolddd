import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApBillLineDto {
  @IsNotEmpty()
  @IsUUID()
  expenseAccountId: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}

export class CreateBillDto {
  @IsNotEmpty()
  @IsUUID()
  vendorId: string;

  @IsNotEmpty()
  @IsString()
  billNumber: string;

  @IsOptional()
  @IsString()
  vendorInvoiceNumber?: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  billDate: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApBillLineDto)
  lines: ApBillLineDto[];
}
