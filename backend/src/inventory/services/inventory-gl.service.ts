import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VouchersService } from '../../vouchers/vouchers.service';
import { AccountsService } from '../../accounts/accounts.service';
import { CustomersService } from '../../customers/customers.service';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Account } from '../../accounts/entities/account.entity';
import { VoucherType } from '../../common/enums/voucher-type.enum';
import { InventoryTransactionType } from '../../common/enums/inventory-transaction-type.enum';
import { CreateVoucherDto } from '../../vouchers/dto/create-voucher.dto';

interface InventoryGLAccounts {
  inventoryAsset: string;           // Main inventory asset account
  costOfGoodsSold: string;          // COGS for issues
  grnPayable: string;              // GRN Payable for receipts
  inventoryLoss: string;           // Loss account for negative adjustments
  inventoryGain: string;           // Gain account for positive adjustments
  storageRevenue: string;          // Revenue from storage services
  customerReceivables: string;     // AR for customer billing
}

@Injectable()
export class InventoryGLService {
  private glAccounts: InventoryGLAccounts;

  constructor(
    private readonly vouchersService: VouchersService,
    private readonly accountsService: AccountsService,
    private readonly customersService: CustomersService,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
  ) {
    // Initialize GL account mappings
    this.glAccounts = {
      inventoryAsset: '1-0001-0001-0004',        // Inventory (Current Asset)
      costOfGoodsSold: '5-0001-0003-0001',      // Cost of Goods Sold (Expense)
      grnPayable: '2-0001-0001-0002',           // GRN Payable (Current Liability)
      inventoryLoss: '5-0001-0002-0002',        // Inventory Loss (Operating Expense)
      inventoryGain: '4-0001-0002-0002',        // Inventory Gain (Other Income)
      storageRevenue: '4-0001-0001-0001',       // Storage Revenue (Operating Revenue)
      customerReceivables: '1-0001-0001-0003',  // Accounts Receivable (Current Asset)
    };
  }

  /**
   * Post inventory transaction to General Ledger
   * @param transactionId - ID of the inventory transaction
   * @param userId - User ID performing the posting
   * @returns Created voucher
   */
  async postTransactionToGL(transactionId: string, userId: string): Promise<any> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['item', 'customer', 'fiscalPeriod'],
    });

    if (!transaction) {
      throw new NotFoundException(`Inventory transaction ${transactionId} not found`);
    }

    if (transaction.isPostedToGl) {
      throw new BadRequestException(`Transaction ${transaction.transactionNumber} is already posted to GL`);
    }

    let voucher: any;

    switch (transaction.transactionType) {
      case InventoryTransactionType.RECEIPT:
        voucher = await this.postReceiptToGL(transaction, userId);
        break;
        
      case InventoryTransactionType.ISSUE:
        voucher = await this.postIssueToGL(transaction, userId);
        break;
        
      case InventoryTransactionType.TRANSFER:
        // Transfers typically don't affect GL (just location change)
        // But we can create a memo entry for audit trail
        voucher = await this.postTransferMemoToGL(transaction, userId);
        break;
        
      case InventoryTransactionType.ADJUSTMENT:
        voucher = await this.postAdjustmentToGL(transaction, userId);
        break;
        
      default:
        throw new BadRequestException(`Unsupported transaction type for GL posting: ${transaction.transactionType}`);
    }

    // Update transaction to mark as posted
    await this.transactionRepository.update(transactionId, {
      isPostedToGl: true,
      glVoucherId: voucher.id,
    });

    return voucher;
  }

  /**
   * Post goods receipt to GL
   * Creates: DR Inventory, CR GRN Payable
   */
  private async postReceiptToGL(transaction: InventoryTransaction, userId: string): Promise<any> {
    const description = `Inventory Receipt - ${transaction.item.name} (${transaction.transactionNumber})`;
    
    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.SYSTEM_GENERATED,
      voucherDate: transaction.transactionDate.toISOString().split('T')[0],
      description,
      referenceType: 'INVENTORY_RECEIPT',
      referenceId: transaction.id,
      referenceNumber: transaction.transactionNumber,
      details: [
        {
          accountCode: this.glAccounts.inventoryAsset,
          debitAmount: transaction.totalCost,
          creditAmount: 0,
          description: `Receipt: ${transaction.item.name} - ${transaction.quantity} ${transaction.unitOfMeasure}`,
          costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
          lineNumber: 1,
        },
        {
          accountCode: this.glAccounts.grnPayable,
          debitAmount: 0,
          creditAmount: transaction.totalCost,
          description: `GRN Payable: ${transaction.referenceNumber || transaction.transactionNumber}`,
          costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
          lineNumber: 2,
        },
      ],
    };

    return await this.vouchersService.create(createVoucherDto, userId);
  }

  /**
   * Post goods issue to GL
   * Creates: DR COGS, CR Inventory + DR AR, CR Revenue (if billable)
   */
  private async postIssueToGL(transaction: InventoryTransaction, userId: string): Promise<any> {
    const description = `Goods Issue - ${transaction.item.name} (${transaction.transactionNumber})`;
    
    const details = [
      // COGS Entry
      {
        accountCode: this.glAccounts.costOfGoodsSold,
        debitAmount: transaction.totalCost,
        creditAmount: 0,
        description: `COGS: ${transaction.item.name} - ${transaction.quantity} ${transaction.unitOfMeasure}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 1,
      },
      {
        accountCode: this.glAccounts.inventoryAsset,
        debitAmount: 0,
        creditAmount: transaction.totalCost,
        description: `Inventory Reduction: ${transaction.item.name}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 2,
      },
    ];

    // If this is a customer dispatch, also create revenue entry
    if (transaction.customer) {
      const storageRevenue = await this.calculateStorageRevenue(transaction);
      
      if (storageRevenue > 0) {
        // Get customer's receivable account
        const customerReceivableAccount = await this.getCustomerReceivableAccount(transaction.customerId);
        
        details.push(
          {
            accountCode: customerReceivableAccount,
            debitAmount: storageRevenue,
            creditAmount: 0,
            description: `Storage charges: ${transaction.customer.name}`,
            costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
            lineNumber: details.length + 1,
          },
          {
            accountCode: this.glAccounts.storageRevenue,
            debitAmount: 0,
            creditAmount: storageRevenue,
            description: `Storage revenue: ${transaction.item.name}`,
            costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
            lineNumber: details.length + 2,
          }
        );
      }
    }

    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.SYSTEM_GENERATED,
      voucherDate: transaction.transactionDate.toISOString().split('T')[0],
      description,
      referenceType: 'INVENTORY_ISSUE',
      referenceId: transaction.id,
      referenceNumber: transaction.transactionNumber,
      details,
    };

    return await this.vouchersService.create(createVoucherDto, userId);
  }

  /**
   * Post transfer memo to GL (no financial impact, just audit trail)
   */
  private async postTransferMemoToGL(transaction: InventoryTransaction, userId: string): Promise<any> {
    const description = `Stock Transfer - ${transaction.item.name} (${transaction.transactionNumber})`;
    
    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.MEMO,
      voucherDate: transaction.transactionDate.toISOString().split('T')[0],
      description,
      referenceType: 'INVENTORY_TRANSFER',
      referenceId: transaction.id,
      referenceNumber: transaction.transactionNumber,
      details: [
        {
          accountCode: this.glAccounts.inventoryAsset,
          debitAmount: 0,
          creditAmount: 0,
          description: `Transfer: ${transaction.item.name} - ${transaction.quantity} ${transaction.unitOfMeasure} (Value: ${transaction.totalCost})`,
          costCenterId: await this.getWarehouseCostCenter(transaction.fromWarehouseId),
          lineNumber: 1,
        },
      ],
    };

    return await this.vouchersService.create(createVoucherDto, userId);
  }

  /**
   * Post adjustment to GL
   * Positive: DR Inventory, CR Gain | Negative: DR Loss, CR Inventory
   */
  private async postAdjustmentToGL(transaction: InventoryTransaction, userId: string): Promise<any> {
    const isPositive = transaction.quantity > 0;
    const description = `Inventory ${isPositive ? 'Gain' : 'Loss'} - ${transaction.item.name} (${transaction.transactionNumber})`;
    
    const details = isPositive ? [
      // Positive adjustment (found stock)
      {
        accountCode: this.glAccounts.inventoryAsset,
        debitAmount: transaction.totalCost,
        creditAmount: 0,
        description: `Stock found: ${transaction.item.name} - ${transaction.quantity} ${transaction.unitOfMeasure}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 1,
      },
      {
        accountCode: this.glAccounts.inventoryGain,
        debitAmount: 0,
        creditAmount: transaction.totalCost,
        description: `Inventory gain: ${transaction.item.name}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 2,
      },
    ] : [
      // Negative adjustment (lost stock)
      {
        accountCode: this.glAccounts.inventoryLoss,
        debitAmount: transaction.totalCost,
        creditAmount: 0,
        description: `Stock loss: ${transaction.item.name} - ${Math.abs(transaction.quantity)} ${transaction.unitOfMeasure}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 1,
      },
      {
        accountCode: this.glAccounts.inventoryAsset,
        debitAmount: 0,
        creditAmount: transaction.totalCost,
        description: `Inventory reduction: ${transaction.item.name}`,
        costCenterId: await this.getWarehouseCostCenter(transaction.warehouseId),
        lineNumber: 2,
      },
    ];

    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.SYSTEM_GENERATED,
      voucherDate: transaction.transactionDate.toISOString().split('T')[0],
      description,
      referenceType: 'INVENTORY_ADJUSTMENT',
      referenceId: transaction.id,
      referenceNumber: transaction.transactionNumber,
      details,
    };

    return await this.vouchersService.create(createVoucherDto, userId);
  }

  /**
   * Reverse GL posting for an inventory transaction
   */
  async reverseGLPosting(transactionId: string, userId: string): Promise<any> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['item', 'customer', 'glVoucher'],
    });

    if (!transaction) {
      throw new NotFoundException(`Inventory transaction ${transactionId} not found`);
    }

    if (!transaction.isPostedToGl || !transaction.glVoucher) {
      throw new BadRequestException(`Transaction ${transaction.transactionNumber} is not posted to GL`);
    }

    // Create a reversing voucher
    const originalVoucher = transaction.glVoucher;
    const reversalLineItems = originalVoucher.details.map((detail, index) => ({
      accountCode: detail.accountCode,
      debitAmount: detail.creditAmount, // Swap debit and credit
      creditAmount: detail.debitAmount,
      description: `REVERSAL: ${detail.description}`,
      costCenterId: detail.costCenterId || undefined, // Convert null to undefined
      lineNumber: index + 1,
    }));

    const createVoucherDto: CreateVoucherDto = {
      voucherType: VoucherType.REVERSING,
      voucherDate: new Date().toISOString().split('T')[0],
      description: `REVERSAL: ${originalVoucher.description}`,
      referenceType: 'INVENTORY_REVERSAL',
      referenceId: transaction.id,
      referenceNumber: `REV-${transaction.transactionNumber}`,
      details: reversalLineItems,
    };

    const reversalVoucher = await this.vouchersService.create(createVoucherDto, userId);

    // Update transaction to mark as not posted
    await this.transactionRepository.update(transactionId, {
      isPostedToGl: false,
      glVoucherId: undefined,
    });

    return reversalVoucher;
  }

  /**
   * Get warehouse cost center (if warehouses are mapped to cost centers)
   */
  private async getWarehouseCostCenter(warehouseId: string): Promise<string | undefined> {
    // This would typically look up the warehouse and return its associated cost center
    // For now, we'll return a default cost center or undefined
    // TODO: Implement warehouse-to-cost-center mapping when warehouse module is built
    return undefined;
  }

  /**
   * Get customer's receivable account
   */
  private async getCustomerReceivableAccount(customerId: string): Promise<string> {
    try {
      const customer = await this.customersService.findOne(customerId);
      // Customer entity has receivableAccount relation to Account entity
      if (customer.receivableAccount) {
        return customer.receivableAccount.code;
      }
      // Fallback to default receivables account
      return this.glAccounts.customerReceivables;
    } catch (error) {
      // Fallback to default receivables account
      return this.glAccounts.customerReceivables;
    }
  }

  /**
   * Calculate storage revenue for a dispatch
   * This is a placeholder - in reality, this would integrate with a billing system
   */
  private async calculateStorageRevenue(transaction: InventoryTransaction): Promise<number> {
    // Placeholder calculation
    // In a real system, this would:
    // 1. Look up customer's storage rates
    // 2. Calculate days stored
    // 3. Apply volume discounts
    // 4. Consider special pricing agreements
    
    // For now, return a simple rate per unit
    const baseRatePerUnit = 10; // PKR per unit per transaction
    return transaction.quantity * baseRatePerUnit;
  }

  /**
   * Validate GL account configuration
   */
  async validateGLAccountConfiguration(): Promise<{
    isValid: boolean;
    missingAccounts: string[];
    errors: string[];
  }> {
    const missingAccounts: string[] = [];
    const errors: string[] = [];

    for (const [accountName, accountCode] of Object.entries(this.glAccounts)) {
      try {
        const account = await this.accountsService.findByCode(accountCode);
        
        if (!account) {
          missingAccounts.push(`${accountName} (${accountCode})`);
          continue;
        }

        if (!account.isActive) {
          errors.push(`${accountName} account (${accountCode}) is inactive`);
        }

        if (!account.allowDirectPosting) {
          errors.push(`${accountName} account (${accountCode}) does not allow direct posting`);
        }
      } catch (error) {
        missingAccounts.push(`${accountName} (${accountCode})`);
      }
    }

    return {
      isValid: missingAccounts.length === 0 && errors.length === 0,
      missingAccounts,
      errors,
    };
  }

  /**
   * Get GL account mapping configuration
   */
  getGLAccountMapping(): InventoryGLAccounts {
    return { ...this.glAccounts };
  }

  /**
   * Update GL account mapping
   */
  async updateGLAccountMapping(newMapping: Partial<InventoryGLAccounts>, userId: string): Promise<void> {
    // Validate new accounts exist
    for (const [accountName, accountCode] of Object.entries(newMapping)) {
      if (accountCode) {
        try {
          await this.accountsService.findByCode(accountCode);
        } catch (error) {
          throw new BadRequestException(`Invalid account code for ${accountName}: ${accountCode}`);
        }
      }
    }

    // Update the mapping
    Object.assign(this.glAccounts, newMapping);

    // In a production system, this configuration would be stored in the database
    // For now, it's just in memory
  }

  /**
   * Get inventory GL posting statistics
   */
  async getPostingStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalTransactions: number;
    postedTransactions: number;
    unpostedTransactions: number;
    postingRate: number;
    totalValue: number;
    averageValue: number;
  }> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('t');

    if (fromDate) {
      queryBuilder.andWhere('t.transactionDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('t.transactionDate <= :toDate', { toDate });
    }

    const [totalTransactions, postedTransactions, valueResult] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('t.isPostedToGl = true').getCount(),
      queryBuilder.clone().select('SUM(t.totalCost)', 'totalValue').getRawOne(),
    ]);

    const unpostedTransactions = totalTransactions - postedTransactions;
    const postingRate = totalTransactions > 0 ? (postedTransactions / totalTransactions) * 100 : 0;
    const totalValue = parseFloat(valueResult?.totalValue || '0');
    const averageValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

    return {
      totalTransactions,
      postedTransactions,
      unpostedTransactions,
      postingRate,
      totalValue,
      averageValue,
    };
  }
}
