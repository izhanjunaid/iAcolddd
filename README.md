# 🚀 Advance ERP - Modern Cold Storage Management System

[![CI/CD](https://github.com/yourusername/advance-erp/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/yourusername/advance-erp/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A complete modernization of a legacy ERP system, transforming it from C# + SQL Server to a modern, scalable, cloud-ready platform.

## 📊 **Project Status**

- **Phase 1:** ✅ Complete - Project Setup & Core Infrastructure
- **Phase 2:** ✅ Complete - Authentication & Authorization
- **Phase 3:** ✅ Complete - Chart of Accounts Module
- **Phase 4:** ✅ Complete (100%) - Vouchers & General Ledger
- **Phase 5-11:** ⏸️ Pending
- **Overall Progress:** 36% (4 of 11 phases complete)

## 🎯 **Technology Stack**

### Frontend
- **React 18** + **TypeScript** - Modern UI library
- **Vite 5** - Lightning-fast build tool
- **Tailwind CSS** + **Shadcn/ui** - Beautiful, accessible components
- **Zustand** - Lightweight state management
- **TanStack Query** - Powerful data fetching & caching
- **React Hook Form** + **Zod** - Type-safe forms

### Backend
- **NestJS** + **TypeScript** - Scalable Node.js framework
- **TypeORM** - Type-safe database abstraction
- **PostgreSQL 15+** - Robust relational database
- **Redis** - Caching & session management
- **Bull** - Background job processing
- **Swagger/OpenAPI** - Auto-generated API docs

## 🚦 **Getting Started**

### Prerequisites

- Node.js 20+ (LTS)
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/advance-erp.git
   cd advance-erp
   ```

2. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL (port 5432)
   - Redis (port 6379)
   - Backend API (port 3000)
   - Frontend (port 5173)

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs

### Development Setup (Without Docker)

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📁 **Project Structure**

```
advance-erp/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── accounts/       # Chart of accounts
│   │   ├── vouchers/       # Vouchers module
│   │   ├── warehouse/      # Warehouse operations
│   │   ├── invoices/       # Billing & invoicing
│   │   ├── reports/        # Report generation
│   │   └── main.ts         # Application entry point
│   ├── test/               # E2E tests
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── lib/            # Utilities
│   │   └── main.tsx        # Application entry point
│   └── package.json
├── database/               # Database schemas
│   └── postgres_schema.sql
├── docs/                   # Comprehensive documentation
│   ├── architecture_overview.md
│   ├── modernization-design/
│   └── implementation-plans/
├── docker-compose.yml      # Docker orchestration
└── README.md
```

## 🎓 **Available Scripts**

### Root Level
```bash
npm run format        # Format all code with Prettier
npm run format:check  # Check code formatting
```

### Backend
```bash
npm run start         # Start production server
npm run start:dev     # Start development server with hot reload
npm run start:debug   # Start debug mode
npm run build         # Build for production
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run test:cov      # Run tests with coverage
npm run lint          # Run ESLint
```

### Frontend
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

## 🔐 **Environment Variables**

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=admin
DATABASE_PASSWORD=admin123
DATABASE_NAME=advance_erp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=30d
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

## 📚 **Documentation**

Comprehensive documentation (~400 pages) is available in the `/docs` directory:

- **[Architecture Overview](docs/architecture_overview.md)** - Complete system architecture
- **[Backend Blueprint](docs/modernization-design/backend_blueprint.md)** - Backend implementation guide
- **[Frontend Structure](docs/modernization-design/frontend_structure.md)** - Frontend architecture
- **[API Specification](docs/modernization-design/api_spec.yaml)** - OpenAPI 3.0 spec
- **[Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)** - Phase-by-phase progress

## 🧪 **Testing**

```bash
# Backend tests
cd backend
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:cov          # Coverage report

# Frontend tests (to be added in Phase 10)
cd frontend
npm run test
```

### Phase 3 E2E Testing (Chart of Accounts)

Comprehensive end-to-end testing completed using Playwright MCP:
- **Test Report:** See `PHASE3_E2E_TEST_REPORT.md` for detailed results
- **Tests Passed:** 9/9 (100%)
- **Features Tested:** Authentication, Account CRUD, List/Tree views, Permission-based access
- **Status:** ✅ All core functionalities working as expected

## 🚢 **Deployment**

### Using Docker Compose (Recommended for staging/testing)

```bash
docker-compose up -d
```

### Production Deployment (Kubernetes)

Kubernetes deployment files will be added in Phase 11.

## 📈 **Implementation Phases**

- [x] **Phase 1:** Project Setup & Core Infrastructure (Weeks 1-2) ✅
- [x] **Phase 2:** Authentication & Authorization (Weeks 3-4) ✅
- [ ] **Phase 3:** Chart of Accounts Module (Weeks 5-6)
- [ ] **Phase 4:** Vouchers Module (Weeks 7-10)
- [ ] **Phase 5:** Warehouse Operations (Weeks 11-16)
- [ ] **Phase 6:** Billing & Invoicing (Weeks 17-22)
- [ ] **Phase 7:** Reporting Module (Weeks 23-28)
- [ ] **Phase 8:** Dashboard & Analytics (Weeks 29-32)
- [ ] **Phase 9:** Advanced Features (Weeks 33-40)
- [ ] **Phase 10:** Testing & QA (Weeks 41-48)
- [ ] **Phase 11:** Deployment & Go-Live (Weeks 49-52)

## 🤝 **Contributing**

This is a private project, but contributions are welcome from team members.

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📝 **Code Quality**

- **TypeScript** strict mode enabled
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **lint-staged** for staged files linting

## 🔍 **Troubleshooting**

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# View logs
docker-compose logs postgres
```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 📞 **Support**

For questions and support, please refer to:
- [Documentation](docs/)
- [Issue Tracker](https://github.com/yourusername/advance-erp/issues)

## 📄 **License**

This project is proprietary software. All rights reserved.

---

**Built with ❤️ by the Advance ERP Team**

**Last Updated:** October 19, 2025

#   i A c o l d d d 
 
 