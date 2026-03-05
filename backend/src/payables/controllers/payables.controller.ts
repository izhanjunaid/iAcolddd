import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PayablesService } from '../services/payables.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateBillDto } from '../dto/create-bill.dto';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Payables')
@Controller('payables')
@UseGuards(JwtAuthGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Post('bills')
  async createBill(@Body() dto: CreateBillDto, @Request() req) {
    return this.payablesService.createBill(dto, req.user.id);
  }

  @Get('bills')
  async findAllBills() {
    return this.payablesService.findAllBills();
  }

  @Get('bills/:id')
  async findBillOne(@Param('id') id: string) {
    return this.payablesService.findBillOne(id);
  }

  @Post('payments')
  async recordPayment(@Body() dto: RecordPaymentDto, @Request() req) {
    return this.payablesService.recordPayment(dto, req.user.id);
  }
}
