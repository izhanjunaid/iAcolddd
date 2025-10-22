import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto, QueryVouchersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @RequirePermissions('vouchers.create')
  @ApiOperation({ summary: 'Create new voucher' })
  @ApiResponse({ status: 201, description: 'Voucher created successfully' })
  create(@Body() createVoucherDto: CreateVoucherDto, @Request() req) {
    return this.vouchersService.create(createVoucherDto, req.user.id);
  }

  @Get()
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get all vouchers with filters' })
  findAll(@Query() query: QueryVouchersDto) {
    return this.vouchersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get single voucher by ID' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('vouchers.update')
  @ApiOperation({ summary: 'Update voucher (draft only)' })
  update(
    @Param('id') id: string,
    @Body() updateVoucherDto: UpdateVoucherDto,
    @Request() req,
  ) {
    return this.vouchersService.update(id, updateVoucherDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('vouchers.delete')
  @ApiOperation({ summary: 'Delete voucher (draft only)' })
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }

  @Post(':id/post')
  @RequirePermissions('vouchers.post')
  @ApiOperation({ summary: 'Post voucher (mark as final)' })
  postVoucher(@Param('id') id: string, @Request() req) {
    return this.vouchersService.postVoucher(id, req.user.id);
  }

  @Post(':id/unpost')
  @RequirePermissions('vouchers.unpost')
  @ApiOperation({ summary: 'Unpost voucher (admin only)' })
  unpostVoucher(@Param('id') id: string, @Request() req) {
    return this.vouchersService.unpostVoucher(id, req.user.id);
  }

  @Get('next-number/:type')
  @RequirePermissions('vouchers.read')
  @ApiOperation({ summary: 'Get next voucher number for a type' })
  getNextVoucherNumber(@Param('type') type: string) {
    return this.vouchersService.getNextVoucherNumber(type as any);
  }
}

