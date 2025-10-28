import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsUUID, 
  IsNumber, 
  IsPositive, 
  IsOptional, 
  IsDateString,
  MaxLength,
  ValidateIf
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { InventoryReferenceType } from '../../common/enums/inventory-reference-type.enum';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum';

export class CreateInventoryTransactionDto {
  @ApiProperty({ 
    enum: InventoryTransactionType, 
    example: InventoryTransactionType.RECEIPT, 
    description: 'Type of inventory transaction' 
  })
  @IsEnum(InventoryTransactionType)
  transactionType: InventoryTransactionType;

  @ApiProperty({ example: '2025-10-26', description: 'Date of the transaction' })
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional({ 
    enum: InventoryReferenceType, 
    example: InventoryReferenceType.GRN,
    description: 'Type of reference document' 
  })
  @IsOptional()
  @IsEnum(InventoryReferenceType)
  referenceType?: InventoryReferenceType;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'ID of the reference document' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'GRN-2025-001', description: 'Reference document number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceNumber?: string;

  @ApiProperty({ example: 'uuid-here', description: 'ID of the inventory item' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'ID of the customer who owns the goods' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ example: 'uuid-here', description: 'ID of the warehouse' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'ID of the room within the warehouse' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  // Transfer-specific fields
  @ApiPropertyOptional({ example: 'uuid-here', description: 'Source warehouse ID (for transfers)' })
  @ValidateIf((o) => o.transactionType === InventoryTransactionType.TRANSFER)
  @IsUUID()
  fromWarehouseId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Source room ID (for transfers)' })
  @IsOptional()
  @IsUUID()
  fromRoomId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Destination warehouse ID (for transfers)' })
  @ValidateIf((o) => o.transactionType === InventoryTransactionType.TRANSFER)
  @IsUUID()
  toWarehouseId?: string;

  @ApiPropertyOptional({ example: 'uuid-here', description: 'Destination room ID (for transfers)' })
  @IsOptional()
  @IsUUID()
  toRoomId?: string;

  @ApiProperty({ example: 100.500, description: 'Quantity being transacted' })
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  quantity: number;

  @ApiProperty({ 
    enum: UnitOfMeasure, 
    example: UnitOfMeasure.KG, 
    description: 'Unit of measure for the quantity' 
  })
  @IsEnum(UnitOfMeasure)
  unitOfMeasure: UnitOfMeasure;

  @ApiProperty({ 
    example: 25.75, 
    description: 'Cost per unit (calculated automatically for ISSUE transactions using FIFO)' 
  })
  @IsNumber()
  @ValidateIf((o) => o.transactionType !== InventoryTransactionType.ISSUE)
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  unitCost: number;

  @ApiPropertyOptional({ example: 'LOT-2025-001', description: 'Lot number for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lotNumber?: string;

  @ApiPropertyOptional({ example: 'BATCH-001', description: 'Batch number for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  batchNumber?: string;

  @ApiPropertyOptional({ example: '2026-10-26', description: 'Expiry date (for perishable items)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: '2025-09-15', description: 'Manufacture date' })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiPropertyOptional({ example: 'Stock received in good condition', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

