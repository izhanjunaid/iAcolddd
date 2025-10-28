import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInventoryBalancesDto {
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

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Filter by room ID' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ example: 'LOT-001', description: 'Filter by lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ example: 'RICE', description: 'Search by item SKU (partial match)' })
  @IsOptional()
  @IsString()
  itemSku?: string;

  @ApiPropertyOptional({ example: 'Basmati', description: 'Search by item name (partial match)' })
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiPropertyOptional({ example: 'Customer A', description: 'Search by customer name (partial match)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: true, description: 'Show only items with positive stock', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  onlyWithStock?: boolean = true;

  @ApiPropertyOptional({ example: 0, description: 'Minimum quantity threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  minQuantity?: number;

  @ApiPropertyOptional({ example: 10, description: 'Number of records per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;

  @ApiPropertyOptional({ example: 0, description: 'Number of records to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({ 
    example: 'totalValue', 
    description: 'Sort by field', 
    default: 'totalValue' 
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'totalValue';

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

