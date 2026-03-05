import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMiscChargeDto {
  @ApiProperty({
    description: 'Description of the charge (e.g., Demurrage, Penalty)',
    example: 'Demurrage - 5 days overdue',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Quantity', example: 1, default: 1 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Unit price of the charge', example: 5000 })
  @IsNumber()
  @Min(0.01)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'GST tax rate percentage (0-100)',
    example: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Reason/justification for the charge',
    example: 'Customer exceeded agreed pickup window by 5 days',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
