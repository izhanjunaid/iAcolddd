import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { InventoryReferenceType } from '../../common/enums/inventory-reference-type.enum';

export class QueryInventoryTransactionsDto {
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

  @ApiPropertyOptional({ 
    enum: InventoryReferenceType, 
    description: 'Filter by reference type' 
  })
  @IsOptional()
  @IsEnum(InventoryReferenceType)
  referenceType?: InventoryReferenceType;

  @ApiPropertyOptional({ example: 'GRN-2025-001', description: 'Filter by reference number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'LOT-001', description: 'Filter by lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ example: '2025-10-01', description: 'Filter from this date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2025-10-31', description: 'Filter to this date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 10, description: 'Number of transactions per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;

  @ApiPropertyOptional({ example: 0, description: 'Number of transactions to skip', default: 0 })
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

