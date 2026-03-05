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
import InventoryValuationPage from './pages/InventoryValuationPage';
import TaxRatesPage from './pages/TaxRatesPage';
import InvoicesPage from './pages/InvoicesPage';
// CreateInvoicePage removed — invoices are auto-generated from Outward Gate Pass approval
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { IncomeStatementPage } from './pages/IncomeStatementPage';
import { CashFlowStatementPage } from './pages/CashFlowStatementPage';
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage';
import BillsList from './pages/payables/BillsList';
import CreateBill from './pages/payables/CreateBill';
import VendorsList from './pages/payables/VendorsList';
import CreateVendor from './pages/payables/CreateVendor';
import PaymentsList from './pages/payables/PaymentsList';
import RecordPayment from './pages/payables/RecordPayment';
import PurchaseOrdersList from './pages/procurement/PurchaseOrdersList';
import CreatePurchaseOrder from './pages/procurement/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/procurement/PurchaseOrderDetail';
import GoodsReceiptNotesList from './pages/procurement/GoodsReceiptNotesList';
import CreateGoodsReceiptNote from './pages/procurement/CreateGoodsReceiptNote';
import ColdStoreLotsPage from './pages/cold-store/ColdStoreLotsPage';
import InwardGatePassPage from './pages/cold-store/InwardGatePassPage';
import OutwardGatePassPage from './pages/cold-store/OutwardGatePassPage';
import RentalBillingPage from './pages/cold-store/RentalBillingPage';
import ColdStoreReportsPage from './pages/cold-store/ColdStoreReportsPage';
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
import FixedAssetsPage from './pages/FixedAssetsPage';
import BudgetsPage from './pages/BudgetsPage';

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
            path="/inventory/valuation"
            element={
              <ProtectedRoute requiredPermissions={['inventory.reports.read']}>
                <InventoryValuationPage />
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
          {/* /invoices/create route removed — invoices auto-generated from Outward Gate Pass */}
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
          <Route
            path="/payables/bills"
            element={
              <ProtectedRoute requiredPermissions={['invoices.read']}>
                <BillsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payables/bills/create"
            element={
              <ProtectedRoute requiredPermissions={['invoices.create']}>
                <CreateBill />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payables/vendors"
            element={
              <ProtectedRoute requiredPermissions={['vendors.read']}>
                <VendorsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payables/vendors/create"
            element={
              <ProtectedRoute requiredPermissions={['vendors.create']}>
                <CreateVendor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payables/payments"
            element={
              <ProtectedRoute requiredPermissions={['ap.payment.read']}>
                <PaymentsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payables/payments/record"
            element={
              <ProtectedRoute requiredPermissions={['ap.payment.create']}>
                <RecordPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/purchase-orders"
            element={
              <ProtectedRoute requiredPermissions={['vendors.read']}>
                <PurchaseOrdersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/purchase-orders/:id"
            element={
              <ProtectedRoute requiredPermissions={['vendors.read']}>
                <PurchaseOrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/purchase-orders/create"
            element={
              <ProtectedRoute requiredPermissions={['vendors.create']}>
                <CreatePurchaseOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/goods-receipts"
            element={
              <ProtectedRoute requiredPermissions={['vendors.read']}>
                <GoodsReceiptNotesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/procurement/goods-receipts/create"
            element={
              <ProtectedRoute requiredPermissions={['vendors.create']}>
                <CreateGoodsReceiptNote />
              </ProtectedRoute>
            }
          />
          {/* Cold Store */}
          <Route
            path="/cold-store/lots"
            element={
              <ProtectedRoute>
                <ColdStoreLotsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cold-store/inward-gate-passes"
            element={
              <ProtectedRoute>
                <InwardGatePassPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cold-store/outward-gate-passes"
            element={
              <ProtectedRoute>
                <OutwardGatePassPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cold-store/billing"
            element={
              <ProtectedRoute>
                <RentalBillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cold-store/reports"
            element={
              <ProtectedRoute>
                <ColdStoreReportsPage />
              </ProtectedRoute>
            }
          />
          {/* Fixed Assets */}
          <Route
            path="/fixed-assets"
            element={
              <ProtectedRoute>
                <FixedAssetsPage />
              </ProtectedRoute>
            }
          />
          {/* Budgets */}
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <BudgetsPage />
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
