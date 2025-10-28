import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CloseFiscalPeriodDto {
  @ApiProperty({
    description: 'ID of the fiscal period to close',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  periodId: string;
}

