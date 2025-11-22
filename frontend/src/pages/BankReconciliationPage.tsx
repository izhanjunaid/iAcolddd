import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

import { bankReconciliationService } from '../services/bankReconciliationService';

export default function BankReconciliationPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [accountId, setAccountId] = useState('1-0001-0001-0001'); // TODO: Replace with actual account selector
    const queryClient = useQueryClient();

    const { data: status, isLoading } = useQuery({
        queryKey: ['reconciliationStatus', accountId],
        queryFn: () => bankReconciliationService.getStatus(accountId),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => bankReconciliationService.uploadStatementLines(accountId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliationStatus'] });
            alert('Bank statement uploaded successfully!');
            setSelectedFile(null);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to upload bank statement');
            console.error(error);
        },
    });

    const autoMatchMutation = useMutation({
        mutationFn: () => bankReconciliationService.autoMatch(accountId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['reconciliationStatus'] });
            alert(`Auto-match completed. Matched ${data.matchedCount} transactions.`);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to auto-match transactions');
            console.error(error);
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            uploadMutation.mutate(selectedFile);
        }
    };

    const handleAutoMatch = () => {
        if (confirm('Are you sure you want to auto-match transactions?')) {
            autoMatchMutation.mutate();
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${status?.statement?.closingBalance?.toLocaleString() ?? '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            As per latest statement
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reconciled Amount</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${status?.reconciledAmount?.toLocaleString() ?? '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total Reconciled
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unreconciled Amount</CardTitle>
                        <AlertCircle className={`h-4 w-4 ${status?.unreconciledAmount !== 0 ? 'text-red-500' : 'text-green-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${status?.unreconciledAmount !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                            ${status?.unreconciledAmount?.toLocaleString() ?? '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {status?.unreconciledLines ?? 0} items pending
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Bank Statement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="statement">Bank Statement (CSV/Excel)</Label>
                            <div className="flex gap-2">
                                <Input id="statement" type="file" onChange={handleFileChange} accept=".csv,.xlsx" />
                                <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
                                    {uploadMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Upload
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Supported formats: CSV, Excel. Ensure columns match the template.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Reconciliation Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <Button
                                className="w-full justify-start"
                                variant="outline"
                                onClick={handleAutoMatch}
                                disabled={autoMatchMutation.isPending}
                            >
                                {autoMatchMutation.isPending ? (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                )}
                                Auto-Match Transactions
                            </Button>
                            <Button className="w-full justify-start" variant="outline">
                                <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                                View Unmatched Items ({status?.unreconciledLines ?? 0})
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for Transaction List */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {status?.lines && status.lines.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {status.lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{format(new Date(line.transactionDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{line.description}</TableCell>
                                        <TableCell>{line.reference}</TableCell>
                                        <TableCell>${line.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={line.type === 'DEBIT' ? 'destructive' : 'default'}>
                                                {line.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {line.isReconciled ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                                    Reconciled
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No transactions found. Upload a statement to get started.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
