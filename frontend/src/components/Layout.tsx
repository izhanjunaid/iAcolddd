import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    LayoutDashboard,
    Users,
    FileText,
    Package,
    Calendar,
    Building2,
    Percent,
    FileSpreadsheet,
    LogOut
} from 'lucide-react';

export const Layout = () => {
    const { user, logout } = useAuthStore();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const isActive = (path: string) => {
        return location.pathname.startsWith(path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
    };

    const NavLink = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => (
        <Link
            to={to}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive(to)}`}
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link to="/" className="flex items-center gap-2 font-semibold">
                            <Package className="h-6 w-6" />
                            <span className="">Advance ERP</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                            <NavLink to="/customers" icon={Users}>Customers</NavLink>
                            <NavLink to="/accounts" icon={FileSpreadsheet}>Chart of Accounts</NavLink>
                            <NavLink to="/vouchers" icon={FileText}>Vouchers</NavLink>
                            <div className="my-2 border-t" />
                            <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground">Inventory</p>
                            <NavLink to="/inventory/items" icon={Package}>Items</NavLink>
                            <NavLink to="/inventory/transactions" icon={FileText}>Transactions</NavLink>
                            <NavLink to="/inventory/balances" icon={FileSpreadsheet}>Balances</NavLink>
                            <div className="my-2 border-t" />
                            <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground">Settings</p>
                            <NavLink to="/fiscal-periods" icon={Calendar}>Fiscal Periods</NavLink>
                            <NavLink to="/cost-centers" icon={Building2}>Cost Centers</NavLink>
                            <NavLink to="/tax-rates" icon={Percent}>Tax Rates</NavLink>
                            <div className="my-2 border-t" />
                            <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground">Reports</p>
                            <NavLink to="/trial-balance" icon={FileSpreadsheet}>Trial Balance</NavLink>
                            <NavLink to="/financial-statements/balance-sheet" icon={FileText}>Balance Sheet</NavLink>
                            <NavLink to="/financial-statements/income-statement" icon={FileText}>Income Statement</NavLink>
                            <NavLink to="/financial-statements/cash-flow" icon={FileText}>Cash Flow</NavLink>
                            <NavLink to="/financial-statements/analysis" icon={FileText}>Analysis</NavLink>
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <div className="w-full flex-1">
                        {/* Add search or breadcrumbs here if needed */}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {user?.fullName}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="rounded-full p-2 hover:bg-accent"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
