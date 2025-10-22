import { 
  IsString, 
  IsEnum, 
  IsDate, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { PaymentMode } from '../../common/enums/payment-mode.enum';
import { VoucherLineItemDto } from './voucher-line-item.dto';

export class CreateVoucherDto {
  @ApiProperty({ 
    enum: VoucherType, 
    description: 'Voucher type',
    example: VoucherType.JOURNAL,
  })
  @IsEnum(VoucherType)
  voucherType: VoucherType;

  @ApiProperty({ 
    description: 'Voucher date',
    example: '2025-10-21',
  })
  @IsDateString()
  voucherDate: string;

  @ApiPropertyOptional({ description: 'Voucher description/narration' })
  @IsString()
  @IsOptional()
  description?: string;

  // Payment/Receipt specific fields
  @ApiPropertyOptional({ enum: PaymentMode, description: 'Payment mode (for Payment/Receipt vouchers)' })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({ description: 'Cheque number' })
  @IsString()
  @IsOptional()
  chequeNumber?: string;

  @ApiPropertyOptional({ description: 'Cheque date' })
  @IsDateString()
  @IsOptional()
  chequeDate?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsString()
  @IsOptional()
  bankName?: string;

  // Reference fields (for future use)
  @ApiPropertyOptional({ description: 'Reference document ID' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Reference document type', example: 'GRN' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference document number' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  // Line items
  @ApiProperty({ 
    type: [VoucherLineItemDto], 
    description: 'Voucher line items (debit and credit entries)',
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 line items required (one debit and one credit)' })
  @ValidateNested({ each: true })
  @Type(() => VoucherLineItemDto)
  details: VoucherLineItemDto[];
}

