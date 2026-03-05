import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    coldStoreService,
    RentalCycleStatus,
    BillingUnitType,
} from '../../services/coldStoreService';
import type { RentalBillingCycle } from '../../services/coldStoreService';

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-PK') : '—');
const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const cycleStatusColors: Record<RentalCycleStatus, string> = {
    [RentalCycleStatus.ACTIVE]: 'bg-blue-100 text-blue-800',
    [RentalCycleStatus.CLOSED]: 'bg-gray-100 text-gray-800',
    [RentalCycleStatus.INVOICED]: 'bg-green-100 text-green-800',
};

const RentalBillingPage = () => {
    const [cycles, setCycles] = useState<RentalBillingCycle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await coldStoreService.getActiveBillingCycles();
            setCycles(data);
        } catch (e: any) {
            toast.error('Failed to load billing cycles');
        } finally {
            setLoading(false);
        }
    };

    const totalStorageCharges = cycles.reduce((s, c) => s + Number(c.storageCharges), 0);
    const totalInvoiced = cycles
        .filter((c) => c.status === RentalCycleStatus.INVOICED)
        .reduce((s, c) => s + Number(c.totalAmount), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Rental Billing Cycles</h1>
                <p className="text-sm text-muted-foreground mt-1">Active and historical storage billing records</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-card">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cycles</p>
                    <p className="text-3xl font-bold mt-1">{cycles.length}</p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Storage Charges</p>
                    <p className="text-2xl font-bold mt-1">{formatPKR(totalStorageCharges)}</p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{formatPKR(totalInvoiced)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-card overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading billing cycles...</div>
                ) : cycles.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No billing cycles found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">Lot</th>
                                <th className="text-left p-3 font-medium">Customer</th>
                                <th className="text-left p-3 font-medium">Billing Unit</th>
                                <th className="text-left p-3 font-medium">Start Date</th>
                                <th className="text-left p-3 font-medium">End Date</th>
                                <th className="text-left p-3 font-medium">Days</th>
                                <th className="text-right p-3 font-medium">Storage Charges</th>
                                <th className="text-right p-3 font-medium">GST</th>
                                <th className="text-right p-3 font-medium">Total</th>
                                <th className="text-left p-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycles.map((cycle) => (
                                <tr key={cycle.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 font-mono text-xs">{cycle.lot?.lotNumber || '—'}</td>
                                    <td className="p-3">{cycle.customer?.name || '—'}</td>
                                    <td className="p-3 text-xs">
                                        {cycle.billingUnit === BillingUnitType.PER_BAG
                                            ? `${cycle.bagsBilled} bags × PKR ${cycle.rateApplied}`
                                            : `${cycle.weightBilledKg} kg × PKR ${cycle.rateApplied}/kg/day`}
                                    </td>
                                    <td className="p-3">{formatDate(cycle.billingStartDate)}</td>
                                    <td className="p-3">{formatDate(cycle.billingEndDate)}</td>
                                    <td className="p-3">{cycle.daysStored ?? '—'}</td>
                                    <td className="p-3 text-right font-medium">{formatPKR(Number(cycle.storageCharges))}</td>
                                    <td className="p-3 text-right">{formatPKR(Number(cycle.gstAmount))}</td>
                                    <td className="p-3 text-right font-bold">{formatPKR(Number(cycle.totalAmount))}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${cycleStatusColors[cycle.status]}`}>
                                            {cycle.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t bg-muted/30">
                            <tr>
                                <td colSpan={6} className="p-3 font-semibold text-right">Totals:</td>
                                <td className="p-3 text-right font-semibold">{formatPKR(totalStorageCharges)}</td>
                                <td className="p-3 text-right font-semibold">
                                    {formatPKR(cycles.reduce((s, c) => s + Number(c.gstAmount), 0))}
                                </td>
                                <td className="p-3 text-right font-bold">
                                    {formatPKR(cycles.reduce((s, c) => s + Number(c.totalAmount), 0))}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RentalBillingPage;
