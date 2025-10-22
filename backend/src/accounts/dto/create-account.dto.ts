import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsEmail,
  IsDateString,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { AccountType } from '../../common/enums/account-type.enum';
import { AccountNature } from '../../common/enums/account-nature.enum';
import { AccountCategory } from '../../common/enums/account-category.enum';

export class CreateAccountDto {
  @ApiPropertyOptional({ example: '1-0000', description: 'Account code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9-]+$/, { message: 'Account code must contain only numbers and hyphens' })
  @MaxLength(20)
  code?: string;

  @ApiProperty({ example: 'Cash in Hand' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Parent account ID (null for root accounts)' })
  @IsOptional()
  @IsUUID('4')
  parentAccountId?: string | null;

  @ApiProperty({ enum: AccountType, example: AccountType.DETAIL })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ enum: AccountNature, example: AccountNature.DEBIT })
  @IsEnum(AccountNature)
  nature: AccountNature;

  @ApiProperty({ enum: AccountCategory, example: AccountCategory.ASSET })
  @IsEnum(AccountCategory)
  category: AccountCategory;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  openingDate?: string;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditDays?: number;

  // Contact details
  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Suite 100' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Karachi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Sindh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Pakistan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '75500' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional({ example: '+92-21-1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+92-300-1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ example: '1234567-8' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ntn?: string;

  @ApiPropertyOptional({ example: 'GST-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gst?: string;

  @ApiPropertyOptional({ example: { bankName: 'MCB', accountNumber: '1234567890' } })
  @IsOptional()
  metadata?: Record<string, any>;
}

