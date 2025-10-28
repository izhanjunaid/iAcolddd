import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  MaxLength, 
  IsEnum, 
  IsBoolean, 
  IsOptional, 
  IsNumber, 
  Min, 
  Max,
  IsPositive
} from 'class-validator';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'RICE001', description: 'Unique SKU for the inventory item' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Basmati Rice Premium', description: 'Name of the inventory item' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'High quality basmati rice for export', description: 'Detailed description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Grains', description: 'Category of the item' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.BAG, description: 'Unit of measure' })
  @IsEnum(UnitOfMeasure)
  unitOfMeasure: UnitOfMeasure;

  @ApiPropertyOptional({ example: false, description: 'Whether the item is perishable' })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  @ApiPropertyOptional({ example: 365, description: 'Shelf life in days (for perishable items)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  shelfLifeDays?: number;

  @ApiPropertyOptional({ example: 15, description: 'Minimum storage temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  @Min(-50)
  @Max(50)
  minTemperature?: number;

  @ApiPropertyOptional({ example: 25, description: 'Maximum storage temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  @Min(-50)
  @Max(50)
  maxTemperature?: number;

  @ApiPropertyOptional({ example: 25.50, description: 'Standard cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardCost?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the item is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

