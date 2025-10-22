import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVoucherDto } from './create-voucher.dto';

// Cannot update voucher type after creation
export class UpdateVoucherDto extends PartialType(
  OmitType(CreateVoucherDto, ['voucherType'] as const),
) {}

