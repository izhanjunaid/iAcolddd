import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoodsReceiptNoteItemDto {
  @IsUUID()
  purchaseOrderItemId: string;

  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  orderedQuantity: number;

  @IsNumber()
  @Min(0.0001)
  receivedQuantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateGoodsReceiptNoteDto {
  @IsUUID()
  purchaseOrderId: string;

  @IsDateString()
  receiptDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptNoteItemDto)
  items: CreateGoodsReceiptNoteItemDto[];
}
