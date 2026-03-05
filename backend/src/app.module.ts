import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { GeneralLedgerModule } from './general-ledger/general-ledger.module';
import { SequencesModule } from './sequences/sequences.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { CustomersModule } from './customers/customers.module';
import { FiscalPeriodsModule } from './fiscal-periods/fiscal-periods.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { InventoryModule } from './inventory/inventory.module';
import { TaxModule } from './tax/tax.module';
import { BillingModule } from './billing/billing.module';
import { InvoicesModule } from './invoices/invoices.module';
import { FinancialStatementsModule } from './financial-statements/financial-statements.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { PayablesModule } from './payables/payables.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VendorsModule } from './vendors/vendors.module';
import { ApModule } from './ap/ap.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ColdStoreModule } from './cold-store/cold-store.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Set to false in production, use migrations
        logging: false, // Disabled for production/clean verification
      }),
      inject: [ConfigService],
    }),

    // Redis & Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),

    // Cron jobs (IFRS P3 Deferred Revenue + P4 Depreciation)
    ScheduleModule.forRoot(),

    UsersModule,
    AuthModule,
    AccountsModule,
    VouchersModule,
    GeneralLedgerModule,
    SequencesModule,
    ApprovalsModule,
    CustomersModule,
    FiscalPeriodsModule,
    CostCentersModule,
    InventoryModule,
    TaxModule,
    BillingModule,
    InvoicesModule,
    FinancialStatementsModule,
    BankReconciliationModule,
    PayablesModule,
    DashboardModule,
    VendorsModule,
    ApModule,
    ProcurementModule,
    ColdStoreModule,
    FixedAssetsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
