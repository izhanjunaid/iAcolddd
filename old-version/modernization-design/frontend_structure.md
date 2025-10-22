# Frontend Architecture: React + TypeScript + Vite + Tailwind
**Project:** Advance ERP Modernization  
**Date:** October 15, 2025  
**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui

---

## Executive Summary

This document outlines the complete frontend architecture for the modernized Advance ERP system. The design emphasizes:
- **Type-safe development** with TypeScript
- **Modern UI/UX** with Tailwind CSS and Shadcn/ui components
- **Performance** with Vite's lightning-fast HMR
- **Maintainability** with feature-based folder structure
- **Scalability** with proper state management and code splitting

**Key Features:**
- Responsive dashboard with real-time updates
- Role-based UI rendering
- Multi-language support (English, Urdu)
- Dark mode support
- Offline capability (Progressive Web App)
- Accessibility (WCAG 2.1 AA compliant)

---

## 1. Technology Stack

### 1.1 Core Technologies

```json
{
  "runtime": "React 18.2+",
  "language": "TypeScript 5.0+",
  "build-tool": "Vite 5.0+",
  "styling": "Tailwind CSS 3.4+",
  "ui-library": "Shadcn/ui + Radix UI",
  "state-management": "Zustand 4.4+",
  "routing": "React Router v6.20+",
  "forms": "React Hook Form 7.48+ + Zod 3.22+",
  "api-client": "Axios 1.6+ / TanStack Query 5.0+",
  "charts": "Recharts 2.10+",
  "tables": "TanStack Table 8.11+",
  "i18n": "i18next 23.7+",
  "date-handling": "date-fns 3.0+",
  "notifications": "Sonner (toast notifications)",
  "icons": "Lucide React"
}
```

### 1.2 Development Tools

```json
{
  "linting": "ESLint 8.56+",
  "formatting": "Prettier 3.1+",
  "testing": "Vitest + React Testing Library",
  "e2e-testing": "Playwright",
  "type-checking": "TypeScript Compiler",
  "git-hooks": "Husky + lint-staged"
}
```

---

## 2. Project Structure

```
advance-erp-frontend/
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── locales/
│       ├── en/
│       │   └── translation.json
│       └── ur/
│           └── translation.json
│
├── src/
│   ├── main.tsx                     # Application entry point
│   ├── App.tsx                      # Root component
│   ├── vite-env.d.ts                # Vite type definitions
│   │
│   ├── assets/                      # Static assets
│   │   ├── images/
│   │   ├── fonts/
│   │   └── styles/
│   │       └── globals.css          # Global styles, Tailwind imports
│   │
│   ├── components/                  # Shared/reusable components
│   │   ├── ui/                      # Shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (50+ components)
│   │   │
│   │   ├── layout/                  # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── common/                  # Common business components
│   │   │   ├── DataTable.tsx        # Reusable data table
│   │   │   ├── PageHeader.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── AccountSelector.tsx  # Account picker
│   │   │   ├── ProductSelector.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   └── charts/                  # Chart components
│   │       ├── LineChart.tsx
│   │       ├── BarChart.tsx
│   │       ├── PieChart.tsx
│   │       └── AreaChart.tsx
│   │
│   ├── features/                    # Feature modules (domain-driven)
│   │   │
│   │   ├── auth/                    # Authentication
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   └── ChangePasswordDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useLogin.ts
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── ForgotPasswordPage.tsx
│   │   │   ├── store/
│   │   │   │   └── authStore.ts     # Zustand store
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── dashboard/               # Dashboard
│   │   │   ├── components/
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── StockSummary.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useDashboardMetrics.ts
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx
│   │   │   └── api/
│   │   │       └── dashboardApi.ts
│   │   │
│   │   ├── accounting/              # Accounting module
│   │   │   ├── accounts/            # Chart of Accounts
│   │   │   │   ├── components/
│   │   │   │   │   ├── AccountsTree.tsx
│   │   │   │   │   ├── AccountForm.tsx
│   │   │   │   │   └── AccountBalanceCard.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── AccountsPage.tsx
│   │   │   │   │   └── AccountDetailPage.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useAccounts.ts
│   │   │   │   │   └── useAccountBalance.ts
│   │   │   │   └── api/
│   │   │   │       └── accountsApi.ts
│   │   │   │
│   │   │   ├── vouchers/            # Vouchers (JV, PV, RV)
│   │   │   │   ├── components/
│   │   │   │   │   ├── VoucherForm.tsx
│   │   │   │   │   ├── VoucherDetailLines.tsx
│   │   │   │   │   ├── VoucherPreview.tsx
│   │   │   │   │   └── VoucherFilters.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── VouchersListPage.tsx
│   │   │   │   │   ├── CreateVoucherPage.tsx
│   │   │   │   │   └── EditVoucherPage.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useVouchers.ts
│   │   │   │   │   └── usePostVoucher.ts
│   │   │   │   └── api/
│   │   │   │       └── vouchersApi.ts
│   │   │   │
│   │   │   └── reports/             # Accounting reports
│   │   │       ├── components/
│   │   │       │   ├── TrialBalanceReport.tsx
│   │   │       │   ├── LedgerReport.tsx
│   │   │       │   └── ProfitLossReport.tsx
│   │   │       ├── pages/
│   │   │       │   └── AccountingReportsPage.tsx
│   │   │       └── api/
│   │   │           └── reportsApi.ts
│   │   │
│   │   ├── warehouse/               # Warehouse operations
│   │   │   ├── grn/                 # Goods Receipt Notes
│   │   │   │   ├── components/
│   │   │   │   │   ├── GRNForm.tsx
│   │   │   │   │   ├── GRNDetailLines.tsx
│   │   │   │   │   ├── GRNBagDetails.tsx
│   │   │   │   │   └── GRNPreview.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── GRNListPage.tsx
│   │   │   │   │   ├── CreateGRNPage.tsx
│   │   │   │   │   └── GRNDetailPage.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useGRN.ts
│   │   │   │   └── api/
│   │   │   │       └── grnApi.ts
│   │   │   │
│   │   │   ├── gdn/                 # Goods Delivery Notes
│   │   │   │   ├── components/
│   │   │   │   │   ├── GDNForm.tsx
│   │   │   │   │   └── GDNDetailLines.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── GDNListPage.tsx
│   │   │   │   │   └── CreateGDNPage.tsx
│   │   │   │   └── api/
│   │   │   │       └── gdnApi.ts
│   │   │   │
│   │   │   ├── transfers/           # Inter-room transfers
│   │   │   │   ├── components/
│   │   │   │   │   └── TransferForm.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   └── TransfersPage.tsx
│   │   │   │   └── api/
│   │   │   │       └── transfersApi.ts
│   │   │   │
│   │   │   └── stock/               # Stock management
│   │   │       ├── components/
│   │   │       │   ├── StockSummary.tsx
│   │   │       │   ├── RoomVisualization.tsx
│   │   │       │   └── StockMovementHistory.tsx
│   │   │       ├── pages/
│   │   │       │   └── StockPage.tsx
│   │   │       └── api/
│   │   │           └── stockApi.ts
│   │   │
│   │   ├── billing/                 # Invoicing
│   │   │   ├── invoices/
│   │   │   │   ├── components/
│   │   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   │   ├── InvoiceLineItems.tsx
│   │   │   │   │   ├── InvoicePreview.tsx
│   │   │   │   │   ├── InvoiceCalculator.tsx
│   │   │   │   │   └── InvoicePrintPreview.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── InvoicesListPage.tsx
│   │   │   │   │   ├── CreateInvoicePage.tsx
│   │   │   │   │   └── InvoiceDetailPage.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useInvoices.ts
│   │   │   │   │   └── useInvoiceCalculations.ts
│   │   │   │   └── api/
│   │   │   │       └── invoicesApi.ts
│   │   │   │
│   │   │   └── payments/            # Payment tracking
│   │   │       ├── components/
│   │   │       │   └── PaymentHistory.tsx
│   │   │       └── pages/
│   │   │           └── PaymentsPage.tsx
│   │   │
│   │   ├── products/                # Product management
│   │   │   ├── components/
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   └── ProductCard.tsx
│   │   │   ├── pages/
│   │   │   │   └── ProductsPage.tsx
│   │   │   └── api/
│   │   │       └── productsApi.ts
│   │   │
│   │   ├── customers/               # Customer management
│   │   │   ├── components/
│   │   │   │   ├── CustomerForm.tsx
│   │   │   │   └── CustomerDetails.tsx
│   │   │   ├── pages/
│   │   │   │   ├── CustomersPage.tsx
│   │   │   │   └── CustomerDetailPage.tsx
│   │   │   └── api/
│   │   │       └── customersApi.ts
│   │   │
│   │   ├── reports/                 # General reports
│   │   │   ├── components/
│   │   │   │   ├── ReportBuilder.tsx
│   │   │   │   ├── ReportFilters.tsx
│   │   │   │   └── ReportViewer.tsx
│   │   │   ├── pages/
│   │   │   │   └── ReportsPage.tsx
│   │   │   └── api/
│   │   │       └── reportsApi.ts
│   │   │
│   │   ├── settings/                # System settings
│   │   │   ├── components/
│   │   │   │   ├── CompanySettings.tsx
│   │   │   │   ├── UserSettings.tsx
│   │   │   │   └── SystemSettings.tsx
│   │   │   ├── pages/
│   │   │   │   └── SettingsPage.tsx
│   │   │   └── api/
│   │   │       └── settingsApi.ts
│   │   │
│   │   └── users/                   # User management
│   │       ├── components/
│   │       │   ├── UserForm.tsx
│   │       │   ├── RoleSelector.tsx
│   │       │   └── PermissionsMatrix.tsx
│   │       ├── pages/
│   │       │   ├── UsersPage.tsx
│   │       │   └── RolesPage.tsx
│   │       └── api/
│   │           └── usersApi.ts
│   │
│   ├── hooks/                       # Global custom hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   ├── usePermissions.ts
│   │   ├── useRealtime.ts           # WebSocket hook
│   │   └── usePagination.ts
│   │
│   ├── lib/                         # Utilities & helpers
│   │   ├── api/
│   │   │   ├── client.ts            # Axios instance configuration
│   │   │   └── queryClient.ts       # TanStack Query configuration
│   │   ├── utils/
│   │   │   ├── cn.ts                # Class name utility (clsx + tailwind-merge)
│   │   │   ├── formatters.ts        # Date, number, currency formatters
│   │   │   ├── validators.ts        # Common validation functions
│   │   │   └── constants.ts         # App constants
│   │   ├── i18n/
│   │   │   └── config.ts            # i18next configuration
│   │   └── websocket/
│   │       └── client.ts            # WebSocket client
│   │
│   ├── routes/                      # Routing configuration
│   │   ├── index.tsx                # Route definitions
│   │   ├── ProtectedRoute.tsx       # Protected route wrapper
│   │   └── routes.config.ts         # Route constants
│   │
│   ├── store/                       # Global state (Zustand)
│   │   ├── index.ts                 # Store exports
│   │   ├── authStore.ts             # Authentication state
│   │   ├── uiStore.ts               # UI state (sidebar, theme, etc.)
│   │   └── notificationStore.ts     # Notifications state
│   │
│   ├── types/                       # TypeScript types & interfaces
│   │   ├── api.types.ts             # API response types
│   │   ├── models.types.ts          # Domain model types
│   │   ├── enums.ts                 # Enums
│   │   └── index.ts                 # Type exports
│   │
│   └── config/                      # Configuration files
│       ├── app.config.ts            # App configuration
│       └── env.ts                   # Environment variables
│
├── .env.example                     # Environment variables template
├── .env.development
├── .env.production
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. State Management Strategy

### 3.1 Zustand Stores

**Why Zustand:**
- Minimal boilerplate
- No providers needed
- TypeScript-first
- Excellent performance
- Easy to test

**Store Structure:**

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      login: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true
      }),
      
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false
      }),
      
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
      
      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);
```

```typescript
// store/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ur';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'ur') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      language: 'en',
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language })
    }),
    {
      name: 'ui-storage'
    }
  )
);
```

### 3.2 TanStack Query for Server State

```typescript
// features/accounting/vouchers/api/vouchersApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Voucher, CreateVoucherDto } from '@/types';

export const vouchersKeys = {
  all: ['vouchers'] as const,
  lists: () => [...vouchersKeys.all, 'list'] as const,
  list: (filters: any) => [...vouchersKeys.lists(), filters] as const,
  details: () => [...vouchersKeys.all, 'detail'] as const,
  detail: (id: string) => [...vouchersKeys.details(), id] as const
};

// Fetch vouchers
export const useVouchers = (filters?: any) => {
  return useQuery({
    queryKey: vouchersKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<Voucher[]>('/vouchers', { params: filters });
      return data;
    }
  });
};

// Fetch single voucher
export const useVoucher = (id: string) => {
  return useQuery({
    queryKey: vouchersKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Voucher>(`/vouchers/${id}`);
      return data;
    },
    enabled: !!id
  });
};

// Create voucher
export const useCreateVoucher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (voucher: CreateVoucherDto) => {
      const { data } = await apiClient.post<Voucher>('/vouchers', voucher);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vouchersKeys.lists() });
    }
  });
};

// Post voucher
export const usePostVoucher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Voucher>(`/vouchers/${id}/post`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: vouchersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vouchersKeys.lists() });
    }
  });
};
```

---

## 4. Routing Configuration

```typescript
// routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const AccountsPage = lazy(() => import('@/features/accounting/accounts/pages/AccountsPage'));
const VouchersListPage = lazy(() => import('@/features/accounting/vouchers/pages/VouchersListPage'));
const CreateVoucherPage = lazy(() => import('@/features/accounting/vouchers/pages/CreateVoucherPage'));
// ... more imports

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'accounting',
        children: [
          {
            path: 'accounts',
            element: <AccountsPage />,
            loader: accountsLoader // Optional data loader
          },
          {
            path: 'vouchers',
            children: [
              {
                index: true,
                element: <VouchersListPage />
              },
              {
                path: 'new',
                element: <CreateVoucherPage />
              },
              {
                path: ':id',
                element: <EditVoucherPage />
              }
            ]
          }
        ]
      },
      {
        path: 'warehouse',
        children: [
          {
            path: 'grn',
            children: [
              { index: true, element: <GRNListPage /> },
              { path: 'new', element: <CreateGRNPage /> },
              { path: ':id', element: <GRNDetailPage /> }
            ]
          },
          {
            path: 'gdn',
            children: [
              { index: true, element: <GDNListPage /> },
              { path: 'new', element: <CreateGDNPage /> }
            ]
          },
          {
            path: 'stock',
            element: <StockPage />
          }
        ]
      },
      {
        path: 'billing',
        children: [
          {
            path: 'invoices',
            children: [
              { index: true, element: <InvoicesListPage /> },
              { path: 'new', element: <CreateInvoicePage /> },
              { path: ':id', element: <InvoiceDetailPage /> }
            ]
          }
        ]
      },
      {
        path: 'reports',
        element: <ReportsPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);
```

---

## 5. Key Component Examples

### 5.1 App Layout

```typescript
// components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/uiStore';

export const AppLayout = () => {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar open={sidebarOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
```

### 5.2 Data Table (Reusable)

```typescript
// components/common/DataTable.tsx
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  pagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = true,
  pagination = true
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter
    }
  });

  return (
    <div className="space-y-4">
      {searchable && (
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 5.3 Form with Validation

```typescript
// features/accounting/vouchers/components/VoucherForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const voucherSchema = z.object({
  voucherDate: z.date(),
  voucherType: z.enum(['JOURNAL', 'PAYMENT', 'RECEIPT']),
  description: z.string().optional(),
  details: z.array(z.object({
    accountCode: z.string().min(1, 'Account is required'),
    description: z.string().optional(),
    debitAmount: z.number().min(0),
    creditAmount: z.number().min(0)
  })).min(2, 'At least 2 lines required')
}).refine((data) => {
  const totalDebit = data.details.reduce((sum, d) => sum + d.debitAmount, 0);
  const totalCredit = data.details.reduce((sum, d) => sum + d.creditAmount, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
  message: 'Debit and credit must be equal',
  path: ['details']
});

type VoucherFormValues = z.infer<typeof voucherSchema>;

export const VoucherForm = ({ onSubmit }: { onSubmit: (values: VoucherFormValues) => void }) => {
  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      voucherDate: new Date(),
      voucherType: 'JOURNAL',
      details: [
        { accountCode: '', description: '', debitAmount: 0, creditAmount: 0 },
        { accountCode: '', description: '', debitAmount: 0, creditAmount: 0 }
      ]
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="voucherDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voucher Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* More fields... */}

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
```

---

## 6. Styling & Theming

### 6.1 Tailwind Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')]
};
```

### 6.2 Global Styles

```css
/* assets/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode colors */
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
  }
}
```

---

## 7. Performance Optimization

### 7.1 Code Splitting

- Lazy load routes
- Dynamic imports for heavy components
- Use React.lazy() and Suspense

### 7.2 Image Optimization

- Use WebP format
- Lazy load images
- CDN for static assets

### 7.3 Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-forms': ['react-hook-form', 'zod'],
          'vendor-charts': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

---

## 8. Testing Strategy

```typescript
// Example: Component test
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/features/auth/components/LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });
});
```

---

## 9. Deployment

### 9.1 Build for Production

```bash
npm run build
```

### 9.2 Docker

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 10. Accessibility & Internationalization

### 10.1 i18next Setup

```typescript
// lib/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../../public/locales/en/translation.json') },
      ur: { translation: require('../../public/locales/ur/translation.json') }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
```

### 10.2 Usage

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <h1>{t('dashboard.welcome')}</h1>;
};
```

---

## Conclusion

This frontend architecture provides a **scalable, maintainable, and performant** foundation for the modernized Advance ERP system. The design emphasizes developer experience, type safety, and modern best practices.

**Key Benefits:**
- Type-safe development with TypeScript
- Component reusability with Shadcn/ui
- Efficient state management with Zustand + TanStack Query
- Code splitting and lazy loading for performance
- Comprehensive testing strategy
- Internationalization ready
- Accessible (WCAG 2.1 AA)

**Estimated Development Timeline:**
- **Phase 1 (Core Setup & Auth):** 2 weeks
- **Phase 2 (Dashboard & Layout):** 2 weeks
- **Phase 3 (Accounting Module):** 4 weeks
- **Phase 4 (Warehouse Module):** 4 weeks
- **Phase 5 (Billing Module):** 3 weeks
- **Phase 6 (Reports & Polish):** 3 weeks
- **Total:** ~18 weeks (4-5 months)

---

**Document Version:** 1.0  
**Author:** ERP Modernization AI Architect  
**Next Document:** `ui_flow_wireframe.md`, `api_spec.yaml`

