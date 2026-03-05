import {
  IsString,
  IsDateString,
  IsNumber,
  IsUUID,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApPaymentMethod } from '../enums/ap-payment-method.enum';

export class CreateApPaymentDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsUUID()
  vendorId: string;

  @ApiProperty({ description: 'Payment Date (YYYY-MM-DD)' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ enum: ApPaymentMethod })
  @IsEnum(ApPaymentMethod)
  paymentMethod: ApPaymentMethod;

  @ApiProperty({ description: 'Bank/Cash Account ID (Asset Account)' })
  @IsUUID()
  bankAccountId: string;

  @ApiProperty({ description: 'Amount Paid', example: 5000.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Reference Number (Cheque #, Transaction ID)',
  })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
