import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
    coldStoreService,
    ColdStoreLotStatus,
    BillingUnitType,
} from '../../services/coldStoreService';
import type { ColdStoreLot, LotsSummary } from '../../services/coldStoreService';

const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-PK') : '—');

const statusColors: Record<ColdStoreLotStatus, string> = {
    [ColdStoreLotStatus.IN_STORAGE]: 'bg-blue-100 text-blue-800',
    [ColdStoreLotStatus.PARTIALLY_RELEASED]: 'bg-orange-100 text-orange-800',
    [ColdStoreLotStatus.RELEASED]: 'bg-green-100 text-green-800',
    [ColdStoreLotStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

const ColdStoreLotsPage = () => {
    const [lots, setLots] = useState<ColdStoreLot[]>([]);
    const [summary, setSummary] = useState<LotsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ColdStoreLotStatus | ''>('');

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [lotsData, summaryData] = await Promise.all([
                coldStoreService.getLots(statusFilter ? { status: statusFilter } : undefined),
                coldStoreService.getLotsSummary(),
            ]);
            setLots(lotsData);
            setSummary(summaryData);
        } catch (e: any) {
            toast.error('Failed to load cold store lots');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Cold Store Lots</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track all customer commodity lots in storage</p>
                </div>
                <Link
                    to="/cold-store/inward-gate-passes/create"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                >
                    + New Inward Gate Pass
                </Link>
            </div>

            {/* KPI Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 bg-card">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Lots</p>
                        <p className="text-3xl font-bold mt-1">{summary.totalLots}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Bags in Storage</p>
                        <p className="text-3xl font-bold mt-1">{summary.totalBagsInStorage.toLocaleString()}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Weight (kg)</p>
                        <p className="text-3xl font-bold mt-1">{Number(summary.totalWeightKg).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2">
                {(['', ...Object.values(ColdStoreLotStatus)] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s as any)}
                        className={`px-3 py-1 rounded text-sm border ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-card overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading lots...</div>
                ) : lots.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No lots found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">Lot #</th>
                                <th className="text-left p-3 font-medium">Customer</th>
                                <th className="text-left p-3 font-medium">Commodity</th>
                                <th className="text-left p-3 font-medium">Bags (In/Out)</th>
                                <th className="text-left p-3 font-medium">Net Wt (kg)</th>
                                <th className="text-left p-3 font-medium">Billing</th>
                                <th className="text-left p-3 font-medium">Inward Date</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-right p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.map((lot) => (
                                <tr key={lot.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 font-mono font-medium">{lot.lotNumber}</td>
                                    <td className="p-3">{lot.customer?.name || '—'}</td>
                                    <td className="p-3">{lot.commodity}{lot.variety ? ` (${lot.variety})` : ''}</td>
                                    <td className="p-3">
                                        <span className="font-medium">{lot.bagsIn}</span>
                                        <span className="text-muted-foreground"> / {lot.bagsOut}</span>
                                        <span className="ml-1 text-xs text-blue-600">({lot.bagsIn - lot.bagsOut} left)</span>
                                    </td>
                                    <td className="p-3">{Number(lot.netWeightKg).toLocaleString()}</td>
                                    <td className="p-3">
                                        {lot.billingUnit === BillingUnitType.PER_BAG
                                            ? `PKR ${lot.ratePerBagPerSeason}/bag`
                                            : `PKR ${lot.ratePerKgPerDay}/kg/day`}
                                    </td>
                                    <td className="p-3">{formatDate(lot.inwardDate)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[lot.status]}`}>
                                            {lot.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Link
                                            to={`/cold-store/outward-gate-passes/create?lotId=${lot.id}`}
                                            className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs hover:bg-orange-200 mr-1"
                                        >
                                            Release
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ColdStoreLotsPage;
