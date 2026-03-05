import { PartialType } from '@nestjs/swagger';
import { CreateApBillDto } from './create-ap-bill.dto';

export class UpdateApBillDto extends PartialType(CreateApBillDto) {}
