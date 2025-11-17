import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ type: 'int', name: 'line_number' })
  lineNumber: number;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price', default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'line_total', default: 0 })
  lineTotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', nullable: true })
  taxRate: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'tax_amount', nullable: true })
  taxAmount: number | null;
}
