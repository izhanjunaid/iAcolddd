import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { purchaseOrdersService, PurchaseOrderStatus } from '../../services/purchaseOrdersService';
import type { PurchaseOrder } from '../../services/purchaseOrdersService';

const PurchaseOrdersList = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadOrders();
    }, [page]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await purchaseOrdersService.getPurchaseOrders({ page, limit: 10 });
            setOrders(data.items);
            setTotalPages(data.totalPages);
        } catch (error: any) {
            console.error('Failed to load purchase orders:', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (status: PurchaseOrderStatus) => {
        const colors: Record<PurchaseOrderStatus, string> = {
            [PurchaseOrderStatus.DRAFT]: 'bg-gray-100 text-gray-800',
            [PurchaseOrderStatus.ISSUED]: 'bg-blue-100 text-blue-800',
            [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'bg-orange-100 text-orange-800',
            [PurchaseOrderStatus.RECEIVED]: 'bg-yellow-100 text-yellow-800',
            [PurchaseOrderStatus.CLOSED]: 'bg-green-100 text-green-800',
            [PurchaseOrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100';
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Purchase Orders</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage procurement and orders</p>
                    </div>
                    <Link to="/procurement/purchase-orders/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        + New Purchase Order
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="border rounded-lg bg-card">
                    {loading ? (
                        <div className="p-8 text-center">Loading...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No purchase orders found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="text-left p-4 font-medium">PO #</th>
                                        <th className="text-left p-4 font-medium">Vendor</th>
                                        <th className="text-left p-4 font-medium">Order Date</th>
                                        <th className="text-left p-4 font-medium">Delivery Date</th>
                                        <th className="text-left p-4 font-medium">Amount</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-right p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((po) => (
                                        <tr key={po.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4 font-medium">{po.poNumber}</td>
                                            <td className="p-4">{po.vendor?.name || po.vendorId}</td>
                                            <td className="p-4">{formatDate(po.orderDate)}</td>
                                            <td className="p-4">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</td>
                                            <td className="p-4 font-bold">{formatCurrency(Number(po.totalAmount))}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(po.status)}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link
                                                    to={`/procurement/purchase-orders/${po.id}`}
                                                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Simple Pagination */}
                            <div className="p-4 flex justify-between items-center border-t">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm">Page {page} of {totalPages}</span>
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

export default PurchaseOrdersList;
