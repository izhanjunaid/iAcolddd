import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AccountsPage } from './pages/AccountsPage';
import { JournalVoucherPage } from './pages/JournalVoucherPage';
import { VouchersPage } from './pages/VouchersPage';
import { TrialBalancePage } from './pages/TrialBalancePage';
import { AccountLedgerPage } from './pages/AccountLedgerPage';
import CustomersPage from './pages/CustomersPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

// Temporary Dashboard component
const Dashboard = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Advance ERP</h1>
            <nav className="flex gap-4">
              <Link to="/dashboard" className="text-sm hover:underline">
                Dashboard
              </Link>
              <Link to="/customers" className="text-sm hover:underline">
                Customers
              </Link>
              <Link to="/accounts" className="text-sm hover:underline">
                Chart of Accounts
              </Link>
              <Link to="/vouchers" className="text-sm hover:underline">
                Vouchers
              </Link>
              <Link to="/trial-balance" className="text-sm hover:underline">
                Trial Balance
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.fullName}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            You are logged in as: <strong>{user?.username}</strong>
          </p>
          <div className="space-y-2 mb-6">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Roles:</strong> {user?.roles.join(', ') || 'None'}
            </p>
            <p>
              <strong>Permissions:</strong>{' '}
              {user?.permissions.length || 0} permissions
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Link
              to="/customers"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-2">👥 Customers</h3>
              <p className="text-sm text-muted-foreground">
                Manage customer accounts
              </p>
            </Link>
            <Link
              to="/accounts"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-2">📊 Chart of Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account hierarchy
              </p>
            </Link>
            <Link
              to="/vouchers"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-2">📝 Vouchers</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage journal entries
              </p>
            </Link>
            <Link
              to="/trial-balance"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-2">⚖️ Trial Balance</h3>
              <p className="text-sm text-muted-foreground">
                Verify books are balanced
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
