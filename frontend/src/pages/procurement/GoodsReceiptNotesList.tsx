import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import goodsReceiptNotesService from '../../services/goodsReceiptNotesService';
import type { GoodsReceiptNote } from '../../types/goods-receipt-note';

const GoodsReceiptNotesList = () => {
    const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadGrns();
    }, [page]);

    const loadGrns = async () => {
        try {
            setLoading(true);
            const data = await goodsReceiptNotesService.getAll({ page, limit: 10 });
            setGrns(data.items);
            setTotalPages(data.totalPages);
        } catch (error: any) {
            console.error('Failed to load GRNs:', error);
            toast.error('Failed to load goods receipt notes');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Complete this GRN? This will update inventory balances.')) return;
        try {
            await goodsReceiptNotesService.complete(id);
            toast.success('GRN completed — inventory updated');
            loadGrns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to complete GRN');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this GRN?')) return;
        try {
            await goodsReceiptNotesService.cancel(id);
            toast.success('GRN cancelled');
            loadGrns();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to cancel GRN');
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString();

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DRAFT: 'bg-gray-100 text-gray-800',
            COMPLETED: 'bg-green-100 text-green-800',
            CANCELLED: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100';
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Goods Receipt Notes</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Record goods received against purchase orders
                        </p>
                    </div>
                    <Link
                        to="/procurement/goods-receipts/create"
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        + New GRN
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="border rounded-lg bg-card">
                    {loading ? (
                        <div className="p-8 text-center">Loading...</div>
                    ) : grns.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No goods receipt notes found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="text-left p-4 font-medium">GRN #</th>
                                        <th className="text-left p-4 font-medium">PO #</th>
                                        <th className="text-left p-4 font-medium">Vendor</th>
                                        <th className="text-left p-4 font-medium">Receipt Date</th>
                                        <th className="text-left p-4 font-medium">Amount</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-right p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grns.map((grn) => (
                                        <tr key={grn.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4 font-medium">{grn.grnNumber}</td>
                                            <td className="p-4">{grn.purchaseOrder?.poNumber || '-'}</td>
                                            <td className="p-4">{grn.vendor?.name || grn.vendorId}</td>
                                            <td className="p-4">{formatDate(grn.receiptDate)}</td>
                                            <td className="p-4 font-bold">
                                                {formatCurrency(Number(grn.totalAmount))}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(grn.status)}`}
                                                >
                                                    {grn.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                {grn.status === 'DRAFT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleComplete(grn.id)}
                                                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                        >
                                                            Complete
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(grn.id)}
                                                            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            <div className="p-4 flex justify-between items-center border-t">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default GoodsReceiptNotesList;
