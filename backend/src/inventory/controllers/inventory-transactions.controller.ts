import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { InventoryTransactionsService } from '../services/inventory-transactions.service';
import { InventoryGLService } from '../services/inventory-gl.service';
import { 
  CreateInventoryTransactionDto, 
  QueryInventoryTransactionsDto,
  QueryInventoryBalancesDto,
  StockMovementReportDto,
  InventoryValuationReportDto
} from '../dto';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';

@ApiTags('Inventory Transactions')
@ApiBearerAuth()
@Controller('inventory/transactions')
@UseGuards(JwtAuthGuard)
export class InventoryTransactionsController {
  constructor(
    private readonly transactionsService: InventoryTransactionsService,
    private readonly glService: InventoryGLService,
  ) {}

  @Post()
  @RequirePermissions('inventory.transactions.create')
  @ApiOperation({ summary: 'Process inventory transaction (receipt, issue, transfer, or adjustment)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Transaction processed successfully',
    type: InventoryTransaction 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid data or insufficient stock' 
  })
  async processTransaction(
    @Body() createDto: CreateInventoryTransactionDto,
    @Req() req: any
  ): Promise<InventoryTransaction> {
    return await this.transactionsService.processTransaction(createDto, req.user.id);
  }

  @Post('receipt')
  @RequirePermissions('inventory.transactions.create')
  @ApiOperation({ summary: 'Process goods receipt (shortcut for receipt transaction)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Goods receipt processed successfully',
    type: InventoryTransaction 
  })
  async processReceipt(
    @Body() createDto: CreateInventoryTransactionDto,
    @Req() req: any
  ): Promise<InventoryTransaction> {
    const receiptDto = { ...createDto, transactionType: InventoryTransactionType.RECEIPT };
    return await this.transactionsService.processTransaction(receiptDto, req.user.id);
  }

  @Post('issue')
  @RequirePermissions('inventory.transactions.create')
  @ApiOperation({ summary: 'Process goods issue/dispatch (shortcut for issue transaction)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Goods issue processed successfully',
    type: InventoryTransaction 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Insufficient stock available' 
  })
  async processIssue(
    @Body() createDto: CreateInventoryTransactionDto,
    @Req() req: any
  ): Promise<InventoryTransaction> {
    const issueDto = { ...createDto, transactionType: InventoryTransactionType.ISSUE };
    return await this.transactionsService.processTransaction(issueDto, req.user.id);
  }

  @Post('transfer')
  @RequirePermissions('inventory.transactions.create')
  @ApiOperation({ summary: 'Process stock transfer between locations' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Stock transfer processed successfully',
    type: InventoryTransaction 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Insufficient stock at source location' 
  })
  async processTransfer(
    @Body() createDto: CreateInventoryTransactionDto,
    @Req() req: any
  ): Promise<InventoryTransaction> {
    const transferDto = { ...createDto, transactionType: InventoryTransactionType.TRANSFER };
    return await this.transactionsService.processTransaction(transferDto, req.user.id);
  }

  @Post('adjustment')
  @RequirePermissions('inventory.transactions.create')
  @ApiOperation({ summary: 'Process inventory adjustment (positive or negative)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Inventory adjustment processed successfully',
    type: InventoryTransaction 
  })
  async processAdjustment(
    @Body() createDto: CreateInventoryTransactionDto,
    @Req() req: any
  ): Promise<InventoryTransaction> {
    const adjustmentDto = { ...createDto, transactionType: InventoryTransactionType.ADJUSTMENT };
    return await this.transactionsService.processTransaction(adjustmentDto, req.user.id);
  }

  @Get()
  @RequirePermissions('inventory.transactions.read')
  @ApiOperation({ summary: 'Get all inventory transactions with filtering and pagination' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of transactions retrieved successfully' 
  })
  @ApiQuery({ name: 'itemId', required: false, description: 'Filter by item ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'transactionType', required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'referenceType', required: false, description: 'Filter by reference type' })
  @ApiQuery({ name: 'referenceNumber', required: false, description: 'Filter by reference number' })
  @ApiQuery({ name: 'lotNumber', required: false, description: 'Filter by lot number' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions per page', default: 50 })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of transactions to skip', default: 0 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', default: 'transactionDate' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  async findAll(
    @Query() queryDto: QueryInventoryTransactionsDto
  ): Promise<{
    transactions: InventoryTransaction[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    const result = await this.transactionsService.findAll(queryDto);
    const currentPage = Math.floor((queryDto.offset || 0) / (queryDto.limit || 50)) + 1;
    const hasMore = (queryDto.offset || 0) + (queryDto.limit || 50) < result.total;
    
    return {
      ...result,
      currentPage,
      hasMore,
    };
  }

  @Get(':id')
  @RequirePermissions('inventory.transactions.read')
  @ApiOperation({ summary: 'Get inventory transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Transaction retrieved successfully',
    type: InventoryTransaction 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Transaction not found' 
  })
  async findOne(@Param('id') id: string): Promise<InventoryTransaction> {
    return await this.transactionsService.findOne(id);
  }

  @Post(':id/post-to-gl')
  @RequirePermissions('inventory.transactions.post')
  @ApiOperation({ summary: 'Post inventory transaction to General Ledger' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Transaction posted to GL successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Transaction already posted or invalid' 
  })
  async postToGL(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<{ message: string; voucherId: string }> {
    const voucher = await this.glService.postTransactionToGL(id, req.user.id);
    return { 
      message: 'Transaction posted to General Ledger successfully',
      voucherId: voucher.id
    };
  }

  @Post(':id/reverse-gl')
  @RequirePermissions('inventory.transactions.reverse')
  @ApiOperation({ summary: 'Reverse GL posting for inventory transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'GL posting reversed successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Transaction not posted to GL or invalid' 
  })
  async reverseGL(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<{ message: string; reversalVoucherId: string }> {
    const reversalVoucher = await this.glService.reverseGLPosting(id, req.user.id);
    return { 
      message: 'GL posting reversed successfully',
      reversalVoucherId: reversalVoucher.id
    };
  }
}

@ApiTags('Inventory Balances & Reports')
@ApiBearerAuth()
@Controller('inventory/balances')
@UseGuards(JwtAuthGuard)
export class InventoryBalancesController {
  constructor(
    private readonly transactionsService: InventoryTransactionsService,
  ) {}

  @Get()
  @RequirePermissions('inventory.balances.read')
  @ApiOperation({ summary: 'Get current inventory balances (stock on hand)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory balances retrieved successfully' 
  })
  @ApiQuery({ name: 'itemId', required: false, description: 'Filter by item ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Filter by room ID' })
  @ApiQuery({ name: 'lotNumber', required: false, description: 'Filter by lot number' })
  @ApiQuery({ name: 'itemSku', required: false, description: 'Search by item SKU' })
  @ApiQuery({ name: 'itemName', required: false, description: 'Search by item name' })
  @ApiQuery({ name: 'customerName', required: false, description: 'Search by customer name' })
  @ApiQuery({ name: 'onlyWithStock', required: false, description: 'Show only items with positive stock', default: true })
  @ApiQuery({ name: 'minQuantity', required: false, description: 'Minimum quantity threshold' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records per page', default: 50 })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip', default: 0 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', default: 'totalValue' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  async getBalances(
    @Query() queryDto: QueryInventoryBalancesDto
  ): Promise<any> {
    return await this.transactionsService.getInventoryBalances(queryDto);
  }
}

@ApiTags('Inventory Reports')
@ApiBearerAuth()
@Controller('inventory/reports')
@UseGuards(JwtAuthGuard)
export class InventoryReportsController {
  constructor(
    private readonly transactionsService: InventoryTransactionsService,
    private readonly glService: InventoryGLService,
  ) {}

  @Get('movement')
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({ summary: 'Get stock movement report' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Stock movement report generated successfully' 
  })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'itemId', required: false, description: 'Filter by item ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'transactionType', required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by item category' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records per page', default: 100 })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip', default: 0 })
  async getMovementReport(
    @Query() queryDto: StockMovementReportDto
  ): Promise<any> {
    // This would be implemented by adding a method to the transactions service
    // For now, return a placeholder
    return {
      movements: [],
      summary: {
        totalIn: 0,
        totalOut: 0,
        netMovement: 0,
        totalValue: 0,
      },
      total: 0,
    };
  }

  @Get('valuation')
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Inventory valuation report generated successfully' 
  })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Valuation as of date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by item category' })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group by field', enum: ['warehouse', 'category', 'customer', 'none'], default: 'warehouse' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', enum: ['totalValue', 'totalQuantity', 'averageCost'], default: 'totalValue' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  async getValuationReport(
    @Query() queryDto: InventoryValuationReportDto
  ): Promise<any> {
    // This would be implemented by adding a method to the transactions service
    // For now, return a placeholder
    return {
      valuation: [],
      summary: {
        totalQuantity: 0,
        totalValue: 0,
        averageCost: 0,
        itemCount: 0,
      },
    };
  }

  @Get('gl-posting-status')
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({ summary: 'Get GL posting status report' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'GL posting status retrieved successfully' 
  })
  @ApiQuery({ name: 'fromDate', required: false, description: 'From date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'To date (YYYY-MM-DD)' })
  async getGLPostingStatus(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<{
    totalTransactions: number;
    postedTransactions: number;
    unpostedTransactions: number;
    postingRate: number;
    totalValue: number;
    averageValue: number;
  }> {
    const fromDateObj = fromDate ? new Date(fromDate) : undefined;
    const toDateObj = toDate ? new Date(toDate) : undefined;
    
    return await this.glService.getPostingStatistics(fromDateObj, toDateObj);
  }

  @Get('gl-account-mapping')
  @RequirePermissions('inventory.reports.read')
  @ApiOperation({ summary: 'Get current GL account mapping configuration' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'GL account mapping retrieved successfully' 
  })
  async getGLAccountMapping(): Promise<any> {
    const mapping = this.glService.getGLAccountMapping();
    const validation = await this.glService.validateGLAccountConfiguration();
    
    return {
      mapping,
      validation,
    };
  }
}

