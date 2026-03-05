import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { vendorsService } from '../../services/vendorsService';
import type { Vendor } from '../../types/vendor';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

const VendorsList = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        try {
            setLoading(true);
            const data = await vendorsService.getVendors();
            setVendors(data);
        } catch (error: any) {
            console.error('Failed to load vendors:', error);
            toast.error('Failed to load vendors');
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
        }).format(amount || 0);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Vendors</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage your suppliers and payables</p>
                    </div>
                    <Link to="/payables/vendors/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            + Add Vendor
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <Card className="border-slate-200 shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading vendors...</div>
                    ) : vendors.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-500 mb-4">No vendors found.</p>
                            <Link to="/payables/vendors/create">
                                <Button variant="outline">Create your first vendor</Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Payable Account</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vendors.map((vendor) => (
                                    <TableRow key={vendor.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <TableCell className="font-medium text-slate-700">{vendor.code}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{vendor.name}</div>
                                            {vendor.email && <div className="text-xs text-slate-500">{vendor.email}</div>}
                                        </TableCell>
                                        <TableCell>
                                            {vendor.contact}
                                            {vendor.phone && <div className="text-xs text-slate-500">{vendor.phone}</div>}
                                        </TableCell>
                                        <TableCell>
                                            {vendor.payableAccount ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                    {vendor.payableAccount.code} - {vendor.payableAccount.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Not Configured</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            {/* TODO: Add balance field to Vendor entity or fetch separately */}
                                            {/* For now assuming 0 or fetching later */}
                                            {formatCurrency(0)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {vendor.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default VendorsList;
