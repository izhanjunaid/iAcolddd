import { IsNotEmpty, IsString, IsOptional, IsDateString, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CalculateStorageBillingDto } from '../../billing/dto/calculate-storage-billing.dto';

export class CreateInvoiceFromBillingDto {
  @ApiProperty({
    description: 'Customer ID for the invoice',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'Billing calculation details',
    type: () => CalculateStorageBillingDto,
  })
  @IsNotEmpty()
  @Type(() => CalculateStorageBillingDto)
  billingData: CalculateStorageBillingDto;

  @ApiPropertyOptional({
    description: 'Invoice issue date (defaults to today)',
    example: '2025-11-02',
  })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({
    description: 'Number of days until payment is due (defaults to 30)',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  paymentTermsDays?: number;

  @ApiPropertyOptional({
    description: 'Reference number (e.g., GDN number, booking reference)',
    example: 'GDN-2025-001',
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Storage of frozen chicken products',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Auto-send invoice via email to customer',
    example: false,
    default: false,
  })
  @IsOptional()
  autoSend?: boolean;
}
