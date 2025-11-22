import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';
import { BankStatementLine } from './bank-statement-line.entity';

@Entity('bank_statements')
export class BankStatement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'account_id', type: 'uuid' })
    accountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ name: 'statement_date', type: 'date' })
    statementDate: Date;

    @Column({ name: 'period_start', type: 'date' })
    periodStart: Date;

    @Column({ name: 'period_end', type: 'date' })
    periodEnd: Date;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 18, scale: 2 })
    openingBalance: number;

    @Column({ name: 'closing_balance', type: 'decimal', precision: 18, scale: 2 })
    closingBalance: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    reference: string;

    @Column({ type: 'boolean', default: false, name: 'is_reconciled' })
    isReconciled: boolean;

    @OneToMany(() => BankStatementLine, (line) => line.statement, {
        cascade: true,
    })
    lines: BankStatementLine[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by', type: 'uuid' })
    createdById: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;
}
