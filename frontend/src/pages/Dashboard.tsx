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
} from 'recharts';
import {
    Users,
    FileText,
    Package,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    AlertCircle,
    Info,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Warehouse,
    Receipt,
    CreditCard,
} from 'lucide-react';
import {
    dashboardService,
    type DashboardKPIs,
    type MonthlyTrend,
    type ActivityItem,
    type AlertItem,
} from '../services/dashboardService';

// ────────────────────────────────────────────────────────────────
// UTILITY
// ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

const formatCompact = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    return amount.toFixed(0);
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

// ────────────────────────────────────────────────────────────────
// KPI CARD
// ────────────────────────────────────────────────────────────────

interface KPICardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    trend?: { value: number; label: string };
    link?: string;
}

const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor,
    iconBg,
    trend,
    link,
}) => {
    const content = (
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                {trend && (
                    <div
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.value >= 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-red-500/10 text-red-600'
                            }`}
                    >
                        {trend.value >= 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                        ) : (
                            <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(trend.value)}%
                    </div>
                )}
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
    );

    if (link) {
        return (
            <Link to={link} className="block">
                {content}
            </Link>
        );
    }
    return content;
};

// ────────────────────────────────────────────────────────────────
// ALERT BANNER
// ────────────────────────────────────────────────────────────────

const AlertBanner: React.FC<{ alerts: AlertItem[] }> = ({ alerts }) => {
    if (!alerts.length) return null;

    const iconMap = {
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const colorMap = {
        error: {
            bg: 'bg-red-500/10 border-red-500/30',
            text: 'text-red-600',
            icon: 'text-red-500',
        },
        warning: {
            bg: 'bg-amber-500/10 border-amber-500/30',
            text: 'text-amber-700',
            icon: 'text-amber-500',
        },
        info: {
            bg: 'bg-blue-500/10 border-blue-500/30',
            text: 'text-blue-600',
            icon: 'text-blue-500',
        },
    };

    return (
        <div className="space-y-2">
            {alerts.map((alert, i) => {
                const Icon = iconMap[alert.level];
                const colors = colorMap[alert.level];
                return (
                    <Link
                        key={i}
                        to={alert.link}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors.bg} hover:opacity-80 transition-opacity`}
                    >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${colors.icon}`} />
                        <span className={`text-sm font-medium ${colors.text}`}>
                            {alert.message}
                        </span>
                        <ArrowUpRight className={`h-3 w-3 ml-auto ${colors.icon}`} />
                    </Link>
                );
            })}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────
// ACTIVITY FEED
// ────────────────────────────────────────────────────────────────

const ActivityFeed: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {
    const iconMap = {
        invoice: Receipt,
        bill: CreditCard,
        inventory: Package,
    };

    const colorMap = {
        invoice: 'text-blue-500 bg-blue-500/10',
        bill: 'text-orange-500 bg-orange-500/10',
        inventory: 'text-emerald-500 bg-emerald-500/10',
    };

    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm h-full">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Activity
            </h3>
            {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
            ) : (
                <div className="space-y-1">
                    {activities.map((act, i) => {
                        const Icon = iconMap[act.type];
                        const colors = colorMap[act.type];
                        return (
                            <div
                                key={i}
                                className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
                            >
                                <div className={`p-1.5 rounded-md mt-0.5 ${colors}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{act.description}</p>
                                    <p className="text-xs text-muted-foreground">{timeAgo(act.date)}</p>
                                </div>
                                {act.amount != null && (
                                    <span className="text-sm font-medium whitespace-nowrap">
                                        {formatCurrency(act.amount)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────
// QUICK ACTION CARD
// ────────────────────────────────────────────────────────────────

interface QuickActionCardProps {
    title: string;
    icon: React.ElementType;
    link: string;
    description: string;
    color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
    title,
    icon: Icon,
    link,
    description,
    color,
}) => (
    <Link
        to={link}
        className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200"
    >
        <div
            className={`absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${color}`}
        />
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon className="h-5 w-5 text-foreground/80" />
            </div>
            <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
);

// ────────────────────────────────────────────────────────────────
// REVENUE CHART (custom tooltip)
// ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
            <p className="text-xs font-medium mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-xs" style={{ color: p.color }}>
                    {p.name}: {formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-muted rounded-md ${className || ''}`} />
);

const KPICardSkeleton = () => (
    <div className="rounded-xl border bg-card p-5 shadow-sm h-full">
        <Skeleton className="h-10 w-10 rounded-lg mb-3" />
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-28 mb-1" />
        <Skeleton className="h-3 w-16" />
    </div>
);

// ────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ────────────────────────────────────────────────────────────────

export const Dashboard = () => {
    const { user } = useAuthStore();
    const [kpis, setKpis] = React.useState<DashboardKPIs | null>(null);
    const [trends, setTrends] = React.useState<MonthlyTrend[]>([]);
    const [activities, setActivities] = React.useState<ActivityItem[]>([]);
    const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadAll = async () => {
            try {
                const [kpiData, trendData, actData, alertData] = await Promise.all([
                    dashboardService.getKPIs(),
                    dashboardService.getMonthlyTrends(),
                    dashboardService.getRecentActivity(),
                    dashboardService.getAlerts(),
                ]);
                setKpis(kpiData);
                setTrends(trendData);
                setActivities(actData);
                setAlerts(alertData);
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {user?.fullName || 'User'}
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {!loading && <AlertBanner alerts={alerts} />}

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                    <>
                        <KPICardSkeleton />
                        <KPICardSkeleton />
                        <KPICardSkeleton />
                        <KPICardSkeleton />
                    </>
                ) : (
                    <>
                        <KPICard
                            title="Revenue"
                            value={formatCurrency(kpis?.totalRevenue || 0)}
                            subtitle={`${kpis?.pendingInvoices || 0} pending invoices`}
                            icon={DollarSign}
                            iconColor="text-emerald-600"
                            iconBg="bg-emerald-500/10"
                            link="/invoices"
                        />
                        <KPICard
                            title="Receivables"
                            value={formatCurrency(kpis?.totalReceivables || 0)}
                            subtitle={
                                kpis?.overdueInvoices
                                    ? `${kpis.overdueInvoices} overdue`
                                    : 'All current'
                            }
                            icon={Users}
                            iconColor="text-blue-600"
                            iconBg="bg-blue-500/10"
                            link="/invoices"
                        />
                        <KPICard
                            title="Payables"
                            value={formatCurrency(kpis?.totalPayables || 0)}
                            subtitle={
                                kpis?.overdueBills
                                    ? `${kpis.overdueBills} overdue`
                                    : 'All current'
                            }
                            icon={FileText}
                            iconColor="text-orange-600"
                            iconBg="bg-orange-500/10"
                            link="/payables"
                        />
                        <KPICard
                            title="Inventory Value"
                            value={formatCurrency(kpis?.totalInventoryValue || 0)}
                            subtitle={`${kpis?.stockItems || 0} active items`}
                            icon={Warehouse}
                            iconColor="text-violet-600"
                            iconBg="bg-violet-500/10"
                            link="/inventory/items"
                        />
                    </>
                )}
            </div>

            {/* Charts + Activity */}
            <div className="grid gap-4 lg:grid-cols-7">
                {/* Revenue Chart */}
                <div className="col-span-full lg:col-span-4 rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Revenue vs Expenses
                    </h3>
                    <div className="h-[300px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Skeleton className="h-full w-full" />
                            </div>
                        ) : trends.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                No trend data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trends} barGap={4}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-muted"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `₨${formatCompact(v)}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px' }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Bar
                                        name="Revenue"
                                        dataKey="revenue"
                                        fill="hsl(142, 71%, 45%)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={40}
                                    />
                                    <Bar
                                        name="Expenses"
                                        dataKey="expenses"
                                        fill="hsl(0, 84%, 60%)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="col-span-full lg:col-span-3">
                    {loading ? (
                        <div className="rounded-xl border bg-card p-5 shadow-sm h-full">
                            <Skeleton className="h-5 w-32 mb-4" />
                            {[1, 2, 3, 4, 5].map((n) => (
                                <div key={n} className="flex gap-3 py-2.5">
                                    <Skeleton className="h-7 w-7 rounded-md" />
                                    <div className="flex-1">
                                        <Skeleton className="h-3 w-full mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ActivityFeed activities={activities} />
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickActionCard
                        title="Customers"
                        icon={Users}
                        link="/customers"
                        description="Manage customer accounts"
                        color="bg-blue-500"
                    />
                    <QuickActionCard
                        title="Vouchers"
                        icon={FileText}
                        link="/vouchers"
                        description="Create journal entries"
                        color="bg-emerald-500"
                    />
                    <QuickActionCard
                        title="Inventory"
                        icon={Package}
                        link="/inventory/items"
                        description="Manage stock items"
                        color="bg-orange-500"
                    />
                    <QuickActionCard
                        title="Financials"
                        icon={TrendingUp}
                        link="/financial-statements/analysis"
                        description="View financial reports"
                        color="bg-violet-500"
                    />
                </div>
            </div>
        </div>
    );
};
