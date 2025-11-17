import { IsOptional, IsEnum, IsDateString, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Update invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.SENT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Update due date',
    example: '2025-12-01',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Record payment date',
    example: '2025-11-15',
  })
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiPropertyOptional({
    description: 'Record payment amount',
    example: 174420,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Update invoice notes',
    example: 'Payment received via bank transfer',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
