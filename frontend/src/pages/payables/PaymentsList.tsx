import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { payablesService, type ApPayment } from '../../services/payablesService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

const PaymentsList = () => {
    const [payments, setPayments] = useState<ApPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await payablesService.getPayments();
            setPayments(data);
        } catch (error: any) {
            console.error('Failed to load payments:', error);
            toast.error('Failed to load payments');
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
                        <p className="text-sm text-slate-500 mt-1">View and record vendor payments</p>
                    </div>
                    <Link to="/payables/payments/record">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            + Record Payment
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <Card className="border-slate-200 shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading payments...</div>
                    ) : payments.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-500 mb-4">No payments recorded yet.</p>
                            <Link to="/payables/payments/record">
                                <Button variant="outline">Record your first payment</Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[120px]">Number</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Bank Account</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <TableCell className="font-medium text-slate-700">
                                            {payment.paymentNumber}
                                            {payment.referenceNumber && (
                                                <div className="text-xs text-slate-400">Ref: {payment.referenceNumber}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{payment.vendor?.name || 'Unknown Vendor'}</div>
                                            {payment.vendor?.code && <div className="text-xs text-slate-500">{payment.vendor.code}</div>}
                                        </TableCell>
                                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                                {payment.paymentMethod.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {payment.bankAccount ? (
                                                <span className="text-sm text-slate-600">
                                                    {payment.bankAccount.name}
                                                </span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800">
                                            {formatCurrency(payment.amount)}
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

export default PaymentsList;
