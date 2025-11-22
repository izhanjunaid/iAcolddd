import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Account } from '../accounts/entities/account.entity';
import { VoucherMaster, VoucherDetail } from '../vouchers/entities';

// Services
import { BalanceSheetService } from './services/balance-sheet.service';
import { IncomeStatementService } from './services/income-statement.service';
import { CashFlowService } from './services/cash-flow.service';
import { FinancialAnalysisService } from './services/financial-analysis.service';
import { FinancialStatementsPdfService } from './services/financial-statements-pdf.service';

// Controllers
import { BalanceSheetController } from './controllers/balance-sheet.controller';
import { IncomeStatementController } from './controllers/income-statement.controller';
import { CashFlowController } from './controllers/cash-flow.controller';
import { FinancialAnalysisController } from './controllers/financial-analysis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, VoucherMaster, VoucherDetail]),
  ],
  controllers: [
    BalanceSheetController,
    IncomeStatementController,
    CashFlowController,
    FinancialAnalysisController,
  ],
  providers: [
    BalanceSheetService,
    IncomeStatementService,
    CashFlowService,
    FinancialAnalysisService,
    FinancialStatementsPdfService,
  ],
  exports: [
    BalanceSheetService,
    IncomeStatementService,
    CashFlowService,
    FinancialAnalysisService,
  ],
})
export class FinancialStatementsModule {}
