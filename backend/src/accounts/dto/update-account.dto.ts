import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

// Omit code because it should not be changed after creation
export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['code'] as const),
) {}

