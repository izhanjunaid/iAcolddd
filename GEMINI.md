# GEMINI.MD: AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

* **Primary Goal:** This is a Modern ERP (Enterprise Resource Planning) system specifically designed for Cold Storage management. It provides end-to-end functionality for Customer Management, Accounts Payable/Receivable, General Ledger, Inventory (both company-owned and 3PL/Cold Store customer lots), Procurement, and Tax compliance operations.
* **Business Domain:** Logistics, Supply Chain, and Enterprise Financials (Cold Storage, 3PL Warehousing).

## 2. Core Technologies & Stack

* **Languages:** TypeScript (strict mode enabled), JavaScript.
* **Frameworks & Runtimes:**
  * **Backend:** Node.js v20, NestJS (v11)
  * **Frontend:** React 19, Vite (Rolldown), Tailwind CSS
* **Databases:** PostgreSQL (v15) as the primary relational database, Redis (v7) for caching and background queues.
* **Key Libraries/Dependencies:**
  * **Backend:** TypeORM for database interactions, Passport & JWT for authentication, Bull for queues, Swagger for API docs.
  * **Frontend:** Zustand (state management), React Query (data fetching), React Hook Form + Zod (forms and validation), Recharts (dashboard visualization), axios.
* **Package Manager(s):** npm (using lockfiles heavily via `npm ci`).

## 3. Architectural Patterns

* **Overall Architecture:** Modular Monolith application. The backend is structured around specific ERP business domains (e.g., `ap`, `ar`, `inventory`, `cold-store`, `general-ledger`) communicating with a unified Postgres database. The frontend communicates with the backend via REST APIs.
* **Directory Structure Philosophy:**
    * `/backend/src`: Contains the NestJS modular backend. Each folder (e.g., `customers`, `invoices`, `payables`) represents a distinct domain module housing controllers, services, entities, and DTOS.
    * `/frontend/src`: Contains the primary React application. Organized into `components` (reusable UI), `pages` (routings views), `services` (API integrations), `stores` (Zustand state), `hooks`, and `types`.
    * `/database`: Contains SQL schema deployments, migrations, and initialization scripts for Postgres.
    * `/scripts`: Contains project tooling, verification, and database utility scripts.

## 4. Coding Conventions & Style Guide

* **Formatting:** Enforced by Prettier (`.prettierrc`) across both frontend and backend. Integration uses `eslint` and `lint-staged` with Husky.
* **Naming Conventions:**
    * `variables`, `functions`: `camelCase` (e.g., `calculateChargesForLot`)
    * `classes`, `components`, `types/interfaces`: `PascalCase` (e.g., `InvoiceGLService`, `CreateBill`)
    * `files`: `kebab-case` for backend (e.g., `app.controller.ts`), `PascalCase` for React components/pages (e.g., `CreateInvoicePage.tsx`).
* **API Design:** RESTful principles adhering to standard HTTP verbs (GET, POST, PUT, PATCH, DELETE). Documented structurally via `@nestjs/swagger` decorators on controllers and DTOs.
* **Error Handling:** Backend uses standard NestJS exception filters (`NotFoundException`, `BadRequestException`). Frontend relies on `sonner` for toast notifications and `zod` for robust client-side payload validation.

## 5. Key Files & Entrypoints

* **Main Entrypoint(s):**
    * **Backend:** `backend/src/main.ts`
    * **Frontend:** `frontend/src/main.tsx`
* **Configuration:**
    * **Global:** Root `docker-compose.yml` orchestrates all services locally.
    * **Backend:** `backend/.env` (loads runtime secrets like `JWT_SECRET`, database coordinates).
    * **Frontend:** `frontend/.env` (for public variables like `VITE_API_URL`).
* **CI/CD Pipeline:** GitHub Actions configuration exists at `.github/workflows/ci.yml`.

## 6. Development & Testing Workflow

* **Local Development Environment:** Use `docker-compose up` from the root directory to spin up PostgreSQL, Redis, and optionally the containerized front and back ends. Alternatively, after DBs are running, navigate to `/backend` and run `npm run start:dev`, and `/frontend` with `npm run dev`.
* **Testing:**
    * **Backend:** Comprehensive Jest testing setup. Run unit tests via `npm run test` and integration/E2E via `npm run test:e2e`. Coverage reports via `npm run test:cov`.
    * **Frontend:** Linting and TypeScript builds act as the main quality gates (`npm run lint`, `npm run build`).
* **CI/CD Process:** The pipeline (`ci.yml`) runs on push and PR to `main` and `develop` branches. It pulls Node v20, installs dependencies via `npm ci`, runs code formatters (`npm run format:check`), executes linters (`npm run lint`), runs Jest suites, and builds the frontend. Fails if standards aren't met.

## 7. Specific Instructions for AI Collaboration

* **Contribution Guidelines (Inferred):** No explicit `CONTRIBUTING.md` exists, but development is driven by a central `todo.md`. Prioritize strict financial constraints when adding or modifying logic. Always check `todo.md` for context on ongoing feature work (like the Maker-Checker engine or Cold Store modules).
* **Infrastructure & Database:** Database mutations must be captured via SQL scripts or TypeORM migrations. Beware of sequences vs DB-safe counters, and always enforce strict explicitly defined Foreign Keys. If interacting with the database directly, review `/database`.
* **Security & Authorization:** Never bypass role-based access. Ensure all inventory or financial mutations are protected by `PermissionsGuard`. Sensitive actions (e.g., Unpost/Reopen actions) legally strictly require a rigorous Maker-Checker pipeline.
* **Dependencies:** Only add new dependencies if critically required. When adding to backend or frontend, always use `npm install <package> --save` within the specific `/backend` or `/frontend` directory boundaries so `package-lock.json` is properly updated to guarantee reproducible `npm ci` builds in the pipeline.
* **Accounting Rigor:** The system executes double-entry bookkeeping immediately alongside operational procedures. For instance, any AI modification involving Inventory Receipts (GRN) or Sales Invoices natively expects correct General Ledger (GL) double-entry voucher posts (`ApBill` → Liability/Expense, `GatePass` → Revenue/Receivables/Tax). Always explicitly pass `EntityManager` across service boundaries recursively during these flows to ensure pure SQL transaction context.
