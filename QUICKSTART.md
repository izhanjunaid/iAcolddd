# 🚀 Quick Start Guide - Advance ERP

## ✅ Phase 1 Complete!

The project foundation is ready. You can now start development immediately.

## 🎯 What's Been Built

### Backend (NestJS)
- ✅ Full NestJS application with TypeScript
- ✅ PostgreSQL + TypeORM configured
- ✅ Redis + Bull queues ready
- ✅ JWT authentication scaffolded
- ✅ Swagger API docs at `/api/docs`
- ✅ Validation, CORS, error handling

### Frontend (React)
- ✅ React 18 + Vite + TypeScript
- ✅ Tailwind CSS + Shadcn/ui ready
- ✅ React Router, Zustand, TanStack Query
- ✅ Form handling (React Hook Form + Zod)
- ✅ Beautiful component foundation

### Infrastructure
- ✅ Docker Compose with 4 services
- ✅ PostgreSQL with production schema
- ✅ Redis for caching/queues
- ✅ Hot reload for dev
- ✅ CI/CD pipeline (GitHub Actions)

## 🚀 Start Development Now

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services will be available at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Option 2: Local Development

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Services:**
```bash
# Start only DB and Redis
docker-compose up postgres redis
```

## 📚 Project Structure

```
advance-erp/
├── backend/           # NestJS backend
│   ├── src/
│   │   ├── main.ts           # App entry with Swagger
│   │   └── app.module.ts     # Main module
│   └── package.json
├── frontend/          # React frontend
│   ├── src/
│   │   ├── main.tsx          # App entry
│   │   ├── index.css         # Tailwind + theme
│   │   └── lib/utils.ts      # Utilities
│   └── package.json
├── database/
│   └── postgres_schema.sql   # Production schema
├── docs/              # Comprehensive docs
├── docker-compose.yml # Full stack
└── README.md          # Full documentation
```

## 🎯 Next: Phase 2 - Authentication

Now that infrastructure is ready, Phase 2 will implement:

1. **Backend:**
   - User/Role/Permission entities
   - JWT authentication with Passport
   - Login/logout/refresh endpoints
   - RBAC guards and decorators

2. **Frontend:**
   - Login page
   - Auth state management
   - Protected routes
   - Permission-based UI

## 📖 Documentation

- **[README.md](README.md)** - Complete project overview
- **[Architecture](docs/architecture_overview.md)** - System architecture
- **[Backend Blueprint](docs/modernization-design/backend_blueprint.md)** - Backend guide
- **[API Spec](docs/modernization-design/api_spec.yaml)** - API contract
- **[Checklist](IMPLEMENTATION_CHECKLIST.md)** - Phase-by-phase progress

## 🔧 Useful Commands

### Backend
```bash
cd backend
npm run start:dev     # Dev mode with hot reload
npm run build         # Production build
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run lint          # Run linter
```

### Frontend
```bash
cd frontend
npm run dev           # Dev server
npm run build         # Production build
npm run preview       # Preview build
npm run lint          # Run linter
```

### Code Quality
```bash
npm run format        # Format all code
npm run format:check  # Check formatting
```

### Docker
```bash
docker-compose up -d          # Start all
docker-compose down           # Stop all
docker-compose logs -f        # View logs
docker-compose ps             # Check status
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Redis Connection Failed
```bash
# Restart Redis
docker-compose restart redis
```

## ✅ Verification Checklist

Before starting development, verify:

- [ ] Docker is running
- [ ] `docker-compose up -d` succeeds
- [ ] http://localhost:3000 shows "Hello World!"
- [ ] http://localhost:3000/api/docs shows Swagger UI
- [ ] http://localhost:5173 shows React app
- [ ] No errors in `docker-compose logs`

## 🎉 You're Ready!

Everything is set up and ready for Phase 2 development. The foundation is solid, properly configured, and production-ready.

**Happy coding! 🚀**

---

**Created:** October 19, 2025  
**Phase:** 1 ✅ Complete | Phase 2 🔄 Ready to Start

