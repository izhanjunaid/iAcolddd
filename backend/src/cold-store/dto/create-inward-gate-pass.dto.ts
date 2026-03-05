import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  Min,
  ValidateIf,
} from 'class-validator';
import { BillingUnitType } from '../entities/cold-store-lot.entity';

export class CreateInwardGatePassDto {
  @IsUUID()
  customerId: string;

  @IsString()
  commodity: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsOptional()
  @IsUUID()
  chamberId?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsNumber()
  @IsPositive()
  bagsReceived: number;

  @IsNumber()
  @Min(0)
  grossWeightKg: number;

  @IsNumber()
  @Min(0)
  tareWeightKg: number;

  @IsDateString()
  inwardDate: string;

  @IsEnum(BillingUnitType)
  billingUnit: BillingUnitType;

  /**
   * Required when billingUnit = PER_BAG.
   * PKR per bag for the entire season.
   */
  @ValidateIf((o) => o.billingUnit === BillingUnitType.PER_BAG)
  @IsNumber()
  @IsPositive()
  ratePerBagPerSeason?: number;

  /**
   * Required when billingUnit = PER_KG.
   * PKR per kg per day.
   */
  @ValidateIf((o) => o.billingUnit === BillingUnitType.PER_KG)
  @IsNumber()
  @IsPositive()
  ratePerKgPerDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
