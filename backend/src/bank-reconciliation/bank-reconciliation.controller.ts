import {
    Controller,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('bank-reconciliation')
@Controller('bank-reconciliation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BankReconciliationController {
    constructor(private readonly reconciliationService: BankReconciliationService) { }

    @Post('statements')
    @RequirePermissions('vouchers.create')
    @ApiOperation({ summary: 'Create a new bank statement' })
    @ApiResponse({ status: 201, description: 'Bank statement created successfully' })
    async createStatement(@Body() createDto: any, @Request() req) {
        return this.reconciliationService.createStatement(createDto, req.user.id);
    }

    @Post('statements/:id/lines')
    @RequirePermissions('vouchers.create')
    @ApiOperation({ summary: 'Add lines to a bank statement' })
    @ApiResponse({ status: 201, description: 'Lines added successfully' })
    async addLines(@Param('id') id: string, @Body() lines: any[]) {
        return this.reconciliationService.addLines(id, lines);
    }

    @Post('statements/:id/auto-match')
    @RequirePermissions('vouchers.create')
    @ApiOperation({ summary: 'Auto-match statement lines with system vouchers' })
    @ApiResponse({ status: 200, description: 'Auto-matching completed' })
    async autoMatch(@Param('id') id: string) {
        return this.reconciliationService.autoMatch(id);
    }

    @Get('statements/:id/status')
    @RequirePermissions('vouchers.read')
    @ApiOperation({ summary: 'Get reconciliation status' })
    @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
    async getStatus(@Param('id') id: string) {
        return this.reconciliationService.getReconciliationStatus(id);
    }
}
