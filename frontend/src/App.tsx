import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { AccountsPage } from './pages/AccountsPage';
import { JournalVoucherPage } from './pages/JournalVoucherPage';
import { VouchersPage } from './pages/VouchersPage';
import { TrialBalancePage } from './pages/TrialBalancePage';
import { AccountLedgerPage } from './pages/AccountLedgerPage';
import CustomersPage from './pages/CustomersPage';
import FiscalPeriodsPage from './pages/FiscalPeriodsPage';
import CostCentersPage from './pages/CostCentersPage';
import InventoryItemsPage from './pages/InventoryItemsPage';
import InventoryTransactionsPage from './pages/InventoryTransactionsPage';
import InventoryBalancesPage from './pages/InventoryBalancesPage';
import TaxRatesPage from './pages/TaxRatesPage';
import InvoicesPage from './pages/InvoicesPage';
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { IncomeStatementPage } from './pages/IncomeStatementPage';
import { CashFlowStatementPage } from './pages/CashFlowStatementPage';
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { Dashboard } from './pages/Dashboard';


// Unauthorized page
const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">403 - Unauthorized</h1>
      <p className="text-muted-foreground mb-4">
        You don't have permission to access this resource.
      </p>
      <a
        href="/dashboard"
        className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Go to Dashboard
      </a>
    </div>
  </div>
);

import BankReconciliationPage from './pages/BankReconciliationPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        {/* Protected Routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bank-reconciliation"
            element={
              <ProtectedRoute requiredPermissions={['bank-reconciliation.read']}>
                <BankReconciliationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute requiredPermissions={['customers.read']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute requiredPermissions={['accounts.read']}>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers"
            element={
              <ProtectedRoute requiredPermissions={['vouchers.read']}>
                <VouchersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers/journal/create"
            element={
              <ProtectedRoute requiredPermissions={['vouchers.create']}>
                <JournalVoucherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trial-balance"
            element={
              <ProtectedRoute requiredPermissions={['vouchers.read']}>
                <TrialBalancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/general-ledger/account/:accountCode"
            element={
              <ProtectedRoute requiredPermissions={['vouchers.read']}>
                <AccountLedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fiscal-periods"
            element={
              <ProtectedRoute requiredPermissions={['fiscal-periods.read']}>
                <FiscalPeriodsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cost-centers"
            element={
              <ProtectedRoute requiredPermissions={['cost-centers.read']}>
                <CostCentersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/items"
            element={
              <ProtectedRoute requiredPermissions={['inventory.items.read']}>
                <InventoryItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/transactions"
            element={
              <ProtectedRoute requiredPermissions={['inventory.transactions.read']}>
                <InventoryTransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/balances"
            element={
              <ProtectedRoute requiredPermissions={['inventory.balances.read']}>
                <InventoryBalancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tax-rates"
            element={
              <ProtectedRoute requiredPermissions={['tax:view']}>
                <TaxRatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute requiredPermissions={['invoices.read']}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-statements/balance-sheet"
            element={
              <ProtectedRoute requiredPermissions={['financial-statements.read']}>
                <BalanceSheetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-statements/income-statement"
            element={
              <ProtectedRoute requiredPermissions={['financial-statements.read']}>
                <IncomeStatementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-statements/cash-flow"
            element={
              <ProtectedRoute requiredPermissions={['financial-statements.read']}>
                <CashFlowStatementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-statements/analysis"
            element={
              <ProtectedRoute requiredPermissions={['financial-statements.read']}>
                <FinancialAnalysisPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
