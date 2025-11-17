import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Invoice } from '../entities/invoice.entity';
import { format } from 'date-fns';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /**
   * Generate PDF for an invoice
   */
  async generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
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

        // Generate PDF content
        this.generateHeader(doc);
        this.generateCustomerInfo(doc, invoice);
        this.generateInvoiceDetails(doc, invoice);
        this.generateLineItems(doc, invoice);
        this.generateTotals(doc, invoice);
        this.generateFooter(doc, invoice);

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate PDF for invoice ${invoice.invoiceNumber}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Generate PDF header with company info
   */
  private generateHeader(doc: PDFKit.PDFDocument): void {
    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // Company Name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('COLD STORAGE FACILITY', 50, 50, { align: 'center' })
      .fontSize(10)
      .font('Helvetica')
      .text('Professional Cold Storage & Warehousing Services', { align: 'center' })
      .moveDown(0.3);

    // Company Details
    doc
      .fontSize(9)
      .text('Address: [Your Business Address]', { align: 'center' })
      .text('NTN: [Your NTN Number] | STRN: [Your STRN Number]', { align: 'center' })
      .text('Phone: [Contact Number] | Email: [Email Address]', { align: 'center' })
      .moveDown(1);

    // Horizontal line
    doc
      .strokeColor('#3b82f6')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(pageWidth - 50, doc.y)
      .stroke()
      .moveDown(1);
  }

  /**
   * Generate customer information section
   */
  private generateCustomerInfo(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const topY = doc.y;

    // Invoice Title
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('TAX INVOICE', 50, topY)
      .fillColor('#000000')
      .moveDown(1);

    const infoStartY = doc.y;

    // Left column - Bill To
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, infoStartY)
      .font('Helvetica')
      .fontSize(9)
      .moveDown(0.3);

    if (invoice.customer) {
      doc
        .text(invoice.customer.name || 'N/A')
        .text(invoice.customer.contactPerson || '')
        .text(`Phone: ${invoice.customer.phone || 'N/A'}`)
        .text(`Email: ${invoice.customer.email || 'N/A'}`);
    }

    // Right column - Invoice Details
    const rightX = 350;
    doc.fontSize(10).font('Helvetica-Bold');

    let detailY = infoStartY;
    const lineHeight = 15;

    // Invoice Number
    doc.text('Invoice No:', rightX, detailY, { width: 100, continued: false });
    doc.font('Helvetica').text(invoice.invoiceNumber, rightX + 100, detailY);
    detailY += lineHeight;

    // Issue Date
    doc.font('Helvetica-Bold').text('Issue Date:', rightX, detailY);
    doc.font('Helvetica').text(format(new Date(invoice.issueDate), 'dd-MMM-yyyy'), rightX + 100, detailY);
    detailY += lineHeight;

    // Due Date
    doc.font('Helvetica-Bold').text('Due Date:', rightX, detailY);
    doc.font('Helvetica').text(format(new Date(invoice.dueDate), 'dd-MMM-yyyy'), rightX + 100, detailY);
    detailY += lineHeight;

    // Reference Number
    if (invoice.referenceNumber) {
      doc.font('Helvetica-Bold').text('Reference:', rightX, detailY);
      doc.font('Helvetica').text(invoice.referenceNumber, rightX + 100, detailY);
      detailY += lineHeight;
    }

    // Status
    doc.font('Helvetica-Bold').text('Status:', rightX, detailY);
    const statusColor = this.getStatusColor(invoice.status);
    doc.fillColor(statusColor).font('Helvetica-Bold').text(invoice.status, rightX + 100, detailY);
    doc.fillColor('#000000');

    doc.moveDown(2);
  }

  /**
   * Generate storage details section
   */
  private generateInvoiceDetails(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    if (invoice.invoiceType === 'STORAGE' && invoice.weight) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('STORAGE DETAILS', 50, doc.y)
        .moveDown(0.5);

      const detailsY = doc.y;
      const col1X = 50;
      const col2X = 200;
      const col3X = 350;
      const lineHeight = 18;

      doc.fontSize(9).font('Helvetica');

      let currentY = detailsY;

      // Row 1
      doc.font('Helvetica-Bold').text('Weight:', col1X, currentY);
      doc.font('Helvetica').text(`${invoice.weight} kg`, col1X + 60, currentY);

      doc.font('Helvetica-Bold').text('Days Stored:', col2X, currentY);
      doc.font('Helvetica').text(`${invoice.daysStored} days`, col2X + 70, currentY);

      doc.font('Helvetica-Bold').text('Rate:', col3X, currentY);
      doc.font('Helvetica').text(`PKR ${invoice.ratePerKgPerDay}/kg/day`, col3X + 40, currentY);

      currentY += lineHeight;

      // Row 2 - Dates
      if (invoice.storageDateIn) {
        doc.font('Helvetica-Bold').text('Date In:', col1X, currentY);
        doc.font('Helvetica').text(format(new Date(invoice.storageDateIn), 'dd-MMM-yyyy'), col1X + 60, currentY);
      }

      if (invoice.storageDateOut) {
        doc.font('Helvetica-Bold').text('Date Out:', col2X, currentY);
        doc.font('Helvetica').text(format(new Date(invoice.storageDateOut), 'dd-MMM-yyyy'), col2X + 70, currentY);
      }

      doc.moveDown(2);
    }
  }

  /**
   * Generate line items table
   */
  private generateLineItems(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const tableTop = doc.y;
    const pageWidth = doc.page.width;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .rect(50, tableTop, pageWidth - 100, 25)
      .fill('#3b82f6');

    doc.fillColor('#ffffff');

    const headerY = tableTop + 8;
    doc.text('#', 55, headerY, { width: 30 });
    doc.text('Description', 90, headerY, { width: 240 });
    doc.text('Qty', 335, headerY, { width: 50, align: 'right' });
    doc.text('Unit Price', 390, headerY, { width: 70, align: 'right' });
    doc.text('Amount', 465, headerY, { width: 80, align: 'right' });

    doc.fillColor('#000000');

    // Line items
    let itemY = tableTop + 35;
    const sortedItems = invoice.lineItems?.sort((a, b) => a.lineNumber - b.lineNumber) || [];

    sortedItems.forEach((item, index) => {
      if (itemY > doc.page.height - 200) {
        doc.addPage();
        itemY = 50;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, itemY - 5, pageWidth - 100, 20).fill('#f8fafc');
      }

      doc.fillColor('#000000').fontSize(9).font('Helvetica');

      doc.text(item.lineNumber.toString(), 55, itemY, { width: 30 });
      doc.text(item.description, 90, itemY, { width: 240 });
      doc.text(parseFloat(item.quantity.toString()).toFixed(2), 335, itemY, { width: 50, align: 'right' });
      doc.text(parseFloat(item.unitPrice.toString()).toLocaleString('en-PK', { minimumFractionDigits: 2 }), 390, itemY, { width: 70, align: 'right' });
      doc.text(parseFloat(item.lineTotal.toString()).toLocaleString('en-PK', { minimumFractionDigits: 2 }), 465, itemY, { width: 80, align: 'right' });

      itemY += 25;
    });

    // Bottom border
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .moveTo(50, itemY)
      .lineTo(pageWidth - 50, itemY)
      .stroke();

    doc.y = itemY + 10;
  }

  /**
   * Generate totals section
   */
  private generateTotals(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const pageWidth = doc.page.width;
    const rightX = pageWidth - 250;
    let totalY = doc.y + 10;

    doc.fontSize(9).font('Helvetica');

    // Subtotal
    doc.font('Helvetica').text('Subtotal:', rightX, totalY);
    doc.text(`PKR ${invoice.subtotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, rightX + 100, totalY, { width: 100, align: 'right' });
    totalY += 18;

    // GST
    if (invoice.gstAmount > 0) {
      doc.text(`GST @ ${invoice.gstRate}%:`, rightX, totalY);
      doc.text(`PKR ${invoice.gstAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, rightX + 100, totalY, { width: 100, align: 'right' });
      totalY += 18;
    }

    // WHT
    if (invoice.whtAmount > 0) {
      doc.text(`WHT @ ${invoice.whtRate}% (Deducted):`, rightX, totalY);
      doc.fillColor('#dc2626').text(`(PKR ${invoice.whtAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })})`, rightX + 100, totalY, { width: 100, align: 'right' });
      doc.fillColor('#000000');
      totalY += 18;
    }

    // Line
    doc
      .strokeColor('#3b82f6')
      .lineWidth(1)
      .moveTo(rightX, totalY)
      .lineTo(pageWidth - 50, totalY)
      .stroke();
    totalY += 10;

    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text('TOTAL AMOUNT:', rightX, totalY);
    doc.text(`PKR ${invoice.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, rightX + 100, totalY, { width: 100, align: 'right' });
    doc.fillColor('#000000');
    totalY += 25;

    // Amount Paid
    if (invoice.amountPaid > 0) {
      doc.fontSize(9).font('Helvetica');
      doc.text('Amount Paid:', rightX, totalY);
      doc.fillColor('#059669').text(`PKR ${invoice.amountPaid.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, rightX + 100, totalY, { width: 100, align: 'right' });
      doc.fillColor('#000000');
      totalY += 18;

      // Balance Due
      doc.font('Helvetica-Bold').text('Balance Due:', rightX, totalY);
      doc.fillColor('#dc2626').text(`PKR ${invoice.balanceDue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, rightX + 100, totalY, { width: 100, align: 'right' });
      doc.fillColor('#000000');
      totalY += 20;
    }

    doc.y = totalY + 10;
  }

  /**
   * Generate footer with notes and payment terms
   */
  private generateFooter(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    let footerY = doc.y + 20;

    // Notes section
    if (invoice.notes) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('NOTES:', 50, footerY)
        .font('Helvetica')
        .text(invoice.notes, 50, footerY + 15, { width: pageWidth - 100 })
        .moveDown(1);

      footerY = doc.y + 10;
    }

    // Payment Terms
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('PAYMENT TERMS:', 50, footerY)
      .font('Helvetica')
      .text(`Payment due within ${invoice.paymentTermsDays} days from issue date.`, 50, footerY + 15, { width: pageWidth - 100 })
      .moveDown(0.5);

    // Bank Details
    doc
      .font('Helvetica-Bold')
      .text('BANK DETAILS:', 50, doc.y)
      .font('Helvetica')
      .text('Bank: [Your Bank Name]', 50, doc.y)
      .text('Account Title: [Account Title]', 50, doc.y)
      .text('Account Number: [Account Number]', 50, doc.y)
      .text('IBAN: [IBAN Number]', 50, doc.y)
      .moveDown(1);

    // Footer line and signature
    const bottomY = pageHeight - 100;
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
      .text('This is a computer-generated invoice and does not require a signature.', 50, bottomY + 10, { align: 'center' })
      .text('For any queries, please contact us at [Email/Phone]', { align: 'center' })
      .moveDown(0.5)
      .text(`Generated on: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, { align: 'center' });

    doc.fillColor('#000000');
  }

  /**
   * Get status color for display
   */
  private getStatusColor(status: string): string {
    const colors = {
      DRAFT: '#64748b',
      SENT: '#3b82f6',
      PAID: '#059669',
      PARTIALLY_PAID: '#d97706',
      OVERDUE: '#dc2626',
      CANCELLED: '#64748b',
    };

    return colors[status] || '#000000';
  }
}
