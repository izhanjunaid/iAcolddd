import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCostCenterDto } from './create-cost-center.dto';

export class UpdateCostCenterDto extends PartialType(
  OmitType(CreateCostCenterDto, ['code'] as const),
) {}

