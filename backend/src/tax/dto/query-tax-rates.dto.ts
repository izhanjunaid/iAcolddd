import { IsOptional, IsEnum, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { TaxType } from '../../common/enums/tax-type.enum';
import { TaxApplicability } from '../../common/enums/tax-applicability.enum';
import { Transform } from 'class-transformer';

export class QueryTaxRatesDto {
  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsOptional()
  @IsEnum(TaxApplicability)
  applicability?: TaxApplicability;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
