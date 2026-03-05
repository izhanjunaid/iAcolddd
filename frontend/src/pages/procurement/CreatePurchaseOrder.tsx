import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { purchaseOrdersService } from '../../services/purchaseOrdersService';
import type { CreatePurchaseOrderDto, CreatePurchaseOrderItemDto } from '../../services/purchaseOrdersService';
import { vendorsService } from '../../services/vendorsService';
import { inventoryService } from '../../services/inventory';
import type { Vendor } from '../../types/vendor';
import type { InventoryItem } from '../../types/inventory';

const CreatePurchaseOrder = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        vendorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notes: '',
    });

    const [lineItems, setLineItems] = useState([
        { id: Date.now(), itemId: '', quantity: 1, unitPrice: 0, description: '', total: 0 }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            console.log('CreatePO: loading vendors and items...');
            const [vendorsData, itemsData] = await Promise.all([
                vendorsService.getVendors(),
                inventoryService.items.getItems({ limit: 100 })
            ]);
            console.log('CreatePO: vendorsData type:', typeof vendorsData, Array.isArray(vendorsData));
            console.log('CreatePO: itemsData:', typeof itemsData, itemsData ? Object.keys(itemsData) : 'null');

            // Defensive: handle both array and object responses
            const vendorArray = Array.isArray(vendorsData) ? vendorsData : [];
            // Backend returns { items, total, ... } not { data, total, ... }
            const itemsArray = Array.isArray(itemsData?.data)
                ? itemsData.data
                : Array.isArray((itemsData as any)?.items)
                    ? (itemsData as any).items
                    : Array.isArray(itemsData) ? itemsData : [];

            console.log('CreatePO: setting vendors:', vendorArray.length, 'items:', itemsArray.length);
            setVendors(vendorArray);
            setItems(itemsArray);
        } catch (error) {
            console.error('CreatePO: Failed to load initial data:', error);
            toast.error('Failed to load vendors or items');
        } finally {
            setLoading(false);
        }
    };

    const handleLineItemChange = (id: number, field: string, value: any) => {
        setLineItems(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };

                // Auto-fill description and price if item selected
                if (field === 'itemId') {
                    const selectedInventoryItem = items.find(i => i.id === value);
                    if (selectedInventoryItem) {
                        updatedItem.description = selectedInventoryItem.name;
                        updatedItem.unitPrice = selectedInventoryItem.standardCost || 0;
                    }
                }

                // Recalculate total
                if (field === 'quantity' || field === 'unitPrice' || field === 'itemId') {
                    updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
                }

                return updatedItem;
            }
            return item;
        }));
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { id: Date.now(), itemId: '', quantity: 1, unitPrice: 0, description: '', total: 0 }]);
    };

    const removeLineItem = (id: number) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        } else {
            toast.error('At least one item is required');
        }
    };

    const calculateGrandTotal = () => {
        return lineItems.reduce((sum, item) => sum + item.total, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vendorId) {
            toast.error('Please select a vendor');
            return;
        }

        const validItems = lineItems.filter(item => item.itemId && item.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Please add at least one valid item');
            return;
        }

        try {
            setSubmitting(true);
            const payload: CreatePurchaseOrderDto = {
                vendorId: formData.vendorId,
                orderDate: formData.orderDate,
                expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
                notes: formData.notes,
                items: validItems.map(item => ({
                    itemId: item.itemId,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    description: item.description
                }))
            };

            await purchaseOrdersService.createPurchaseOrder(payload);
            toast.success('Purchase Order created successfully');
            navigate('/procurement/purchase-orders');
        } catch (error: any) {
            console.error('Failed to create PO:', error);
            toast.error(error.response?.data?.message || 'Failed to create Purchase Order');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <header className="border-b bg-white">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">Create Purchase Order</h1>
                    <p className="text-sm text-muted-foreground mt-1">Raise a new PO for a vendor</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Header Section */}
                    <div className="bg-card border rounded-lg p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Vendor *</label>
                                <select
                                    required
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={formData.vendorId}
                                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Order Date *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={formData.orderDate}
                                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    value={formData.expectedDeliveryDate}
                                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4">
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any internal notes or instructions..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="bg-card border rounded-lg p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Line Items</h2>
                            <button
                                type="button"
                                onClick={addLineItem}
                                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80"
                            >
                                + Add Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-left p-3 font-medium w-1/3">Item</th>
                                        <th className="text-left p-3 font-medium">Description</th>
                                        <th className="text-right p-3 font-medium w-24">Qty</th>
                                        <th className="text-right p-3 font-medium w-32">Unit Price</th>
                                        <th className="text-right p-3 font-medium w-32">Total</th>
                                        <th className="p-3 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {lineItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-muted/30">
                                            <td className="p-3">
                                                <select
                                                    required
                                                    className="w-full border rounded px-2 py-1"
                                                    value={item.itemId}
                                                    onChange={(e) => handleLineItemChange(item.id, 'itemId', e.target.value)}
                                                >
                                                    <option value="">Select Item</option>
                                                    {items.map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className="w-full border rounded px-2 py-1"
                                                    value={item.description}
                                                    onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                                                    placeholder="Description"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                    className="w-full border rounded px-2 py-1 text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    className="w-full border rounded px-2 py-1 text-right"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(item.total)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeLineItem(item.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Remove Item"
                                                >
                                                    &times;
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-muted/50 border-t font-bold">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right">Grand Total:</td>
                                        <td className="p-3 text-right">
                                            {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(calculateGrandTotal())}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/procurement/purchase-orders')}
                            className="px-6 py-2 border rounded-md hover:bg-accent"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                            disabled={submitting}
                        >
                            {submitting ? 'Creating...' : 'Create Purchase Order'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CreatePurchaseOrder;
