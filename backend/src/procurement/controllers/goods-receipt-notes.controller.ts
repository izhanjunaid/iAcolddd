import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GoodsReceiptNotesService } from '../services/goods-receipt-notes.service';
import { CreateGoodsReceiptNoteDto } from '../dto/create-goods-receipt-note.dto';
import { GrnStatus } from '../enums/grn-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Goods Receipt Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goods-receipt-notes')
export class GoodsReceiptNotesController {
  constructor(private readonly grnService: GoodsReceiptNotesService) {}

  @Post()
  create(@Body() createGrnDto: CreateGoodsReceiptNoteDto, @Request() req) {
    return this.grnService.create(createGrnDto, req.user.id);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: GrnStatus })
  @ApiQuery({ name: 'vendorId', required: false, type: String })
  @ApiQuery({ name: 'purchaseOrderId', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: GrnStatus,
    @Query('vendorId') vendorId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
  ) {
    return this.grnService.findAll({
      page,
      limit,
      status,
      vendorId,
      purchaseOrderId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grnService.findOne(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req) {
    return this.grnService.complete(id, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.grnService.cancel(id, req.user.id);
  }
}
