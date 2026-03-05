import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming Auth exists

@ApiTags('Approvals')
@Controller('approvals')
// @UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending approval requests' })
  async getPendingRequests(@Req() req) {
    // In real app, extracting user from req.user
    const userId = req.user?.id || 'TEST_USER_ID';
    return this.approvalsService.findMyPendingRequests(userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a request' })
  async approve(@Param('id') id: string, @Body() body: { approverId: string }) {
    // Temporary: accepting userId in body for testing ease, real app uses req.user
    return this.approvalsService.approveRequest(id, body.approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a request' })
  async reject(
    @Param('id') id: string,
    @Body() body: { approverId: string; reason: string },
  ) {
    return this.approvalsService.rejectRequest(
      id,
      body.approverId,
      body.reason,
    );
  }
}
