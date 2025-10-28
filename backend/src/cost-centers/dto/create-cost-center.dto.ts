import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({
    description: 'Unique code for the cost center',
    example: 'WH-01',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({
    description: 'Name of the cost center',
    example: 'Warehouse A',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the cost center',
    example: 'Main cold storage warehouse for perishable goods',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent cost center ID (for hierarchical structure)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether the cost center is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

