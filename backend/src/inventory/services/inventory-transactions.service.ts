import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
  StockMovementReportDto,
  InventoryValuationReportDto,
} from '../dto';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import {
  InsufficientStockException,
  InvalidInventoryTransactionException,
  InventoryLocationException,
} from '../../common/exceptions/inventory.exception';
import {
  FIFOCalculationResult,
  StockMovement,
  StockAvailability,
  StockMovementSummary,
} from '../../common/interfaces/inventory.interface';
import { FIFOCostingService } from './fifo-costing.service';

import Decimal from 'decimal.js';

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
  ) {
    // Defaults are fine, skipping explicit set to avoid type issues
  }

  private toDecimal(value: any): any {
    return new Decimal(value || 0);
  }

  async processTransaction(
    createDto: CreateInventoryTransactionDto,
    userId: string,
    existingManager?: any,
  ): Promise<InventoryTransaction> {
    // Validate the transaction
    await this.validateTransaction(createDto);

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(
      createDto.transactionType,
    );

    // Calculate total cost (default to 0 if unitCost is missing, e.g. for ISSUE/RETURN where it's calculated later)
    const unitCost = createDto.unitCost || 0;
    const totalCost = createDto.quantity * unitCost;

    const executeLogic = async (manager: any) => {
      // Create the transaction record
      const transaction = manager.create(InventoryTransaction, {
        ...createDto,
        transactionNumber,
        unitCost, // Explicitly set to override undefined from createDto spread (prevents NOT NULL violation)
        totalCost,
        transactionDate: new Date(createDto.transactionDate),
        expiryDate: createDto.expiryDate
          ? new Date(createDto.expiryDate)
          : undefined,
        manufactureDate: createDto.manufactureDate
          ? new Date(createDto.manufactureDate)
          : undefined,
        createdBy: userId,
        fiscalPeriodId: await this.getFiscalPeriodId(createDto.transactionDate),
      });

      const savedTransaction = await manager.save(
        InventoryTransaction,
        transaction,
      );

      // Process the stock movement based on transaction type
      switch (createDto.transactionType) {
        case InventoryTransactionType.RECEIPT:
          await this.processReceipt(savedTransaction, manager);
          break;

        case InventoryTransactionType.ISSUE:
          await this.processIssue(savedTransaction, manager);
          break;

        case InventoryTransactionType.CONSUMPTION:
          await this.processConsumption(savedTransaction, manager);
          break;

        case InventoryTransactionType.TRANSFER:
          await this.processTransfer(savedTransaction, manager);
          break;

        case InventoryTransactionType.ADJUSTMENT:
          await this.processAdjustment(savedTransaction, manager);
          break;

        case InventoryTransactionType.SALES_RETURN:
          await this.processSalesReturn(savedTransaction, manager);
          break;

        default:
          throw new InvalidInventoryTransactionException(
            `Unsupported transaction type: ${createDto.transactionType}`,
          );
      }

      return savedTransaction;
    };

    // Process the transaction in the existing transaction or create a new one
    if (existingManager) {
      return await executeLogic(existingManager);
    } else {
      return await this.dataSource.transaction(executeLogic);
    }
  }

  private async processReceipt(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
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
      manager,
    );

    // 2. Create FIFO cost layer
    await this.createCostLayer(transaction, manager);

    // 3. Update item's last cost
    await manager.update(InventoryItem, transaction.itemId, {
      lastCost: transaction.unitCost,
    });
  }

  private async processConsumption(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
    // Internal consumption is processed exactly like an issue in terms of stock movement and costing
    await this.processIssue(transaction, manager);
  }

  private async processIssue(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
    // 1. Check stock availability
    const availability = await this.checkStockAvailability(
      transaction.itemId,
      transaction.customerId,
      transaction.warehouseId,
      transaction.roomId,
      transaction.lotNumber,
      transaction.quantity,
      manager,
    );

    if (!availability.isAvailable) {
      throw new InsufficientStockException(
        availability.insufficientStockMessage ||
          `Insufficient stock for item ${transaction.itemId}`,
      );
    }

    // 2. Calculate FIFO cost
    const fifoResult = await this.fifoService.calculateFIFOCost(
      transaction.itemId,
      transaction.customerId,
      transaction.warehouseId,
      transaction.quantity,
      transaction.lotNumber,
      manager,
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
      manager,
    );
  }

  private async processTransfer(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
    if (!transaction.fromWarehouseId || !transaction.toWarehouseId) {
      throw new InvalidInventoryTransactionException(
        'Transfer transactions require both from and to warehouse IDs',
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
      manager,
    );

    if (!availability.isAvailable) {
      throw new InsufficientStockException(
        availability.insufficientStockMessage ||
          `Insufficient stock at source location`,
      );
    }

    // 2. Calculate FIFO cost from source location
    const fifoResult = await this.fifoService.calculateFIFOCost(
      transaction.itemId,
      transaction.customerId,
      transaction.fromWarehouseId,
      transaction.quantity,
      transaction.lotNumber,
      manager,
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
      manager,
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
      manager,
    );

    // 6. Transfer cost layers from source to destination
    await this.fifoService.transferCostLayers(
      fifoResult.costBreakdown,
      transaction.toWarehouseId,
      transaction.toRoomId,
      manager,
    );
  }

  private async processAdjustment(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
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
        manager,
      );

      if (!availability.isAvailable) {
        throw new InsufficientStockException(
          `Cannot adjust: ${availability.insufficientStockMessage}`,
        );
      }

      // Calculate FIFO cost for the adjustment
      const fifoResult = await this.fifoService.calculateFIFOCost(
        transaction.itemId,
        transaction.customerId,
        transaction.warehouseId,
        Math.abs(quantityChange),
        transaction.lotNumber,
        manager,
      );

      transaction.unitCost = fifoResult.averageCost;
      transaction.totalCost = fifoResult.totalCost;
      await manager.save(InventoryTransaction, transaction);

      // Consume cost layers
      await this.fifoService.consumeCostLayers(
        fifoResult.costBreakdown,
        manager,
      );
    } else {
      // Positive adjustment (found/gain)
      // Use standard cost or provided unit cost
      const item = await manager.findOne(InventoryItem, {
        where: { id: transaction.itemId },
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
      manager,
    );
  }

  private async processSalesReturn(
    transaction: InventoryTransaction,
    manager: any,
  ): Promise<void> {
    // 1. Validate Reference to Original Issue
    if (!transaction.referenceId) {
      throw new InvalidInventoryTransactionException(
        'Sales Return must reference the original Issue transaction ID',
      );
    }

    const originalIssue = await manager.findOne(InventoryTransaction, {
      where: {
        id: transaction.referenceId,
        transactionType: InventoryTransactionType.ISSUE,
      },
    });

    if (!originalIssue) {
      throw new InvalidInventoryTransactionException(
        `Original Issue transaction ${transaction.referenceId} not found`,
      );
    }

    // 2. Restore Cost from Original Issue
    // We assume the return cost should match the original issue unit cost to reverse the COGS impact correctly.
    transaction.unitCost = Number(originalIssue.unitCost);
    transaction.totalCost = this.toDecimal(transaction.quantity)
      .mul(transaction.unitCost)
      .toNumber();
    await manager.save(InventoryTransaction, transaction);

    // 3. Update Inventory Balance (Increase Stock)
    await this.updateInventoryBalance(
      {
        itemId: transaction.itemId,
        customerId: transaction.customerId,
        warehouseId: transaction.warehouseId,
        roomId: transaction.roomId,
        lotNumber: transaction.lotNumber,
        quantity: transaction.quantity,
        quantityChange: Number(transaction.quantity),
        unitOfMeasure: transaction.unitOfMeasure,
        unitCost: Number(transaction.unitCost),
        totalCost: Number(transaction.totalCost),
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      manager,
    );

    // 4. Create a new Cost Layer at the Returned Cost
    // This effectively puts the item back into inventory at its original cost basis.
    await this.createCostLayer(transaction, manager);
  }

  private async updateInventoryBalance(
    movement: StockMovement,
    manager: any,
  ): Promise<void> {
    try {
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

      let balance = await manager.findOne(InventoryBalance, {
        where: whereClause,
        lock: { mode: 'pessimistic_write' },
      });

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

      // Update quantities using Decimal for precision
      const oldQuantity = this.toDecimal(balance.quantityOnHand);
      const oldValue = this.toDecimal(balance.totalValue);
      const oldReserved = this.toDecimal(balance.quantityReserved);

      const qtyChange = this.toDecimal(movement.quantityChange);
      const newQuantity = oldQuantity.plus(qtyChange);

      // STRICT NEGATIVE STOCK CHECK
      if (newQuantity.isNegative()) {
        throw new InsufficientStockException(
          `Operation would result in negative stock: ${newQuantity.toFixed(4)}`,
        );
      }

      // Calculate new Total Value and Weighted Average Cost
      // Logic:
      // - Receipts/Returns (Positive Change): Add the exact transaction cost to Total Value.
      // - Issues/Transfers (Negative Change): Subtract the exact transaction cost from Total Value.

      // Note: movement.totalCost should be the EXACT logic cost (FIFO cost for issues).
      const txTotalCost = this.toDecimal(movement.totalCost);

      let newValue: any;

      if (qtyChange.isPositive()) {
        // Adding stock: Value increases by transaction cost
        newValue = oldValue.plus(txTotalCost);
      } else {
        // Removing stock: Value decreases by transaction cost (which should be positive in the simple sum, but logic might vary)
        // If movement.totalCost is passed as positive number for the "Value of the goods moved":
        newValue = oldValue.minus(txTotalCost);
      }

      // Safeguard: Value shouldn't be negative if quantity is substantial (unless penny rounding errors)
      // If Quantity is 0, Value must be 0.
      if (newQuantity.isZero()) {
        newValue = new Decimal(0);
      } else if (newValue.isNegative()) {
        // This theoretically shouldn't happen if FIFO is correct, but floating point drift could cause it.
        // We clamp to 0 or allow small negative? Better to clamp to 0 for sanity, or warn.
        newValue = new Decimal(0);
      }

      balance.totalValue = newValue.toNumber();
      balance.weightedAverageCost = newQuantity.isZero()
        ? 0
        : newValue.div(newQuantity).toNumber();

      balance.quantityOnHand = newQuantity.toNumber();
      balance.quantityAvailable = newQuantity.minus(oldReserved).toNumber();
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
    manager: any,
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
    manager: any,
  ): Promise<StockAvailability> {
    const balanceKey: any = {
      itemId,
      warehouseId,
    };

    if (customerId) balanceKey.customerId = customerId;
    else balanceKey.customerId = IsNull();

    if (roomId) balanceKey.roomId = roomId;
    else balanceKey.roomId = IsNull();

    if (lotNumber) balanceKey.lotNumber = lotNumber;
    else balanceKey.lotNumber = IsNull();

    const balance = await manager.findOne(InventoryBalance, {
      where: balanceKey,
      lock: { mode: 'pessimistic_write' },
    });

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

  private async validateTransaction(
    createDto: CreateInventoryTransactionDto,
  ): Promise<void> {
    // Validate item exists
    const item = await this.itemRepository.findOne({
      where: { id: createDto.itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${createDto.itemId} not found or inactive`,
      );
    }

    // Validate customer exists (if provided)
    if (createDto.customerId) {
      const customer = await this.customerRepository.findOne({
        where: { id: createDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${createDto.customerId} not found`,
        );
      }
    }

    // Validate unit of measure matches item
    if (createDto.unitOfMeasure !== item.unitOfMeasure) {
      throw new BadRequestException(
        `Unit of measure mismatch. Item uses ${item.unitOfMeasure}, transaction uses ${createDto.unitOfMeasure}`,
      );
    }

    // Validate transfer-specific fields
    if (createDto.transactionType === InventoryTransactionType.TRANSFER) {
      if (!createDto.fromWarehouseId || !createDto.toWarehouseId) {
        throw new BadRequestException(
          'Transfer transactions require both fromWarehouseId and toWarehouseId',
        );
      }

      if (
        createDto.fromWarehouseId === createDto.toWarehouseId &&
        createDto.fromRoomId === createDto.toRoomId
      ) {
        throw new BadRequestException(
          'Source and destination locations cannot be the same',
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
        throw new BadRequestException(
          'Expiry date must be after transaction date',
        );
      }
    }
  }

  private async generateTransactionNumber(
    type: InventoryTransactionType,
  ): Promise<string> {
    const prefix = this.getTransactionPrefix(type);
    const year = new Date().getFullYear();

    // Get the next sequence number for this type and year
    const lastTransaction = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.transactionNumber LIKE :pattern', {
        pattern: `${prefix}-${year}-%`,
      })
      .orderBy('t.createdAt', 'DESC')
      .getOne();

    let nextSequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(
        lastTransaction.transactionNumber.split('-').pop() || '0',
      );
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
      case InventoryTransactionType.CONSUMPTION:
        return 'CON';
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

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.item', 'item')
      .leftJoinAndSelect('transaction.customer', 'customer')
      .leftJoinAndSelect('transaction.createdByUser', 'createdByUser');

    // Apply filters
    if (itemId) {
      queryBuilder.andWhere('transaction.itemId = :itemId', { itemId });
    }

    if (customerId) {
      queryBuilder.andWhere('transaction.customerId = :customerId', {
        customerId,
      });
    }

    if (warehouseId) {
      queryBuilder.andWhere('transaction.warehouseId = :warehouseId', {
        warehouseId,
      });
    }

    if (transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :transactionType', {
        transactionType,
      });
    }

    if (referenceType) {
      queryBuilder.andWhere('transaction.referenceType = :referenceType', {
        referenceType,
      });
    }

    if (referenceNumber) {
      queryBuilder.andWhere(
        'transaction.referenceNumber ILIKE :referenceNumber',
        {
          referenceNumber: `%${referenceNumber}%`,
        },
      );
    }

    if (lotNumber) {
      queryBuilder.andWhere('transaction.lotNumber ILIKE :lotNumber', {
        lotNumber: `%${lotNumber}%`,
      });
    }

    if (fromDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :fromDate', {
        fromDate,
      });
    }

    if (toDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :toDate', {
        toDate,
      });
    }

    // Apply sorting
    const allowedSortFields = [
      'transactionDate',
      'transactionNumber',
      'transactionType',
      'quantity',
      'unitCost',
      'totalCost',
      'createdAt',
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
      relations: [
        'item',
        'customer',
        'createdByUser',
        'fiscalPeriod',
        'glVoucher',
      ],
    });

    if (!transaction) {
      throw new NotFoundException(
        `Inventory transaction with ID ${id} not found`,
      );
    }

    return transaction;
  }

  async getInventoryBalances(queryDto: any): Promise<any> {
    const queryBuilder = this.balanceRepository
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.item', 'item')
      .leftJoinAndSelect('balance.customer', 'customer');

    // Default filters
    if (queryDto.onlyWithStock !== false) {
      queryBuilder.andWhere('balance.quantityOnHand > 0');
    }

    // Apply filters
    if (queryDto.itemId) {
      queryBuilder.andWhere('balance.itemId = :itemId', {
        itemId: queryDto.itemId,
      });
    }

    if (queryDto.customerId) {
      queryBuilder.andWhere('balance.customerId = :customerId', {
        customerId: queryDto.customerId,
      });
    }

    if (queryDto.warehouseId) {
      queryBuilder.andWhere('balance.warehouseId = :warehouseId', {
        warehouseId: queryDto.warehouseId,
      });
    }

    if (queryDto.roomId) {
      queryBuilder.andWhere('balance.roomId = :roomId', {
        roomId: queryDto.roomId,
      });
    }

    if (queryDto.lotNumber) {
      queryBuilder.andWhere('balance.lotNumber = :lotNumber', {
        lotNumber: queryDto.lotNumber,
      });
    }

    if (queryDto.itemSku) {
      queryBuilder.andWhere('item.sku ILIKE :itemSku', {
        itemSku: `%${queryDto.itemSku}%`,
      });
    }

    if (queryDto.itemName) {
      queryBuilder.andWhere('item.name ILIKE :itemName', {
        itemName: `%${queryDto.itemName}%`,
      });
    }

    if (queryDto.customerName) {
      queryBuilder.andWhere('customer.name ILIKE :customerName', {
        customerName: `%${queryDto.customerName}%`,
      });
    }

    if (queryDto.minQuantity) {
      queryBuilder.andWhere('balance.quantityOnHand >= :minQuantity', {
        minQuantity: queryDto.minQuantity,
      });
    }

    // Sorting
    const sortBy = queryDto.sortBy || 'totalValue';
    const sortOrder = queryDto.sortOrder || 'DESC';

    const validSortFields = [
      'quantityOnHand',
      'totalValue',
      'weightedAverageCost',
      'lastMovementDate',
    ];
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

  async getValuationReport(
    queryDto: InventoryValuationReportDto,
  ): Promise<any> {
    const {
      asOfDate,
      warehouseId,
      customerId,
      category,
      groupBy = 'warehouse',
      sortBy = 'totalValue',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.costLayerRepository
      .createQueryBuilder('layer')
      .leftJoinAndSelect('layer.item', 'item')
      .leftJoin('layer.customer', 'customer')
      .where('layer.isFullyConsumed = :isFullyConsumed', {
        isFullyConsumed: false,
      })
      .andWhere('layer.remainingQuantity > 0');

    // Apply filters
    if (asOfDate) {
      queryBuilder.andWhere('layer.receiptDate <= :asOfDate', {
        asOfDate: new Date(asOfDate),
      });
    }

    if (warehouseId) {
      queryBuilder.andWhere('layer.warehouseId = :warehouseId', {
        warehouseId,
      });
    }

    if (customerId) {
      queryBuilder.andWhere('layer.customerId = :customerId', { customerId });
    }

    if (category) {
      queryBuilder.andWhere('item.category = :category', { category });
    }

    // Select based on grouping
    let groupByField = '';
    let selectFields: any[] = [];

    switch (groupBy) {
      case 'warehouse':
        groupByField = 'layer.warehouseId';
        selectFields = [
          'layer.warehouseId AS "groupId"',
          'layer.warehouseId AS "groupName"', // Warehouse name would require join, keeping ID for now
        ];
        break;
      case 'customer':
        groupByField = 'layer.customerId';
        selectFields = [
          'layer.customerId AS "groupId"',
          'customer.name AS "groupName"',
        ];
        break;
      case 'category':
        groupByField = 'item.category';
        selectFields = [
          'item.category AS "groupId"',
          'item.category AS "groupName"',
        ];
        break;
      case 'none':
      default:
        groupByField = 'layer.itemId';
        selectFields = [
          'layer.itemId AS "groupId"',
          'item.name AS "groupName"',
          'item.sku AS "sku"',
          'item.unitOfMeasure AS "unitOfMeasure"',
        ];
        break;
    }

    // Add aggregates
    queryBuilder.select([
      ...selectFields,
      'SUM(layer.remainingQuantity) AS "totalQuantity"',
      'SUM(layer.remainingQuantity * layer.unitCost) AS "totalValue"',
      'COUNT(layer.id) AS "layerCount"',
    ]);

    if (groupBy !== 'none') {
      queryBuilder.addGroupBy(groupByField);
      if (groupBy === 'customer') queryBuilder.addGroupBy('customer.name');
    } else {
      queryBuilder.addGroupBy('layer.itemId');
      queryBuilder.addGroupBy('item.name');
      queryBuilder.addGroupBy('item.sku');
      queryBuilder.addGroupBy('item.unitOfMeasure');
    }

    // Execute query
    const rawResults = await queryBuilder.getRawMany();

    // Process results (formatting numbers)
    const valuation = rawResults.map((row) => {
      const totalQuantity = parseFloat(row.totalQuantity || '0');
      const totalValue = parseFloat(row.totalValue || '0');
      const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

      return {
        groupId: row.groupId,
        groupName: row.groupName,
        sku: row.sku, // Only present if groupBy=none
        unitOfMeasure: row.unitOfMeasure, // Only present if groupBy=none
        totalQuantity,
        totalValue,
        averageCost,
        layerCount: parseInt(row.layerCount || '0'),
      };
    });

    // Sort results
    valuation.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (sortOrder === 'ASC') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    // Calculate totals
    const summary = {
      totalQuantity: valuation.reduce(
        (sum, item) => sum + item.totalQuantity,
        0,
      ),
      totalValue: valuation.reduce((sum, item) => sum + item.totalValue, 0),
      averageCost: 0, // Calculated below
      itemCount: valuation.length,
    };
    summary.averageCost =
      summary.totalQuantity > 0
        ? summary.totalValue / summary.totalQuantity
        : 0;

    return {
      valuation,
      summary,
    };
  }
}
