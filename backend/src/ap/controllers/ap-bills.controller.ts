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
import { ApBillsService } from '../services/ap-bills.service';
import { CreateApBillDto } from '../dto/create-ap-bill.dto';
import { UpdateApBillDto } from '../dto/update-ap-bill.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('ap-bills')
@Controller('ap-bills')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ApBillsController {
  constructor(private readonly apBillsService: ApBillsService) {}

  @Post()
  @RequirePermissions('ap.create') // Assuming permission key
  @ApiOperation({ summary: 'Create new AP Bill (Draft)' })
  create(@Body() createDto: CreateApBillDto, @Request() req) {
    return this.apBillsService.create(createDto, req.user.id);
  }

  @Get()
  @RequirePermissions('ap.read')
  @ApiOperation({ summary: 'Get all AP Bills' })
  findAll() {
    return this.apBillsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ap.read')
  @ApiOperation({ summary: 'Get AP Bill by ID' })
  findOne(@Param('id') id: string) {
    return this.apBillsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ap.update')
  @ApiOperation({ summary: 'Update AP Bill (Draft only)' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApBillDto,
    @Request() req,
  ) {
    return this.apBillsService.update(id, updateDto, req.user.id);
  }

  @Post(':id/post')
  @RequirePermissions('ap.post')
  @ApiOperation({ summary: 'Post AP Bill (Finalize & Create Voucher)' })
  postBill(@Param('id') id: string, @Request() req) {
    return this.apBillsService.postBill(id, req.user.id);
  }
}
