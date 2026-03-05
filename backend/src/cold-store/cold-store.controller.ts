import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ColdStoreLotService } from './services/cold-store-lot.service';
import { InwardGatePassService } from './services/inward-gate-pass.service';
import { OutwardGatePassService } from './services/outward-gate-pass.service';
import { RentalBillingService } from './services/rental-billing.service';
import { ColdStoreReportsService } from './services/cold-store-reports.service';
import { CreateInwardGatePassDto } from './dto/create-inward-gate-pass.dto';
import { CreateOutwardGatePassDto } from './dto/create-outward-gate-pass.dto';
import { ColdStoreLotStatus } from './entities/cold-store-lot.entity';
import { GatePassStatus } from './entities/inward-gate-pass.entity';

@UseGuards(JwtAuthGuard)
@Controller('cold-store')
export class ColdStoreController {
  constructor(
    private readonly lotService: ColdStoreLotService,
    private readonly inwardService: InwardGatePassService,
    private readonly outwardService: OutwardGatePassService,
    private readonly billingService: RentalBillingService,
    private readonly reportsService: ColdStoreReportsService,
  ) {}

  // ─── Lots ────────────────────────────────────────────────────────────────────

  @Get('lots')
  getLots(
    @Query('customerId') customerId?: string,
    @Query('status') status?: ColdStoreLotStatus,
    @Query('chamberId') chamberId?: string,
    @Query('commodity') commodity?: string,
  ) {
    return this.lotService.findAll({
      customerId,
      status,
      chamberId,
      commodity,
    });
  }

  @Get('lots/summary')
  getLotsSummary() {
    return this.lotService.getActiveLotsSummary();
  }

  @Get('lots/:id')
  getLot(@Param('id', ParseUUIDPipe) id: string) {
    return this.lotService.findOne(id);
  }

  @Get('lots/:id/accrued-charges')
  getLotAccruedCharges(@Param('id', ParseUUIDPipe) id: string) {
    return this.lotService.getLotWithAccruedCharges(id);
  }

  @Get('lots/:id/billing-cycles')
  getLotBillingCycles(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.getCyclesForLot(id);
  }

  // ─── Inward Gate Passes ───────────────────────────────────────────────────────

  @Get('inward-gate-passes')
  getInwardGatePasses(
    @Query('customerId') customerId?: string,
    @Query('status') status?: GatePassStatus,
  ) {
    return this.inwardService.findAll({ customerId, status });
  }

  @Post('inward-gate-passes')
  createInwardGatePass(
    @Body() dto: CreateInwardGatePassDto,
    @Request() req: any,
  ) {
    return this.inwardService.create(dto, req.user?.id || 'system');
  }

  @Get('inward-gate-passes/:id')
  getInwardGatePass(@Param('id', ParseUUIDPipe) id: string) {
    return this.inwardService.findOne(id);
  }

  @Patch('inward-gate-passes/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveInwardGatePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.inwardService.approve(id, req.user?.id || 'system');
  }

  @Patch('inward-gate-passes/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelInwardGatePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.inwardService.cancel(id, req.user?.id || 'system');
  }

  // ─── Outward Gate Passes ──────────────────────────────────────────────────────

  @Get('outward-gate-passes')
  getOutwardGatePasses(
    @Query('lotId') lotId?: string,
    @Query('status') status?: GatePassStatus,
  ) {
    return this.outwardService.findAll({ lotId, status });
  }

  @Post('outward-gate-passes')
  createOutwardGatePass(
    @Body() dto: CreateOutwardGatePassDto,
    @Request() req: any,
  ) {
    return this.outwardService.create(dto, req.user?.id || 'system');
  }

  @Get('outward-gate-passes/:id')
  getOutwardGatePass(@Param('id', ParseUUIDPipe) id: string) {
    return this.outwardService.findOne(id);
  }

  @Patch('outward-gate-passes/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveOutwardGatePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.outwardService.approve(id, req.user?.id || 'system');
  }

  @Patch('outward-gate-passes/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOutwardGatePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.outwardService.cancel(id, req.user?.id || 'system');
  }

  // ─── Billing ──────────────────────────────────────────────────────────────────

  @Get('billing/active-cycles')
  getActiveBillingCycles() {
    return this.billingService.getAllActiveCycles();
  }

  // ─── Reports ──────────────────────────────────────────────────────────────────

  @Get('reports/space-utilization')
  getSpaceUtilization() {
    return this.reportsService.getSpaceUtilization();
  }

  @Get('reports/projected-revenue')
  getProjectedAccrualRevenue() {
    return this.reportsService.getProjectedAccrualRevenue();
  }

  @Get('reports/customer-aging')
  getCustomerStockAging() {
    return this.reportsService.getCustomerStockAging();
  }
}
