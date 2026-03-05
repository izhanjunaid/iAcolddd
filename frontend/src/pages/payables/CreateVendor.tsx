import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { vendorsService } from '../../services/vendorsService';
import { accountsService } from '../../services/accountsService';
import type { CreateVendorDto } from '../../types/vendor';
import type { Account } from '../../types/account';
import { AccountCategory, AccountType } from '../../types/account';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';

const VENDOR_TYPES = [
    "Refrigerants & Chemicals (Ammonia)",
    "Electricity / Utilities",
    "Fuel / Generator",
    "Maintenance & Repairs",
    "Labor / Manpower",
    "Packaging Material",
    "Transport / Logistics",
    "Security Services",
    "Cleaning / Sanitation",
    "Government / Tax / Regulatory",
    "Office Supplies",
    "Raw Materials",
    "IT / Software",
    "Consultancy",
    "Rent / Lease",
];

const CreateVendor = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);

    // Form State
    const [formData, setFormData] = useState<CreateVendorDto>({
        name: '',
        payableAccountId: '',
        taxId: '',
        gstNumber: '',
        paymentTerms: 0,
        address: '',
        contact: '',
        phone: '',
        email: '',
        website: '',
        vendorType: '',
        notes: '',
    });

    useEffect(() => {
        loadLiabilityAccounts();
    }, []);

    const loadLiabilityAccounts = async () => {
        try {
            // Fetch detail accounts and filter for liabilities
            // In a real app, backend might provide a specific endpoint
            const allAccounts = await accountsService.getDetailAccounts();
            const liabilities = allAccounts.filter(
                acc => acc.category === AccountCategory.LIABILITY &&
                    acc.accountType === AccountType.DETAIL
            );
            setAccounts(liabilities);
        } catch (error) {
            console.error('Failed to load accounts:', error);
            toast.error('Failed to load capability accounts');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Vendor Name is required');
            return;
        }

        try {
            setLoading(true);
            await vendorsService.createVendor(formData);
            toast.success('Vendor created successfully');
            navigate('/payables/vendors');
        } catch (error: any) {
            console.error('Failed to create vendor:', error);
            toast.error(error.response?.data?.message || 'Failed to create vendor');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedAccountName = () => {
        const acc = accounts.find(a => a.id === formData.payableAccountId);
        return acc ? `${acc.code} - ${acc.name}` : "Select Payable Account";
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Link to="/payables/vendors" className="text-slate-500 hover:text-slate-800">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Add New Vendor</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-3xl">
                <form onSubmit={handleSubmit}>
                    <Card className="p-6 space-y-8 border-slate-200 shadow-sm">

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Basic Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Vendor Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Acme Supplies Ltd."
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact">Contact Person</Label>
                                    <Input
                                        id="contact"
                                        placeholder="e.g. John Doe"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="contact@vendor.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+1 234 567 8900"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Financial Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Financial Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Payable Account (Liability) *</Label>
                                    <Select
                                        value={formData.payableAccountId}
                                        onValueChange={(val) => setFormData({ ...formData, payableAccountId: val })}
                                    >
                                        <SelectTrigger className="bg-white">
                                            {getSelectedAccountName()}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    <span className="font-mono text-xs mr-2 text-slate-500">{acc.code}</span>
                                                    {acc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {accounts.length === 0 && (
                                        <p className="text-xs text-amber-600">No Liability Accounts found. Please create one in Chart of Accounts.</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Vendor Type</Label>
                                    <Select
                                        value={VENDOR_TYPES.includes(formData.vendorType || '') ? formData.vendorType : (formData.vendorType ? 'OTHER' : '')}
                                        onValueChange={(val) => {
                                            if (val === 'OTHER') {
                                                setFormData({ ...formData, vendorType: '' });
                                            } else {
                                                setFormData({ ...formData, vendorType: val });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-white">
                                            {formData.vendorType && !VENDOR_TYPES.includes(formData.vendorType)
                                                ? 'Other (Custom)'
                                                : (formData.vendorType || 'Select Vendor Type')}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENDOR_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                            <SelectItem value="OTHER" className="font-semibold text-blue-600">
                                                Other (Specify Custom)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Custom Vendor Type Input */}
                            {(!VENDOR_TYPES.includes(formData.vendorType || '') && (formData.vendorType !== undefined || formData.vendorType === '')) && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Label htmlFor="customVendorType" className="text-blue-600">Specify Custom Vendor Type</Label>
                                    <Input
                                        id="customVendorType"
                                        placeholder="e.g. Specialized Cooling Equipment"
                                        value={formData.vendorType || ''}
                                        onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                                        className="bg-blue-50 border-blue-200 focus-visible:ring-blue-500"
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="taxId">Tax ID / NTN</Label>
                                    <Input
                                        id="taxId"
                                        placeholder="Tax ID"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstNumber">GST Number</Label>
                                    <Input
                                        id="gstNumber"
                                        placeholder="GST #"
                                        value={formData.gstNumber}
                                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                                    <Input
                                        id="paymentTerms"
                                        type="number"
                                        placeholder="0"
                                        value={formData.paymentTerms}
                                        onChange={(e) => setFormData({ ...formData, paymentTerms: Number(e.target.value) })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address & Notes */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Address & Notes</h3>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    placeholder="Full street address..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Internal Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any internal notes about this vendor..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Link to="/payables/vendors">
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Vendor'}
                            </Button>
                        </div>

                    </Card>
                </form>
            </main>
        </div>
    );
};

export default CreateVendor;
