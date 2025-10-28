import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID, IsEnum, IsNumber, Min, Max, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';

export class StockMovementReportDto {
  @ApiProperty({ example: '2025-10-01', description: 'Start date for the report' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2025-10-31', description: 'End date for the report' })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by item ID' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ 
    enum: InventoryTransactionType, 
    description: 'Filter by transaction type' 
  })
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  transactionType?: InventoryTransactionType;

  @ApiPropertyOptional({ example: 'Grains', description: 'Filter by item category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 100, description: 'Number of records per page', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 100;

  @ApiPropertyOptional({ example: 0, description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({ 
    example: 'transactionDate', 
    description: 'Sort by field', 
    default: 'transactionDate' 
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'transactionDate';

  @ApiPropertyOptional({ 
    example: 'DESC', 
    description: 'Sort order', 
    enum: ['ASC', 'DESC'], 
    default: 'DESC' 
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

