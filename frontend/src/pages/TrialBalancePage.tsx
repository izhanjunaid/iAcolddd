import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { generalLedgerService } from '../services/generalLedgerService';
import type { TrialBalance } from '../types/voucher';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';

export const TrialBalancePage = () => {
  const navigate = useNavigate();
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadTrialBalance();
  }, [asOfDate]);

  const loadTrialBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await generalLedgerService.getTrialBalance(asOfDate);
      setTrialBalance(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!trialBalance) return;

    const headers = ['Account Code', 'Account Name', 'Type', 'Category', 'Debit Balance', 'Credit Balance'];
    const rows = trialBalance.accounts.map((acc) => [
      acc.accountCode,
      acc.accountName,
      acc.accountType,
      acc.category,
      acc.debitBalance.toFixed(2),
      acc.creditBalance.toFixed(2),
    ]);

    const totalsRow = [
      '', '', '', 'TOTALS',
      trialBalance.totalDebits.toFixed(2),
      trialBalance.totalCredits.toFixed(2),
    ];

    rows.push(totalsRow);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Trial Balance</h1>
            <div className="flex gap-2">
              <Link to="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance Report</CardTitle>
            <CardDescription>
              Verify that total debits equal total credits for all accounts
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex items-end gap-4 mb-6">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="asOfDate">As of Date</Label>
                <Input
                  id="asOfDate"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <Button variant="outline" onClick={loadTrialBalance} disabled={loading}>
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!trialBalance}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading trial balance...
              </div>
            ) : !trialBalance ? (
              <div className="text-center py-12 text-muted-foreground">
                No data available
              </div>
            ) : (
              <>
                {/* Balance Status */}
                <div
                  className="mb-6 p-4 rounded-lg border-2"
                  style={{
                    borderColor: trialBalance.isBalanced ? '#22c55e' : '#ef4444',
                    backgroundColor: trialBalance.isBalanced ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {trialBalance.isBalanced ? (
                        <>
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <div className="font-semibold text-green-900">
                              Books are Balanced ✓
                            </div>
                            <div className="text-sm text-green-700">
                              Total Debits = Total Credits
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-6 w-6 text-red-600" />
                          <div>
                            <div className="font-semibold text-red-900">
                              Books are OUT OF BALANCE!
                            </div>
                            <div className="text-sm text-red-700">
                              Difference: {Math.abs(trialBalance.difference).toFixed(2)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-900">
                        {trialBalance.totalDebits.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total DR = Total CR
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trial Balance Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Debit Balance</TableHead>
                          <TableHead className="text-right">Credit Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.accounts.map((account) => (
                          <TableRow
                            key={account.accountCode}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/general-ledger/account/${account.accountCode}`)}
                          >
                            <TableCell className="font-mono font-semibold">
                              {account.accountCode}
                            </TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-muted rounded text-xs">
                                {account.accountType}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                                {account.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {account.debitBalance > 0
                                ? account.debitBalance.toFixed(2)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {account.creditBalance > 0
                                ? account.creditBalance.toFixed(2)
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell colSpan={4} className="text-right">
                            TOTALS:
                          </TableCell>
                          <TableCell className="text-right font-mono text-lg">
                            {trialBalance.totalDebits.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-lg">
                            {trialBalance.totalCredits.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary by Category */}
                <div className="mt-6 grid grid-cols-5 gap-4">
                  {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((category) => {
                    const categoryAccounts = trialBalance.accounts.filter(
                      (acc) => acc.category === category
                    );
                    const total = categoryAccounts.reduce(
                      (sum, acc) =>
                        sum + (acc.debitBalance > 0 ? acc.debitBalance : acc.creditBalance),
                      0
                    );

                    return (
                      <Card key={category}>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-1">
                              {category}
                            </div>
                            <div className="text-2xl font-bold">
                              {total.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {categoryAccounts.length} accounts
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

