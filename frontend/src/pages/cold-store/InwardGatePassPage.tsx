import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    coldStoreService,
    GatePassStatus,
    BillingUnitType,
} from '../../services/coldStoreService';
import type { InwardGatePass, CreateInwardGatePassDto } from '../../services/coldStoreService';
import { customersService } from '../../services/customers';

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-PK') : '—');

const statusColors: Record<GatePassStatus, string> = {
    [GatePassStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [GatePassStatus.APPROVED]: 'bg-green-100 text-green-800',
    [GatePassStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

const InwardGatePassPage = () => {
    const navigate = useNavigate();
    const [passes, setPasses] = useState<InwardGatePass[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<CreateInwardGatePassDto>({
        customerId: '',
        commodity: '',
        variety: '',
        vehicleNumber: '',
        driverName: '',
        bagsReceived: 0,
        grossWeightKg: 0,
        tareWeightKg: 0,
        inwardDate: new Date().toISOString().split('T')[0],
        billingUnit: BillingUnitType.PER_BAG,
        ratePerBagPerSeason: undefined,
        ratePerKgPerDay: undefined,
        notes: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [passesData, customersData] = await Promise.all([
                coldStoreService.getInwardGatePasses(),
                customersService.getCustomers(),
            ]);
            setPasses(passesData);
            setCustomers(customersData.data || customersData);
        } catch (e: any) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await coldStoreService.createInwardGatePass(form);
            toast.success('Inward Gate Pass created');
            setShowForm(false);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to create gate pass');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: string, gpNumber: string) => {
        if (!confirm(`Approve ${gpNumber}? This will create a lot and start billing.`)) return;
        try {
            await coldStoreService.approveInwardGatePass(id);
            toast.success(`${gpNumber} approved — Lot created`);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Approval failed');
        }
    };

    const handleCancel = async (id: string, gpNumber: string) => {
        if (!confirm(`Cancel ${gpNumber}?`)) return;
        try {
            await coldStoreService.cancelInwardGatePass(id);
            toast.success(`${gpNumber} cancelled`);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Cancel failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Inward Gate Passes</h1>
                    <p className="text-sm text-muted-foreground mt-1">Record incoming commodity trucks</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                >
                    {showForm ? 'Cancel' : '+ New Inward GPI'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="border rounded-lg p-6 bg-card space-y-4">
                    <h2 className="font-semibold text-lg">New Inward Gate Pass</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Customer *</label>
                            <select
                                required
                                value={form.customerId}
                                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            >
                                <option value="">Select customer...</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Commodity *</label>
                            <input
                                required
                                value={form.commodity}
                                onChange={(e) => setForm({ ...form, commodity: e.target.value })}
                                placeholder="e.g. Wheat, Rice, Potato"
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Variety</label>
                            <input
                                value={form.variety}
                                onChange={(e) => setForm({ ...form, variety: e.target.value })}
                                placeholder="e.g. Basmati, Irri-6"
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Vehicle #</label>
                            <input
                                value={form.vehicleNumber}
                                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                                placeholder="e.g. LHR-1234"
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Driver Name</label>
                            <input
                                value={form.driverName}
                                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Inward Date *</label>
                            <input
                                required
                                type="date"
                                value={form.inwardDate}
                                onChange={(e) => setForm({ ...form, inwardDate: e.target.value })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Bags Received *</label>
                            <input
                                required
                                type="number"
                                min={1}
                                value={form.bagsReceived || ''}
                                onChange={(e) => setForm({ ...form, bagsReceived: Number(e.target.value) })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Gross Weight (kg) *</label>
                            <input
                                required
                                type="number"
                                step="0.001"
                                min={0}
                                value={form.grossWeightKg || ''}
                                onChange={(e) => setForm({ ...form, grossWeightKg: Number(e.target.value) })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Tare Weight (kg) *</label>
                            <input
                                required
                                type="number"
                                step="0.001"
                                min={0}
                                value={form.tareWeightKg || ''}
                                onChange={(e) => setForm({ ...form, tareWeightKg: Number(e.target.value) })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Billing Unit *</label>
                            <select
                                value={form.billingUnit}
                                onChange={(e) => setForm({ ...form, billingUnit: e.target.value as BillingUnitType })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            >
                                <option value={BillingUnitType.PER_BAG}>Per Bag (Seasonal)</option>
                                <option value={BillingUnitType.PER_KG}>Per KG / Day</option>
                            </select>
                        </div>
                        {form.billingUnit === BillingUnitType.PER_BAG && (
                            <div>
                                <label className="text-sm font-medium">Rate per Bag (PKR) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={form.ratePerBagPerSeason || ''}
                                    onChange={(e) => setForm({ ...form, ratePerBagPerSeason: Number(e.target.value) })}
                                    className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                                />
                            </div>
                        )}
                        {form.billingUnit === BillingUnitType.PER_KG && (
                            <div>
                                <label className="text-sm font-medium">Rate per KG/Day (PKR) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.0001"
                                    min={0}
                                    value={form.ratePerKgPerDay || ''}
                                    onChange={(e) => setForm({ ...form, ratePerKgPerDay: Number(e.target.value) })}
                                    className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                                />
                            </div>
                        )}
                        <div className="md:col-span-3">
                            <label className="text-sm font-medium">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Gate Pass'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 border rounded-md text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="border rounded-lg bg-card overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : passes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No inward gate passes found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">GPI #</th>
                                <th className="text-left p-3 font-medium">Customer</th>
                                <th className="text-left p-3 font-medium">Commodity</th>
                                <th className="text-left p-3 font-medium">Bags</th>
                                <th className="text-left p-3 font-medium">Net Wt (kg)</th>
                                <th className="text-left p-3 font-medium">Billing</th>
                                <th className="text-left p-3 font-medium">Date</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-right p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {passes.map((gp) => (
                                <tr key={gp.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 font-mono font-medium">{gp.gatePassNumber}</td>
                                    <td className="p-3">{gp.customer?.name || '—'}</td>
                                    <td className="p-3">{gp.commodity}</td>
                                    <td className="p-3">{gp.bagsReceived}</td>
                                    <td className="p-3">{Number(gp.netWeightKg).toLocaleString()}</td>
                                    <td className="p-3 text-xs">
                                        {gp.billingUnit === BillingUnitType.PER_BAG
                                            ? `PKR ${gp.ratePerBagPerSeason}/bag`
                                            : `PKR ${gp.ratePerKgPerDay}/kg/day`}
                                    </td>
                                    <td className="p-3">{formatDate(gp.inwardDate)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[gp.status]}`}>
                                            {gp.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right space-x-1">
                                        {gp.status === GatePassStatus.DRAFT && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(gp.id, gp.gatePassNumber)}
                                                    className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(gp.id, gp.gatePassNumber)}
                                                    className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                        {gp.lot && (
                                            <span className="text-xs text-blue-600">→ {gp.lot.lotNumber}</span>
                                        )}
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

export default InwardGatePassPage;
