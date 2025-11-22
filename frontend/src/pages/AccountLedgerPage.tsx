import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { generalLedgerService } from '../services/generalLedgerService';
import { accountsService } from '../services/accountsService';
import type { AccountLedger, Account } from '../types';
import { Download, ArrowLeft } from 'lucide-react';

export const AccountLedgerPage = () => {
  const { accountCode } = useParams<{ accountCode: string }>();
  const [ledger, setLedger] = useState<AccountLedger | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAccount, setSelectedAccount] = useState<string>(accountCode || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadLedger();
    }
  }, [selectedAccount, fromDate, toDate]);

  const loadAccounts = async () => {
    try {
      const response = await accountsService.getAccounts({ limit: 100 });
      const detailAccounts = response.data.filter((acc: any) => acc.accountType === 'DETAIL');
      setAccounts(detailAccounts);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await generalLedgerService.getAccountLedger(
        selectedAccount,
        fromDate || undefined,
        toDate || undefined,
      );
      setLedger(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load account ledger');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!ledger) return;

    const headers = ['Date', 'Voucher Number', 'Voucher Type', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = ledger.entries.map((entry) => [
      new Date(entry.date).toLocaleDateString(),
      entry.voucherNumber,
      entry.voucherType,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
    ]);

    const csv = [
      [`Account Ledger: ${ledger.account.code} - ${ledger.account.name}`],
      [`From: ${fromDate || 'Beginning'} To: ${toDate}`],
      [],
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-ledger-${selectedAccount}-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Account Ledger</h1>
            <div className="flex gap-2">
              <Link to="/trial-balance">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Trial Balance
                </Button>
              </Link>
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
            <CardTitle>Account Ledger</CardTitle>
            <CardDescription>
              View all transactions for an account with running balance
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <Label htmlFor="account">Select Account</Label>
                <select
                  id="account"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={!ledger}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
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
                Loading ledger...
              </div>
            ) : !selectedAccount ? (
              <div className="text-center py-12 text-muted-foreground">
                Please select an account to view its ledger
              </div>
            ) : !ledger ? (
              <div className="text-center py-12 text-muted-foreground">
                No data available
              </div>
            ) : (
              <>
                {/* Account Info */}
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Account</div>
                      <div className="font-semibold">
                        {ledger.account.code} - {ledger.account.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Opening Balance</div>
                      <div className="font-semibold">
                        {ledger.openingBalance.currentBalance.toFixed(2)}{' '}
                        {ledger.openingBalance.balanceType}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Closing Balance</div>
                      <div className="font-semibold">
                        {ledger.closingBalance.currentBalance.toFixed(2)}{' '}
                        {ledger.closingBalance.balanceType}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Transactions</div>
                      <div className="font-semibold">{ledger.entries.length}</div>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                {ledger.entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions found for this account in the selected date range
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Voucher Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Opening Balance Row */}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={4}>Opening Balance</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right font-mono">
                              {ledger.openingBalance.currentBalance.toFixed(2)}{' '}
                              {ledger.openingBalance.balanceType}
                            </TableCell>
                          </TableRow>

                          {/* Transaction Rows */}
                          {ledger.entries.map((entry, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {new Date(entry.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {entry.voucherNumber}
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                                  {entry.voucherType}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {entry.description}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {entry.balance.toFixed(2)} {entry.balanceType}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Closing Balance Row */}
                          <TableRow className="bg-muted/50 font-bold border-t-2">
                            <TableCell colSpan={4}>Closing Balance</TableCell>
                            <TableCell className="text-right">
                              {ledger.closingBalance.totalDebits.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {ledger.closingBalance.totalCredits.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-lg">
                              {ledger.closingBalance.currentBalance.toFixed(2)}{' '}
                              {ledger.closingBalance.balanceType}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

