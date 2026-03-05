import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../services/fixedAssetsService';
import type { FixedAsset, DepreciationRunResult } from '../services/fixedAssetsService';
import { AccountSelector } from '../components/AccountSelector';

const FixedAssetsPage: React.FC = () => {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [depResult, setDepResult] = useState<DepreciationRunResult | null>(null);
    const [depDate, setDepDate] = useState('');
    const [runningDep, setRunningDep] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', purchaseDate: '', purchaseCost: 0,
        salvageValue: 0, usefulLifeMonths: 60,
        depreciationMethod: 'STRAIGHT_LINE' as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        assetAccountCode: '1-0001-0002-0001',
        depreciationExpenseCode: '5-0001-0001-0004',
        accumulatedDepreciationCode: '1-0001-0002-0002',
    });

    useEffect(() => { loadAssets(); }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await fixedAssetsApi.getAll();
            setAssets(data);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fixedAssetsApi.create(formData);
            toast.success('Asset registered successfully');
            setShowForm(false);
            loadAssets();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create asset');
        }
    };

    const handleRunDepreciation = async () => {
        if (!depDate) { toast.error('Select a period end date'); return; }
        setRunningDep(true);
        try {
            const result = await fixedAssetsApi.runDepreciation(depDate);
            setDepResult(result);
            toast.success(`Depreciation posted: ${result.assetsProcessed} assets, voucher ${result.voucherNumber}`);
            loadAssets();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Depreciation run failed');
        } finally {
            setRunningDep(false);
        }
    };

    const statusColor = (s: string) => {
        if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
        if (s === 'FULLY_DEPRECIATED') return 'bg-yellow-100 text-yellow-800';
        if (s === 'DISPOSED') return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Fixed Assets</h1>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors">
                    {showForm ? 'Cancel' : '+ Register Asset'}
                </button>
            </div>

            {/* Register Asset Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow-sm space-y-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-2 border-b pb-2">Register New Asset</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Name*</label>
                            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Test Laptop" /></div>
                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Purchase Date*</label>
                            <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} required /></div>
                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Purchase Cost*</label>
                            <input type="number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.purchaseCost} onChange={e => setFormData({ ...formData, purchaseCost: Number(e.target.value) })} required /></div>

                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Salvage Value</label>
                            <input type="number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.salvageValue} onChange={e => setFormData({ ...formData, salvageValue: Number(e.target.value) })} /></div>
                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Useful Life (months)</label>
                            <input type="number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.usefulLifeMonths} onChange={e => setFormData({ ...formData, usefulLifeMonths: Number(e.target.value) })} /></div>
                        <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Method</label>
                            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.depreciationMethod} onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value as any })}>
                                <option value="STRAIGHT_LINE">Straight Line</option>
                                <option value="DECLINING_BALANCE">Declining Balance</option>
                            </select></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-4 border border-gray-200 rounded-md">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Asset GL Account*</label>
                            <AccountSelector
                                value={formData.assetAccountCode}
                                onChange={(code) => setFormData({ ...formData, assetAccountCode: code })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Depreciation Expense GL*</label>
                            <AccountSelector
                                value={formData.depreciationExpenseCode}
                                onChange={(code) => setFormData({ ...formData, depreciationExpenseCode: code })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1 block">Accumulated Dep. GL*</label>
                            <AccountSelector
                                value={formData.accumulatedDepreciationCode}
                                onChange={(code) => setFormData({ ...formData, accumulatedDepreciationCode: code })}
                            />
                        </div>
                    </div>

                    <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
                        <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>

                    <div className="pt-2">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm">Save Asset</button>
                    </div>
                </form>
            )}

            {/* Depreciation Run */}
            <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold mb-3">Run Monthly Depreciation</h3>
                <div className="flex items-center gap-4">
                    <input type="date" className="border rounded px-3 py-2 text-sm" value={depDate} onChange={e => setDepDate(e.target.value)} />
                    <button onClick={handleRunDepreciation} disabled={runningDep} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm disabled:opacity-50">
                        {runningDep ? 'Running...' : 'Run Depreciation'}
                    </button>
                </div>
                {depResult && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded p-3 text-sm">
                        <p><strong>Voucher:</strong> {depResult.voucherNumber} | <strong>Assets:</strong> {depResult.assetsProcessed} | <strong>Total:</strong> PKR {depResult.totalDepreciation.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* Asset Register Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">Code</th>
                            <th className="px-4 py-3 text-left font-medium">Name</th>
                            <th className="px-4 py-3 text-left font-medium">Method</th>
                            <th className="px-4 py-3 text-right font-medium">Cost</th>
                            <th className="px-4 py-3 text-right font-medium">Accum. Dep.</th>
                            <th className="px-4 py-3 text-right font-medium">Net Book Value</th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                        ) : assets.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No fixed assets registered</td></tr>
                        ) : assets.map(a => (
                            <tr key={a.id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3 font-mono text-xs">{a.assetCode}</td>
                                <td className="px-4 py-3">{a.name}</td>
                                <td className="px-4 py-3 text-xs">{a.depreciationMethod === 'STRAIGHT_LINE' ? 'SL' : 'DB'}</td>
                                <td className="px-4 py-3 text-right font-mono">{Number(a.purchaseCost).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-mono">{Number(a.accumulatedDepreciation).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold">{Number(a.netBookValue).toLocaleString()}</td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(a.status)}`}>{a.status.replace('_', ' ')}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FixedAssetsPage;
