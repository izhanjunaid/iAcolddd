import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { TaxType } from '../../common/enums/tax-type.enum';
import { TaxApplicability } from '../../common/enums/tax-applicability.enum';

export class CreateTaxRateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaxType)
  taxType: TaxType;

  @IsEnum(TaxApplicability)
  applicability: TaxApplicability;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  liabilityAccountCode?: string;

  @IsOptional()
  metadata?: any;
}
