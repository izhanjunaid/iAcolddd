import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In, IsNull } from 'typeorm';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryBalance } from '../entities/inventory-balance.entity';
import { InventoryCostLayer } from '../entities/inventory-cost-layer.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { 
  CreateInventoryTransactionDto, 
  QueryInventoryTransactionsDto,
  StockMovementReportDto
} from '../dto';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { 
  InsufficientStockException, 
  InvalidInventoryTransactionException,
  InventoryLocationException
} from '../../common/exceptions/inventory.exception';
import { 
  FIFOCalculationResult, 
  StockMovement, 
  StockAvailability,
  StockMovementSummary
} from '../../common/interfaces/inventory.interface';
import { FIFOCostingService } from './fifo-costing.service';

@Injectable()
export class InventoryTransactionsService {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(InventoryBalance)
    private readonly balanceRepository: Repository<InventoryBalance>,
    @InjectRepository(InventoryCostLayer)
    private readonly costLayerRepository: Repository<InventoryCostLayer>,
    @InjectRepository(InventoryItem)
    private readonly itemRepository: Repository<InventoryItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(FiscalPeriod)
    private readonly fiscalPeriodRepository: Repository<FiscalPeriod>,
    private readonly dataSource: DataSource,
    private readonly fifoService: FIFOCostingService,
  ) {}

  async processTransaction(
    createDto: CreateInventoryTransactionDto, 
    userId: string
  ): Promise<InventoryTransaction> {
    // Validate the transaction
    await this.validateTransaction(createDto);

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(createDto.transactionType);

    // Calculate total cost
    const totalCost = createDto.quantity * createDto.unitCost;

    // Process the transaction in a database transaction
    return await this.dataSource.transaction(async (manager) => {
      // Create the transaction record
      const transaction = manager.create(InventoryTransaction, {
        ...createDto,
        transactionNumber,
        totalCost,
        transactionDate: new Date(createDto.transactionDate),
        expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : undefined,
        manufactureDate: createDto.manufactureDate ? new Date(createDto.manufactureDate) : undefined,
        createdBy: userId,
        fiscalPeriodId: await this.getFiscalPeriodId(createDto.transactionDate),
      });

      const savedTransaction = await manager.save(InventoryTransaction, transaction);

      // Process the stock movement based on transaction type
      switch (createDto.transactionType) {
        case InventoryTransactionType.RECEIPT:
          await this.processReceipt(savedTransaction, manager);
          break;
          
        case InventoryTransactionType.ISSUE:
          await this.processIssue(savedTransaction, manager);
          break;
          
        case InventoryTransactionType.TRANSFER:
          await this.processTransfer(savedTransaction, manager);
          break;
          
        case InventoryTransactionType.ADJUSTMENT:
          await this.processAdjustment(savedTransaction, manager);
          break;
          
        default:
          throw new InvalidInventoryTransactionException(
            `Unsupported transaction type: ${createDto.transactionType}`
          );
      }

      return savedTransaction;
    });
  }

  private async processReceipt(transaction: InventoryTransaction, manager: any): Promise<void> {
    // 1. Create/update inventory balance
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.warehouseId,
        roomId: transaction.roomId,
        lotNumber: transaction.lotNumber,
        quantity: transaction.quantity,
        quantityChange: parseFloat(transaction.quantity as any), // Ensure numeric
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: parseFloat(transaction.unitCost as any), // Ensure numeric
        totalCost: parseFloat(transaction.totalCost as any), // Ensure numeric
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager
    );

    // 2. Create FIFO cost layer
    await this.createCostLayer(transaction, manager);

    // 3. Update item's last cost
    await manager.update(InventoryItem, transaction.itemId, {
      lastCost: transaction.unitCost,
    });
  }

  private async processIssue(transaction: InventoryTransaction, manager: any): Promise<void> {
    // 1. Check stock availability
    const availability = await this.checkStockAvailability(
      transaction.itemId,
      transaction.customerId,
      transaction.warehouseId,
      transaction.roomId,
      transaction.lotNumber,
      transaction.quantity,
      manager
    );

    if (!availability.isAvailable) {
      throw new InsufficientStockException(
        availability.insufficientStockMessage || 
        `Insufficient stock for item ${transaction.itemId}`
      );
    }

    // 2. Calculate FIFO cost
    const fifoResult = await this.fifoService.calculateFIFOCost(
      transaction.itemId,
      transaction.customerId,
      transaction.warehouseId,
      transaction.quantity,
      transaction.lotNumber,
      manager
    );

    // 3. Update transaction with calculated cost
    transaction.unitCost = fifoResult.averageCost;
    transaction.totalCost = fifoResult.totalCost;
    await manager.save(InventoryTransaction, transaction);

    // 4. Consume cost layers
    await this.fifoService.consumeCostLayers(fifoResult.costBreakdown, manager);

    // 5. Update inventory balance
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.warehouseId,
        roomId: transaction.roomId,
        lotNumber: transaction.lotNumber,
        quantity: transaction.quantity,
        quantityChange: -parseFloat(transaction.quantity as any), // Negative for issues (ensure numeric)
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: parseFloat(transaction.unitCost as any), // Ensure numeric
        totalCost: parseFloat(transaction.totalCost as any), // Ensure numeric
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager
    );
  }

  private async processTransfer(transaction: InventoryTransaction, manager: any): Promise<void> {
    if (!transaction.fromWarehouseId || !transaction.toWarehouseId) {
      throw new InvalidInventoryTransactionException(
        'Transfer transactions require both from and to warehouse IDs'
      );
    }

    // 1. Check stock availability at source location
    const availability = await this.checkStockAvailability(
      transaction.itemId,
      transaction.customerId,
      transaction.fromWarehouseId,
      transaction.fromRoomId,
      transaction.lotNumber,
      transaction.quantity,
      manager
    );

    if (!availability.isAvailable) {
      throw new InsufficientStockException(
        availability.insufficientStockMessage || 
        `Insufficient stock at source location`
      );
    }

    // 2. Calculate FIFO cost from source location
    const fifoResult = await this.fifoService.calculateFIFOCost(
      transaction.itemId,
      transaction.customerId,
      transaction.fromWarehouseId,
      transaction.quantity,
      transaction.lotNumber,
      manager
    );

    // 3. Update transaction with calculated cost
    transaction.unitCost = fifoResult.averageCost;
    transaction.totalCost = fifoResult.totalCost;
    await manager.save(InventoryTransaction, transaction);

    // 4. Reduce stock at source location
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.fromWarehouseId,
        roomId: transaction.fromRoomId,
        lotNumber: transaction.lotNumber,
        quantity: transaction.quantity,
        quantityChange: -parseFloat(transaction.quantity as any), // Negative, ensure numeric
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: parseFloat(transaction.unitCost as any), // Ensure numeric
        totalCost: parseFloat(transaction.totalCost as any), // Ensure numeric
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager
    );

    // 5. Increase stock at destination location
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.toWarehouseId,
        roomId: transaction.toRoomId,
        lotNumber: transaction.lotNumber,
        quantity: transaction.quantity,
        quantityChange: parseFloat(transaction.quantity as any), // Ensure numeric
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: parseFloat(transaction.unitCost as any), // Ensure numeric
        totalCost: parseFloat(transaction.totalCost as any), // Ensure numeric
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager
    );

    // 6. Transfer cost layers from source to destination
    await this.fifoService.transferCostLayers(
      fifoResult.costBreakdown,
      transaction.toWarehouseId,
      transaction.toRoomId,
      manager
    );
  }

  private async processAdjustment(transaction: InventoryTransaction, manager: any): Promise<void> {
    const quantityChange = parseFloat(transaction.quantity as any); // Can be positive or negative, ensure numeric

    if (quantityChange < 0) {
      // Negative adjustment (loss/shrinkage)
      const availability = await this.checkStockAvailability(
        transaction.itemId,
        transaction.customerId,
        transaction.warehouseId,
        transaction.roomId,
        transaction.lotNumber,
        Math.abs(quantityChange),
        manager
      );

      if (!availability.isAvailable) {
        throw new InsufficientStockException(
          `Cannot adjust: ${availability.insufficientStockMessage}`
        );
      }

      // Calculate FIFO cost for the adjustment
      const fifoResult = await this.fifoService.calculateFIFOCost(
        transaction.itemId,
        transaction.customerId,
        transaction.warehouseId,
        Math.abs(quantityChange),
        transaction.lotNumber,
        manager
      );

      transaction.unitCost = fifoResult.averageCost;
      transaction.totalCost = fifoResult.totalCost;
      await manager.save(InventoryTransaction, transaction);

      // Consume cost layers
      await this.fifoService.consumeCostLayers(fifoResult.costBreakdown, manager);
    } else {
      // Positive adjustment (found/gain)
      // Use standard cost or provided unit cost
      const item = await manager.findOne(InventoryItem, { 
        where: { id: transaction.itemId } 
      });
      
      if (transaction.unitCost === 0) {
        transaction.unitCost = item.standardCost;
        transaction.totalCost = quantityChange * item.standardCost;
        await manager.save(InventoryTransaction, transaction);
      }

      // Create cost layer for the adjustment
      await this.createCostLayer(transaction, manager);
    }

    // Update inventory balance
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.warehouseId,
        roomId: transaction.roomId,
        lotNumber: transaction.lotNumber,
        quantity: Math.abs(quantityChange),
        quantityChange: quantityChange,
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: parseFloat(transaction.unitCost as any), // Ensure numeric
        totalCost: parseFloat(transaction.totalCost as any), // Ensure numeric
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager
    );
  }

  private async updateInventoryBalance(
    movement: StockMovement, 
    manager: any
  ): Promise<void> {
    try {
      // Build where clause that properly handles null values
      const whereClause: any = {
        itemId: movement.itemId,
        warehouseId: movement.warehouseId,
      };

      // Only add non-null values to where clause
      // For null values, use IsNull() operator
      if (movement.customerId !== null && movement.customerId !== undefined) {
        whereClause.customerId = movement.customerId;
      } else {
        whereClause.customerId = IsNull();
      }

      if (movement.roomId !== null && movement.roomId !== undefined) {
        whereClause.roomId = movement.roomId;
      } else {
        whereClause.roomId = IsNull();
      }

      if (movement.lotNumber !== null && movement.lotNumber !== undefined) {
        whereClause.lotNumber = movement.lotNumber;
      } else {
        whereClause.lotNumber = IsNull();
      }

      let balance = await manager.findOne(InventoryBalance, { where: whereClause });

      if (!balance) {
        // Create new balance record
        balance = manager.create(InventoryBalance, {
          itemId: movement.itemId,
          customerId: movement.customerId,
          warehouseId: movement.warehouseId,
          roomId: movement.roomId,
          lotNumber: movement.lotNumber,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          weightedAverageCost: 0,
          totalValue: 0,
        });
      }

    // Update quantities (convert database decimals to numbers)
    const oldQuantity = parseFloat(balance.quantityOnHand as any) || 0;
    const oldValue = parseFloat(balance.totalValue as any) || 0;
    const oldAvgCost = parseFloat(balance.weightedAverageCost as any) || 0;
    const oldReserved = parseFloat(balance.quantityReserved as any) || 0;
    
    const newQuantity = oldQuantity + movement.quantityChange;

    if (newQuantity < 0) {
      throw new InsufficientStockException(
        `Operation would result in negative stock: ${newQuantity}`
      );
    }

    // Calculate new weighted average cost
    if (movement.quantityChange > 0) {
      // Adding stock - recalculate weighted average
      const addedValue = movement.quantityChange * movement.unitCost;
      const newValue = oldValue + addedValue;
      
      balance.weightedAverageCost = newQuantity > 0 ? newValue / newQuantity : 0;
      balance.totalValue = newValue;
    } else {
      // Reducing stock - maintain existing weighted average cost
      balance.totalValue = newQuantity * oldAvgCost;
    }

      balance.quantityOnHand = newQuantity;
      balance.quantityAvailable = newQuantity - oldReserved;
      balance.lastMovementDate = movement.transactionDate;
      balance.lastMovementType = movement.transactionType;

      await manager.save(InventoryBalance, balance);
      
    } catch (error) {
      throw error;
    }

    // If quantity is zero, optionally remove the balance record
    // (Keeping it for audit trail - could be a configuration option)
  }

  private async createCostLayer(
    transaction: InventoryTransaction, 
    manager: any
  ): Promise<void> {
    const costLayer = manager.create(InventoryCostLayer, {
      itemId: transaction.itemId,
      customerId: transaction.customerId,
      warehouseId: transaction.warehouseId,
      roomId: transaction.roomId,
      lotNumber: transaction.lotNumber,
      receiptDate: transaction.transactionDate,
      receiptReference: transaction.referenceNumber,
      receiptTransactionId: transaction.id,
      originalQuantity: transaction.quantity,
      remainingQuantity: transaction.quantity,
      unitCost: transaction.unitCost,
      isFullyConsumed: false,
    });

    await manager.save(InventoryCostLayer, costLayer);
  }

  private async checkStockAvailability(
    itemId: string,
    customerId: string,
    warehouseId: string,
    roomId: string,
    lotNumber: string,
    requiredQuantity: number,
    manager: any
  ): Promise<StockAvailability> {
    const balanceKey: any = {
      itemId,
      warehouseId,
    };

    if (customerId) balanceKey.customerId = customerId;
    if (roomId) balanceKey.roomId = roomId;
    if (lotNumber) balanceKey.lotNumber = lotNumber;

    const balance = await manager.findOne(InventoryBalance, { where: balanceKey });

    if (!balance) {
      return {
        itemId,
        customerId,
        warehouseId,
        roomId,
        availableQuantity: 0,
        reservedQuantity: 0,
        totalOnHand: 0,
        isAvailable: false,
        insufficientStockMessage: 'No stock available at this location',
      };
    }

    const isAvailable = balance.quantityAvailable >= requiredQuantity;

    return {
      itemId,
      customerId,
      warehouseId,
      roomId,
      availableQuantity: balance.quantityAvailable,
      reservedQuantity: balance.quantityReserved,
      totalOnHand: balance.quantityOnHand,
      isAvailable,
      insufficientStockMessage: isAvailable 
        ? undefined 
        : `Required: ${requiredQuantity}, Available: ${balance.quantityAvailable}`,
    };
  }

  private async validateTransaction(createDto: CreateInventoryTransactionDto): Promise<void> {
    // Validate item exists
    const item = await this.itemRepository.findOne({
      where: { id: createDto.itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${createDto.itemId} not found or inactive`);
    }

    // Validate customer exists (if provided)
    if (createDto.customerId) {
      const customer = await this.customerRepository.findOne({
        where: { id: createDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
      }
    }

    // Validate unit of measure matches item
    if (createDto.unitOfMeasure !== item.unitOfMeasure) {
      throw new BadRequestException(
        `Unit of measure mismatch. Item uses ${item.unitOfMeasure}, transaction uses ${createDto.unitOfMeasure}`
      );
    }

    // Validate transfer-specific fields
    if (createDto.transactionType === InventoryTransactionType.TRANSFER) {
      if (!createDto.fromWarehouseId || !createDto.toWarehouseId) {
        throw new BadRequestException(
          'Transfer transactions require both fromWarehouseId and toWarehouseId'
        );
      }

      if (createDto.fromWarehouseId === createDto.toWarehouseId && 
          createDto.fromRoomId === createDto.toRoomId) {
        throw new BadRequestException(
          'Source and destination locations cannot be the same'
        );
      }
    }

    // Validate quantity
    if (createDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    // Validate unit cost
    if (createDto.unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative');
    }

    // Validate expiry date for perishable items
    if (item.isPerishable && createDto.expiryDate) {
      const expiryDate = new Date(createDto.expiryDate);
      const transactionDate = new Date(createDto.transactionDate);
      
      if (expiryDate <= transactionDate) {
        throw new BadRequestException('Expiry date must be after transaction date');
      }
    }
  }

  private async generateTransactionNumber(type: InventoryTransactionType): Promise<string> {
    const prefix = this.getTransactionPrefix(type);
    const year = new Date().getFullYear();
    
    // Get the next sequence number for this type and year
    const lastTransaction = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.transactionNumber LIKE :pattern', { pattern: `${prefix}-${year}-%` })
      .orderBy('t.createdAt', 'DESC')
      .getOne();

    let nextSequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionNumber.split('-').pop() || '0');
      nextSequence = lastSequence + 1;
    }

    return `${prefix}-${year}-${nextSequence.toString().padStart(4, '0')}`;
  }

  private getTransactionPrefix(type: InventoryTransactionType): string {
    switch (type) {
      case InventoryTransactionType.RECEIPT:
        return 'RCP';
      case InventoryTransactionType.ISSUE:
        return 'ISS';
      case InventoryTransactionType.TRANSFER:
        return 'TRF';
      case InventoryTransactionType.ADJUSTMENT:
        return 'ADJ';
      default:
        return 'INV';
    }
  }

  private async getFiscalPeriodId(transactionDate: string): Promise<string> {
    const date = new Date(transactionDate);
    const period = await this.fiscalPeriodRepository
      .createQueryBuilder('period')
      .where('period.startDate <= :date AND period.endDate >= :date', { date })
      .getOne();

    return period?.id || '';
  }

  // Additional query methods
  async findAll(queryDto: QueryInventoryTransactionsDto): Promise<{
    transactions: InventoryTransaction[];
    total: number;
    totalPages: number;
  }> {
    const {
      itemId,
      customerId,
      warehouseId,
      transactionType,
      referenceType,
      referenceNumber,
      lotNumber,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
      sortBy = 'transactionDate',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.item', 'item')
      .leftJoinAndSelect('transaction.customer', 'customer')
      .leftJoinAndSelect('transaction.createdByUser', 'createdByUser');

    // Apply filters
    if (itemId) {
      queryBuilder.andWhere('transaction.itemId = :itemId', { itemId });
    }

    if (customerId) {
      queryBuilder.andWhere('transaction.customerId = :customerId', { customerId });
    }

    if (warehouseId) {
      queryBuilder.andWhere('transaction.warehouseId = :warehouseId', { warehouseId });
    }

    if (transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :transactionType', { transactionType });
    }

    if (referenceType) {
      queryBuilder.andWhere('transaction.referenceType = :referenceType', { referenceType });
    }

    if (referenceNumber) {
      queryBuilder.andWhere('transaction.referenceNumber ILIKE :referenceNumber', { 
        referenceNumber: `%${referenceNumber}%` 
      });
    }

    if (lotNumber) {
      queryBuilder.andWhere('transaction.lotNumber ILIKE :lotNumber', { 
        lotNumber: `%${lotNumber}%` 
      });
    }

    if (fromDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :toDate', { toDate });
    }

    // Apply sorting
    const allowedSortFields = [
      'transactionDate', 'transactionNumber', 'transactionType', 
      'quantity', 'unitCost', 'totalCost', 'createdAt'
    ];
    
    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('transaction.transactionDate', 'DESC');
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      total,
      totalPages,
    };
  }

  async findOne(id: string): Promise<InventoryTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['item', 'customer', 'createdByUser', 'fiscalPeriod', 'glVoucher'],
    });

    if (!transaction) {
      throw new NotFoundException(`Inventory transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async getInventoryBalances(queryDto: any): Promise<any> {
    const queryBuilder = this.balanceRepository.createQueryBuilder('balance')
      .leftJoinAndSelect('balance.item', 'item')
      .leftJoinAndSelect('balance.customer', 'customer');

    // Default filters
    if (queryDto.onlyWithStock !== false) {
      queryBuilder.andWhere('balance.quantityOnHand > 0');
    }

    // Apply filters
    if (queryDto.itemId) {
      queryBuilder.andWhere('balance.itemId = :itemId', { itemId: queryDto.itemId });
    }

    if (queryDto.customerId) {
      queryBuilder.andWhere('balance.customerId = :customerId', { customerId: queryDto.customerId });
    }

    if (queryDto.warehouseId) {
      queryBuilder.andWhere('balance.warehouseId = :warehouseId', { warehouseId: queryDto.warehouseId });
    }

    if (queryDto.roomId) {
      queryBuilder.andWhere('balance.roomId = :roomId', { roomId: queryDto.roomId });
    }

    if (queryDto.lotNumber) {
      queryBuilder.andWhere('balance.lotNumber = :lotNumber', { lotNumber: queryDto.lotNumber });
    }

    if (queryDto.itemSku) {
      queryBuilder.andWhere('item.sku ILIKE :itemSku', { itemSku: `%${queryDto.itemSku}%` });
    }

    if (queryDto.itemName) {
      queryBuilder.andWhere('item.name ILIKE :itemName', { itemName: `%${queryDto.itemName}%` });
    }

    if (queryDto.customerName) {
      queryBuilder.andWhere('customer.name ILIKE :customerName', { customerName: `%${queryDto.customerName}%` });
    }

    if (queryDto.minQuantity) {
      queryBuilder.andWhere('balance.quantityOnHand >= :minQuantity', { minQuantity: queryDto.minQuantity });
    }

    // Sorting
    const sortBy = queryDto.sortBy || 'totalValue';
    const sortOrder = queryDto.sortOrder || 'DESC';
    
    const validSortFields = ['quantityOnHand', 'totalValue', 'weightedAverageCost', 'lastMovementDate'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'totalValue';
    
    queryBuilder.orderBy(`balance.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Pagination
    const page = Math.max(1, parseInt(queryDto.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryDto.limit) || 50));
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [balances, total] = await queryBuilder.getManyAndCount();

    return {
      balances,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasMore: total > offset + balances.length,
    };
  }
}
