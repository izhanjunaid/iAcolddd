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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto, QueryAccountsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @RequirePermissions('accounts.create')
  @ApiOperation({ summary: 'Create new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Account code already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.accountsService.create(createAccountDto, req.user.id);
  }

  @Get()
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Get all accounts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Returns list of accounts' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  findAll(@Query() queryDto: QueryAccountsDto) {
    return this.accountsService.findAll(queryDto);
  }

  @Get('tree')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Get complete account hierarchy tree' })
  @ApiResponse({ status: 200, description: 'Returns account tree' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  getTree() {
    return this.accountsService.getAccountTree();
  }

  @Get('detail')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Get all DETAIL type accounts (for transaction selection)' })
  @ApiResponse({ status: 200, description: 'Returns detail accounts' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  getDetailAccounts() {
    return this.accountsService.getDetailAccounts();
  }

  @Get(':id')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Returns account' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Get(':id/tree')
  @RequirePermissions('accounts.read')
  @ApiOperation({ summary: 'Get sub-tree starting from specific account' })
  @ApiResponse({ status: 200, description: 'Returns account sub-tree' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  getSubTree(@Param('id') id: string) {
    return this.accountsService.getSubTree(id);
  }

  @Patch(':id')
  @RequirePermissions('accounts.update')
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Invalid data or system account' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req,
  ) {
    return this.accountsService.update(id, updateAccountDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('accounts.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete: has children or is system account' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async remove(@Param('id') id: string) {
    await this.accountsService.remove(id);
  }
}

