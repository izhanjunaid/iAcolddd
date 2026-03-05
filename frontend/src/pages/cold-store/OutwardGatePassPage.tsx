import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    coldStoreService,
    GatePassStatus,
    ColdStoreLotStatus,
} from '../../services/coldStoreService';
import type { OutwardGatePass, ColdStoreLot, CreateOutwardGatePassDto } from '../../services/coldStoreService';

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-PK') : '—');
const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const statusColors: Record<GatePassStatus, string> = {
    [GatePassStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [GatePassStatus.APPROVED]: 'bg-green-100 text-green-800',
    [GatePassStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

const OutwardGatePassPage = () => {
    const [searchParams] = useSearchParams();
    const prefillLotId = searchParams.get('lotId') || '';

    const [passes, setPasses] = useState<OutwardGatePass[]>([]);
    const [lots, setLots] = useState<ColdStoreLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(!!prefillLotId);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<CreateOutwardGatePassDto>({
        lotId: prefillLotId,
        vehicleNumber: '',
        driverName: '',
        bagsReleased: 0,
        grossWeightKg: 0,
        tareWeightKg: 0,
        outwardDate: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const selectedLot = lots.find((l) => l.id === form.lotId);
    const bagsBalance = selectedLot ? selectedLot.bagsIn - selectedLot.bagsOut : 0;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [passesData, inStorageLots, partialLots] = await Promise.all([
                coldStoreService.getOutwardGatePasses(),
                coldStoreService.getLots({ status: ColdStoreLotStatus.IN_STORAGE }),
                coldStoreService.getLots({ status: ColdStoreLotStatus.PARTIALLY_RELEASED }),
            ]);
            setPasses(passesData);
            setLots([...inStorageLots, ...partialLots]);
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
            await coldStoreService.createOutwardGatePass(form);
            toast.success('Outward Gate Pass created');
            setShowForm(false);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to create gate pass');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: string, gpNumber: string) => {
        if (!confirm(`Approve ${gpNumber}? This will close the billing cycle and generate an invoice.`)) return;
        try {
            await coldStoreService.approveOutwardGatePass(id);
            toast.success(`${gpNumber} approved — Invoice generated`);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Approval failed');
        }
    };

    const handleCancel = async (id: string, gpNumber: string) => {
        if (!confirm(`Cancel ${gpNumber}?`)) return;
        try {
            await coldStoreService.cancelOutwardGatePass(id);
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
                    <h1 className="text-2xl font-bold">Outward Gate Passes</h1>
                    <p className="text-sm text-muted-foreground mt-1">Release commodities and generate rental invoices</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                >
                    {showForm ? 'Cancel' : '+ New Outward GPO'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="border rounded-lg p-6 bg-card space-y-4">
                    <h2 className="font-semibold text-lg">New Outward Gate Pass</h2>

                    {selectedLot && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong>Lot:</strong> {selectedLot.lotNumber} | {selectedLot.commodity}
                            {selectedLot.variety ? ` (${selectedLot.variety})` : ''} |{' '}
                            <strong>Balance:</strong> {bagsBalance} bags | {Number(selectedLot.netWeightKg).toLocaleString()} kg
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Select Lot *</label>
                            <select
                                required
                                value={form.lotId}
                                onChange={(e) => setForm({ ...form, lotId: e.target.value })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            >
                                <option value="">Select lot...</option>
                                {lots.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.lotNumber} — {l.commodity} ({l.bagsIn - l.bagsOut} bags left)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Vehicle #</label>
                            <input
                                value={form.vehicleNumber}
                                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                                placeholder="e.g. LHR-5678"
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
                            <label className="text-sm font-medium">Bags Released *</label>
                            <input
                                required
                                type="number"
                                min={1}
                                max={bagsBalance || undefined}
                                value={form.bagsReleased || ''}
                                onChange={(e) => setForm({ ...form, bagsReleased: Number(e.target.value) })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                            {selectedLot && <p className="text-xs text-muted-foreground mt-1">Max: {bagsBalance} bags</p>}
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
                            <label className="text-sm font-medium">Outward Date *</label>
                            <input
                                required
                                type="date"
                                value={form.outwardDate}
                                onChange={(e) => setForm({ ...form, outwardDate: e.target.value })}
                                className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                            />
                        </div>
                        <div className="md:col-span-2">
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
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md text-sm">
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
                    <div className="p-8 text-center text-muted-foreground">No outward gate passes found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">GPO #</th>
                                <th className="text-left p-3 font-medium">Lot</th>
                                <th className="text-left p-3 font-medium">Customer</th>
                                <th className="text-left p-3 font-medium">Bags Released</th>
                                <th className="text-left p-3 font-medium">Net Wt (kg)</th>
                                <th className="text-left p-3 font-medium">Outward Date</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-right p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {passes.map((gp) => (
                                <tr key={gp.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 font-mono font-medium">{gp.gatePassNumber}</td>
                                    <td className="p-3 font-mono text-xs">{gp.lot?.lotNumber || '—'}</td>
                                    <td className="p-3">{gp.customer?.name || '—'}</td>
                                    <td className="p-3">{gp.bagsReleased}</td>
                                    <td className="p-3">{Number(gp.netWeightKg).toLocaleString()}</td>
                                    <td className="p-3">{formatDate(gp.outwardDate)}</td>
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
                                                    Approve & Invoice
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(gp.id, gp.gatePassNumber)}
                                                    className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                        {gp.invoiceId && (
                                            <span className="text-xs text-green-600">✓ Invoiced</span>
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

export default OutwardGatePassPage;
