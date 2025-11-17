import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { BalanceSheetRequestDto } from '../dto/statement-request.dto';

@ApiTags('Financial Statements - Balance Sheet')
@ApiBearerAuth()
@Controller('financial-statements/balance-sheet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BalanceSheetController {
  constructor(private readonly balanceSheetService: BalanceSheetService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Permissions('financial-statements.read')
  @ApiOperation({ summary: 'Generate Balance Sheet (Statement of Financial Position)' })
  @ApiResponse({ status: 200, description: 'Balance Sheet generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateBalanceSheet(@Body() dto: BalanceSheetRequestDto) {
    return this.balanceSheetService.generateBalanceSheet(dto);
  }
}
