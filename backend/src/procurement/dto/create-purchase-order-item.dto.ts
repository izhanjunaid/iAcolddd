import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  // Description is optional, derived from Item if not provided, but let's make it optional in DTO
  @ApiProperty({ required: false })
  @IsString()
  description?: string;
}
