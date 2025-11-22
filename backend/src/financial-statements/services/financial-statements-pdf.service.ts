import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { BalanceSheet, IncomeStatement, CashFlowStatement, FinancialAnalysis } from '../interfaces/financial-statement.interface';

@Injectable()
export class FinancialStatementsPdfService {
  private readonly logger = new Logger(FinancialStatementsPdfService.name);

  /**
   * Generate Balance Sheet PDF
   */
  async generateBalanceSheetPdf(balanceSheet: BalanceSheet): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateHeader(doc, balanceSheet.title);
        this.generateBalanceSheetSubtitle(doc, balanceSheet);
        this.generateBalanceSheetContent(doc, balanceSheet);
        if (balanceSheet.metrics) {
          this.generateBalanceSheetMetrics(doc, balanceSheet);
        }
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate Balance Sheet PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate Income Statement PDF
   */
  async generateIncomeStatementPdf(incomeStatement: IncomeStatement): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateHeader(doc, incomeStatement.title);
        this.generatePeriodSubtitle(doc, incomeStatement.periodStart, incomeStatement.periodEnd);
        this.generateIncomeStatementContent(doc, incomeStatement);
        if (incomeStatement.metrics) {
          this.generateIncomeStatementMetrics(doc, incomeStatement);
        }
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate Income Statement PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate Cash Flow Statement PDF
   */
  async generateCashFlowPdf(cashFlow: CashFlowStatement): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateHeader(doc, cashFlow.title);
        this.generatePeriodSubtitle(doc, cashFlow.periodStart, cashFlow.periodEnd);
        this.generateCashFlowContent(doc, cashFlow);
        if (cashFlow.metrics) {
          this.generateCashFlowMetrics(doc, cashFlow);
        }
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate Cash Flow Statement PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate Financial Analysis PDF
   */
  async generateFinancialAnalysisPdf(analysis: FinancialAnalysis): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
          layout: 'landscape', // Landscape for better ratio display
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateHeader(doc, 'Financial Analysis');
        this.generatePeriodSubtitle(doc, analysis.period.start, analysis.period.end);
        this.generateFinancialAnalysisContent(doc, analysis);
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error('Failed to generate Financial Analysis PDF:', error);
        reject(error);
      }
    });
  }

  // ============================================================================
  // COMMON COMPONENTS
  // ============================================================================

  private generateHeader(doc: PDFKit.PDFDocument, title: string): void {
    const pageWidth = doc.page.width;

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ADVANCE ERP', 50, 50, { align: 'center' })
      .fontSize(10)
      .font('Helvetica')
      .text('Integrated Accounting & Financial Reporting System', { align: 'center' })
      .moveDown(1);

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(title.toUpperCase(), { align: 'center' })
      .fillColor('#000000')
      .moveDown(0.5);

    doc
      .strokeColor('#3b82f6')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(pageWidth - 50, doc.y)
      .stroke()
      .moveDown(1);
  }

  private generateBalanceSheetSubtitle(doc: PDFKit.PDFDocument, balanceSheet: BalanceSheet): void {
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`As of ${format(new Date(balanceSheet.periodEnd), 'MMMM dd, yyyy')}`, { align: 'center' })
      .moveDown(0.3);

    const statusText = balanceSheet.isBalanced ? '✓ BALANCED' : '⚠ NOT BALANCED';
    const statusColor = balanceSheet.isBalanced ? '#059669' : '#dc2626';

    doc
      .fontSize(10)
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(statusText, { align: 'center' })
      .fillColor('#000000')
      .moveDown(1);
  }

  private generatePeriodSubtitle(doc: PDFKit.PDFDocument, startDate: Date, endDate: Date): void {
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`For the period ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`,
        { align: 'center' })
      .moveDown(1.5);
  }

  private generateFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    const bottomY = pageHeight - 60;

    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .moveTo(50, bottomY)
      .lineTo(pageWidth - 50, bottomY)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('This is a computer-generated financial statement.', 50, bottomY + 10, { align: 'center' })
      .text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy - HH:mm')}`, { align: 'center' });

    doc.fillColor('#000000');
  }

  private formatCurrency(amount: number): string {
    return amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================================================
  // BALANCE SHEET SPECIFIC
  // ============================================================================

  private generateBalanceSheetContent(doc: PDFKit.PDFDocument, bs: BalanceSheet): void {
    const startY = doc.y;
    const leftCol = 50;
    const rightCol = doc.page.width / 2 + 10;
    const colWidth = doc.page.width / 2 - 70;

    // ASSETS (Left Column)
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text('ASSETS', leftCol, startY);
    doc.fillColor('#000000').moveDown(0.5);

    let assetY = doc.y;

    // Current Assets
    if (bs.assets.currentAssets) {
      doc.fontSize(11).font('Helvetica-Bold').text('Current Assets', leftCol, assetY);
      assetY += 20;
      assetY = this.renderLineItems(doc, bs.assets.currentAssets.lineItems, leftCol, assetY, colWidth);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total Current Assets', leftCol + 10, assetY);
      doc.text(this.formatCurrency(bs.assets.currentAssets.subtotal), leftCol + colWidth - 100, assetY, { width: 100, align: 'right' });
      assetY += 25;
    }

    // Non-Current Assets
    if (bs.assets.nonCurrentAssets) {
      doc.fontSize(11).font('Helvetica-Bold').text('Non-Current Assets', leftCol, assetY);
      assetY += 20;
      assetY = this.renderLineItems(doc, bs.assets.nonCurrentAssets.lineItems, leftCol, assetY, colWidth);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total Non-Current Assets', leftCol + 10, assetY);
      doc.text(this.formatCurrency(bs.assets.nonCurrentAssets.subtotal), leftCol + colWidth - 100, assetY, { width: 100, align: 'right' });
      assetY += 25;
    }

    // Total Assets
    doc
      .strokeColor('#1e40af')
      .lineWidth(2)
      .moveTo(leftCol, assetY)
      .lineTo(leftCol + colWidth, assetY)
      .stroke();
    assetY += 10;

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af');
    doc.text('TOTAL ASSETS', leftCol, assetY);
    doc.text(this.formatCurrency(bs.assets.totalAssets), leftCol + colWidth - 100, assetY, { width: 100, align: 'right' });
    doc.fillColor('#000000');

    // LIABILITIES & EQUITY (Right Column)
    let liabY = startY;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text('LIABILITIES & EQUITY', rightCol, liabY);
    doc.fillColor('#000000');
    liabY += 30;

    // Current Liabilities
    if (bs.liabilities.currentLiabilities) {
      doc.fontSize(11).font('Helvetica-Bold').text('Current Liabilities', rightCol, liabY);
      liabY += 20;
      liabY = this.renderLineItems(doc, bs.liabilities.currentLiabilities.lineItems, rightCol, liabY, colWidth);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total Current Liabilities', rightCol + 10, liabY);
      doc.text(this.formatCurrency(bs.liabilities.currentLiabilities.subtotal), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
      liabY += 25;
    }

    // Non-Current Liabilities
    if (bs.liabilities.nonCurrentLiabilities) {
      doc.fontSize(11).font('Helvetica-Bold').text('Non-Current Liabilities', rightCol, liabY);
      liabY += 20;
      liabY = this.renderLineItems(doc, bs.liabilities.nonCurrentLiabilities.lineItems, rightCol, liabY, colWidth);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total Non-Current Liabilities', rightCol + 10, liabY);
      doc.text(this.formatCurrency(bs.liabilities.nonCurrentLiabilities.subtotal), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
      liabY += 25;
    }

    // Total Liabilities
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Total Liabilities', rightCol, liabY);
    doc.text(this.formatCurrency(bs.liabilities.totalLiabilities), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
    liabY += 30;

    // EQUITY
    doc.fontSize(11).font('Helvetica-Bold').text('Equity', rightCol, liabY);
    liabY += 20;

    doc.fontSize(9).font('Helvetica');
    if (bs.equity.shareCapital) {
      liabY = this.renderLineItems(doc, bs.equity.shareCapital.lineItems, rightCol, liabY, colWidth);
    }
    if (bs.equity.reserves) {
      liabY = this.renderLineItems(doc, bs.equity.reserves.lineItems, rightCol, liabY, colWidth);
    }

    // Retained Earnings & Current Year Profit
    doc.text('Retained Earnings', rightCol + 10, liabY);
    doc.text(this.formatCurrency(bs.equity.retainedEarnings), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
    liabY += 15;

    doc.text('Current Year Profit', rightCol + 10, liabY);
    doc.text(this.formatCurrency(bs.equity.currentYearProfit), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
    liabY += 20;

    // Total Equity
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Total Equity', rightCol, liabY);
    doc.text(this.formatCurrency(bs.equity.totalEquity), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
    liabY += 25;

    // Total Liabilities & Equity
    doc
      .strokeColor('#1e40af')
      .lineWidth(2)
      .moveTo(rightCol, liabY)
      .lineTo(rightCol + colWidth, liabY)
      .stroke();
    liabY += 10;

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af');
    doc.text('TOTAL LIABILITIES & EQUITY', rightCol, liabY);
    doc.text(this.formatCurrency(bs.liabilities.totalLiabilities + bs.equity.totalEquity), rightCol + colWidth - 100, liabY, { width: 100, align: 'right' });
    doc.fillColor('#000000');

    doc.y = Math.max(assetY, liabY) + 40;
  }

  private generateBalanceSheetMetrics(doc: PDFKit.PDFDocument, bs: BalanceSheet): void {
    if (!bs.metrics) return;

    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text('FINANCIAL METRICS', 50, 50);
    doc.fillColor('#000000').moveDown(1);

    const metrics = [
      { label: 'Working Capital', value: `PKR ${this.formatCurrency(bs.metrics.workingCapital)}` },
      { label: 'Current Ratio', value: bs.metrics.currentRatio.toFixed(2) },
      { label: 'Quick Ratio', value: bs.metrics.quickRatio.toFixed(2) },
      { label: 'Debt-to-Equity Ratio', value: bs.metrics.debtToEquityRatio.toFixed(2) },
      { label: 'Return on Assets (ROA)', value: `${bs.metrics.returnOnAssets.toFixed(2)}%` },
      { label: 'Return on Equity (ROE)', value: `${bs.metrics.returnOnEquity.toFixed(2)}%` },
    ];

    let metricY = doc.y;
    doc.fontSize(10).font('Helvetica');

    metrics.forEach((metric) => {
      doc.font('Helvetica-Bold').text(metric.label, 50, metricY, { width: 200, continued: true });
      doc.font('Helvetica').text(metric.value, { align: 'right', width: 150 });
      metricY += 20;
    });
  }

  // ============================================================================
  // INCOME STATEMENT SPECIFIC
  // ============================================================================

  private generateIncomeStatementContent(doc: PDFKit.PDFDocument, is: IncomeStatement): void {
    const leftMargin = 50;
    const pageWidth = doc.page.width - 100;
    let currentY = doc.y;

    // REVENUE
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('REVENUE', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    if (is.revenue.operatingRevenue) {
      currentY = this.renderSection(doc, 'Operating Revenue', is.revenue.operatingRevenue, leftMargin, currentY, pageWidth);
    }
    if (is.revenue.otherIncome) {
      currentY = this.renderSection(doc, 'Other Income', is.revenue.otherIncome, leftMargin, currentY, pageWidth);
    }

    currentY = this.renderTotal(doc, 'Total Revenue', is.revenue.totalRevenue, leftMargin, currentY, pageWidth, '#1e40af');

    // COST OF GOODS SOLD
    if (is.costOfGoodsSold.items.length > 0) {
      currentY += 20;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('COST OF GOODS SOLD', leftMargin, currentY);
      doc.fillColor('#000000');
      currentY += 25;

      currentY = this.renderLineItems(doc, is.costOfGoodsSold.items, leftMargin, currentY, pageWidth);
      currentY = this.renderTotal(doc, 'Total COGS', is.costOfGoodsSold.total, leftMargin, currentY, pageWidth);
    }

    // GROSS PROFIT
    currentY += 20;
    currentY = this.renderHighlight(doc, 'GROSS PROFIT', is.grossProfit.amount, leftMargin, currentY, pageWidth, '#059669');

    // OPERATING EXPENSES
    currentY += 20;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('OPERATING EXPENSES', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    if (is.operatingExpenses.administrative) {
      currentY = this.renderSection(doc, 'Administrative Expenses', is.operatingExpenses.administrative, leftMargin, currentY, pageWidth);
    }
    if (is.operatingExpenses.selling) {
      currentY = this.renderSection(doc, 'Selling Expenses', is.operatingExpenses.selling, leftMargin, currentY, pageWidth);
    }
    if (is.operatingExpenses.general) {
      currentY = this.renderSection(doc, 'General Expenses', is.operatingExpenses.general, leftMargin, currentY, pageWidth);
    }

    currentY = this.renderTotal(doc, 'Total Operating Expenses', is.operatingExpenses.totalOperating, leftMargin, currentY, pageWidth);

    // OPERATING INCOME (EBIT)
    currentY += 20;
    currentY = this.renderHighlight(doc, 'OPERATING INCOME (EBIT)', is.operatingIncome.amount, leftMargin, currentY, pageWidth, '#3b82f6');

    // EBITDA
    if (is.ebitda) {
      currentY += 20;
      currentY = this.renderHighlight(doc, 'EBITDA', is.ebitda.amount, leftMargin, currentY, pageWidth, '#8b5cf6');
    }

    // OTHER EXPENSES
    if (is.otherExpenses.total > 0) {
      currentY += 20;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('OTHER EXPENSES', leftMargin, currentY);
      doc.fillColor('#000000');
      currentY += 25;

      if (is.otherExpenses.financial) {
        currentY = this.renderSection(doc, 'Financial Expenses', is.otherExpenses.financial, leftMargin, currentY, pageWidth);
      }
      if (is.otherExpenses.other) {
        currentY = this.renderSection(doc, 'Other Expenses', is.otherExpenses.other, leftMargin, currentY, pageWidth);
      }

      currentY = this.renderTotal(doc, 'Total Other Expenses', is.otherExpenses.total, leftMargin, currentY, pageWidth);
    }

    // INCOME BEFORE TAX
    currentY += 20;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Income Before Tax', leftMargin, currentY);
    doc.text(this.formatCurrency(is.tax.taxableIncome), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    currentY += 20;

    // TAX
    doc.fontSize(9).font('Helvetica');
    doc.text(`Tax @ ${is.tax.taxRate}%`, leftMargin, currentY);
    doc.text(this.formatCurrency(is.tax.taxAmount), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    currentY += 25;

    // NET INCOME
    const netIncomeColor = is.netIncome.amount >= 0 ? '#059669' : '#dc2626';
    currentY = this.renderHighlight(doc, 'NET INCOME', is.netIncome.amount, leftMargin, currentY, pageWidth, netIncomeColor);

    doc.y = currentY + 20;
  }

  private generateIncomeStatementMetrics(doc: PDFKit.PDFDocument, is: IncomeStatement): void {
    if (!is.metrics) return;

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('PERFORMANCE METRICS', 50);
    doc.fillColor('#000000').moveDown(0.5);

    const metrics = [
      { label: 'Gross Profit Margin', value: `${is.metrics.grossProfitMargin.toFixed(2)}%` },
      { label: 'Operating Margin', value: `${is.metrics.operatingMargin.toFixed(2)}%` },
      { label: 'Net Profit Margin', value: `${is.metrics.netProfitMargin.toFixed(2)}%` },
      { label: 'Return on Sales', value: `${is.metrics.returnOnSales.toFixed(2)}%` },
      { label: 'Expense Ratio', value: `${is.metrics.expenseRatio.toFixed(2)}%` },
    ];

    let metricY = doc.y;
    doc.fontSize(9).font('Helvetica');

    metrics.forEach((metric) => {
      doc.font('Helvetica-Bold').text(metric.label, 50, metricY, { width: 200, continued: true });
      doc.font('Helvetica').text(metric.value, { align: 'right', width: 150 });
      metricY += 18;
    });
  }

  // ============================================================================
  // CASH FLOW SPECIFIC
  // ============================================================================

  private generateCashFlowContent(doc: PDFKit.PDFDocument, cf: CashFlowStatement): void {
    const leftMargin = 50;
    const pageWidth = doc.page.width - 100;
    let currentY = doc.y;

    // OPERATING ACTIVITIES
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#3b82f6').text('CASH FLOWS FROM OPERATING ACTIVITIES', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    doc.fontSize(10).font('Helvetica-Bold').text('Net Income', leftMargin, currentY);
    doc.text(this.formatCurrency(cf.operatingActivities.netIncome), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    currentY += 25;

    if (cf.operatingActivities.adjustments.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').text('Adjustments to reconcile net income:', leftMargin, currentY);
      currentY += 18;
      currentY = this.renderLineItems(doc, cf.operatingActivities.adjustments, leftMargin, currentY, pageWidth);
    }

    if (cf.operatingActivities.workingCapitalChanges.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').text('Changes in working capital:', leftMargin, currentY);
      currentY += 18;
      currentY = this.renderLineItems(doc, cf.operatingActivities.workingCapitalChanges, leftMargin, currentY, pageWidth);
    }

    currentY = this.renderTotal(doc, 'Net Cash from Operating Activities', cf.operatingActivities.netCashFromOperating, leftMargin, currentY, pageWidth, '#3b82f6');

    // INVESTING ACTIVITIES
    currentY += 30;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#8b5cf6').text('CASH FLOWS FROM INVESTING ACTIVITIES', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    if (cf.investingActivities.items.length > 0) {
      currentY = this.renderLineItems(doc, cf.investingActivities.items, leftMargin, currentY, pageWidth);
      currentY = this.renderTotal(doc, 'Net Cash from Investing Activities', cf.investingActivities.netCashFromInvesting, leftMargin, currentY, pageWidth, '#8b5cf6');
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('No investing activities during this period', leftMargin, currentY);
      doc.fillColor('#000000');
      currentY += 20;
    }

    // FINANCING ACTIVITIES
    currentY += 30;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669').text('CASH FLOWS FROM FINANCING ACTIVITIES', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    if (cf.financingActivities.items.length > 0) {
      currentY = this.renderLineItems(doc, cf.financingActivities.items, leftMargin, currentY, pageWidth);
      currentY = this.renderTotal(doc, 'Net Cash from Financing Activities', cf.financingActivities.netCashFromFinancing, leftMargin, currentY, pageWidth, '#059669');
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('No financing activities during this period', leftMargin, currentY);
      doc.fillColor('#000000');
      currentY += 20;
    }

    // CASH SUMMARY
    currentY += 30;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('CASH SUMMARY', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    const netChangeColor = cf.cashSummary.netCashChange >= 0 ? '#059669' : '#dc2626';
    doc.fontSize(10).font('Helvetica-Bold').fillColor(netChangeColor);
    doc.text('Net Change in Cash', leftMargin, currentY);
    doc.text(this.formatCurrency(cf.cashSummary.netCashChange), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    doc.fillColor('#000000');
    currentY += 20;

    doc.fontSize(9).font('Helvetica');
    doc.text('Cash at Beginning of Period', leftMargin, currentY);
    doc.text(this.formatCurrency(cf.cashSummary.cashBeginning), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    currentY += 25;

    doc
      .strokeColor('#1e40af')
      .lineWidth(2)
      .moveTo(leftMargin, currentY)
      .lineTo(leftMargin + pageWidth, currentY)
      .stroke();
    currentY += 10;

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af');
    doc.text('Cash at End of Period', leftMargin, currentY);
    doc.text(this.formatCurrency(cf.cashSummary.cashEnding), leftMargin + pageWidth - 120, currentY, { width: 120, align: 'right' });
    doc.fillColor('#000000');

    doc.y = currentY + 20;
  }

  private generateCashFlowMetrics(doc: PDFKit.PDFDocument, cf: CashFlowStatement): void {
    if (!cf.metrics) return;

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('CASH FLOW METRICS', 50);
    doc.fillColor('#000000').moveDown(0.5);

    const metrics = [
      { label: 'Operating Cash Flow Ratio', value: cf.metrics.operatingCashFlowRatio.toFixed(2) },
      { label: 'Free Cash Flow', value: `PKR ${this.formatCurrency(cf.metrics.freeCashFlow)}` },
      { label: 'Cash Flow Margin', value: `${cf.metrics.cashFlowMargin.toFixed(2)}%` },
    ];

    let metricY = doc.y;
    doc.fontSize(9).font('Helvetica');

    metrics.forEach((metric) => {
      doc.font('Helvetica-Bold').text(metric.label, 50, metricY, { width: 200, continued: true });
      doc.font('Helvetica').text(metric.value, { align: 'right', width: 150 });
      metricY += 18;
    });
  }

  // ============================================================================
  // FINANCIAL ANALYSIS SPECIFIC
  // ============================================================================

  private generateFinancialAnalysisContent(doc: PDFKit.PDFDocument, analysis: FinancialAnalysis): void {
    const leftMargin = 50;
    let currentY = doc.y;

    // LIQUIDITY RATIOS
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6').text('LIQUIDITY RATIOS', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    currentY = this.renderRatio(doc, 'Current Ratio', analysis.liquidity.currentRatio, '2.0', leftMargin, currentY);
    currentY = this.renderRatio(doc, 'Quick Ratio', analysis.liquidity.quickRatio, '1.0', leftMargin, currentY);
    currentY = this.renderRatio(doc, 'Cash Ratio', analysis.liquidity.cashRatio, '0.5', leftMargin, currentY);
    currentY = this.renderCurrencyMetric(doc, 'Working Capital', analysis.liquidity.workingCapital, leftMargin, currentY);

    // PROFITABILITY RATIOS
    currentY += 30;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#059669').text('PROFITABILITY RATIOS', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    currentY = this.renderPercentageMetric(doc, 'Gross Profit Margin', analysis.profitability.grossProfitMargin, leftMargin, currentY);
    currentY = this.renderPercentageMetric(doc, 'Operating Margin', analysis.profitability.operatingMargin, leftMargin, currentY);
    currentY = this.renderPercentageMetric(doc, 'Net Profit Margin', analysis.profitability.netProfitMargin, leftMargin, currentY);
    currentY = this.renderPercentageMetric(doc, 'Return on Assets (ROA)', analysis.profitability.returnOnAssets, leftMargin, currentY);
    currentY = this.renderPercentageMetric(doc, 'Return on Equity (ROE)', analysis.profitability.returnOnEquity, leftMargin, currentY);
    currentY = this.renderPercentageMetric(doc, 'Return on Investment (ROI)', analysis.profitability.returnOnInvestment, leftMargin, currentY);

    // EFFICIENCY RATIOS
    currentY += 30;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#8b5cf6').text('EFFICIENCY RATIOS', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    currentY = this.renderRatio(doc, 'Asset Turnover', analysis.efficiency.assetTurnover, '1.0x', leftMargin, currentY);
    if (analysis.efficiency.inventoryTurnover !== undefined) {
      currentY = this.renderRatio(doc, 'Inventory Turnover', analysis.efficiency.inventoryTurnover, '-', leftMargin, currentY);
    }
    if (analysis.efficiency.receivablesTurnover !== undefined) {
      currentY = this.renderRatio(doc, 'Receivables Turnover', analysis.efficiency.receivablesTurnover, '-', leftMargin, currentY);
    }
    if (analysis.efficiency.payablesTurnover !== undefined) {
      currentY = this.renderRatio(doc, 'Payables Turnover', analysis.efficiency.payablesTurnover, '-', leftMargin, currentY);
    }

    // SOLVENCY RATIOS
    currentY += 30;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#f59e0b').text('SOLVENCY RATIOS', leftMargin, currentY);
    doc.fillColor('#000000');
    currentY += 25;

    currentY = this.renderRatio(doc, 'Debt-to-Assets', analysis.solvency.debtToAssets, '≤ 0.4', leftMargin, currentY);
    currentY = this.renderRatio(doc, 'Debt-to-Equity', analysis.solvency.debtToEquity, '≤ 1.0', leftMargin, currentY);
    currentY = this.renderRatio(doc, 'Equity Ratio', analysis.solvency.equityRatio, '≥ 0.5', leftMargin, currentY);
    if (analysis.solvency.interestCoverage !== undefined) {
      currentY = this.renderRatio(doc, 'Interest Coverage', analysis.solvency.interestCoverage, '≥ 3.0x', leftMargin, currentY);
    }

    doc.y = currentY;
  }

  // ============================================================================
  // HELPER RENDERING METHODS
  // ============================================================================

  private renderLineItems(doc: PDFKit.PDFDocument, items: any[], x: number, startY: number, width: number): number {
    let y = startY;
    doc.fontSize(9).font('Helvetica');

    items.forEach((item) => {
      const indent = (item.level || 1) * 10;
      doc.text(item.label, x + indent, y, { width: width - 120 - indent });
      doc.text(this.formatCurrency(item.amount), x + width - 120, y, { width: 120, align: 'right' });
      y += 15;
    });

    return y + 5;
  }

  private renderSection(doc: PDFKit.PDFDocument, title: string, section: any, x: number, y: number, width: number): number {
    doc.fontSize(10).font('Helvetica-Bold').text(title, x, y);
    y += 20;
    return this.renderLineItems(doc, section.lineItems, x, y, width);
  }

  private renderTotal(doc: PDFKit.PDFDocument, label: string, amount: number, x: number, y: number, width: number, color: string = '#000000'): number {
    doc
      .strokeColor(color)
      .lineWidth(1)
      .moveTo(x, y)
      .lineTo(x + width, y)
      .stroke();
    y += 8;

    doc.fontSize(10).font('Helvetica-Bold').fillColor(color);
    doc.text(label, x, y);
    doc.text(this.formatCurrency(amount), x + width - 120, y, { width: 120, align: 'right' });
    doc.fillColor('#000000');

    return y + 25;
  }

  private renderHighlight(doc: PDFKit.PDFDocument, label: string, amount: number, x: number, y: number, width: number, color: string): number {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(color);
    doc.text(label, x, y);
    doc.text(this.formatCurrency(amount), x + width - 120, y, { width: 120, align: 'right' });
    doc.fillColor('#000000');

    return y + 20;
  }

  private renderRatio(doc: PDFKit.PDFDocument, label: string, value: number, benchmark: string, x: number, y: number): number {
    doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { width: 250 });
    doc.font('Helvetica').text(value.toFixed(2), x + 250, y, { width: 100, align: 'right' });
    doc.fontSize(8).fillColor('#64748b').text(`Target: ${benchmark}`, x + 360, y, { width: 150 });
    doc.fillColor('#000000');
    return y + 22;
  }

  private renderPercentageMetric(doc: PDFKit.PDFDocument, label: string, value: number, x: number, y: number): number {
    doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { width: 250 });
    doc.font('Helvetica').text(`${value.toFixed(2)}%`, x + 250, y, { width: 100, align: 'right' });
    return y + 22;
  }

  private renderCurrencyMetric(doc: PDFKit.PDFDocument, label: string, value: number, x: number, y: number): number {
    doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { width: 250 });
    doc.font('Helvetica').text(`PKR ${this.formatCurrency(value)}`, x + 250, y, { width: 200, align: 'right' });
    return y + 22;
  }
}
