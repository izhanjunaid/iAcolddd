import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyPaymentDto {
  @ApiProperty({ description: 'Bill ID' })
  @IsUUID()
  billId: string;

  @ApiProperty({ description: 'Amount to apply to this bill' })
  @IsNumber()
  @Min(0.01)
  amountToApply: number;
}
