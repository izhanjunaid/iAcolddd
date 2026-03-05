import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryBalance } from '../entities/inventory-balance.entity';
import { InventoryCostLayer } from '../entities/inventory-cost-layer.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { FiscalPeriod } from '../../fiscal-periods/entities/fiscal-period.entity';
import { FIFOCostingService } from './fifo-costing.service';
import { CreateInventoryTransactionDto } from '../dto/create-inventory-transaction.dto';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum';
import { InsufficientStockException } from '../../common/exceptions/inventory.exception';

describe('InventoryTransactionsService', () => {
  let service: InventoryTransactionsService;
  let itemRepository: Repository<InventoryItem>;
  let mockEntityManager: any;
  let mockDataSource: any;
  let mockFifoService: any;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest
        .fn()
        .mockImplementation((entity, data) => Promise.resolve(data || entity)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    mockEntityManager = {
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest
        .fn()
        .mockImplementation((entity, data) => Promise.resolve(data || entity)),
      update: jest.fn(),
      findOne: jest.fn(),
      getRepository: jest.fn().mockReturnValue(mockRepo),
    };

    mockDataSource = {
      transaction: jest.fn((cb) => cb(mockEntityManager)),
      createQueryRunner: jest.fn(),
    };

    mockFifoService = {
      calculateFIFOCost: jest.fn(),
      consumeCostLayers: jest.fn(),
      transferCostLayers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransactionsService,
        {
          provide: getRepositoryToken(InventoryTransaction),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(InventoryBalance),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(InventoryCostLayer),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(FiscalPeriod),
          useValue: mockRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: FIFOCostingService,
          useValue: mockFifoService,
        },
      ],
    }).compile();

    service = module.get<InventoryTransactionsService>(
      InventoryTransactionsService,
    );
    itemRepository = module.get(getRepositoryToken(InventoryItem));

    // ensure mocks are clean
    jest.clearAllMocks();

    // Default behavior for item lookup (can be overridden in tests)
    (itemRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'item-1',
      unitOfMeasure: UnitOfMeasure.KG,
      isActive: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processTransaction - Receipt', () => {
    it('should process a receipt transaction correctly', async () => {
      const createDto: CreateInventoryTransactionDto = {
        transactionType: InventoryTransactionType.RECEIPT,
        transactionDate: new Date().toISOString().split('T')[0],
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantity: 10,
        unitOfMeasure: UnitOfMeasure.KG,
        unitCost: 100,
        roomId: 'room-1',
      };

      const mockItem = {
        id: 'item-1',
        unitOfMeasure: UnitOfMeasure.KG,
        isActive: true,
      };

      jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem as any);
      mockEntityManager.findOne.mockResolvedValue(null); // Force new balance creation
      jest
        .spyOn(service as any, 'getFiscalPeriodId')
        .mockResolvedValue('period-1');
      jest
        .spyOn(service as any, 'generateTransactionNumber')
        .mockResolvedValue('RCP-2025-0001');

      await service.processTransaction(createDto, 'user-1');

      expect(mockDataSource.transaction).toHaveBeenCalled();
      // Verify balance was saved with correct quantity (10)
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        InventoryBalance,
        expect.objectContaining({
          itemId: 'item-1',
          warehouseId: 'warehouse-1',
          quantityOnHand: 10,
        }),
      );
    });
  });

  describe('processTransaction - Issue', () => {
    it('should process an issue transaction and use FIFO logic', async () => {
      const createDto: CreateInventoryTransactionDto = {
        transactionType: InventoryTransactionType.ISSUE,
        transactionDate: new Date().toISOString().split('T')[0],
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantity: 5,
        unitOfMeasure: UnitOfMeasure.KG,
        unitCost: 0,
        roomId: 'room-1',
      };

      const mockItem = {
        id: 'item-1',
        unitOfMeasure: UnitOfMeasure.KG,
        isActive: true,
      };
      const mockBalance = {
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantityOnHand: 10,
        quantityAvailable: 10,
        quantityReserved: 0,
        weightedAverageCost: 100,
        totalValue: 1000,
      };

      jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem as any);
      jest
        .spyOn(service as any, 'getFiscalPeriodId')
        .mockResolvedValue('period-1');
      jest
        .spyOn(service as any, 'generateTransactionNumber')
        .mockResolvedValue('ISS-2025-0001');

      // Set up findOne to return the mock balance
      mockEntityManager.findOne.mockResolvedValue(mockBalance);

      mockFifoService.calculateFIFOCost.mockResolvedValue({
        averageCost: 100,
        totalCost: 500,
        costBreakdown: [],
        remainingQuantity: 0,
      });

      mockEntityManager.create.mockImplementation((entity, data) => data);
      mockEntityManager.save.mockResolvedValue({ id: 'trans-1', ...createDto });

      await service.processTransaction(createDto, 'user-1');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        InventoryBalance,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockFifoService.calculateFIFOCost).toHaveBeenCalled();
    });

    it('should throw InsufficientStockException if stock is low', async () => {
      const createDto: CreateInventoryTransactionDto = {
        transactionType: InventoryTransactionType.ISSUE,
        transactionDate: new Date().toISOString().split('T')[0],
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantity: 15, // Requesting more than available
        unitOfMeasure: UnitOfMeasure.KG,
        unitCost: 0,
        roomId: 'room-1',
      };

      const mockItem = {
        id: 'item-1',
        unitOfMeasure: UnitOfMeasure.KG,
        isActive: true,
      };
      const mockBalance = {
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantityOnHand: 10,
        quantityAvailable: 10,
        quantityReserved: 0,
      };

      jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem as any);
      mockEntityManager.findOne.mockResolvedValue(mockBalance);

      await expect(
        service.processTransaction(createDto, 'user-1'),
      ).rejects.toThrow(InsufficientStockException);
    });
  });

  describe('Location Validation', () => {
    it('should enforce pessimistic locking on correct location keys', async () => {
      const createDto: CreateInventoryTransactionDto = {
        transactionType: InventoryTransactionType.ISSUE,
        transactionDate: new Date().toISOString().split('T')[0],
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        quantity: 1,
        unitOfMeasure: UnitOfMeasure.KG,
        unitCost: 0,
        roomId: 'room-1',
      };

      const mockItem = {
        id: 'item-1',
        unitOfMeasure: UnitOfMeasure.KG,
        isActive: true,
      };
      const mockBalance = { quantityAvailable: 10, quantityOnHand: 10 };

      jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem as any);
      mockEntityManager.findOne.mockResolvedValue(mockBalance);
      jest
        .spyOn(service as any, 'getFiscalPeriodId')
        .mockResolvedValue('period-1');
      jest
        .spyOn(service as any, 'generateTransactionNumber')
        .mockResolvedValue('ISS-001');
      mockFifoService.calculateFIFOCost.mockResolvedValue({
        averageCost: 10,
        totalCost: 10,
        costBreakdown: [],
        remainingQuantity: 0,
      });
      mockEntityManager.create.mockImplementation((e, d) => d);
      mockEntityManager.save.mockImplementation((e, d) => d);

      await service.processTransaction(createDto, 'user-1');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        InventoryBalance,
        expect.objectContaining({
          where: expect.objectContaining({
            roomId: 'room-1',
          }),
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });
});
