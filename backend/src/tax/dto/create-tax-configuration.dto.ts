import { IsEnum, IsUUID, IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';
import { TaxEntityType } from '../../common/enums/tax-applicability.enum';

export class CreateTaxConfigurationDto {
  @IsEnum(TaxEntityType)
  entityType: TaxEntityType;

  @IsUUID()
  entityId: string;

  @IsUUID()
  taxRateId: string;

  @IsBoolean()
  @IsOptional()
  isExempt?: boolean;

  @IsOptional()
  @IsString()
  exemptionReason?: string;

  @IsOptional()
  @IsString()
  exemptionCertificateNumber?: string;

  @IsOptional()
  @IsDateString()
  exemptionValidFrom?: string;

  @IsOptional()
  @IsDateString()
  exemptionValidTo?: string;

  @IsOptional()
  metadata?: any;
}
