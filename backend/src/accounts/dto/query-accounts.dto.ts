import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../common/enums/account-type.enum';
import { AccountNature } from '../../common/enums/account-nature.enum';
import { AccountCategory } from '../../common/enums/account-category.enum';

export class QueryAccountsDto {
  @ApiPropertyOptional({ description: 'Search by account name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiPropertyOptional({ enum: AccountNature })
  @IsOptional()
  @IsEnum(AccountNature)
  nature?: AccountNature;

  @ApiPropertyOptional({ enum: AccountCategory })
  @IsOptional()
  @IsEnum(AccountCategory)
  category?: AccountCategory;

  @ApiPropertyOptional({ description: 'Filter by parent account ID' })
  @IsOptional()
  @IsUUID('4')
  parentAccountId?: string;

  @ApiPropertyOptional({ description: 'Include only root accounts (no parent)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rootOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'code' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'code';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

