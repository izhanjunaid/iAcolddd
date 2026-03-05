import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InvoicesService } from '../invoices/services/invoices.service';
import { PayablesService } from '../payables/services/payables.service';
import { InventoryItemsService } from '../inventory/services/inventory-items.service';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { ApBill } from '../payables/entities/ap-bill.entity';
import { ApBillStatus } from '../payables/enums/ap-bill-status.enum';
import { InventoryBalance } from '../inventory/entities/inventory-balance.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

export interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ActivityItem {
  type: 'invoice' | 'bill' | 'inventory';
  description: string;
  amount: number | null;
  date: Date;
  reference: string;
}

export interface AlertItem {
  level: 'error' | 'warning' | 'info';
  message: string;
  count: number;
  link: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly payablesService: PayablesService,
    private readonly inventoryItemsService: InventoryItemsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enhanced KPIs: Revenue, Receivables, Payables, Inventory Value,
   * overdue counts, pending counts, and stock items.
   */
  async getKPIs() {
    const [
      invoiceStats,
      inventoryStats,
      totalPayables,
      overdueInvoiceCount,
      overdueBillCount,
      inventoryValue,
    ] = await Promise.all([
      this.invoicesService.getStatistics(),
      this.inventoryItemsService.getStats(),
      this.getPayablesTotalFromDB(),
      this.getOverdueInvoiceCount(),
      this.getOverdueBillCount(),
      this.getInventoryValue(),
    ]);

    return {
      totalRevenue: invoiceStats?.amount?.total || 0,
      totalReceivables: invoiceStats?.amount?.outstanding || 0,
      totalPayables,
      totalInventoryValue: inventoryValue,
      overdueInvoices: overdueInvoiceCount,
      overdueBills: overdueBillCount,
      pendingInvoices: invoiceStats?.count?.sent || 0,
      stockItems: inventoryStats?.activeItems || 0,
      lowStockItems: 0,
    };
  }

  /**
   * Monthly revenue + expenses for the last 6 months.
   * Revenue = SUM(invoices.total_amount) by issue_date month
   * Expenses = SUM(ap_bills.total_amount) by bill_date month
   */
  async getMonthlyTrends(): Promise<MonthlyTrendItem[]> {
    const months = this.getLast6Months();

    const [revenueRows, expenseRows] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select(
          "TO_CHAR(DATE_TRUNC('month', invoice.issue_date), 'YYYY-MM')",
          'month',
        )
        .addSelect('COALESCE(SUM(invoice.total_amount), 0)', 'total')
        .from(Invoice, 'invoice')
        .where('invoice.status != :cancelled', {
          cancelled: InvoiceStatus.CANCELLED,
        })
        .andWhere('invoice.invoice_type NOT IN (:...excludeTypes)', {
          excludeTypes: ['CREDIT_NOTE', 'DEBIT_NOTE'],
        })
        .andWhere('invoice.issue_date >= :startDate', {
          startDate: months[0].start,
        })
        .groupBy("DATE_TRUNC('month', invoice.issue_date)")
        .getRawMany(),
      this.dataSource
        .createQueryBuilder()
        .select(
          "TO_CHAR(DATE_TRUNC('month', bill.bill_date), 'YYYY-MM')",
          'month',
        )
        .addSelect('COALESCE(SUM(bill.total_amount), 0)', 'total')
        .from(ApBill, 'bill')
        .where('bill.status != :void', { void: ApBillStatus.VOID })
        .andWhere('bill.bill_date >= :startDate', {
          startDate: months[0].start,
        })
        .groupBy("DATE_TRUNC('month', bill.bill_date)")
        .getRawMany(),
    ]);

    const revenueMap = new Map(
      revenueRows.map((r: { month: string; total: string }) => [
        r.month,
        parseFloat(r.total),
      ]),
    );
    const expenseMap = new Map(
      expenseRows.map((r: { month: string; total: string }) => [
        r.month,
        parseFloat(r.total),
      ]),
    );

    return months.map((m) => ({
      month: m.label,
      revenue: revenueMap.get(m.key) || 0,
      expenses: expenseMap.get(m.key) || 0,
    }));
  }

  /**
   * Recent activity: latest 10 events across invoices, bills, and inventory transactions.
   */
  async getRecentActivity(): Promise<ActivityItem[]> {
    const [invoices, bills, transactions] = await Promise.all([
      this.dataSource
        .getRepository(Invoice)
        .createQueryBuilder('inv')
        .select([
          'inv.invoiceNumber',
          'inv.totalAmount',
          'inv.status',
          'inv.createdAt',
        ])
        .orderBy('inv.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.dataSource
        .getRepository(ApBill)
        .createQueryBuilder('bill')
        .select([
          'bill.billNumber',
          'bill.totalAmount',
          'bill.status',
          'bill.createdAt',
        ])
        .orderBy('bill.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.dataSource
        .getRepository(InventoryTransaction)
        .createQueryBuilder('tx')
        .select([
          'tx.transactionNumber',
          'tx.transactionType',
          'tx.quantity',
          'tx.totalCost',
          'tx.createdAt',
        ])
        .orderBy('tx.createdAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const activities: ActivityItem[] = [
      ...invoices.map((inv) => ({
        type: 'invoice' as const,
        description: `Invoice ${inv.invoiceNumber} — ${inv.status}`,
        amount: Number(inv.totalAmount),
        date: inv.createdAt,
        reference: inv.invoiceNumber,
      })),
      ...bills.map((bill) => ({
        type: 'bill' as const,
        description: `Bill ${(bill as any).billNumber} — ${bill.status}`,
        amount: Number(bill.totalAmount),
        date: bill.createdAt,
        reference: (bill as any).billNumber,
      })),
      ...transactions.map((tx) => ({
        type: 'inventory' as const,
        description: `${tx.transactionType} ${tx.transactionNumber} — ${tx.quantity} units`,
        amount: tx.totalCost ? Number(tx.totalCost) : null,
        date: tx.createdAt,
        reference: tx.transactionNumber,
      })),
    ];

    // Sort by date descending, take top 10
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }

  /**
   * Operational alerts: overdue invoices, overdue bills, low stock.
   */
  async getOperationalAlerts(): Promise<AlertItem[]> {
    const [overdueInvoices, overdueBills] = await Promise.all([
      this.getOverdueInvoiceCount(),
      this.getOverdueBillCount(),
    ]);

    const alerts: AlertItem[] = [];

    if (overdueInvoices > 0) {
      alerts.push({
        level: 'error',
        message: `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''} need attention`,
        count: overdueInvoices,
        link: '/invoices?status=OVERDUE',
      });
    }

    if (overdueBills > 0) {
      alerts.push({
        level: 'warning',
        message: `${overdueBills} bill${overdueBills > 1 ? 's' : ''} past due date`,
        count: overdueBills,
        link: '/payables?status=OVERDUE',
      });
    }

    // Low stock items (items where on-hand quantity is at or below 0 but item is active)
    const lowStockCount = await this.dataSource
      .getRepository(InventoryBalance)
      .createQueryBuilder('bal')
      .where('bal.quantityOnHand <= 0')
      .getCount();

    if (lowStockCount > 0) {
      alerts.push({
        level: 'warning',
        message: `${lowStockCount} item${lowStockCount > 1 ? 's' : ''} with zero or negative stock`,
        count: lowStockCount,
        link: '/inventory/balances',
      });
    }

    return alerts;
  }

  // ── Private helpers ──

  private async getPayablesTotalFromDB(): Promise<number> {
    const bills = await this.payablesService.findAllBills();
    return bills
      .filter(
        (b: any) => b.status === 'POSTED' || b.status === 'PARTIALLY_PAID',
      )
      .reduce((sum: number, b: any) => sum + Number(b.balanceDue), 0);
  }

  private async getOverdueInvoiceCount(): Promise<number> {
    return this.dataSource
      .getRepository(Invoice)
      .createQueryBuilder('inv')
      .where('inv.status IN (:...statuses)', {
        statuses: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
      })
      .andWhere('inv.due_date < CURRENT_DATE')
      .getCount();
  }

  private async getOverdueBillCount(): Promise<number> {
    return this.dataSource
      .getRepository(ApBill)
      .createQueryBuilder('bill')
      .where('bill.status IN (:...statuses)', {
        statuses: [ApBillStatus.POSTED, ApBillStatus.PARTIALLY_PAID],
      })
      .andWhere('bill.due_date < CURRENT_DATE')
      .getCount();
  }

  private async getInventoryValue(): Promise<number> {
    const result = await this.dataSource
      .getRepository(InventoryBalance)
      .createQueryBuilder('bal')
      .select('COALESCE(SUM(bal.total_value), 0)', 'total')
      .where('bal.quantityOnHand > 0')
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  private getLast6Months(): { key: string; label: string; start: string }[] {
    const months: { key: string; label: string; start: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en', { month: 'short' });
      const start = `${key}-01`;
      months.push({ key, label, start });
    }
    return months;
  }
}
