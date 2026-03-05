import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import goodsReceiptNotesService from '../../services/goodsReceiptNotesService';
import { purchaseOrdersService } from '../../services/purchaseOrdersService';
import inventoryService from '../../services/inventory';
import type { CreateGoodsReceiptNoteItemDto } from '../../types/goods-receipt-note';
import type { Warehouse } from '../../types/inventory';

interface POForSelect {
    id: string;
    poNumber: string;
    vendorName: string;
    status: string;
    items: {
        id: string;
        itemId: string;
        description: string;
        quantity: number;
        unitPrice: number;
        item?: { id: string; name: string; sku: string };
    }[];
}

interface GrnLineItem extends CreateGoodsReceiptNoteItemDto {
    itemName: string;
    sku: string;
    warehouseId: string; // Make mandatory in UI
}

const CreateGoodsReceiptNote = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState<POForSelect[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedPOId, setSelectedPOId] = useState('');
    const [receiptDate, setReceiptDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState<GrnLineItem[]>([]);

    // Load available warehouses
    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const data = await inventoryService.warehouses.getWarehouses();
                setWarehouses(data);
            } catch (error) {
                console.error('CreateGRN: Failed to load warehouses:', error);
                toast.error('Failed to load warehouses');
            }
        };
        loadWarehouses();
    }, []);

    // Load eligible POs (ISSUED or PARTIALLY_RECEIVED)
    useEffect(() => {
        const loadPOs = async () => {
            try {
                setLoading(true);
                console.log('CreateGRN: loading eligible POs...');
                // Load ISSUED POs
                const issuedData = await purchaseOrdersService.getPurchaseOrders({
                    limit: 100,
                    status: 'ISSUED' as any,
                });
                // Load PARTIALLY_RECEIVED POs
                const partialData = await purchaseOrdersService.getPurchaseOrders({
                    limit: 100,
                    status: 'PARTIALLY_RECEIVED' as any,
                });

                const issuedItems = Array.isArray(issuedData?.items) ? issuedData.items : [];
                const partialItems = Array.isArray(partialData?.items) ? partialData.items : [];
                const allPOs = [...issuedItems, ...partialItems];

                // For each PO, load details with items
                const detailedPOs: POForSelect[] = [];
                for (const po of allPOs) {
                    try {
                        const detail = await purchaseOrdersService.getPurchaseOrder(po.id);
                        detailedPOs.push({
                            id: detail.id,
                            poNumber: detail.poNumber,
                            vendorName: detail.vendor?.name || 'Unknown Vendor',
                            status: detail.status,
                            items: (detail.items || []).map((item: any) => ({
                                id: item.id,
                                itemId: item.itemId || item.item?.id,
                                description: item.description || item.item?.name || '',
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                item: item.item,
                            })),
                        });
                    } catch {
                        // Skip PO if detail load fails
                    }
                }

                console.log('CreateGRN: loaded', detailedPOs.length, 'eligible POs');
                setPurchaseOrders(detailedPOs);
            } catch (error) {
                console.error('CreateGRN: Failed to load POs:', error);
                toast.error('Failed to load purchase orders');
            } finally {
                setLoading(false);
            }
        };
        loadPOs();
    }, []);

    // When a PO is selected, populate line items
    const handlePOSelect = (poId: string) => {
        setSelectedPOId(poId);
        if (!poId) {
            setLineItems([]);
            return;
        }

        const po = purchaseOrders.find((p) => p.id === poId);
        if (!po) return;

        // Default to first warehouse if available
        const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : '';

        const items: GrnLineItem[] = po.items.map((poItem) => ({
            purchaseOrderItemId: poItem.id,
            itemId: poItem.itemId,
            description: poItem.description,
            orderedQuantity: Number(poItem.quantity),
            receivedQuantity: Number(poItem.quantity), // Default: receive full ordered qty
            unitPrice: Number(poItem.unitPrice),
            itemName: poItem.item?.name || poItem.description,
            sku: poItem.item?.sku || '',
            warehouseId: defaultWarehouseId,
        }));

        setLineItems(items);
    };

    const updateLineItem = (index: number, field: keyof GrnLineItem, value: any) => {
        setLineItems((prev) => {
            const updated = [...prev];
            (updated[index] as any)[field] = value;
            return updated;
        });
    };

    const calculateTotal = () =>
        lineItems.reduce((sum, item) => sum + item.receivedQuantity * item.unitPrice, 0);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 2,
        }).format(amount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPOId) {
            toast.error('Please select a Purchase Order');
            return;
        }
        if (lineItems.length === 0) {
            toast.error('No items to receive');
            return;
        }
        // Filter out items with 0 received qty
        const itemsToReceive = lineItems.filter((item) => item.receivedQuantity > 0);
        if (itemsToReceive.length === 0) {
            toast.error('Please enter received quantities for at least one item');
            return;
        }

        // Validate warehouse selection
        const missingWarehouse = itemsToReceive.some(item => !item.warehouseId);
        if (missingWarehouse) {
            toast.error('Please select a warehouse for all items');
            return;
        }

        try {
            setSubmitting(true);
            await goodsReceiptNotesService.create({
                purchaseOrderId: selectedPOId,
                receiptDate,
                notes: notes || undefined,
                items: itemsToReceive.map((item) => ({
                    purchaseOrderItemId: item.purchaseOrderItemId,
                    itemId: item.itemId,
                    description: item.description,
                    orderedQuantity: item.orderedQuantity,
                    receivedQuantity: item.receivedQuantity,
                    unitPrice: item.unitPrice,
                    warehouseId: item.warehouseId,
                    roomId: item.roomId,
                    lotNumber: item.lotNumber,
                    expiryDate: item.expiryDate,
                })),
            });
            toast.success('Goods Receipt Note created successfully');
            navigate('/procurement/goods-receipts');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create GRN');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading purchase orders...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">Create Goods Receipt Note</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Record goods received against a purchase order
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <form onSubmit={handleSubmit}>
                    {/* GRN Details */}
                    <div className="border rounded-lg bg-card p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Receipt Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Purchase Order *
                                </label>
                                <select
                                    value={selectedPOId}
                                    onChange={(e) => handlePOSelect(e.target.value)}
                                    className="w-full border rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select a PO...</option>
                                    {purchaseOrders.map((po) => (
                                        <option key={po.id} value={po.id}>
                                            {po.poNumber} — {po.vendorName} ({po.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Receipt Date *
                                </label>
                                <input
                                    type="date"
                                    value={receiptDate}
                                    onChange={(e) => setReceiptDate(e.target.value)}
                                    className="w-full border rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Vendor
                                </label>
                                <input
                                    type="text"
                                    value={
                                        purchaseOrders.find((p) => p.id === selectedPOId)
                                            ?.vendorName || '-'
                                    }
                                    className="w-full border rounded-md px-3 py-2 bg-gray-50"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                                rows={2}
                                placeholder="Any notes about this receipt..."
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="border rounded-lg bg-card p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Items to Receive</h2>
                        {lineItems.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                Select a Purchase Order to populate items
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-medium">Item</th>
                                            <th className="text-left p-3 font-medium">
                                                Description
                                            </th>
                                            <th className="text-left p-3 font-medium">
                                                Warehouse
                                            </th>
                                            <th className="text-center p-3 font-medium">
                                                Ordered Qty
                                            </th>
                                            <th className="text-center p-3 font-medium">
                                                Received Qty
                                            </th>
                                            <th className="text-center p-3 font-medium">
                                                Unit Price
                                            </th>
                                            <th className="text-right p-3 font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map((item, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="p-3">
                                                    <div className="font-medium">
                                                        {item.itemName}
                                                    </div>
                                                    {item.sku && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.sku}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {item.description}
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        value={item.warehouseId}
                                                        onChange={(e) =>
                                                            updateLineItem(
                                                                idx,
                                                                'warehouseId',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full border rounded px-2 py-1"
                                                        required
                                                    >
                                                        <option value="">Select Warehouse...</option>
                                                        {warehouses.map((w) => (
                                                            <option key={w.id} value={w.id}>
                                                                {w.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-center font-medium">
                                                    {item.orderedQuantity}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        max={item.orderedQuantity}
                                                        value={item.receivedQuantity}
                                                        onChange={(e) =>
                                                            updateLineItem(
                                                                idx,
                                                                'receivedQuantity',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-24 border rounded px-2 py-1 text-center"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    {formatCurrency(item.unitPrice)}
                                                </td>
                                                <td className="p-3 text-right font-bold">
                                                    {formatCurrency(
                                                        item.receivedQuantity * item.unitPrice
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2">
                                            <td colSpan={6} className="p-3 text-right font-semibold">
                                                Grand Total:
                                            </td>
                                            <td className="p-3 text-right font-bold text-lg">
                                                {formatCurrency(calculateTotal())}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/procurement/goods-receipts')}
                            className="px-6 py-2 border rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || lineItems.length === 0}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create GRN'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CreateGoodsReceiptNote;
