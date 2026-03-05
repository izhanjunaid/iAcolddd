import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Fixed Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  @RequirePermissions('fixed-assets.create')
  @ApiOperation({ summary: 'Register a new fixed asset' })
  @ApiResponse({ status: 201, description: 'Asset registered' })
  async create(@Body() dto: CreateFixedAssetDto, @Req() req: any) {
    try {
      return await this.fixedAssetsService.create(dto, req.user.id);
    } catch (error) {
      throw new InternalServerErrorException({
        message: error.message,
        stack: error.stack,
      });
    }
  }

  @Get()
  @RequirePermissions('fixed-assets.read')
  @ApiOperation({ summary: 'List all fixed assets' })
  async findAll() {
    return await this.fixedAssetsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('fixed-assets.read')
  @ApiOperation({ summary: 'Get a fixed asset by ID' })
  async findOne(@Param('id') id: string) {
    return await this.fixedAssetsService.findOne(id);
  }

  @Post('depreciation/run')
  @RequirePermissions('fixed-assets.depreciate')
  @ApiOperation({ summary: 'Run monthly depreciation for all active assets' })
  @ApiResponse({
    status: 200,
    description: 'Depreciation posted, returns consolidated results',
  })
  async runDepreciation(
    @Body() body: { periodEndDate: string },
    @Req() req: any,
  ) {
    return await this.fixedAssetsService.runMonthlyDepreciation(
      body.periodEndDate,
      req.user.id,
    );
  }
}
