import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', example: 'ABC Trading Company' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Contact person name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+92-300-1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile number', example: '+92-301-7654321' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ description: 'Address line 1', example: '123 Main Street' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Suite 100' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Lahore' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province', example: 'Punjab' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'Pakistan', default: 'Pakistan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '54000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Credit limit', example: 100000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Credit days', example: 30, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditDays?: number;

  @ApiPropertyOptional({ description: 'Grace days for rental billing', example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceDays?: number;

  @ApiPropertyOptional({ description: 'Tax ID / NTN', example: '1234567-8' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ description: 'GST Registration Number', example: 'GST-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'Is customer active', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { notes: 'VIP customer' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

