import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { payablesService, type ApBill } from '../../services/payablesService';

const BillsList = () => {
    const [bills, setBills] = useState<ApBill[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState<ApBill | null>(null);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        referenceNumber: '',
    });
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        loadBills();
    }, []);

    const loadBills = async () => {
        try {
            setLoading(true);
            const data = await payablesService.getBills();
            setBills(data);
        } catch (error: any) {
            console.error('Failed to load bills:', error);
            toast.error('Failed to load bills');
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

    const getStatusColor = (status: string) => {
        const colors: any = {
            DRAFT: 'bg-gray-100 text-gray-800',
            POSTED: 'bg-blue-100 text-blue-800',
            PAID: 'bg-green-100 text-green-800',
            PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
            CANCELLED: 'bg-gray-100 text-gray-600',
        };
        return colors[status] || 'bg-gray-100';
    };

    const openPaymentModal = (bill: ApBill) => {
        setSelectedBill(bill);
        setPaymentData({
            amount: bill.balanceDue,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'CASH',
            referenceNumber: '',
        });
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async () => {
        if (!selectedBill) return;
        if (paymentData.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        if (paymentData.amount > selectedBill.balanceDue) {
            toast.error('Amount cannot exceed balance due');
            return;
        }

        try {
            setProcessingPayment(true);
            await payablesService.recordPayment({
                vendorId: selectedBill.vendorId,
                amount: Number(paymentData.amount),
                paymentDate: new Date(paymentData.paymentDate),
                paymentMethod: paymentData.paymentMethod as any,
                referenceNumber: paymentData.referenceNumber,
                applications: [{
                    billId: selectedBill.id,
                    amountApplied: Number(paymentData.amount)
                }]
            });
            toast.success('Payment recorded successfully');
            setShowPaymentModal(false);
            setSelectedBill(null);
            loadBills();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Supplier Bills</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage accounts payable</p>
                    </div>
                    <Link to="/payables/bills/create" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        + Record Bill
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="border rounded-lg bg-card">
                    {loading ? (
                        <div className="p-8 text-center">Loading...</div>
                    ) : bills.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No bills records found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Bill #</th>
                                        <th className="text-left p-4 font-medium">Vendor</th>
                                        <th className="text-left p-4 font-medium">Date</th>
                                        <th className="text-left p-4 font-medium">Due Date</th>
                                        <th className="text-left p-4 font-medium">Amount</th>
                                        <th className="text-left p-4 font-medium">Balance</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-right p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.map((bill) => (
                                        <tr key={bill.id} className="border-b hover:bg-muted/50">
                                            <td className="p-4 font-medium">{bill.billNumber}
                                                <div className="text-xs text-muted-foreground">{bill.vendorInvoiceNumber}</div>
                                            </td>
                                            <td className="p-4">{/* Vendor Name TODO: Fetch name from ID or Include in Relation */}
                                                {bill.vendorId}
                                            </td>
                                            <td className="p-4">{formatDate(bill.billDate)}</td>
                                            <td className="p-4">{formatDate(bill.dueDate)}</td>
                                            <td className="p-4">{formatCurrency(bill.totalAmount)}</td>
                                            <td className="p-4 font-bold">{formatCurrency(bill.balanceDue)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bill.status)}`}>
                                                    {bill.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {(bill.status === 'POSTED' || bill.status === 'PARTIALLY_PAID') && bill.balanceDue > 0 && (
                                                    <button
                                                        onClick={() => openPaymentModal(bill)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Payment Modal */}
            {showPaymentModal && selectedBill && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Record Payment</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Bill: {selectedBill.billNumber} | Balance: {formatCurrency(selectedBill.balanceDue)}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-md px-3 py-2"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-md px-3 py-2"
                                    value={paymentData.paymentDate}
                                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Mode</label>
                                <select
                                    className="w-full border rounded-md px-3 py-2"
                                    value={paymentData.paymentMethod}
                                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Reference / Cheque #</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-md px-3 py-2"
                                    value={paymentData.referenceNumber}
                                    onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="px-4 py-2 border rounded-md hover:bg-accent"
                                disabled={processingPayment}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                disabled={processingPayment}
                            >
                                {processingPayment ? 'Processing...' : 'Record Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillsList;
