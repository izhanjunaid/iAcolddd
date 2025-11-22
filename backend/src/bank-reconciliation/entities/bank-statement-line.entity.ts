import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BankStatement } from './bank-statement.entity';
import { VoucherDetail } from '../../vouchers/entities/voucher-detail.entity';

@Entity('bank_statement_lines')
export class BankStatementLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'statement_id', type: 'uuid' })
    statementId: string;

    @ManyToOne(() => BankStatement, (statement) => statement.lines, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'statement_id' })
    statement: BankStatement;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'varchar', length: 255 })
    description: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    reference: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    debit: number; // Withdrawal

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    credit: number; // Deposit

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    balance: number;

    @Column({ type: 'boolean', default: false, name: 'is_matched' })
    isMatched: boolean;

    @Column({ name: 'matched_voucher_detail_id', type: 'uuid', nullable: true })
    matchedVoucherDetailId: string | null;

    @ManyToOne(() => VoucherDetail, { nullable: true })
    @JoinColumn({ name: 'matched_voucher_detail_id' })
    matchedVoucherDetail: VoucherDetail | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;
}
