import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApPaymentsService } from '../services/ap-payments.service';
import { CreateApPaymentDto } from '../dto/create-ap-payment.dto';
import { ApplyPaymentDto } from '../dto/apply-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('ap-payments')
@Controller('ap-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ApPaymentsController {
  constructor(private readonly apPaymentsService: ApPaymentsService) {}

  @Post()
  @RequirePermissions('ap.payment.create')
  @ApiOperation({ summary: 'Record new AP Payment (GL Integrated)' })
  create(@Body() createDto: CreateApPaymentDto, @Request() req) {
    return this.apPaymentsService.create(createDto, req.user.id);
  }

  @Post(':id/apply')
  @RequirePermissions('ap.payment.apply')
  @ApiOperation({ summary: 'Apply Payment to Bill' })
  apply(
    @Param('id') id: string,
    @Body() applyDto: ApplyPaymentDto,
    @Request() req,
  ) {
    return this.apPaymentsService.applyPayment(id, applyDto, req.user.id);
  }

  @Get()
  @RequirePermissions('ap.payment.read')
  @ApiOperation({ summary: 'Get all AP Payments' })
  findAll() {
    return this.apPaymentsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ap.payment.read')
  @ApiOperation({ summary: 'Get AP Payment by ID' })
  findOne(@Param('id') id: string) {
    return this.apPaymentsService.findOne(id);
  }
}
