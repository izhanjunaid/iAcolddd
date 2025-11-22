import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import {
    Users,
    FileText,
    CreditCard,
    Package,
    Calendar,
    PieChart,
    TrendingUp,
    DollarSign
} from 'lucide-react';

// Mock data for charts
const revenueData = [
    { name: 'Jan', revenue: 4000, expenses: 2400 },
    { name: 'Feb', revenue: 3000, expenses: 1398 },
    { name: 'Mar', revenue: 2000, expenses: 9800 },
    { name: 'Apr', revenue: 2780, expenses: 3908 },
    { name: 'May', revenue: 1890, expenses: 4800 },
    { name: 'Jun', revenue: 2390, expenses: 3800 },
];

const cashFlowData = [
    { name: 'Week 1', cash: 12000 },
    { name: 'Week 2', cash: 15000 },
    { name: 'Week 3', cash: 11000 },
    { name: 'Week 4', cash: 18000 },
];

interface DashboardCardProps {
    title: string;
    icon: React.ElementType;
    link: string;
    description: string;
    color: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, link, description, color }) => (
    <Link
        to={link}
        className="group relative overflow-hidden rounded-xl border bg-card p-6 hover:shadow-lg transition-all duration-300"
    >
        <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${color}`} />
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-primary`}>
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
);

export const Dashboard = () => {
    const { user } = useAuthStore();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome back, {user?.fullName || 'User'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        Download Report
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Active Customers</h3>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Pending Invoices</h3>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">Requires attention</p>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Stock Value</h3>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">$12,234</div>
                    <p className="text-xs text-muted-foreground">+19% from last month</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Revenue Overview</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Cash Flow Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cashFlowData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="cash"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <h2 className="text-xl font-semibold mt-8 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardCard
                    title="Customers"
                    icon={Users}
                    link="/customers"
                    description="Manage customer accounts"
                    color="bg-blue-500"
                />
                <DashboardCard
                    title="Vouchers"
                    icon={FileText}
                    link="/vouchers"
                    description="Create journal entries"
                    color="bg-green-500"
                />
                <DashboardCard
                    title="Inventory"
                    icon={Package}
                    link="/inventory/items"
                    description="Manage stock items"
                    color="bg-orange-500"
                />
                <DashboardCard
                    title="Financials"
                    icon={TrendingUp}
                    link="/financial-statements/analysis"
                    description="View financial reports"
                    color="bg-purple-500"
                />
            </div>
        </div>
    );
};
