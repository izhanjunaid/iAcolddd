import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { purchaseOrdersService, PurchaseOrderStatus } from '../../services/purchaseOrdersService';
import type { PurchaseOrder } from '../../services/purchaseOrdersService';

const PurchaseOrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) loadPO(id);
    }, [id]);

    const loadPO = async (poId: string) => {
        try {
            setLoading(true);
            const data = await purchaseOrdersService.getPurchaseOrder(poId);
            setPo(data);
        } catch (error: any) {
            console.error('Failed to load PO:', error);
            toast.error('Failed to load purchase order details');
        } finally {
            setLoading(false);
        }
    };

    const handleIssuePO = async () => {
        if (!po) return;
        try {
            setProcessing(true);
            await purchaseOrdersService.updateStatus(po.id, PurchaseOrderStatus.ISSUED);
            toast.success('Purchase Order Issued successfully');
            loadPO(po.id); // Reload to update status
        } catch (error: any) {
            console.error('Failed to issue PO:', error);
            toast.error(error.response?.data?.message || 'Failed to issue Purchase Order');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!po) return <div className="p-8 text-center text-muted-foreground">Purchase Order not found</div>;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${po.status === PurchaseOrderStatus.ISSUED ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                po.status === PurchaseOrderStatus.DRAFT ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                    'bg-gray-100'
                                }`}>
                                {po.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Vendor: <span className="font-medium text-foreground">{po.vendor?.name}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/purchase-orders" className="px-4 py-2 border rounded hover:bg-muted">
                            Back to List
                        </Link>
                        {po.status === PurchaseOrderStatus.DRAFT && (
                            <button
                                onClick={handleIssuePO}
                                disabled={processing}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                            >
                                {processing ? 'Issuing...' : 'Issue PO'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Header Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 border rounded bg-card">
                        <div className="text-sm text-muted-foreground">Order Date</div>
                        <div className="font-medium">{formatDate(po.orderDate)}</div>
                    </div>
                    <div className="p-4 border rounded bg-card">
                        <div className="text-sm text-muted-foreground">Expected Delivery</div>
                        <div className="font-medium">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</div>
                    </div>
                    <div className="p-4 border rounded bg-card">
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="text-xl font-bold text-primary">{formatCurrency(po.totalAmount)}</div>
                    </div>
                </div>

                {/* Items */}
                <div className="border rounded-lg bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b font-medium bg-muted/50">Order Items</div>
                    <table className="w-full">
                        <thead className="bg-muted/20 border-b">
                            <tr>
                                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Item</th>
                                <th className="text-center p-4 font-medium text-muted-foreground text-sm">Quantity</th>
                                <th className="text-right p-4 font-medium text-muted-foreground text-sm">Unit Price</th>
                                <th className="text-right p-4 font-medium text-muted-foreground text-sm">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item) => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                                    <td className="p-4">
                                        <div className="font-medium">{item.item?.name || item.description}</div>
                                        {item.item?.sku && <div className="text-xs text-muted-foreground">{item.item.sku}</div>}
                                    </td>
                                    <td className="p-4 text-center">{item.quantity}</td>
                                    <td className="p-4 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="p-4 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-muted/20 border-t">
                            <tr>
                                <td colSpan={3} className="p-4 text-right font-bold">Grand Total:</td>
                                <td className="p-4 text-right font-bold text-lg">{formatCurrency(po.totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Notes */}
                {po.notes && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-2">Notes</h3>
                        <div className="p-4 border rounded bg-muted/20 text-sm whitespace-pre-wrap">
                            {po.notes}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PurchaseOrderDetail;
