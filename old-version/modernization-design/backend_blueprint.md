# Backend Modernization Blueprint: NestJS Implementation
**Project:** Advance ERP Modernization  
**Date:** October 15, 2025  
**Technology:** NestJS + TypeScript + PostgreSQL

---

## Executive Summary

This blueprint outlines the complete NestJS-based backend architecture for the modernized Advance ERP system. The design emphasizes:
- **Modular architecture** with clear domain boundaries
- **Type-safe APIs** with shared DTOs across frontend/backend
- **Role-Based Access Control (RBAC)** with granular permissions
- **Event-driven workflows** using Bull queues
- **Caching strategy** with Redis
- **Audit trails** for compliance
- **Real-time updates** via WebSockets

**Key Metrics:**
- **~15-20 modules** (Accounting, Warehouse, Billing, etc.)
- **~60-80 API endpoints**
- **~40-50 database entities**
- **Expected throughput:** 1000+ req/sec
- **Target latency:** <50ms (p95)

---

## 1. Architecture Overview

### 1.1 High-Level Structure

```
advance-erp-backend/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root module
│   │
│   ├── config/                      # Configuration
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   │
│   ├── common/                      # Shared utilities
│   │   ├── decorators/              # Custom decorators
│   │   ├── guards/                  # Auth, RBAC guards
│   │   ├── interceptors/            # Logging, transformation
│   │   ├── pipes/                   # Validation pipes
│   │   ├── filters/                 # Exception filters
│   │   ├── interfaces/              # Shared interfaces
│   │   ├── enums/                   # Shared enums
│   │   └── utils/                   # Helper functions
│   │
│   ├── database/                    # Database management
│   │   ├── migrations/              # TypeORM migrations
│   │   ├── seeds/                   # Seed data
│   │   └── entities/                # Base entities
│   │
│   ├── modules/                     # Business modules
│   │   ├── auth/                    # Authentication & Authorization
│   │   ├── users/                   # User management
│   │   ├── roles/                   # Role & Permission management
│   │   ├── accounts/                # Chart of Accounts
│   │   ├── vouchers/                # Journal, Payment, Receipt
│   │   ├── products/                # Product master
│   │   ├── customers/               # Customer accounts
│   │   ├── suppliers/               # Supplier accounts
│   │   ├── warehouses/              # Warehouse & Rooms
│   │   ├── grn/                     # Goods Receipt Notes
│   │   ├── gdn/                     # Goods Delivery Notes
│   │   ├── transfers/               # Inter-room transfers
│   │   ├── invoices/                # Billing & Invoicing
│   │   ├── reports/                 # Report generation
│   │   ├── dashboard/               # Dashboard metrics
│   │   ├── audit/                   # Audit logs
│   │   ├── notifications/           # Real-time notifications
│   │   ├── settings/                # System settings
│   │   └── company/                 # Company profile
│   │
│   ├── jobs/                        # Background jobs
│   │   ├── processors/              # Bull processors
│   │   └── schedulers/              # Cron jobs
│   │
│   └── gateway/                     # WebSocket gateway
│       └── events.gateway.ts
│
├── test/                            # E2E tests
├── .env.example
├── tsconfig.json
├── package.json
├── nest-cli.json
└── docker-compose.yml
```

### 1.2 Module Dependency Graph

```
┌─────────────┐
│ AppModule   │
└──────┬──────┘
       │
       ├─► AuthModule ──────────┬─► UsersModule
       │                        └─► RolesModule
       │
       ├─► AccountingModule ────┬─► AccountsModule (Chart of Accounts)
       │                        ├─► VouchersModule
       │                        └─► AuditModule
       │
       ├─► WarehouseModule ─────┬─► ProductsModule
       │                        ├─► WarehousesModule
       │                        ├─► GRNModule
       │                        ├─► GDNModule
       │                        └─► TransfersModule
       │
       ├─► BillingModule ───────┬─► InvoicesModule
       │                        ├─► CustomersModule
       │                        └─► VouchersModule
       │
       ├─► ReportsModule ───────┬─► JobsModule (Background processing)
       │                        └─► NotificationsModule
       │
       ├─► DashboardModule ─────┬─► CacheModule
       │                        └─► EventsGateway (Real-time)
       │
       ├─► SettingsModule
       └─► CompanyModule
```

---

## 2. Core Modules Design

### 2.1 Authentication Module (`auth/`)

**Responsibilities:**
- User login/logout
- JWT token generation & validation
- Password hashing & verification
- Refresh token management
- Session management

**File Structure:**
```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── roles.decorator.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── refresh-token.dto.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

**Key Implementation:**

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        @InjectRepository(RefreshToken)
        private refreshTokenRepo: Repository<RefreshToken>
    ) {}

    async validateUser(username: string, password: string): Promise<User | null> {
        const user = await this.usersService.findByUsername(username);
        if (!user || !user.isActive) return null;
        
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;
        
        // Update last login
        await this.usersService.updateLastLogin(user.id);
        return user;
    }

    async login(user: User) {
        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            roles: user.roles.map(r => r.name),
            permissions: await this.getRolePermissions(user.roles)
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = await this.generateRefreshToken(user.id);

        return {
            accessToken,
            refreshToken,
            expiresIn: 3600,
            user: { id: user.id, username: user.username, fullName: user.fullName }
        };
    }

    async refreshAccessToken(refreshToken: string) {
        const tokenRecord = await this.refreshTokenRepo.findOne({
            where: { token: refreshToken, isRevoked: false },
            relations: ['user']
        });

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const payload: JwtPayload = {
            sub: tokenRecord.user.id,
            username: tokenRecord.user.username,
            roles: tokenRecord.user.roles.map(r => r.name),
            permissions: await this.getRolePermissions(tokenRecord.user.roles)
        };

        return { accessToken: this.jwtService.sign(payload) };
    }

    private async generateRefreshToken(userId: string): Promise<string> {
        const token = randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await this.refreshTokenRepo.save({
            token,
            userId,
            expiresAt,
            isRevoked: false
        });

        return token;
    }

    private async getRolePermissions(roles: Role[]): Promise<string[]> {
        const permissions = new Set<string>();
        roles.forEach(role => {
            role.permissions.forEach(perm => permissions.add(perm.code));
        });
        return Array.from(permissions);
    }
}

// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET')
        });
    }

    async validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
            username: payload.username,
            roles: payload.roles,
            permissions: payload.permissions
        };
    }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredPermissions) return true;

        const { user } = context.switchToHttp().getRequest();
        return requiredPermissions.some(perm => user.permissions?.includes(perm));
    }
}

// decorators/permissions.decorator.ts
export const RequirePermissions = (...permissions: string[]) =>
    SetMetadata('permissions', permissions);

// Usage in controller
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VouchersController {
    @Post()
    @RequirePermissions('vouchers:create')
    async createVoucher(@Body() dto: CreateVoucherDto) {
        // ...
    }

    @Delete(':id')
    @RequirePermissions('vouchers:delete')
    async deleteVoucher(@Param('id') id: string) {
        // ...
    }
}
```

**API Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user profile

---

### 2.2 Accounts Module (`accounts/`)

**Responsibilities:**
- Chart of Accounts (COA) management
- Account CRUD operations
- Account hierarchy navigation
- Account code generation

**Key Entities:**
```typescript
// entities/account.entity.ts
@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 20 })
    code: string;

    @Column({ length: 200 })
    name: string;

    @Column({ type: 'uuid', nullable: true })
    parentAccountId: string | null;

    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: 'parentAccountId' })
    parentAccount: Account;

    @OneToMany(() => Account, account => account.parentAccount)
    subAccounts: Account[];

    @Column({
        type: 'enum',
        enum: AccountType,
        default: AccountType.DETAIL
    })
    accountType: AccountType; // CONTROL, SUB_CONTROL, DETAIL

    @Column({
        type: 'enum',
        enum: AccountNature
    })
    nature: AccountNature; // DEBIT, CREDIT

    @Column({
        type: 'enum',
        enum: AccountCategory
    })
    category: AccountCategory; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isSystem: boolean; // System accounts (cannot be deleted)

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // Extra attributes (e.g., tax rates, bank details)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'uuid', nullable: true })
    createdBy: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;
}
```

**Service Example:**
```typescript
// accounts.service.ts
@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private accountRepo: Repository<Account>
    ) {}

    async findAll(filters?: AccountFiltersDto): Promise<Account[]> {
        const query = this.accountRepo.createQueryBuilder('account')
            .leftJoinAndSelect('account.parentAccount', 'parent');

        if (filters?.category) {
            query.andWhere('account.category = :category', { category: filters.category });
        }

        if (filters?.accountType) {
            query.andWhere('account.accountType = :accountType', { accountType: filters.accountType });
        }

        if (filters?.isActive !== undefined) {
            query.andWhere('account.isActive = :isActive', { isActive: filters.isActive });
        }

        if (filters?.search) {
            query.andWhere('(account.code ILIKE :search OR account.name ILIKE :search)', {
                search: `%${filters.search}%`
            });
        }

        return query.orderBy('account.code', 'ASC').getMany();
    }

    async getAccountTree(): Promise<Account[]> {
        const accounts = await this.accountRepo.find({
            relations: ['subAccounts', 'subAccounts.subAccounts'],
            where: { parentAccountId: IsNull() }
        });
        return accounts;
    }

    async generateAccountCode(parentAccountCode: string): Promise<string> {
        const result = await this.accountRepo
            .createQueryBuilder('account')
            .select('MAX(account.code)', 'maxCode')
            .where('account.code LIKE :pattern', { pattern: `${parentAccountCode}%` })
            .andWhere('LENGTH(account.code) = :length', { length: parentAccountCode.length + 2 })
            .getRawOne();

        const maxCode = result?.maxCode;
        if (!maxCode) {
            return `${parentAccountCode}01`;
        }

        const nextNumber = parseInt(maxCode.slice(-2)) + 1;
        return `${parentAccountCode}${nextNumber.toString().padStart(2, '0')}`;
    }

    async getAccountBalance(accountCode: string, asOfDate?: Date): Promise<number> {
        // Calculate balance from voucher details
        const query = this.voucherDetailRepo
            .createQueryBuilder('vd')
            .select('SUM(vd.debitAmount - vd.creditAmount)', 'balance')
            .where('vd.accountCode = :accountCode', { accountCode });

        if (asOfDate) {
            query.andWhere('vd.voucherDate <= :asOfDate', { asOfDate });
        }

        const result = await query.getRawOne();
        return parseFloat(result?.balance || '0');
    }

    async createAccount(dto: CreateAccountDto, userId: string): Promise<Account> {
        // Validate parent account
        if (dto.parentAccountId) {
            const parent = await this.accountRepo.findOne({
                where: { id: dto.parentAccountId }
            });
            if (!parent) {
                throw new NotFoundException('Parent account not found');
            }
            if (parent.accountType === AccountType.DETAIL) {
                throw new BadRequestException('Parent must be CONTROL or SUB_CONTROL');
            }
        }

        // Auto-generate code
        const code = dto.parentAccountCode
            ? await this.generateAccountCode(dto.parentAccountCode)
            : await this.generateRootAccountCode(dto.category);

        const account = this.accountRepo.create({
            ...dto,
            code,
            createdBy: userId
        });

        return this.accountRepo.save(account);
    }

    async updateAccount(id: string, dto: UpdateAccountDto, userId: string): Promise<Account> {
        const account = await this.accountRepo.findOne({ where: { id } });
        if (!account) {
            throw new NotFoundException('Account not found');
        }

        if (account.isSystem) {
            throw new BadRequestException('System accounts cannot be modified');
        }

        Object.assign(account, dto);
        account.updatedBy = userId;

        return this.accountRepo.save(account);
    }

    async deleteAccount(id: string): Promise<void> {
        const account = await this.accountRepo.findOne({
            where: { id },
            relations: ['subAccounts']
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        if (account.isSystem) {
            throw new BadRequestException('System accounts cannot be deleted');
        }

        if (account.subAccounts?.length > 0) {
            throw new BadRequestException('Cannot delete account with sub-accounts');
        }

        // Check if used in vouchers
        const usageCount = await this.voucherDetailRepo.count({
            where: { accountCode: account.code }
        });

        if (usageCount > 0) {
            throw new BadRequestException('Cannot delete account with transaction history');
        }

        await this.accountRepo.remove(account);
    }
}
```

**API Endpoints:**
- `GET /accounts` - List all accounts (with filters)
- `GET /accounts/tree` - Get account hierarchy tree
- `GET /accounts/:id` - Get account details
- `GET /accounts/:id/balance` - Get account balance
- `POST /accounts` - Create new account
- `PATCH /accounts/:id` - Update account
- `DELETE /accounts/:id` - Delete account
- `GET /accounts/generate-code?parentCode=xxx` - Generate next account code

---

### 2.3 Vouchers Module (`vouchers/`)

**Responsibilities:**
- Journal Vouchers (JV)
- Payment Vouchers (PV)
- Receipt Vouchers (RV)
- Voucher posting & unposting
- Voucher validation (debit = credit)

**Key Entities:**
```typescript
// entities/voucher-master.entity.ts
@Entity('voucher_master')
export class VoucherMaster {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    voucherNumber: string; // Auto-generated: JV-2025-0001

    @Column({
        type: 'enum',
        enum: VoucherType
    })
    voucherType: VoucherType; // JOURNAL, PAYMENT, RECEIPT

    @Column({ type: 'date' })
    voucherDate: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'uuid', nullable: true })
    referenceId: string; // Link to Invoice, GRN, GDN, etc.

    @Column({ length: 50, nullable: true })
    referenceType: string; // 'INVOICE', 'GRN', 'GDN'

    @Column({ length: 50, nullable: true })
    referenceNumber: string; // Display reference number

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    totalAmount: number;

    @Column({ default: false })
    isPosted: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    postedAt: Date;

    @Column({ type: 'uuid', nullable: true })
    postedBy: string;

    @OneToMany(() => VoucherDetail, detail => detail.voucher, {
        cascade: true,
        eager: true
    })
    details: VoucherDetail[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdBy' })
    creator: User;
}

// entities/voucher-detail.entity.ts
@Entity('voucher_detail')
export class VoucherDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    voucherId: string;

    @ManyToOne(() => VoucherMaster, voucher => voucher.details, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'voucherId' })
    voucher: VoucherMaster;

    @Column({ length: 20 })
    accountCode: string;

    @ManyToOne(() => Account, { eager: true })
    @JoinColumn({ name: 'accountCode', referencedColumnName: 'code' })
    account: Account;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    debitAmount: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    creditAmount: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // Extra info (e.g., cost center, project)

    @Column({ type: 'integer' })
    lineNumber: number; // Display order
}
```

**Service Example:**
```typescript
// vouchers.service.ts
@Injectable()
export class VouchersService {
    constructor(
        @InjectRepository(VoucherMaster)
        private voucherRepo: Repository<VoucherMaster>,
        @InjectRepository(VoucherDetail)
        private voucherDetailRepo: Repository<VoucherDetail>,
        private accountsService: AccountsService,
        private auditService: AuditService,
        private eventsGateway: EventsGateway,
        private dataSource: DataSource
    ) {}

    async createVoucher(dto: CreateVoucherDto, userId: string): Promise<VoucherMaster> {
        // Validate debit = credit
        const totalDebit = dto.details.reduce((sum, d) => sum + d.debitAmount, 0);
        const totalCredit = dto.details.reduce((sum, d) => sum + d.creditAmount, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new BadRequestException('Debit and credit amounts must be equal');
        }

        // Validate all accounts exist
        for (const detail of dto.details) {
            const account = await this.accountsService.findByCode(detail.accountCode);
            if (!account) {
                throw new NotFoundException(`Account ${detail.accountCode} not found`);
            }
            if (account.accountType !== AccountType.DETAIL) {
                throw new BadRequestException(`Account ${detail.accountCode} is not a detail account`);
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Generate voucher number
            const voucherNumber = await this.generateVoucherNumber(dto.voucherType, dto.voucherDate);

            // Create voucher
            const voucher = this.voucherRepo.create({
                voucherNumber,
                voucherType: dto.voucherType,
                voucherDate: dto.voucherDate,
                description: dto.description,
                referenceId: dto.referenceId,
                referenceType: dto.referenceType,
                referenceNumber: dto.referenceNumber,
                totalAmount: totalDebit,
                isPosted: false,
                createdBy: userId,
                details: dto.details.map((d, index) => ({
                    accountCode: d.accountCode,
                    description: d.description,
                    debitAmount: d.debitAmount || 0,
                    creditAmount: d.creditAmount || 0,
                    metadata: d.metadata,
                    lineNumber: index + 1
                }))
            });

            const savedVoucher = await queryRunner.manager.save(voucher);

            // Audit log
            await this.auditService.log({
                entityType: 'VOUCHER',
                entityId: savedVoucher.id,
                action: 'CREATE',
                userId,
                metadata: { voucherNumber }
            }, queryRunner);

            await queryRunner.commitTransaction();

            // Real-time notification
            this.eventsGateway.emitVoucherCreated(savedVoucher);

            return savedVoucher;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async postVoucher(id: string, userId: string): Promise<VoucherMaster> {
        const voucher = await this.voucherRepo.findOne({
            where: { id },
            relations: ['details']
        });

        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        if (voucher.isPosted) {
            throw new BadRequestException('Voucher already posted');
        }

        voucher.isPosted = true;
        voucher.postedAt = new Date();
        voucher.postedBy = userId;

        const posted = await this.voucherRepo.save(voucher);

        await this.auditService.log({
            entityType: 'VOUCHER',
            entityId: voucher.id,
            action: 'POST',
            userId,
            metadata: { voucherNumber: voucher.voucherNumber }
        });

        this.eventsGateway.emitVoucherPosted(posted);

        return posted;
    }

    async unpostVoucher(id: string, userId: string): Promise<VoucherMaster> {
        const voucher = await this.voucherRepo.findOne({ where: { id } });

        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        if (!voucher.isPosted) {
            throw new BadRequestException('Voucher not posted');
        }

        // Check if voucher can be unposted (business rules)
        // e.g., cannot unpost if there are dependent transactions

        voucher.isPosted = false;
        voucher.postedAt = null;
        voucher.postedBy = null;

        const unposted = await this.voucherRepo.save(voucher);

        await this.auditService.log({
            entityType: 'VOUCHER',
            entityId: voucher.id,
            action: 'UNPOST',
            userId,
            metadata: { voucherNumber: voucher.voucherNumber }
        });

        this.eventsGateway.emitVoucherUnposted(unposted);

        return unposted;
    }

    private async generateVoucherNumber(voucherType: VoucherType, voucherDate: Date): Promise<string> {
        const year = voucherDate.getFullYear();
        const prefix = this.getVoucherPrefix(voucherType);

        const lastVoucher = await this.voucherRepo
            .createQueryBuilder('v')
            .where('v.voucherType = :voucherType', { voucherType })
            .andWhere('EXTRACT(YEAR FROM v.voucherDate) = :year', { year })
            .orderBy('v.voucherNumber', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastVoucher) {
            const lastNumber = parseInt(lastVoucher.voucherNumber.split('-').pop());
            nextNumber = lastNumber + 1;
        }

        return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
    }

    private getVoucherPrefix(voucherType: VoucherType): string {
        const prefixes = {
            [VoucherType.JOURNAL]: 'JV',
            [VoucherType.PAYMENT]: 'PV',
            [VoucherType.RECEIPT]: 'RV'
        };
        return prefixes[voucherType];
    }

    async getVouchersByDateRange(startDate: Date, endDate: Date, voucherType?: VoucherType): Promise<VoucherMaster[]> {
        const query = this.voucherRepo
            .createQueryBuilder('v')
            .leftJoinAndSelect('v.details', 'details')
            .leftJoinAndSelect('details.account', 'account')
            .where('v.voucherDate BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (voucherType) {
            query.andWhere('v.voucherType = :voucherType', { voucherType });
        }

        return query.orderBy('v.voucherDate', 'DESC').addOrderBy('v.voucherNumber', 'DESC').getMany();
    }
}
```

**API Endpoints:**
- `GET /vouchers` - List vouchers (with filters: type, date range, posted status)
- `GET /vouchers/:id` - Get voucher details
- `POST /vouchers` - Create voucher
- `PATCH /vouchers/:id` - Update voucher (only if not posted)
- `DELETE /vouchers/:id` - Delete voucher (only if not posted)
- `POST /vouchers/:id/post` - Post voucher
- `POST /vouchers/:id/unpost` - Unpost voucher
- `GET /vouchers/generate-number?type=JOURNAL&date=2025-01-15` - Preview next voucher number

---

### 2.4 GRN Module (`grn/`)

**Responsibilities:**
- Goods Receipt Note creation & management
- Product inward tracking
- Room & Rack allocation
- Weight tracking (bag-level)
- Automatic voucher posting (if configured)

**Key Entities:**
```typescript
// entities/grn-master.entity.ts
@Entity('grn_master')
export class GRNMaster {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    grnNumber: string; // GRN-2025-0001

    @Column({ type: 'date' })
    grnDate: Date;

    @Column({ type: 'uuid' })
    supplierAccountId: string;

    @ManyToOne(() => Account, { eager: true })
    @JoinColumn({ name: 'supplierAccountId' })
    supplierAccount: Account;

    @Column({ length: 100, nullable: true })
    supplierInvoiceNumber: string;

    @Column({ type: 'date', nullable: true })
    supplierInvoiceDate: Date;

    @Column({ length: 100, nullable: true })
    vehicleNumber: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ type: 'text', nullable: true })
    remarks: string;

    @Column({ default: false })
    isPosted: boolean;

    @OneToMany(() => GRNDetail, detail => detail.grn, {
        cascade: true,
        eager: true
    })
    details: GRNDetail[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'uuid' })
    createdBy: string;

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string;
}

// entities/grn-detail.entity.ts
@Entity('grn_detail')
export class GRNDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    grnId: string;

    @ManyToOne(() => GRNMaster, grn => grn.details, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'grnId' })
    grn: GRNMaster;

    @Column({ type: 'uuid' })
    productId: string;

    @ManyToOne(() => Product, { eager: true })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ type: 'uuid', nullable: true })
    packingId: string;

    @ManyToOne(() => Packing, { eager: true })
    @JoinColumn({ name: 'packingId' })
    packing: Packing;

    @Column({ type: 'uuid' })
    warehouseRoomId: string;

    @ManyToOne(() => WarehouseRoom, { eager: true })
    @JoinColumn({ name: 'warehouseRoomId' })
    room: WarehouseRoom;

    @Column({ type: 'uuid', nullable: true })
    rackId: string;

    @ManyToOne(() => Rack, { eager: true, nullable: true })
    @JoinColumn({ name: 'rackId' })
    rack: Rack;

    @Column({ type: 'decimal', precision: 18, scale: 3 })
    quantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    rate: number;

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    remarks: string;

    @OneToMany(() => GRNBagDetail, bag => bag.grnDetail, {
        cascade: true
    })
    bagDetails: GRNBagDetail[];

    @Column({ type: 'integer' })
    lineNumber: number;
}

// entities/grn-bag-detail.entity.ts
@Entity('grn_bag_detail')
export class GRNBagDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    grnDetailId: string;

    @ManyToOne(() => GRNDetail, detail => detail.bagDetails, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'grnDetailId' })
    grnDetail: GRNDetail;

    @Column({ length: 50 })
    bagNumber: string; // e.g., B-001

    @Column({ type: 'decimal', precision: 10, scale: 3 })
    weight: number; // In kg

    @Column({ type: 'text', nullable: true })
    remarks: string;
}
```

**Service Example:**
```typescript
// grn.service.ts
@Injectable()
export class GRNService {
    constructor(
        @InjectRepository(GRNMaster)
        private grnRepo: Repository<GRNMaster>,
        @InjectRepository(GRNDetail)
        private grnDetailRepo: Repository<GRNDetail>,
        @InjectRepository(GRNBagDetail)
        private grnBagRepo: Repository<GRNBagDetail>,
        private vouchersService: VouchersService,
        private warehouseService: WarehouseService,
        private auditService: AuditService,
        private eventsGateway: EventsGateway,
        private dataSource: DataSource
    ) {}

    async createGRN(dto: CreateGRNDto, userId: string): Promise<GRNMaster> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Generate GRN number
            const grnNumber = await this.generateGRNNumber(dto.grnDate);

            // Calculate totals
            const totalAmount = dto.details.reduce((sum, d) => sum + d.amount, 0);

            // Create GRN
            const grn = this.grnRepo.create({
                grnNumber,
                grnDate: dto.grnDate,
                supplierAccountId: dto.supplierAccountId,
                supplierInvoiceNumber: dto.supplierInvoiceNumber,
                supplierInvoiceDate: dto.supplierInvoiceDate,
                vehicleNumber: dto.vehicleNumber,
                totalAmount,
                remarks: dto.remarks,
                isPosted: false,
                createdBy: userId,
                details: dto.details.map((d, index) => ({
                    productId: d.productId,
                    packingId: d.packingId,
                    warehouseRoomId: d.warehouseRoomId,
                    rackId: d.rackId,
                    quantity: d.quantity,
                    rate: d.rate,
                    amount: d.quantity * d.rate,
                    remarks: d.remarks,
                    lineNumber: index + 1,
                    bagDetails: d.bagDetails?.map(bag => ({
                        bagNumber: bag.bagNumber,
                        weight: bag.weight,
                        remarks: bag.remarks
                    }))
                }))
            });

            const savedGRN = await queryRunner.manager.save(grn);

            // Update warehouse stock
            for (const detail of savedGRN.details) {
                await this.warehouseService.addStock({
                    roomId: detail.warehouseRoomId,
                    rackId: detail.rackId,
                    productId: detail.productId,
                    packingId: detail.packingId,
                    quantity: detail.quantity,
                    referenceType: 'GRN',
                    referenceId: savedGRN.id
                }, queryRunner);
            }

            // Auto-post accounting voucher if enabled
            if (dto.autoPostVoucher) {
                await this.postAccountingVoucher(savedGRN, userId, queryRunner);
            }

            // Audit log
            await this.auditService.log({
                entityType: 'GRN',
                entityId: savedGRN.id,
                action: 'CREATE',
                userId,
                metadata: { grnNumber }
            }, queryRunner);

            await queryRunner.commitTransaction();

            // Real-time notification
            this.eventsGateway.emitGRNCreated(savedGRN);

            return savedGRN;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async postAccountingVoucher(grn: GRNMaster, userId: string, queryRunner?: QueryRunner): Promise<void> {
        // Create voucher: Debit Inventory, Credit Supplier
        const voucherDetails: CreateVoucherDetailDto[] = [
            {
                accountCode: '1-02-01', // Inventory account (from settings)
                description: `GRN ${grn.grnNumber} - ${grn.supplierAccount.name}`,
                debitAmount: grn.totalAmount,
                creditAmount: 0
            },
            {
                accountCode: grn.supplierAccount.code,
                description: `GRN ${grn.grnNumber}`,
                debitAmount: 0,
                creditAmount: grn.totalAmount
            }
        ];

        await this.vouchersService.createVoucher({
            voucherType: VoucherType.JOURNAL,
            voucherDate: grn.grnDate,
            description: `Auto-posted from GRN ${grn.grnNumber}`,
            referenceId: grn.id,
            referenceType: 'GRN',
            referenceNumber: grn.grnNumber,
            details: voucherDetails
        }, userId, queryRunner);
    }

    private async generateGRNNumber(grnDate: Date): Promise<string> {
        const year = grnDate.getFullYear();

        const lastGRN = await this.grnRepo
            .createQueryBuilder('g')
            .where('EXTRACT(YEAR FROM g.grnDate) = :year', { year })
            .orderBy('g.grnNumber', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastGRN) {
            const lastNumber = parseInt(lastGRN.grnNumber.split('-').pop());
            nextNumber = lastNumber + 1;
        }

        return `GRN-${year}-${nextNumber.toString().padStart(4, '0')}`;
    }

    async getGRNWithDetails(id: string): Promise<GRNMaster> {
        const grn = await this.grnRepo.findOne({
            where: { id },
            relations: ['details', 'details.bagDetails', 'details.product', 'details.packing', 'details.room', 'details.rack']
        });

        if (!grn) {
            throw new NotFoundException('GRN not found');
        }

        return grn;
    }

    async getGRNsByDateRange(startDate: Date, endDate: Date, supplierId?: string): Promise<GRNMaster[]> {
        const query = this.grnRepo
            .createQueryBuilder('g')
            .leftJoinAndSelect('g.supplierAccount', 'supplier')
            .where('g.grnDate BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (supplierId) {
            query.andWhere('g.supplierAccountId = :supplierId', { supplierId });
        }

        return query.orderBy('g.grnDate', 'DESC').addOrderBy('g.grnNumber', 'DESC').getMany();
    }

    async deleteGRN(id: string, userId: string): Promise<void> {
        const grn = await this.grnRepo.findOne({ where: { id }, relations: ['details'] });

        if (!grn) {
            throw new NotFoundException('GRN not found');
        }

        if (grn.isPosted) {
            throw new BadRequestException('Cannot delete posted GRN');
        }

        // Check if used in GDN/Invoices
        const isUsed = await this.checkGRNUsage(id);
        if (isUsed) {
            throw new BadRequestException('Cannot delete GRN that is referenced in GDN or Invoices');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Reverse warehouse stock
            for (const detail of grn.details) {
                await this.warehouseService.removeStock({
                    roomId: detail.warehouseRoomId,
                    rackId: detail.rackId,
                    productId: detail.productId,
                    packingId: detail.packingId,
                    quantity: detail.quantity
                }, queryRunner);
            }

            // Delete associated voucher (if exists)
            await this.vouchersService.deleteByReference('GRN', id, queryRunner);

            // Delete GRN
            await queryRunner.manager.remove(grn);

            // Audit log
            await this.auditService.log({
                entityType: 'GRN',
                entityId: id,
                action: 'DELETE',
                userId,
                metadata: { grnNumber: grn.grnNumber }
            }, queryRunner);

            await queryRunner.commitTransaction();

            // Real-time notification
            this.eventsGateway.emitGRNDeleted({ id, grnNumber: grn.grnNumber });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async checkGRNUsage(grnId: string): Promise<boolean> {
        // Check if GRN details are used in GDN or Invoices
        const gdnUsage = await this.dataSource
            .createQueryBuilder(GDNDetail, 'gdn')
            .innerJoin('gdn.grnDetail', 'grnd')
            .where('grnd.grnId = :grnId', { grnId })
            .getCount();

        return gdnUsage > 0;
    }
}
```

**API Endpoints:**
- `GET /grn` - List GRNs (with filters: date range, supplier, posted status)
- `GET /grn/:id` - Get GRN details (with bag details)
- `POST /grn` - Create GRN
- `PATCH /grn/:id` - Update GRN (only if not posted)
- `DELETE /grn/:id` - Delete GRN
- `POST /grn/:id/post` - Post GRN (mark as posted)
- `GET /grn/available-stock?roomId=xxx&productId=yyy` - Get available stock for GDN

---

### 2.5 Invoices Module (`invoices/`)

**Responsibilities:**
- Invoice generation
- Rental income calculation
- Tax & charges calculation
- Invoice posting (auto-create vouchers)
- Invoice printing

**Key Service Logic:**
```typescript
// invoices.service.ts
@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(InvoiceMaster)
        private invoiceRepo: Repository<InvoiceMaster>,
        @InjectRepository(InvoiceDetail)
        private invoiceDetailRepo: Repository<InvoiceDetail>,
        private vouchersService: VouchersService,
        private grnService: GRNService,
        private settingsService: SettingsService,
        private dataSource: DataSource
    ) {}

    async createInvoice(dto: CreateInvoiceDto, userId: string): Promise<InvoiceMaster> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Generate invoice number
            const invoiceNumber = await this.generateInvoiceNumber(dto.invoiceDate);

            // Calculate invoice details
            const details: InvoiceDetail[] = [];
            let subtotal = 0;

            for (const lineDto of dto.lines) {
                const grnDetail = await this.grnService.getGRNDetail(lineDto.grnDetailId);

                // Calculate months to charge
                const monthsToCharge = this.calculateMonthsToCharge(
                    grnDetail.grn.grnDate,
                    dto.invoiceDate,
                    lineDto.invoicePeriod,
                    dto.graceDays || 0
                );

                // Calculate amounts
                const grossAmount = lineDto.quantity * lineDto.rate * monthsToCharge;
                const labourCharges = await this.calculateLabourCharges(grnDetail.id, lineDto.quantity);
                const loadingCharges = lineDto.loadingCharges || 0;

                const lineSubtotal = grossAmount + labourCharges + loadingCharges;
                subtotal += lineSubtotal;

                details.push({
                    grnDetailId: lineDto.grnDetailId,
                    quantity: lineDto.quantity,
                    rate: lineDto.rate,
                    invoicePeriod: lineDto.invoicePeriod,
                    monthsCharged: monthsToCharge,
                    grossAmount,
                    labourCharges,
                    loadingCharges,
                    lineTotal: lineSubtotal,
                    lineNumber: details.length + 1
                } as InvoiceDetail);
            }

            // Calculate taxes
            const incomeTaxPercent = dto.incomeTaxPercent || 0;
            const incomeTaxAmount = (subtotal * incomeTaxPercent) / 100;

            const withholdingTaxPercent = dto.withholdingTaxPercent || 0;
            const withholdingTaxAmount = (subtotal * withholdingTaxPercent) / 100;

            const totalAmount = subtotal + incomeTaxAmount - withholdingTaxAmount;
            const cashReceived = dto.cashReceived || 0;
            const balance = totalAmount - cashReceived;

            // Create invoice
            const invoice = this.invoiceRepo.create({
                invoiceNumber,
                invoiceDate: dto.invoiceDate,
                customerAccountId: dto.customerAccountId,
                subtotal,
                incomeTaxPercent,
                incomeTaxAmount,
                withholdingTaxPercent,
                withholdingTaxAmount,
                totalAmount,
                cashReceived,
                balance,
                remarks: dto.remarks,
                graceDays: dto.graceDays,
                isPosted: false,
                createdBy: userId,
                details
            });

            const savedInvoice = await queryRunner.manager.save(invoice);

            // Auto-post accounting voucher if enabled
            if (dto.autoPostVoucher) {
                await this.postAccountingVoucher(savedInvoice, userId, queryRunner);
            }

            // Audit log
            await this.auditService.log({
                entityType: 'INVOICE',
                entityId: savedInvoice.id,
                action: 'CREATE',
                userId,
                metadata: { invoiceNumber }
            }, queryRunner);

            await queryRunner.commitTransaction();

            // Real-time notification
            this.eventsGateway.emitInvoiceCreated(savedInvoice);

            return savedInvoice;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private calculateMonthsToCharge(
        ownershipDate: Date,
        invoiceDate: Date,
        invoicePeriod: InvoicePeriod,
        graceDays: number
    ): number {
        const totalDays = differenceInDays(invoiceDate, ownershipDate);
        const chargeableDays = Math.max(0, totalDays - graceDays);

        if (invoicePeriod === InvoicePeriod.SEASONAL) {
            // Seasonal: charge per 15 days
            return Math.ceil(chargeableDays / 15);
        } else if (invoicePeriod === InvoicePeriod.MONTHLY) {
            // Monthly: charge per 30 days
            return Math.ceil(chargeableDays / 30);
        } else {
            // Daily
            return chargeableDays / 30; // Convert to months
        }
    }

    private async calculateLabourCharges(grnDetailId: string, quantity: number): Promise<number> {
        // Sum labour charges from GDN and inter-room transfers
        const query = `
            SELECT COALESCE(SUM(labour_amount), 0) as total
            FROM (
                SELECT gdn_detail.labour_charges * (${quantity} / grn_detail.quantity) as labour_amount
                FROM gdn_detail
                INNER JOIN grn_detail ON gdn_detail.grn_detail_id = grn_detail.id
                WHERE grn_detail.id = $1
                
                UNION ALL
                
                SELECT transfer_detail.labour_charges * (${quantity} / grn_detail.quantity) as labour_amount
                FROM inter_room_transfer_detail transfer_detail
                INNER JOIN grn_detail ON transfer_detail.grn_detail_id = grn_detail.id
                WHERE grn_detail.id = $1
            ) labour_charges
        `;

        const result = await this.dataSource.query(query, [grnDetailId]);
        return parseFloat(result[0]?.total || '0');
    }

    private async postAccountingVoucher(invoice: InvoiceMaster, userId: string, queryRunner?: QueryRunner): Promise<void> {
        const settings = await this.settingsService.getCompanyPreferences();
        const voucherDetails: CreateVoucherDetailDto[] = [];

        // Debit: Customer Account
        voucherDetails.push({
            accountCode: invoice.customerAccount.code,
            description: `Invoice ${invoice.invoiceNumber}`,
            debitAmount: invoice.totalAmount,
            creditAmount: 0
        });

        // Credit: Rental Income
        if (invoice.subtotal > 0) {
            voucherDetails.push({
                accountCode: settings.rentalIncomeAccountCode,
                description: `Invoice ${invoice.invoiceNumber} - Rental Income`,
                debitAmount: 0,
                creditAmount: invoice.subtotal
            });
        }

        // Credit: Income Tax
        if (invoice.incomeTaxAmount > 0) {
            voucherDetails.push({
                accountCode: settings.incomeTaxAccountCode,
                description: `Invoice ${invoice.invoiceNumber} - Income Tax`,
                debitAmount: 0,
                creditAmount: invoice.incomeTaxAmount
            });
        }

        // Debit: Withholding Tax
        if (invoice.withholdingTaxAmount > 0) {
            voucherDetails.push({
                accountCode: settings.withholdingTaxAccountCode,
                description: `Invoice ${invoice.invoiceNumber} - WHT`,
                debitAmount: invoice.withholdingTaxAmount,
                creditAmount: 0
            });
        }

        // Debit: Cash Received (if any)
        if (invoice.cashReceived > 0) {
            voucherDetails.push({
                accountCode: settings.defaultCashAccountCode,
                description: `Invoice ${invoice.invoiceNumber} - Cash Received`,
                debitAmount: invoice.cashReceived,
                creditAmount: 0
            });

            voucherDetails.push({
                accountCode: invoice.customerAccount.code,
                description: `Invoice ${invoice.invoiceNumber} - Cash Received`,
                debitAmount: 0,
                creditAmount: invoice.cashReceived
            });
        }

        await this.vouchersService.createVoucher({
            voucherType: VoucherType.JOURNAL,
            voucherDate: invoice.invoiceDate,
            description: `Auto-posted from Invoice ${invoice.invoiceNumber}`,
            referenceId: invoice.id,
            referenceType: 'INVOICE',
            referenceNumber: invoice.invoiceNumber,
            details: voucherDetails
        }, userId, queryRunner);
    }

    private async generateInvoiceNumber(invoiceDate: Date): Promise<string> {
        const year = invoiceDate.getFullYear();

        const lastInvoice = await this.invoiceRepo
            .createQueryBuilder('i')
            .where('EXTRACT(YEAR FROM i.invoiceDate) = :year', { year })
            .orderBy('i.invoiceNumber', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop());
            nextNumber = lastNumber + 1;
        }

        return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
    }
}
```

**API Endpoints:**
- `GET /invoices` - List invoices (with filters)
- `GET /invoices/:id` - Get invoice details
- `POST /invoices` - Create invoice
- `PATCH /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `POST /invoices/:id/post` - Post invoice
- `GET /invoices/:id/print` - Generate PDF
- `GET /invoices/customer/:customerId` - Get customer invoices
- `GET /invoices/outstanding` - Get outstanding invoices

---

## 3. Cross-Cutting Concerns

### 3.1 Authentication & Authorization

**Guards:**
```typescript
// guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info, context) {
        if (err || !user) {
            throw new UnauthorizedException('Invalid or expired token');
        }
        return user;
    }
}

// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredPermissions) return true;

        const { user } = context.switchToHttp().getRequest();
        return requiredPermissions.some(perm => user.permissions?.includes(perm));
    }
}
```

**Usage:**
```typescript
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
    @Get()
    @RequirePermissions('invoices:view')
    async findAll() { ... }

    @Post()
    @RequirePermissions('invoices:create')
    async create(@Body() dto: CreateInvoiceDto) { ... }

    @Delete(':id')
    @RequirePermissions('invoices:delete')
    async delete(@Param('id') id: string) { ... }
}
```

---

### 3.2 Validation & Transformation

**Global Validation Pipe:**
```typescript
// main.ts
app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,  // Strip properties not in DTO
        forbidNonWhitelisted: true,  // Throw error on extra properties
        transform: true,  // Auto-transform types
        transformOptions: {
            enableImplicitConversion: true
        }
    })
);
```

**DTO Example:**
```typescript
// dto/create-invoice.dto.ts
export class CreateInvoiceDto {
    @IsUUID()
    @IsNotEmpty()
    customerAccountId: string;

    @IsDate()
    @Type(() => Date)
    invoiceDate: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceLineDto)
    lines: InvoiceLineDto[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    incomeTaxPercent?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    withholdingTaxPercent?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    cashReceived?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    graceDays?: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    remarks?: string;

    @IsOptional()
    @IsBoolean()
    autoPostVoucher?: boolean;
}

export class InvoiceLineDto {
    @IsUUID()
    grnDetailId: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsNumber()
    @Min(0)
    rate: number;

    @IsEnum(InvoicePeriod)
    invoicePeriod: InvoicePeriod;

    @IsOptional()
    @IsNumber()
    @Min(0)
    loadingCharges?: number;
}
```

---

### 3.3 Audit Logging

**Audit Entity:**
```typescript
// audit/entities/audit-log.entity.ts
@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50 })
    entityType: string; // 'INVOICE', 'VOUCHER', 'GRN', etc.

    @Column({ type: 'uuid' })
    entityId: string;

    @Column({ length: 50 })
    action: string; // 'CREATE', 'UPDATE', 'DELETE', 'POST', 'UNPOST'

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'jsonb', nullable: true })
    changesBefore: any; // Old values (for UPDATE)

    @Column({ type: 'jsonb', nullable: true })
    changesAfter: any; // New values (for UPDATE)

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // Extra context

    @Column({ length: 45, nullable: true })
    ipAddress: string;

    @Column({ length: 200, nullable: true })
    userAgent: string;

    @CreateDateColumn()
    createdAt: Date;
}
```

**Audit Service:**
```typescript
// audit/audit.service.ts
@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>
    ) {}

    async log(params: {
        entityType: string;
        entityId: string;
        action: string;
        userId: string;
        changesBefore?: any;
        changesAfter?: any;
        metadata?: any;
        ipAddress?: string;
        userAgent?: string;
    }, queryRunner?: QueryRunner): Promise<void> {
        const auditLog = this.auditRepo.create(params);

        if (queryRunner) {
            await queryRunner.manager.save(auditLog);
        } else {
            await this.auditRepo.save(auditLog);
        }
    }

    async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { entityType, entityId },
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
    }

    async getUserActivity(userId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: {
                userId,
                createdAt: Between(startDate, endDate)
            },
            order: { createdAt: 'DESC' }
        });
    }
}
```

**Usage:**
```typescript
// In service
await this.auditService.log({
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'CREATE',
    userId,
    metadata: { invoiceNumber: invoice.invoiceNumber },
    ipAddress: request.ip,
    userAgent: request.headers['user-agent']
}, queryRunner);
```

---

### 3.4 Real-Time Updates (WebSockets)

**Events Gateway:**
```typescript
// gateway/events.gateway.ts
@WebSocketGateway({
    cors: { origin: '*' }, // Configure properly in production
    namespace: '/events'
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, string>(); // socketId -> userId

    constructor(private jwtService: JwtService) {}

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token;
            const payload = this.jwtService.verify(token);
            this.connectedUsers.set(client.id, payload.sub);
            console.log(`User ${payload.sub} connected`);
        } catch (error) {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.connectedUsers.get(client.id);
        this.connectedUsers.delete(client.id);
        console.log(`User ${userId} disconnected`);
    }

    // Emit events
    emitInvoiceCreated(invoice: InvoiceMaster) {
        this.server.emit('invoice:created', {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerAccount.name,
            totalAmount: invoice.totalAmount,
            createdAt: invoice.createdAt
        });
    }

    emitVoucherPosted(voucher: VoucherMaster) {
        this.server.emit('voucher:posted', {
            id: voucher.id,
            voucherNumber: voucher.voucherNumber,
            voucherType: voucher.voucherType,
            postedAt: voucher.postedAt
        });
    }

    emitGRNCreated(grn: GRNMaster) {
        this.server.emit('grn:created', {
            id: grn.id,
            grnNumber: grn.grnNumber,
            supplierName: grn.supplierAccount.name,
            totalAmount: grn.totalAmount,
            createdAt: grn.createdAt
        });
    }

    emitUserNotification(userId: string, notification: any) {
        const sockets = Array.from(this.connectedUsers.entries())
            .filter(([, uid]) => uid === userId)
            .map(([socketId]) => socketId);

        sockets.forEach(socketId => {
            this.server.to(socketId).emit('notification', notification);
        });
    }
}
```

**Frontend Connection:**
```typescript
// React frontend
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
    auth: {
        token: localStorage.getItem('accessToken')
    }
});

socket.on('invoice:created', (data) => {
    console.log('New invoice created:', data);
    // Update UI
});

socket.on('voucher:posted', (data) => {
    console.log('Voucher posted:', data);
    // Refresh voucher list
});
```

---

### 3.5 Caching Strategy

**Redis Configuration:**
```typescript
// config/redis.config.ts
@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                store: redisStore,
                host: configService.get('REDIS_HOST'),
                port: configService.get('REDIS_PORT'),
                ttl: 600, // 10 minutes default
                max: 100 // Max items in cache
            }),
            inject: [ConfigService]
        })
    ],
    exports: [CacheModule]
})
export class RedisCacheModule {}
```

**Usage in Service:**
```typescript
// dashboard.service.ts
@Injectable()
export class DashboardService {
    constructor(
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache,
        @InjectRepository(InvoiceMaster)
        private invoiceRepo: Repository<InvoiceMaster>
    ) {}

    async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
        const cacheKey = `dashboard:metrics:${userId}`;

        // Try cache first
        const cached = await this.cacheManager.get<DashboardMetrics>(cacheKey);
        if (cached) return cached;

        // Calculate metrics
        const today = new Date();
        const startOfMonth = startOfMonth(today);

        const [
            totalInvoices,
            totalRevenue,
            outstandingAmount,
            todayGRNs
        ] = await Promise.all([
            this.invoiceRepo.count({
                where: {
                    invoiceDate: Between(startOfMonth, today)
                }
            }),
            this.invoiceRepo
                .createQueryBuilder('i')
                .select('SUM(i.totalAmount)', 'total')
                .where('i.invoiceDate BETWEEN :start AND :end', {
                    start: startOfMonth,
                    end: today
                })
                .getRawOne()
                .then(r => parseFloat(r.total || '0')),
            this.invoiceRepo
                .createQueryBuilder('i')
                .select('SUM(i.balance)', 'total')
                .where('i.balance > 0')
                .getRawOne()
                .then(r => parseFloat(r.total || '0')),
            this.grnRepo.count({
                where: { grnDate: today }
            })
        ]);

        const metrics = {
            totalInvoices,
            totalRevenue,
            outstandingAmount,
            todayGRNs
        };

        // Cache for 5 minutes
        await this.cacheManager.set(cacheKey, metrics, 300);

        return metrics;
    }

    // Invalidate cache when data changes
    async invalidateDashboardCache(userId: string) {
        await this.cacheManager.del(`dashboard:metrics:${userId}`);
    }
}
```

---

### 3.6 Background Jobs (Bull Queues)

**Queue Configuration:**
```typescript
// jobs/jobs.module.ts
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST'),
                    port: configService.get('REDIS_PORT')
                }
            }),
            inject: [ConfigService]
        }),
        BullModule.registerQueue(
            { name: 'reports' },
            { name: 'notifications' },
            { name: 'invoices' }
        )
    ]
})
export class JobsModule {}
```

**Report Generation Processor:**
```typescript
// jobs/processors/reports.processor.ts
@Processor('reports')
export class ReportsProcessor {
    constructor(
        private reportsService: ReportsService,
        private notificationsService: NotificationsService
    ) {}

    @Process('generate-trial-balance')
    async generateTrialBalance(job: Job<{ userId: string; startDate: Date; endDate: Date }>) {
        const { userId, startDate, endDate } = job.data;

        try {
            // Update progress
            await job.progress(10);

            // Generate report
            const reportData = await this.reportsService.generateTrialBalance(startDate, endDate);
            await job.progress(60);

            // Generate PDF
            const pdfBuffer = await this.reportsService.generatePDF(reportData, 'trial-balance');
            await job.progress(90);

            // Save to storage
            const fileUrl = await this.reportsService.saveReportToStorage(
                pdfBuffer,
                `trial-balance-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}.pdf`
            );

            await job.progress(100);

            // Notify user
            await this.notificationsService.notifyUser(userId, {
                type: 'REPORT_READY',
                title: 'Trial Balance Report Ready',
                message: 'Your trial balance report has been generated',
                fileUrl
            });

            return { success: true, fileUrl };
        } catch (error) {
            await this.notificationsService.notifyUser(userId, {
                type: 'REPORT_ERROR',
                title: 'Report Generation Failed',
                message: error.message
            });
            throw error;
        }
    }

    @Process('generate-invoice-aging')
    async generateInvoiceAging(job: Job<{ userId: string; asOfDate: Date }>) {
        // Similar logic for aging report
    }
}
```

**Invoice Auto-Posting Scheduler:**
```typescript
// jobs/schedulers/invoice.scheduler.ts
@Injectable()
export class InvoiceScheduler {
    constructor(
        @InjectQueue('invoices')
        private invoiceQueue: Queue,
        private invoicesService: InvoicesService
    ) {}

    // Run daily at 1 AM
    @Cron('0 1 * * *')
    async scheduleAutomaticInvoiceGeneration() {
        const today = new Date();

        // Find customers due for invoicing
        const dueCustomers = await this.invoicesService.getCustomersDueForInvoicing(today);

        for (const customer of dueCustomers) {
            await this.invoiceQueue.add('auto-generate-invoice', {
                customerId: customer.id,
                invoiceDate: today
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 60000 // 1 minute
                }
            });
        }
    }
}
```

**Usage in Controller:**
```typescript
// reports.controller.ts
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(
        @InjectQueue('reports')
        private reportsQueue: Queue
    ) {}

    @Post('trial-balance')
    @RequirePermissions('reports:generate')
    async generateTrialBalance(
        @Body() dto: GenerateTrialBalanceDto,
        @CurrentUser() user: JwtPayload
    ) {
        const job = await this.reportsQueue.add('generate-trial-balance', {
            userId: user.sub,
            startDate: dto.startDate,
            endDate: dto.endDate
        });

        return {
            jobId: job.id,
            message: 'Report generation started. You will be notified when ready.'
        };
    }

    @Get('jobs/:jobId')
    async getJobStatus(@Param('jobId') jobId: string) {
        const job = await this.reportsQueue.getJob(jobId);

        if (!job) {
            throw new NotFoundException('Job not found');
        }

        const state = await job.getState();
        const progress = job.progress();
        const result = await job.finished().catch(() => null);

        return {
            jobId: job.id,
            state,
            progress,
            result
        };
    }
}
```

---

## 4. Database Integration (TypeORM)

**Configuration:**
```typescript
// config/database.config.ts
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST'),
                port: configService.get('DB_PORT'),
                username: configService.get('DB_USERNAME'),
                password: configService.get('DB_PASSWORD'),
                database: configService.get('DB_DATABASE'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
                synchronize: false, // NEVER true in production
                logging: configService.get('NODE_ENV') === 'development',
                ssl: configService.get('DB_SSL') === 'true' ? {
                    rejectUnauthorized: false
                } : false
            }),
            inject: [ConfigService]
        })
    ]
})
export class DatabaseModule {}
```

**Running Migrations:**
```bash
# Generate migration
npm run typeorm migration:generate -- -n CreateAccountsTable

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

---

## 5. API Documentation (Swagger)

**Swagger Setup:**
```typescript
// main.ts
const config = new DocumentBuilder()
    .setTitle('Advance ERP API')
    .setDescription('Modernized ERP System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Login, logout, token refresh')
    .addTag('Accounts', 'Chart of Accounts management')
    .addTag('Vouchers', 'Journal, Payment, Receipt vouchers')
    .addTag('GRN', 'Goods Receipt Notes')
    .addTag('GDN', 'Goods Delivery Notes')
    .addTag('Invoices', 'Billing & Invoicing')
    .addTag('Reports', 'Financial & operational reports')
    .addTag('Dashboard', 'Dashboard metrics & widgets')
    .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Controller Documentation:**
```typescript
// invoices.controller.ts
@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
    @Post()
    @RequirePermissions('invoices:create')
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully', type: InvoiceResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
        return this.invoicesService.createInvoice(dto, user.sub);
    }

    @Get()
    @RequirePermissions('invoices:view')
    @ApiOperation({ summary: 'List all invoices' })
    @ApiQuery({ name: 'startDate', required: false, type: Date })
    @ApiQuery({ name: 'endDate', required: false, type: Date })
    @ApiQuery({ name: 'customerId', required: false, type: String })
    @ApiQuery({ name: 'isPosted', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'List of invoices', type: [InvoiceResponseDto] })
    async findAll(@Query() filters: InvoiceFiltersDto) {
        return this.invoicesService.findAll(filters);
    }
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Jest)

```typescript
// invoices.service.spec.ts
describe('InvoicesService', () => {
    let service: InvoicesService;
    let invoiceRepo: Repository<InvoiceMaster>;
    let vouchersService: VouchersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoicesService,
                {
                    provide: getRepositoryToken(InvoiceMaster),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn()
                    }
                },
                {
                    provide: VouchersService,
                    useValue: {
                        createVoucher: jest.fn()
                    }
                },
                // ... other mocks
            ]
        }).compile();

        service = module.get<InvoicesService>(InvoicesService);
        invoiceRepo = module.get<Repository<InvoiceMaster>>(getRepositoryToken(InvoiceMaster));
        vouchersService = module.get<VouchersService>(VouchersService);
    });

    describe('createInvoice', () => {
        it('should create invoice with correct calculations', async () => {
            const dto: CreateInvoiceDto = {
                customerAccountId: 'uuid-1',
                invoiceDate: new Date('2025-01-15'),
                lines: [
                    {
                        grnDetailId: 'uuid-2',
                        quantity: 100,
                        rate: 10,
                        invoicePeriod: InvoicePeriod.MONTHLY
                    }
                ],
                incomeTaxPercent: 5,
                withholdingTaxPercent: 1,
                cashReceived: 500
            };

            const mockInvoice = {
                id: 'uuid-invoice',
                invoiceNumber: 'INV-2025-0001',
                subtotal: 1000,
                incomeTaxAmount: 50,
                withholdingTaxAmount: 10,
                totalAmount: 1040,
                cashReceived: 500,
                balance: 540
            };

            jest.spyOn(invoiceRepo, 'create').mockReturnValue(mockInvoice as any);
            jest.spyOn(invoiceRepo, 'save').mockResolvedValue(mockInvoice as any);

            const result = await service.createInvoice(dto, 'user-id');

            expect(result.subtotal).toBe(1000);
            expect(result.incomeTaxAmount).toBe(50);
            expect(result.totalAmount).toBe(1040);
            expect(result.balance).toBe(540);
        });

        it('should throw error if debit != credit in auto-posted voucher', async () => {
            // ... test case
        });
    });
});
```

### 6.2 Integration Tests (E2E)

```typescript
// test/invoices.e2e-spec.ts
describe('Invoices (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login to get token
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: 'admin', password: 'password' });

        authToken = response.body.accessToken;
    });

    it('/invoices (POST) should create invoice', async () => {
        const dto: CreateInvoiceDto = {
            customerAccountId: 'uuid-1',
            invoiceDate: '2025-01-15',
            lines: [
                {
                    grnDetailId: 'uuid-2',
                    quantity: 100,
                    rate: 10,
                    invoicePeriod: 'MONTHLY'
                }
            ],
            incomeTaxPercent: 5
        };

        return request(app.getHttpServer())
            .post('/invoices')
            .set('Authorization', `Bearer ${authToken}`)
            .send(dto)
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('invoiceNumber');
                expect(res.body.totalAmount).toBeGreaterThan(0);
            });
    });

    it('/invoices (GET) should return list of invoices', async () => {
        return request(app.getHttpServer())
            .get('/invoices')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
    });

    afterAll(async () => {
        await app.close();
    });
});
```

---

## 7. Deployment

### 7.1 Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: advance_erp
      DB_USERNAME: postgres
      DB_PASSWORD: secret
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: advance_erp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 8. Monitoring & Observability

**Health Check Endpoint:**
```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private redis: MicroserviceHealthIndicator
    ) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.pingCheck('database'),
            () => this.redis.pingCheck('redis', { host: 'localhost', port: 6379 })
        ]);
    }
}
```

**Prometheus Metrics:**
```typescript
// Install: npm install @willsoto/nestjs-prometheus prom-client

// main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
    imports: [
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: {
                enabled: true
            }
        })
    ]
})
export class AppModule {}
```

---

## 9. Performance Optimization

**Query Optimization:**
```typescript
// Use query builder for complex queries
const invoices = await this.invoiceRepo
    .createQueryBuilder('i')
    .leftJoinAndSelect('i.customerAccount', 'customer')
    .leftJoinAndSelect('i.details', 'details')
    .leftJoinAndSelect('details.grnDetail', 'grnd')
    .leftJoinAndSelect('grnd.product', 'product')
    .where('i.invoiceDate BETWEEN :start AND :end', { start, end })
    .andWhere('i.isPosted = :isPosted', { isPosted: true })
    .orderBy('i.invoiceDate', 'DESC')
    .take(100) // Pagination
    .skip(page * 100)
    .getMany();

// Use indexes
@Entity('invoices')
@Index(['invoiceDate', 'isPosted'])
@Index(['customerAccountId'])
export class InvoiceMaster { ... }

// Use database-level aggregations
const summary = await this.invoiceRepo
    .createQueryBuilder('i')
    .select('i.customerAccountId', 'customerId')
    .addSelect('SUM(i.totalAmount)', 'totalSales')
    .addSelect('SUM(i.balance)', 'totalOutstanding')
    .addSelect('COUNT(i.id)', 'invoiceCount')
    .where('i.invoiceDate BETWEEN :start AND :end', { start, end })
    .groupBy('i.customerAccountId')
    .getRawMany();
```

---

## 10. Security Best Practices

1. **Helmet.js** - HTTP headers security
2. **Rate Limiting** - Prevent brute-force
3. **CORS** - Restrict origins
4. **SQL Injection Prevention** - Use parameterized queries (TypeORM does this)
5. **XSS Prevention** - Sanitize inputs
6. **CSRF Protection** - Token-based
7. **Secrets Management** - Environment variables, never commit
8. **Password Hashing** - bcrypt with salt rounds >= 10
9. **JWT Expiry** - Short-lived access tokens (15-60 min)
10. **HTTPS** - Always in production

```typescript
// main.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    })
);
app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true
});
```

---

## Conclusion

This NestJS-based backend provides a **scalable, maintainable, and type-safe** foundation for the modernized Advance ERP system. The architecture emphasizes:

- **Modularity** - Clear domain boundaries
- **Type Safety** - End-to-end TypeScript
- **Security** - RBAC, audit trails, secure authentication
- **Performance** - Caching, query optimization, background jobs
- **Real-Time** - WebSockets for live updates
- **Testability** - Comprehensive unit & integration tests
- **Observability** - Health checks, metrics, logging

**Estimated Development Timeline:**
- **Phase 1 (Core APIs):** 4-6 weeks
- **Phase 2 (Warehouse & Billing):** 6-8 weeks
- **Phase 3 (Reports & Dashboard):** 4-5 weeks
- **Phase 4 (Testing & Optimization):** 3-4 weeks
- **Total:** 17-23 weeks (~4-5 months)

---

**Document Version:** 1.0  
**Author:** ERP Modernization AI Architect  
**Next Steps:** Implement frontend structure, API specification (OpenAPI), UI flow wireframes

