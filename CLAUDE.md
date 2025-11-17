# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack **Cold Storage ERP System** with a NestJS backend and React frontend. The system manages accounting, inventory, billing, invoicing, and tax compliance for cold storage operations.

**Current Status**: Phase 1 (GL Foundation) complete, Tax Module implemented, Phase 2 (Inventory) 70% complete. See PROJECT_COMPLETION_ROADMAP.md for detailed progress.

## Architecture

### Monorepo Structure
```
backend/     # NestJS REST API (TypeScript)
frontend/    # React + Vite SPA (TypeScript)
```

### Technology Stack
- **Backend**: NestJS 11 + TypeORM + PostgreSQL + Redis/Bull + JWT Auth
- **Frontend**: React 19 + Vite + Zustand + React Query + Tailwind CSS
- **Database**: PostgreSQL 15 (via Docker)
- **Cache/Queue**: Redis 7 (via Docker)

## Common Commands

### Backend (from `backend/` directory)
```bash
npm run start:dev         # Development with watch mode
npm run start:debug       # Debug mode with Chrome inspector
npm run build             # Compile TypeScript to dist/
npm run migration:run     # Run pending TypeORM migrations
npm run seed              # Seed default data (creates admin user)
npm run seed:accounts     # Seed sample chart of accounts
npm run test              # Run Jest unit tests
npm run test:watch        # Watch mode for tests
npm run test:e2e          # End-to-end tests
npm run lint              # ESLint check and fix
```

### Frontend (from `frontend/` directory)
```bash
npm run dev               # Start Vite dev server (port 5173)
npm run build             # TypeScript check + production build
npm run preview           # Preview production build
npm run lint              # ESLint check
```

### Docker
```bash
docker-compose up -d      # Start PostgreSQL + Redis
# Backend runs on localhost:3000
# Frontend runs on localhost:5173
# Swagger docs at localhost:3000/api/docs
```

### Database Management
After starting Docker containers:
1. `cd backend && npm run migration:run` - Apply schema changes
2. `npm run seed` - Create default admin user (admin/Admin@123)
3. Migrations are in `backend/src/database/migrations/`

## Code Architecture

### Backend Module Organization
NestJS uses a modular architecture with dependency injection. Key modules:

- **auth/** - JWT authentication, token refresh, guards (JwtGuard, PermissionsGuard, RolesGuard)
- **users/** - User/Role/Permission management (RBAC)
- **accounts/** - Chart of Accounts with hierarchical structure
- **vouchers/** - Journal entries (JV, BRV, CPV, BPV, CRV, CPV, CON)
- **general-ledger/** - GL reports, trial balance, account ledger
- **customers/** - Customer master data
- **fiscal-periods/** - Fiscal year/period management with locking
- **cost-centers/** - Cost center tracking for management accounting
- **inventory/** - Stock management (items, transactions, balances, cost layers)
- **tax/** - FBR tax rates, exemptions, GST/WHT calculations
- **billing/** - Cold storage billing (per-kg-per-day calculations)
- **invoices/** - Invoice generation with PDF export
- **common/** - Shared enums, exceptions, decorators

### Key Backend Patterns

**Entity Conventions**:
- All entities use snake_case for table/column names
- Standard columns: `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete)
- Foreign keys: `{entity}_id` (e.g., `parent_account_id`)

**Authentication Flow**:
- JWT tokens stored in frontend (Zustand + localStorage)
- Access token (1h) + Refresh token (30d)
- All protected endpoints require `@UseGuards(JwtAuthGuard)`
- Fine-grained access via `@Permissions('permission.name')` decorator
- Current user injected via `@CurrentUser()` decorator

**Common Enums** (in `backend/src/common/enums/`):
- AccountType: DETAIL, HEADER
- AccountNature: DEBIT, CREDIT
- AccountCategory: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- VoucherType: JV, BRV, CPV, BPV, CRV, CPV, CON
- InventoryTransactionType: INWARD, OUTWARD, TRANSFER
- TaxType: GST, SALES_TAX, FED, WHT, etc.
- PaymentMode: CASH, CHEQUE, TRANSFER, ONLINE

**Service Pattern**:
- Services use constructor injection for dependencies
- Repository pattern via `@InjectRepository(Entity)`
- Async/await for all database operations
- Throw NestJS HTTP exceptions (BadRequestException, UnauthorizedException, etc.)

### Frontend Architecture

**State Management**:
- **Zustand** for global auth state (`stores/authStore.ts`)
- **React Query** for server state caching
- LocalStorage persistence for auth tokens

**Routing** (React Router v6):
- Public: `/login`
- Protected: All other routes via `<ProtectedRoute>` wrapper
- Permission-based access via `requiredPermissions` prop

**API Client** (`services/api.ts`):
- Axios instance with base URL from `VITE_API_URL` env var
- Auto-injects JWT Bearer token in Authorization header
- 401 error handling with automatic token refresh
- On refresh failure: logout and redirect to login

**Component Structure**:
- `pages/` - Route-level components (14 pages)
- `components/ui/` - Reusable UI components (Button, Card, Input, Table, etc.)
- `components/` - Business components (TaxCalculator, AccountSelector, etc.)
- `services/` - API client modules (one per domain)
- `hooks/` - Custom React hooks (usePermission, etc.)

**Forms**:
- React Hook Form + Zod for validation
- Standard pattern: `useForm()` with `zodResolver(schema)`
- Error handling via `toast.error()` from Sonner

## Development Guidelines

### Database Changes
1. **Never use `synchronize: true`** - Production safety
2. Create migrations for schema changes: `typeorm migration:create`
3. Test migrations locally before committing
4. Migrations must be idempotent (use IF NOT EXISTS, IF EXISTS)
5. Update seed scripts if adding new reference data

### API Development
1. **DTOs**: Use class-validator decorators for validation
2. **Swagger**: Annotate with `@ApiProperty()`, `@ApiOperation()`, `@ApiResponse()`
3. **Error Handling**: Throw appropriate HTTP exceptions
4. **Security**: Apply guards at controller level unless endpoint is public
5. **Transactions**: Use QueryRunner for multi-step operations

### Frontend Development
1. **API Calls**: Use React Query hooks for data fetching
2. **Forms**: Prefer React Hook Form over controlled components
3. **Permissions**: Check permissions before showing UI elements
4. **Loading States**: Always show loading/error states
5. **Toast Notifications**: Use Sonner for user feedback

### Testing
- Backend: Jest unit tests (`.spec.ts` files)
- Frontend: No tests currently (setup ready)
- E2E: Jest E2E config in `backend/test/`
- Run tests before creating PRs

### Code Quality
- ESLint enforced on both frontend/backend
- Prettier for formatting
- Husky pre-commit hooks run lint-staged
- No unused variables/imports

## Key Business Logic

### Double-Entry Accounting
- Every voucher must balance (total debits = total credits)
- Validated in `vouchers.service.ts`
- Posted to general_ledger table when status = POSTED

### Inventory Costing
- FIFO cost layer method
- Inward transactions create cost layers
- Outward transactions consume from oldest layers first
- Service: `inventory-cost-layers.service.ts`

### Storage Billing
- Per-kg-per-day calculation: `(weight * days * rate_per_kg_per_day)`
- Seasonal rates supported
- Volume discount tiers
- Service: `billing/storage-billing.service.ts` (in progress)

### Tax Calculation
- Multiple tax types (GST, WHT, Sales Tax, FED)
- Tax exemptions by customer/item/date range
- Configurable rates with effective dates
- Service: `tax/tax-calculation.service.ts`

### Invoice Generation
- Auto-generate from GDN (Goods Delivery Note)
- Apply storage billing + labour charges
- Calculate taxes (GST/WHT)
- PDF generation via PDFKit
- Module: `invoices/` (newly implemented)

## Common Issues & Solutions

### Backend won't start
- Check PostgreSQL is running: `docker-compose ps`
- Verify `.env` file exists with correct DATABASE_* vars
- Run migrations: `npm run migration:run`

### Frontend 401 errors
- Check backend is running on port 3000
- Verify JWT tokens are valid (check Network tab)
- Try logging out and back in
- Check `VITE_API_URL` in frontend/.env

### Database connection errors
- Ensure Docker containers are running
- Check DATABASE_HOST in backend/.env (use `localhost` for local dev)
- Test connection: `docker exec -it [postgres-container] psql -U admin -d advance_erp`

### Migration failures
- Check for conflicting migrations
- Manually rollback if needed (TypeORM doesn't support auto-rollback)
- Verify migration order by timestamp prefix

## Environment Variables

### Backend (.env)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=admin
DATABASE_PASSWORD=admin123
DATABASE_NAME=advance_erp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<change-in-production>
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=<change-in-production>
JWT_REFRESH_EXPIRATION=30d
NODE_ENV=development
PORT=3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Default Credentials
After running `npm run seed`:
- **Username**: admin
- **Email**: admin@advance-erp.com
- **Password**: Admin@123

## Critical Files to Understand

### Backend
- `src/app.module.ts` - Main application module with TypeORM config
- `src/main.ts` - Application bootstrap, Swagger setup, CORS
- `src/auth/jwt.strategy.ts` - JWT validation strategy
- `src/auth/guards/` - Authorization guards
- `src/common/enums/` - Shared enum definitions
- `src/database/migrations/` - Database schema evolution
- `src/database/seeds/seed.ts` - Initial data setup

### Frontend
- `src/App.tsx` - Router configuration
- `src/stores/authStore.ts` - Global auth state
- `src/services/api.ts` - Axios instance with interceptors
- `src/components/ProtectedRoute.tsx` - Route authorization

## Project Roadmap
See `PROJECT_COMPLETION_ROADMAP.md` for detailed 6-week completion plan.

**Current Priorities**:
1. Storage billing calculator (Week 1)
2. Financial statements (Balance Sheet, P&L) (Week 2)
3. Invoice generation completion (Week 3)
4. AR/AP sub-ledgers (Week 5)
5. Period closing workflows (Week 6)

## Notes for AI Assistants
- This is an active project under development
- Phase 1 (GL Foundation) is complete and stable
- Phase 2 (Inventory GL Integration) is 70% complete
- New features should follow existing patterns
- Always test with real accounting scenarios
- Validate calculations with business users
- FBR (Pakistan tax authority) compliance is critical
- Never break double-entry accounting rules
