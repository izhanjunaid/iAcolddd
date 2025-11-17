import { IsOptional, IsEnum, IsDateString, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus, InvoiceType } from '../entities/invoice.entity';

export class QueryInvoicesDto {
  @ApiPropertyOptional({
    description: 'Filter by invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.SENT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Filter by invoice type',
    enum: InvoiceType,
    example: InvoiceType.STORAGE,
  })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter invoices from this date (inclusive)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter invoices until this date (inclusive)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Search by invoice number',
    example: 'INV-2025-0001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Search by reference number',
    example: 'GDN-2025-001',
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Show only overdue invoices',
    example: false,
    default: false,
  })
  @IsOptional()
  overdueOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'issueDate',
    default: 'issueDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'issueDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
