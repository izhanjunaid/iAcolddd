import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApPayment } from './ap-payment.entity';
import { ApBill } from './ap-bill.entity';

@Entity('ap_payment_applications')
export class ApPaymentApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  @ManyToOne(() => ApPayment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: ApPayment;

  @Column({ type: 'uuid', name: 'bill_id' })
  billId: string;

  @ManyToOne(() => ApBill, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_id' })
  bill: ApBill;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'amount_applied' })
  amountApplied: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
