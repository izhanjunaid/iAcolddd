import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';

export class CreateOutwardGatePassDto {
  @IsUUID()
  lotId: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsNumber()
  @IsPositive()
  bagsReleased: number;

  @IsNumber()
  @Min(0)
  grossWeightKg: number;

  @IsNumber()
  @Min(0)
  tareWeightKg: number;

  @IsDateString()
  outwardDate: string;

  /** Optional: handling charges on outward */
  @IsOptional()
  @IsNumber()
  @Min(0)
  handlingChargesOut?: number;

  /** Optional: other charges (fumigation, etc.) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
