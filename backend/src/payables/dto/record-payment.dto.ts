import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApPaymentMethod } from '../enums/ap-payment-method.enum';

export class ApPaymentApplicationDto {
  @IsNotEmpty()
  @IsUUID()
  billId: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountApplied: number;
}

export class RecordPaymentDto {
  @IsNotEmpty()
  @IsUUID()
  vendorId: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  paymentDate: Date;

  @IsNotEmpty()
  @IsEnum(ApPaymentMethod)
  paymentMethod: ApPaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApPaymentApplicationDto)
  applications?: ApPaymentApplicationDto[];
}
