import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get Dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'KPI summary' })
  async getKPIs() {
    return await this.dashboardService.getKPIs();
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get monthly revenue & expense trends (last 6 months)',
  })
  @ApiResponse({ status: 200, description: 'Monthly trend data' })
  async getMonthlyTrends() {
    return await this.dashboardService.getMonthlyTrends();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity across all modules' })
  @ApiResponse({ status: 200, description: 'Recent activity list' })
  async getRecentActivity() {
    return await this.dashboardService.getRecentActivity();
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get operational alerts (overdue items, low stock)',
  })
  @ApiResponse({ status: 200, description: 'Active alerts' })
  async getOperationalAlerts() {
    return await this.dashboardService.getOperationalAlerts();
  }
}
