import { ApiProperty } from '@nestjs/swagger';

export class StorageBillingResultDto {
  @ApiProperty({ description: 'Weight in kilograms' })
  weight: number;

  @ApiProperty({ description: 'Number of days stored (always rounded up)' })
  daysStored: number;

  @ApiProperty({ description: 'Rate per kg per day applied' })
  ratePerKgPerDay: number;

  @ApiProperty({ description: 'Storage charges (weight × rate × days)' })
  storageCharges: number;

  @ApiProperty({ description: 'Labour charges for loading/unloading' })
  labourCharges: number;

  @ApiProperty({ description: 'Loading charges' })
  loadingCharges: number;

  @ApiProperty({ description: 'Other charges' })
  otherCharges: number;

  @ApiProperty({ description: 'Subtotal before tax' })
  subtotal: number;

  @ApiProperty({ description: 'GST amount', required: false })
  gstAmount?: number;

  @ApiProperty({ description: 'GST rate', required: false })
  gstRate?: number;

  @ApiProperty({ description: 'WHT amount', required: false })
  whtAmount?: number;

  @ApiProperty({ description: 'WHT rate', required: false })
  whtRate?: number;

  @ApiProperty({ description: 'Total amount including all taxes and charges' })
  totalAmount: number;

  @ApiProperty({ description: 'Date goods were received' })
  dateIn: Date;

  @ApiProperty({ description: 'Date goods were delivered' })
  dateOut: Date;

  @ApiProperty({ description: 'Calculation breakdown for transparency' })
  breakdown: {
    storageCalculation: string;
    labourCalculation: string;
    taxCalculation: string;
  };
}
