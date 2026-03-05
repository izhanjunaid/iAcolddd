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

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => ApPayment, (payment) => payment.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: ApPayment;

  @Column({ name: 'bill_id', type: 'uuid' })
  billId: string;

  @ManyToOne(() => ApBill, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_id' })
  bill: ApBill;

  @Column({ name: 'amount_applied', type: 'decimal', precision: 18, scale: 2 })
  amountApplied: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
