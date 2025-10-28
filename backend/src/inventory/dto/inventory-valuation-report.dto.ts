import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsDateString, IsEnum } from 'class-validator';

export class InventoryValuationReportDto {
  @ApiPropertyOptional({ 
    example: '2025-10-26', 
    description: 'Valuation as of this date (defaults to current date)' 
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Grains', description: 'Filter by item category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ 
    example: 'warehouse', 
    description: 'Group by field', 
    enum: ['warehouse', 'category', 'customer', 'none'],
    default: 'warehouse'
  })
  @IsOptional()
  @IsEnum(['warehouse', 'category', 'customer', 'none'])
  groupBy?: 'warehouse' | 'category' | 'customer' | 'none' = 'warehouse';

  @ApiPropertyOptional({ 
    example: 'totalValue', 
    description: 'Sort by field', 
    enum: ['totalValue', 'totalQuantity', 'averageCost'],
    default: 'totalValue' 
  })
  @IsOptional()
  @IsEnum(['totalValue', 'totalQuantity', 'averageCost'])
  sortBy?: 'totalValue' | 'totalQuantity' | 'averageCost' = 'totalValue';

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

