import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

// Omit SKU because it should not be changed after creation
export class UpdateInventoryItemDto extends PartialType(
  OmitType(CreateInventoryItemDto, ['sku'] as const),
) {}

