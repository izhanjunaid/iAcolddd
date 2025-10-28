import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsDateString } from 'class-validator';

export class CreateFiscalYearDto {
  @ApiProperty({
    description: 'Fiscal year (e.g., 2025 represents FY 2025-2026: July 1, 2025 - June 30, 2026)',
    example: 2025,
  })
  @IsInt()
  @Min(2020)
  year: number;

  @ApiProperty({
    description: 'Start date of fiscal year (July 1)',
    example: '2025-07-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date of fiscal year (June 30)',
    example: '2026-06-30',
  })
  @IsDateString()
  endDate: string;
}

