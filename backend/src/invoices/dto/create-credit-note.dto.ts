import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCreditNoteDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  issueDate?: string;
}
