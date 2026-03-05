import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageBillingService } from './storage-billing.service';
import { TaxService } from '../../tax/tax.service';
import {
  CalculateStorageBillingDto,
  RateType,
} from '../dto/calculate-storage-billing.dto';
import { TaxType } from '../../common/enums/tax-type.enum';
import { BillingRateConfiguration } from '../../common/entities/billing-rate-configuration.entity';

describe('StorageBillingService', () => {
  let service: StorageBillingService;
  let taxService: TaxService;
  let rateConfigRepository: Repository<BillingRateConfiguration>;

  // Mock TaxService
  const mockTaxService = {
    calculateTax: jest.fn(),
  };

  // Mock Repository
  const mockRateConfigRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBillingService,
        {
          provide: TaxService,
          useValue: mockTaxService,
        },
        {
          provide: getRepositoryToken(BillingRateConfiguration),
          useValue: mockRateConfigRepository,
        },
      ],
    }).compile();

    service = module.get<StorageBillingService>(StorageBillingService);
    taxService = module.get<TaxService>(TaxService);
    rateConfigRepository = module.get<Repository<BillingRateConfiguration>>(
      getRepositoryToken(BillingRateConfiguration),
    );

    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock: No rates in database (will use fallback rates)
    mockRateConfigRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    // Default tax mock responses
    mockTaxService.calculateTax.mockImplementation((params) => {
      if (params.taxType === TaxType.GST) {
        return Promise.resolve({
          taxAmount: params.amount * 0.18, // 18% GST
          taxRate: 18,
        });
      } else if (params.taxType === TaxType.WHT) {
        return Promise.resolve({
          taxAmount: params.amount * 0.04, // 4% WHT
          taxRate: 4,
        });
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Storage Calculation', () => {
    it('should calculate storage charges correctly for 14 days', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 5000,
        dateIn: new Date('2025-10-01T00:00:00Z'),
        dateOut: new Date('2025-10-15T00:00:00Z'),
        ratePerKgPerDay: 2,
        labourChargesIn: 0,
        labourChargesOut: 0,
        loadingCharges: 0,
        otherCharges: 0,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.weight).toBe(5000);
      expect(result.daysStored).toBe(14);
      expect(result.ratePerKgPerDay).toBe(2);
      expect(result.storageCharges).toBe(140000); // 5000 × 2 × 14
      expect(result.subtotal).toBe(140000);
      expect(result.totalAmount).toBe(140000);
    });

    it('should calculate storage charges with labour and loading', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 3,
        labourChargesIn: 2000,
        labourChargesOut: 2500,
        loadingCharges: 1500,
        otherCharges: 500,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.storageCharges).toBe(30000); // 1000 × 3 × 10
      expect(result.labourCharges).toBe(4500); // 2000 + 2500
      expect(result.loadingCharges).toBe(1500);
      expect(result.otherCharges).toBe(500);
      expect(result.subtotal).toBe(36500); // 30000 + 4500 + 1500 + 500
    });
  });

  describe('Date Calculation', () => {
    it('should calculate 1 day for same dates (00:00 to 00:00 next day)', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 100,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-02T00:00:00Z'),
        ratePerKgPerDay: 1,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(1);
      expect(result.storageCharges).toBe(100); // 100 × 1 × 1
    });

    it('should round up partial days', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 100,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-02T12:00:00Z'), // 1.5 days
        ratePerKgPerDay: 1,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(2); // Rounded up
      expect(result.storageCharges).toBe(200); // 100 × 1 × 2
    });

    it('should charge minimum 1 day for same-day in/out', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 100,
        dateIn: new Date('2025-01-01T08:00:00Z'),
        dateOut: new Date('2025-01-01T08:00:00Z'), // Same time
        ratePerKgPerDay: 1,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(1); // Minimum 1 day
      expect(result.storageCharges).toBe(100);
    });

    it('should throw error when dateOut is before dateIn', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 100,
        dateIn: new Date('2025-01-15T00:00:00Z'),
        dateOut: new Date('2025-01-10T00:00:00Z'), // Before dateIn
        ratePerKgPerDay: 1,
        applyGst: false,
        applyWht: false,
      };

      await expect(service.calculateStorageBilling(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate 30 days correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-31T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(30);
      expect(result.storageCharges).toBe(60000); // 1000 × 2 × 30
    });
  });

  describe('Rate Determination', () => {
    it('should use provided rate when specified', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 5.5, // Custom rate
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.ratePerKgPerDay).toBe(5.5);
      expect(result.storageCharges).toBe(55000); // 1000 × 5.5 × 10
    });

    it('should use default daily rate for short storage (< 30 days)', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'), // 10 days
        // No rate specified
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.ratePerKgPerDay).toBe(2); // Default daily rate
    });

    it('should use seasonal rate for 30+ days storage', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-02-01T00:00:00Z'), // 31 days
        // No rate specified
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.ratePerKgPerDay).toBe(1.5); // Seasonal rate
      expect(result.storageCharges).toBe(46500); // 1000 × 1.5 × 31
    });
  });

  describe('Seasonal Billing', () => {
    it('should apply seasonal rate correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 2000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-16T00:00:00Z'), // 15 days
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateSeasonalBilling(dto);

      expect(result.ratePerKgPerDay).toBe(1.5); // Seasonal rate
      expect(result.storageCharges).toBe(45000); // 2000 × 1.5 × 15
    });

    it('should allow custom seasonal rate', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 1.8, // Custom seasonal rate
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateSeasonalBilling(dto);

      expect(result.ratePerKgPerDay).toBe(1.8);
      expect(result.storageCharges).toBe(18000); // 1000 × 1.8 × 10
    });
  });

  describe('Monthly Billing', () => {
    it('should apply monthly rate correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 3000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-21T00:00:00Z'), // 20 days
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateMonthlyBilling(dto);

      expect(result.ratePerKgPerDay).toBe(1.2); // Monthly rate
      expect(result.storageCharges).toBe(72000); // 3000 × 1.2 × 20
    });
  });

  describe('Tax Integration', () => {
    it('should calculate GST correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: true,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.subtotal).toBe(20000); // 1000 × 2 × 10
      expect(result.gstAmount).toBe(3600); // 20000 × 0.18
      expect(result.gstRate).toBe(18);
      expect(result.totalAmount).toBe(23600); // 20000 + 3600
      expect(taxService.calculateTax).toHaveBeenCalledWith({
        amount: 20000,
        taxType: TaxType.GST,
        customerId: undefined,
      });
    });

    it('should calculate WHT correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.subtotal).toBe(20000);
      expect(result.whtAmount).toBe(800); // 20000 × 0.04
      expect(result.whtRate).toBe(4);
      expect(result.totalAmount).toBe(19200); // 20000 - 800 (WHT is deducted)
      expect(taxService.calculateTax).toHaveBeenCalledWith({
        amount: 20000,
        taxType: TaxType.WHT,
        customerId: undefined,
      });
    });

    it('should calculate both GST and WHT correctly', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 5000,
        dateIn: new Date('2025-10-01T00:00:00Z'),
        dateOut: new Date('2025-10-15T00:00:00Z'),
        ratePerKgPerDay: 2,
        labourChargesIn: 5000,
        labourChargesOut: 5000,
        loadingCharges: 3000,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.storageCharges).toBe(140000); // 5000 × 2 × 14
      expect(result.labourCharges).toBe(10000);
      expect(result.loadingCharges).toBe(3000);
      expect(result.subtotal).toBe(153000);
      expect(result.gstAmount).toBe(27540); // 153000 × 0.18
      expect(result.whtAmount).toBe(6120); // 153000 × 0.04
      expect(result.totalAmount).toBe(174420); // 153000 + 27540 - 6120
    });

    it('should not apply taxes when disabled', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.gstAmount).toBe(0);
      expect(result.whtAmount).toBe(0);
      expect(result.totalAmount).toBe(result.subtotal);
      expect(taxService.calculateTax).not.toHaveBeenCalled();
    });

    it('should pass customerId to tax service', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        customerId: 'customer-123',
        applyGst: true,
        applyWht: true,
      };

      await service.calculateStorageBilling(dto);

      expect(taxService.calculateTax).toHaveBeenCalledWith({
        amount: 20000,
        taxType: TaxType.GST,
        customerId: 'customer-123',
      });
      expect(taxService.calculateTax).toHaveBeenCalledWith({
        amount: 20000,
        taxType: TaxType.WHT,
        customerId: 'customer-123',
      });
    });
  });

  describe('Calculation Breakdown', () => {
    it('should provide detailed breakdown', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        labourChargesIn: 1000,
        labourChargesOut: 1500,
        loadingCharges: 500,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.storageCalculation).toContain('1000 kg');
      expect(result.breakdown.storageCalculation).toContain('PKR 2/kg/day');
      expect(result.breakdown.storageCalculation).toContain('10 days');
      expect(result.breakdown.labourCalculation).toContain(
        'Labour In: PKR 1000',
      );
      expect(result.breakdown.labourCalculation).toContain(
        'Labour Out: PKR 1500',
      );
      expect(result.breakdown.labourCalculation).toContain('Loading: PKR 500');
      expect(result.breakdown.taxCalculation).toContain('GST');
      expect(result.breakdown.taxCalculation).toContain('WHT');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero labour charges', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.labourCharges).toBe(0);
      expect(result.loadingCharges).toBe(0);
      expect(result.otherCharges).toBe(0);
      expect(result.subtotal).toBe(result.storageCharges);
    });

    it('should handle very large weight', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000000, // 1 million kg
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-02T00:00:00Z'),
        ratePerKgPerDay: 1,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.storageCharges).toBe(1000000);
    });

    it('should handle decimal weights', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1500.75,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-03T00:00:00Z'), // 2 days
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.weight).toBe(1500.75);
      expect(result.storageCharges).toBe(6003); // 1500.75 × 2 × 2
    });

    it('should round results to 2 decimal places', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 100.33,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-04T00:00:00Z'), // 3 days
        ratePerKgPerDay: 1.11,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      // 100.33 × 1.11 × 3 = 334.0977 → should be rounded to 334.10
      expect(result.storageCharges).toBe(334.1);
    });
  });

  describe('Return Values', () => {
    it('should return all required fields', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        ratePerKgPerDay: 2,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('daysStored');
      expect(result).toHaveProperty('ratePerKgPerDay');
      expect(result).toHaveProperty('storageCharges');
      expect(result).toHaveProperty('labourCharges');
      expect(result).toHaveProperty('loadingCharges');
      expect(result).toHaveProperty('otherCharges');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('gstAmount');
      expect(result).toHaveProperty('gstRate');
      expect(result).toHaveProperty('whtAmount');
      expect(result).toHaveProperty('whtRate');
      expect(result).toHaveProperty('totalAmount');
      expect(result).toHaveProperty('dateIn');
      expect(result).toHaveProperty('dateOut');
      expect(result).toHaveProperty('breakdown');
    });

    it('should preserve input dates', async () => {
      const dateIn = new Date('2025-01-01T00:00:00Z');
      const dateOut = new Date('2025-01-11T00:00:00Z');

      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn,
        dateOut,
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.dateIn).toEqual(dateIn);
      expect(result.dateOut).toEqual(dateOut);
    });
  });

  describe('Monthly Rate (60+ days)', () => {
    it('should automatically apply monthly rate for 60+ days storage', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-03-02T00:00:00Z'), // 60 days
        // No rate specified
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(60);
      expect(result.ratePerKgPerDay).toBe(1.2); // Monthly rate
      expect(result.storageCharges).toBe(72000); // 1000 × 1.2 × 60
    });

    it('should apply monthly rate for 90 days storage', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 2000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-04-01T00:00:00Z'), // 90 days
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(90);
      expect(result.ratePerKgPerDay).toBe(1.2); // Monthly rate
      expect(result.storageCharges).toBe(216000); // 2000 × 1.2 × 90
    });

    it('should use seasonal rate for 59 days (not monthly)', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-03-01T00:00:00Z'), // 59 days
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(59);
      expect(result.ratePerKgPerDay).toBe(1.5); // Seasonal rate, not monthly
      expect(result.storageCharges).toBe(88500); // 1000 × 1.5 × 59
    });
  });

  describe('Database-Driven Rates', () => {
    it('should use database rate when available', async () => {
      // Mock database to return a custom rate
      mockRateConfigRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          rateValue: 2.75,
          rateType: 'daily',
        }),
      });

      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.ratePerKgPerDay).toBe(2.75); // Database rate
      expect(result.storageCharges).toBe(27500); // 1000 × 2.75 × 10
    });

    it('should use customer-specific rate from database', async () => {
      // Mock database to return customer-specific rate
      mockRateConfigRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          rateValue: 1.75,
          rateType: 'daily',
          customerId: 'customer-123',
        }),
      });

      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-01-11T00:00:00Z'),
        customerId: 'customer-123',
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.ratePerKgPerDay).toBe(1.75); // Customer-specific rate
      expect(result.storageCharges).toBe(17500); // 1000 × 1.75 × 10
    });
  });

  describe('Real-World Cold Storage Scenarios', () => {
    it('should calculate billing for short-term frozen meat storage', async () => {
      // Scenario: 500 kg frozen chicken stored for 5 days
      const dto: CalculateStorageBillingDto = {
        weight: 500,
        dateIn: new Date('2025-01-15T00:00:00Z'),
        dateOut: new Date('2025-01-20T00:00:00Z'), // 5 days
        ratePerKgPerDay: 2.0,
        labourChargesIn: 500,
        labourChargesOut: 500,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.storageCharges).toBe(5000); // 500 × 2 × 5
      expect(result.labourCharges).toBe(1000); // 500 + 500
      expect(result.subtotal).toBe(6000);
      expect(result.gstAmount).toBe(1080); // 6000 × 0.18
      expect(result.whtAmount).toBe(240); // 6000 × 0.04
      expect(result.totalAmount).toBe(6840); // 6000 + 1080 - 240
    });

    it('should calculate billing for seasonal meat storage', async () => {
      // Scenario: 2,000 kg meat stored for 44 days (seasonal)
      const dto: CalculateStorageBillingDto = {
        weight: 2000,
        dateIn: new Date('2025-06-01T00:00:00Z'),
        dateOut: new Date('2025-07-15T00:00:00Z'), // 44 days
        labourChargesIn: 2000,
        labourChargesOut: 2000,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(44);
      expect(result.ratePerKgPerDay).toBe(1.5); // Seasonal rate
      expect(result.storageCharges).toBe(132000); // 2000 × 1.5 × 44
      expect(result.labourCharges).toBe(4000);
      expect(result.subtotal).toBe(136000);
      expect(result.gstAmount).toBe(24480); // 136000 × 0.18
      expect(result.whtAmount).toBe(5440); // 136000 × 0.04
      expect(result.totalAmount).toBe(155040); // 136000 + 24480 - 5440
    });

    it('should calculate billing for long-term bulk storage', async () => {
      // Scenario: 10,000 kg stored for 90 days (monthly rate)
      const dto: CalculateStorageBillingDto = {
        weight: 10000,
        dateIn: new Date('2025-01-01T00:00:00Z'),
        dateOut: new Date('2025-04-01T00:00:00Z'), // 90 days
        labourChargesIn: 5000,
        labourChargesOut: 5000,
        loadingCharges: 3000,
        applyGst: true,
        applyWht: true,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(90);
      expect(result.ratePerKgPerDay).toBe(1.2); // Monthly rate
      expect(result.storageCharges).toBe(1080000); // 10000 × 1.2 × 90
      expect(result.labourCharges).toBe(10000);
      expect(result.loadingCharges).toBe(3000);
      expect(result.subtotal).toBe(1093000);
      expect(result.gstAmount).toBe(196740); // 1093000 × 0.18
      expect(result.whtAmount).toBe(43720); // 1093000 × 0.04
      expect(result.totalAmount).toBe(1246020); // 1093000 + 196740 - 43720
    });

    it('should handle partial day storage correctly', async () => {
      // Scenario: Item in at 10 AM, out at 2 PM next day (1.17 days → 2 days charged)
      const dto: CalculateStorageBillingDto = {
        weight: 100,
        dateIn: new Date('2025-01-01T10:00:00Z'),
        dateOut: new Date('2025-01-02T14:00:00Z'), // 1.17 days
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      const result = await service.calculateStorageBilling(dto);

      expect(result.daysStored).toBe(2); // Rounded up from 1.17
      expect(result.storageCharges).toBe(400); // 100 × 2 × 2
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid date sequence', async () => {
      const dto: CalculateStorageBillingDto = {
        weight: 1000,
        dateIn: new Date('2025-01-15T00:00:00Z'),
        dateOut: new Date('2025-01-10T00:00:00Z'), // Before dateIn
        ratePerKgPerDay: 2,
        applyGst: false,
        applyWht: false,
      };

      await expect(service.calculateStorageBilling(dto)).rejects.toThrow(
        'Date out cannot be before date in',
      );
    });
  });
});
