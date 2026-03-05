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
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @RequirePermissions('vendors.create')
  @ApiOperation({ summary: 'Create new vendor' })
  create(@Body() createVendorDto: CreateVendorDto, @Request() req) {
    return this.vendorsService.create(createVendorDto, req.user.id);
  }

  @Get()
  @RequirePermissions('vendors.read')
  @ApiOperation({ summary: 'Get all vendors' })
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('vendors.read')
  @ApiOperation({ summary: 'Get vendor by ID' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('vendors.update')
  @ApiOperation({ summary: 'Update vendor' })
  update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @Request() req,
  ) {
    return this.vendorsService.update(id, updateVendorDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('vendors.delete')
  @ApiOperation({ summary: 'Delete vendor' })
  remove(@Param('id') id: string, @Request() req) {
    return this.vendorsService.remove(id, req.user.id);
  }
}
