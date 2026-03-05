import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { payablesService, type CreateApPaymentDto } from '../../services/payablesService';
import { vendorsService } from '../../services/vendorsService';
import { accountsService } from '../../services/accountsService';
import type { Vendor } from '../../types/vendor';
import type { Account } from '../../types/account';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';

const RecordPayment = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [bankAccounts, setBankAccounts] = useState<Account[]>([]);

    const [formData, setFormData] = useState<CreateApPaymentDto>({
        vendorId: '',
        amount: 0,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        bankAccountId: '',
        notes: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vendorsData, accountsData] = await Promise.all([
                vendorsService.getVendors(),
                accountsService.getDetailAccounts()
            ]);
            setVendors(vendorsData);

            // Filter for Bank/Cash accounts
            // Ideally use isBankAccount flag, or check category/subcategory
            const banks = accountsData.filter(acc => acc.isBankAccount || acc.isCashAccount || (acc.category === 'ASSET' && acc.subCategory === 'CURRENT_ASSET'));
            setBankAccounts(banks);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load vendors or accounts');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vendorId) {
            toast.error('Please select a vendor');
            return;
        }
        if (formData.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        if (!formData.bankAccountId) {
            toast.error('Please select a Bank/Cash account');
            return;
        }

        try {
            setLoading(true);
            await payablesService.recordPayment(formData);
            toast.success('Payment recorded successfully');
            navigate('/payables/payments');
        } catch (error: any) {
            console.error('Failed to record payment:', error);
            toast.error(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedVendorName = () => {
        const v = vendors.find(v => v.id === formData.vendorId);
        return v ? `${v.name}` : "Select Vendor";
    };

    const getSelectedAccountName = () => {
        const a = bankAccounts.find(a => a.id === formData.bankAccountId);
        return a ? `${a.code} - ${a.name}` : "Select Bank/Cash Account";
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Link to="/payables/payments" className="text-slate-500 hover:text-slate-800">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Record Payment</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <Card className="p-6 space-y-6 border-slate-200 shadow-sm">

                        <div className="space-y-2">
                            <Label>Vendor *</Label>
                            <Select
                                value={formData.vendorId}
                                onValueChange={(val) => setFormData({ ...formData, vendorId: val })}
                            >
                                <SelectTrigger className="bg-white">
                                    {getSelectedVendorName()}
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="bg-white text-lg font-semibold"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paymentDate">Date</Label>
                                <Input
                                    id="paymentDate"
                                    type="date"
                                    value={formData.paymentDate instanceof Date ? formData.paymentDate.toISOString().split('T')[0] : formData.paymentDate}
                                    onChange={(e) => setFormData({ ...formData, paymentDate: new Date(e.target.value) })}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select
                                    value={formData.paymentMethod}
                                    onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                                >
                                    <SelectTrigger className="bg-white">
                                        {formData.paymentMethod.replace('_', ' ')}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reference">Reference / Cheque #</Label>
                                <Input
                                    id="reference"
                                    placeholder="e.g. TRX-123456"
                                    value={formData.referenceNumber}
                                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Paid From (Bank/Cash Account) *</Label>
                            <Select
                                value={formData.bankAccountId}
                                onValueChange={(val) => setFormData({ ...formData, bankAccountId: val })}
                            >
                                <SelectTrigger className="bg-white">
                                    {getSelectedAccountName()}
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <span className="font-mono text-xs mr-2 text-slate-500">{acc.code}</span>
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Payment remarks..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="bg-white"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Link to="/payables/payments">
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Record Payment'}
                            </Button>
                        </div>

                    </Card>
                </form>
            </main>
        </div>
    );
};

export default RecordPayment;
