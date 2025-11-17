import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { StorageBillingService } from '../services/storage-billing.service';
import { CalculateStorageBillingDto } from '../dto/calculate-storage-billing.dto';
import { StorageBillingResultDto } from '../dto/storage-billing-result.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly storageBillingService: StorageBillingService,
  ) {}

  @Post('calculate-storage')
  @RequirePermissions('billing.calculate')
  @ApiOperation({
    summary: 'Calculate storage billing charges',
    description: 'Calculates storage charges based on weight, days stored, and applicable rates. Includes labour charges and tax calculations (GST/WHT).',
  })
  @ApiResponse({
    status: 201,
    description: 'Billing calculation successful',
    type: StorageBillingResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async calculateStorageBilling(
    @Body() dto: CalculateStorageBillingDto,
  ): Promise<StorageBillingResultDto> {
    this.logger.log(`Calculating storage billing for ${dto.weight} kg`);
    return this.storageBillingService.calculateStorageBilling(dto);
  }

  @Post('calculate-storage/seasonal')
  @RequirePermissions('billing.calculate')
  @ApiOperation({
    summary: 'Calculate seasonal storage billing',
    description: 'Calculates storage charges using seasonal rates (30-day blocks)',
  })
  @ApiResponse({
    status: 201,
    description: 'Seasonal billing calculation successful',
    type: StorageBillingResultDto,
  })
  async calculateSeasonalBilling(
    @Body() dto: CalculateStorageBillingDto,
  ): Promise<StorageBillingResultDto> {
    this.logger.log(`Calculating seasonal billing for ${dto.weight} kg`);
    return this.storageBillingService.calculateSeasonalBilling(dto);
  }

  @Post('calculate-storage/monthly')
  @RequirePermissions('billing.calculate')
  @ApiOperation({
    summary: 'Calculate monthly storage billing',
    description: 'Calculates storage charges using monthly rates (custom day ranges)',
  })
  @ApiResponse({
    status: 201,
    description: 'Monthly billing calculation successful',
    type: StorageBillingResultDto,
  })
  async calculateMonthlyBilling(
    @Body() dto: CalculateStorageBillingDto,
  ): Promise<StorageBillingResultDto> {
    this.logger.log(`Calculating monthly billing for ${dto.weight} kg`);
    return this.storageBillingService.calculateMonthlyBilling(dto);
  }
}
