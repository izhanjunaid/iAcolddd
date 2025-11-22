import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BankStatement, BankStatementLine } from './entities';
import { VoucherDetail } from '../vouchers/entities/voucher-detail.entity';
import { Account } from '../accounts/entities/account.entity';

@Injectable()
export class BankReconciliationService {
    constructor(
        @InjectRepository(BankStatement)
        private readonly statementRepository: Repository<BankStatement>,
        @InjectRepository(BankStatementLine)
        private readonly lineRepository: Repository<BankStatementLine>,
        @InjectRepository(VoucherDetail)
        private readonly voucherDetailRepository: Repository<VoucherDetail>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) { }

    /**
     * Create a new bank statement (header only)
     */
    async createStatement(data: Partial<BankStatement>, userId: string): Promise<BankStatement> {
        const statement = this.statementRepository.create({
            ...data,
            createdById: userId,
        });
        return await this.statementRepository.save(statement);
    }

    /**
     * Add lines to a bank statement
     */
    async addLines(statementId: string, lines: Partial<BankStatementLine>[]): Promise<BankStatement> {
        const statement = await this.statementRepository.findOne({
            where: { id: statementId },
            relations: ['lines'],
        });

        if (!statement) {
            throw new NotFoundException(`Bank statement ${statementId} not found`);
        }

        const newLines = lines.map((line) =>
            this.lineRepository.create({
                ...line,
                statementId: statement.id,
            }),
        );

        await this.lineRepository.save(newLines);
        return this.statementRepository.findOne({
            where: { id: statementId },
            relations: ['lines'],
        }) as Promise<BankStatement>;
    }

    /**
     * Auto-match bank statement lines with system vouchers
     * Matching criteria: Exact amount AND Date within +/- 3 days
     */
    async autoMatch(statementId: string): Promise<{ matchedCount: number }> {
        const statement = await this.statementRepository.findOne({
            where: { id: statementId },
            relations: ['lines', 'account'],
        });

        if (!statement) {
            throw new NotFoundException(`Bank statement ${statementId} not found`);
        }

        const unmatchedLines = await this.lineRepository.find({
            where: { statementId, isMatched: false },
        });

        let matchedCount = 0;

        for (const line of unmatchedLines) {
            // Determine if it's a debit or credit in the system
            // Bank Debit (Withdrawal) = System Credit (Payment)
            // Bank Credit (Deposit) = System Debit (Receipt)
            const isWithdrawal = Number(line.debit) > 0;
            const amount = isWithdrawal ? Number(line.debit) : Number(line.credit);

            // Find candidate vouchers
            // Look for vouchers posted to the bank account
            const dateBuffer = 3; // days
            const minDate = new Date(line.date);
            minDate.setDate(minDate.getDate() - dateBuffer);
            const maxDate = new Date(line.date);
            maxDate.setDate(maxDate.getDate() + dateBuffer);

            const query = this.voucherDetailRepository
                .createQueryBuilder('detail')
                .leftJoinAndSelect('detail.voucher', 'voucher')
                .where('detail.account_code = :accountCode', { accountCode: statement.account.code })
                .andWhere('voucher.is_posted = :isPosted', { isPosted: true })
                .andWhere('voucher.voucher_date >= :minDate', { minDate })
                .andWhere('voucher.voucher_date <= :maxDate', { maxDate });

            if (isWithdrawal) {
                // Look for system credit (payment)
                query.andWhere('detail.credit_amount = :amount', { amount });
            } else {
                // Look for system debit (receipt)
                query.andWhere('detail.debit_amount = :amount', { amount });
            }

            // Ensure not already matched (this is a simplification, ideally we'd check a "reconciled" flag on voucher detail)
            // For now, we assume 1-to-1 matching and no partial matches

            const candidates = await query.getMany();

            if (candidates.length === 1) {
                // Perfect match found
                const match = candidates[0];

                // Check if this voucher detail is already matched to another line
                const existingMatch = await this.lineRepository.findOne({
                    where: { matchedVoucherDetailId: match.id },
                });

                if (!existingMatch) {
                    line.isMatched = true;
                    line.matchedVoucherDetail = match;
                    await this.lineRepository.save(line);
                    matchedCount++;
                }
            }
        }

        return { matchedCount };
    }

    /**
     * Get reconciliation status
     */
    async getReconciliationStatus(statementId: string) {
        const statement = await this.statementRepository.findOne({
            where: { id: statementId },
            relations: ['lines'],
        });

        if (!statement) {
            throw new NotFoundException(`Bank statement ${statementId} not found`);
        }

        const totalLines = statement.lines.length;
        const matchedLines = statement.lines.filter((l) => l.isMatched).length;
        const unmatchedLines = totalLines - matchedLines;

        // Calculate adjusted bank balance
        // Adjusted Balance = Statement Closing Balance + Deposits in Transit - Outstanding Checks
        // This requires knowing which system vouchers are NOT matched, which is the reverse of what we have here.
        // For this simple version, we'll just return match statistics.

        return {
            statementId,
            totalLines,
            matchedLines,
            unmatchedLines,
            progress: totalLines > 0 ? (matchedLines / totalLines) * 100 : 0,
        };
    }
}
