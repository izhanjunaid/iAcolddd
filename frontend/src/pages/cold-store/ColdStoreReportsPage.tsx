import { useState, useEffect } from 'react';
import { coldStoreService } from '../../services/coldStoreService';
import { toast } from 'sonner';

export default function ColdStoreReportsPage() {
    const [activeTab, setActiveTab] = useState<'utilization' | 'revenue' | 'aging'>('utilization');
    const [utilizationData, setUtilizationData] = useState<any>(null);
    const [revenueData, setRevenueData] = useState<any>(null);
    const [agingData, setAgingData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadReport(activeTab);
    }, [activeTab]);

    const loadReport = async (tab: 'utilization' | 'revenue' | 'aging') => {
        try {
            setLoading(true);
            if (tab === 'utilization' && !utilizationData) {
                const data = await coldStoreService.getSpaceUtilization();
                setUtilizationData(data);
            } else if (tab === 'revenue' && !revenueData) {
                const data = await coldStoreService.getProjectedRevenue();
                setRevenueData(data);
            } else if (tab === 'aging' && !agingData) {
                const data = await coldStoreService.getCustomerAging();
                setAgingData(data);
            }
        } catch (error) {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Cold Store Analytics</h1>

            <div className="flex space-x-4 mb-6 border-b">
                <button
                    className={`pb-2 px-1 ${activeTab === 'utilization' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('utilization')}
                >
                    Space Utilization
                </button>
                <button
                    className={`pb-2 px-1 ${activeTab === 'revenue' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('revenue')}
                >
                    Projected Revenue
                </button>
                <button
                    className={`pb-2 px-1 ${activeTab === 'aging' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('aging')}
                >
                    Stock Aging
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><span className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
            ) : (
                <>
                    {/* Space Utilization Tab */}
                    {activeTab === 'utilization' && utilizationData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Total Chambers</h3>
                                    <div className="text-2xl font-bold">{utilizationData.totalChambers}</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Total Capacity (KG)</h3>
                                    <div className="text-2xl font-bold">{utilizationData.totalMaxCapacityKg.toLocaleString()}</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Total Utilized (KG)</h3>
                                    <div className="text-2xl font-bold">{utilizationData.totalUtilizedKg.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3">Chamber Code</th>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3 text-right">Max Capacity (KG)</th>
                                            <th className="px-4 py-3 text-right">Utilized (KG)</th>
                                            <th className="px-4 py-3 text-right">Utilization %</th>
                                            <th className="px-4 py-3 text-center">Active Lots</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {utilizationData.chambers.map((c: any) => (
                                            <tr key={c.chamberId} className="border-b">
                                                <td className="px-4 py-3 font-medium">{c.chamberCode}</td>
                                                <td className="px-4 py-3">{c.chamberName}</td>
                                                <td className="px-4 py-3 text-right">{c.maxCapacityKg.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right">{c.utilizedKg.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span>{c.utilizationPercentage}%</span>
                                                        <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                                                            <div className={`h-full ${c.utilizationPercentage > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(c.utilizationPercentage, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">{c.activeLotsCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Projected Revenue Tab */}
                    {activeTab === 'revenue' && revenueData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Active Lots</h3>
                                    <div className="text-2xl font-bold">{revenueData.summary.totalActiveLots}</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Projected Subtotal</h3>
                                    <div className="text-2xl font-bold">Rs. {revenueData.summary.totalProjectedSubtotal.toLocaleString()}</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Projected Taxes</h3>
                                    <div className="text-2xl font-bold text-red-500">Rs. {(revenueData.summary.totalProjectedGst + revenueData.summary.totalProjectedWht).toLocaleString()}</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg shadow-sm border">
                                    <h3 className="text-sm font-medium text-muted-foreground">Projected Total</h3>
                                    <div className="text-2xl font-bold text-green-600">Rs. {revenueData.summary.totalProjectedTotal.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3">Lot Number</th>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3 text-center">Days Stored</th>
                                            <th className="px-4 py-3 text-right">Projected Subtotal</th>
                                            <th className="px-4 py-3 text-right">Projected Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revenueData.lots.map((l: any) => (
                                            <tr key={l.lotId} className="border-b">
                                                <td className="px-4 py-3 font-medium">{l.lotNumber}</td>
                                                <td className="px-4 py-3">{l.customerName}</td>
                                                <td className="px-4 py-3 text-center">{l.daysStored}</td>
                                                <td className="px-4 py-3 text-right">Rs. {l.projectedSubtotal.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-medium text-green-600">Rs. {l.projectedTotalAmount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Stock Aging Tab */}
                    {activeTab === 'aging' && agingData && (
                        <div className="space-y-6">
                            {agingData.oldestStockAlerts.length > 0 && (
                                <div className="border border-red-200 bg-red-50 text-red-800 p-4 rounded-lg mb-6">
                                    <h3 className="font-bold flex items-center gap-2 mb-2">
                                        🚨 Older Than 90 Days Alerts ({agingData.oldestStockAlerts.length})
                                    </h3>
                                    <ul className="list-disc pl-5 text-sm space-y-1">
                                        {agingData.oldestStockAlerts.slice(0, 5).map((alert: any) => (
                                            <li key={alert.lotId}>
                                                Lot <strong>{alert.lotNumber}</strong> ({alert.customerName}) - {alert.commodity} - In storage for <strong>{alert.ageDays} days</strong> ({alert.bagsRemaining} bags)
                                            </li>
                                        ))}
                                        {agingData.oldestStockAlerts.length > 5 && (
                                            <li>... and {agingData.oldestStockAlerts.length - 5} more.</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3">Lot Number</th>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Commodity</th>
                                            <th className="px-4 py-3 text-center">Age Bucket</th>
                                            <th className="px-4 py-3 text-right">Days Stored</th>
                                            <th className="px-4 py-3 text-right">Bags Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agingData.allAgingLots.map((l: any) => (
                                            <tr key={l.lotId} className="border-b">
                                                <td className="px-4 py-3 font-medium">{l.lotNumber}</td>
                                                <td className="px-4 py-3">{l.customerName}</td>
                                                <td className="px-4 py-3">{l.commodity}</td>
                                                <td className="px-4 py-3 text-center pr-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium 
                                                        ${l.ageBucket === '0-30 days' ? 'bg-green-100 text-green-800' :
                                                            l.ageBucket === '31-60 days' ? 'bg-yellow-100 text-yellow-800' :
                                                                l.ageBucket === '61-90 days' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-red-100 text-red-800'}`
                                                    }>
                                                        {l.ageBucket}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">{l.ageDays}</td>
                                                <td className="px-4 py-3 text-right">{l.bagsRemaining}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
