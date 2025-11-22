import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { AccountSelector } from '../components/AccountSelector';
import { vouchersService } from '../services/vouchersService';
import { accountsService } from '../services/accountsService';
import { VoucherType, type VoucherLineItem, type Account } from '../types';
import { Trash2, Plus, Check, AlertCircle } from 'lucide-react';

export const JournalVoucherPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form state
  const [voucherDate, setVoucherDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [nextVoucherNumber, setNextVoucherNumber] = useState<string>('');

  // Line items
  const [lineItems, setLineItems] = useState<VoucherLineItem[]>([
    {
      accountCode: '',
      description: '',
      debitAmount: 0,
      creditAmount: 0,
      lineNumber: 1,
    },
    {
      accountCode: '',
      description: '',
      debitAmount: 0,
      creditAmount: 0,
      lineNumber: 2,
    },
  ]);

  // Load accounts and next voucher number
  useEffect(() => {
    loadAccounts();
    loadNextVoucherNumber();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await accountsService.getAccounts({ limit: 100 });
      // Only show DETAIL accounts (not CONTROL or SUB_CONTROL)
      const detailAccounts = response.data.filter((acc: any) => acc.accountType === 'DETAIL');
      setAccounts(detailAccounts);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadNextVoucherNumber = async () => {
    try {
      const number = await vouchersService.getNextVoucherNumber(VoucherType.JOURNAL);
      setNextVoucherNumber(number);
    } catch (err: any) {
      console.error('Failed to load next voucher number:', err);
    }
  };

  // Calculate totals
  const totalDebits = lineItems.reduce(
    (sum, item) => sum + (Number(item.debitAmount) || 0),
    0
  );

  const totalCredits = lineItems.reduce(
    (sum, item) => sum + (Number(item.creditAmount) || 0),
    0
  );

  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01; // Allow 1 cent difference for rounding

  // Add line item
  const addLine = () => {
    setLineItems([
      ...lineItems,
      {
        accountCode: '',
        description: '',
        debitAmount: 0,
        creditAmount: 0,
        lineNumber: lineItems.length + 1,
      },
    ]);
  };

  // Remove line item
  const removeLine = (index: number) => {
    if (lineItems.length <= 2) {
      setError('Voucher must have at least 2 line items');
      return;
    }
    const newItems = lineItems.filter((_, i) => i !== index);
    // Renumber lines
    newItems.forEach((item, i) => {
      item.lineNumber = i + 1;
    });
    setLineItems(newItems);
  };

  // Update line item
  const updateLine = (index: number, field: keyof VoucherLineItem, value: any) => {
    const newItems = [...lineItems];

    // Special handling for debit/credit amounts
    if (field === 'debitAmount' || field === 'creditAmount') {
      const numValue = Number(value) || 0;
      newItems[index][field] = numValue;

      // Clear opposite field (DR and CR are mutually exclusive)
      if (field === 'debitAmount' && numValue > 0) {
        newItems[index].creditAmount = 0;
      } else if (field === 'creditAmount' && numValue > 0) {
        newItems[index].debitAmount = 0;
      }
    } else {
      (newItems[index] as any)[field] = value;
    }

    setLineItems(newItems);
  };

  // Validate form
  const validateForm = (): boolean => {
    setError(null);

    // Check if voucher date is set
    if (!voucherDate) {
      setError('Voucher date is required');
      return false;
    }

    // Check if at least 2 lines
    if (lineItems.length < 2) {
      setError('Voucher must have at least 2 line items');
      return false;
    }

    // Check if all lines have accounts
    for (let i = 0; i < lineItems.length; i++) {
      if (!lineItems[i].accountCode) {
        setError(`Line ${i + 1}: Account is required`);
        return false;
      }

      const debit = Number(lineItems[i].debitAmount) || 0;
      const credit = Number(lineItems[i].creditAmount) || 0;

      if (debit === 0 && credit === 0) {
        setError(`Line ${i + 1}: Must have either debit or credit amount`);
        return false;
      }

      if (debit > 0 && credit > 0) {
        setError(`Line ${i + 1}: Cannot have both debit and credit amounts`);
        return false;
      }
    }

    // Check if voucher is balanced
    if (!isBalanced) {
      setError(
        `Voucher is not balanced. Difference: ${Math.abs(difference).toFixed(2)}`
      );
      return false;
    }

    // Check if has at least one debit and one credit
    const hasDebit = lineItems.some((item) => Number(item.debitAmount) > 0);
    const hasCredit = lineItems.some((item) => Number(item.creditAmount) > 0);

    if (!hasDebit || !hasCredit) {
      setError('Voucher must have at least one debit and one credit entry');
      return false;
    }

    return true;
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      await vouchersService.createVoucher({
        voucherType: VoucherType.JOURNAL,
        voucherDate,
        description,
        details: lineItems,
      });

      navigate('/vouchers?success=created');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create voucher');
    } finally {
      setLoading(false);
    }
  };

  // Save and post
  const handleSaveAndPost = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const voucher = await vouchersService.createVoucher({
        voucherType: VoucherType.JOURNAL,
        voucherDate,
        description,
        details: lineItems,
      });

      // Post the voucher
      await vouchersService.postVoucher(voucher.id);

      navigate('/vouchers?success=posted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create and post voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Create Journal Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Next Voucher: {nextVoucherNumber || 'Loading...'}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/vouchers')}>
              Back to List
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
            <CardDescription>
              Enter debit and credit entries. Total debits must equal total credits.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="voucherDate">Voucher Date *</Label>
                <Input
                  id="voucherDate"
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description / Narration</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter voucher description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base">Line Items</Label>
                <Button onClick={addLine} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold w-12">#</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold">Account</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold w-32">Debit</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold w-32">Credit</th>
                        <th className="px-3 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {item.lineNumber}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full px-2 py-1.5 text-sm border rounded"
                              value={item.accountCode}
                              onChange={(e) =>
                                updateLine(index, 'accountCode', e.target.value)
                              }
                            >
                              <option value="">-- Select Account --</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.code}>
                                  {acc.code} - {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              className="text-sm"
                              placeholder="Line description..."
                              value={item.description || ''}
                              onChange={(e) =>
                                updateLine(index, 'description', e.target.value)
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-right text-sm"
                              value={item.debitAmount || ''}
                              onChange={(e) =>
                                updateLine(index, 'debitAmount', e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="text-right text-sm"
                              value={item.creditAmount || ''}
                              onChange={(e) =>
                                updateLine(index, 'creditAmount', e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(index)}
                              disabled={lineItems.length <= 2}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-muted/50">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-right font-semibold">
                          Total:
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {totalDebits.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {totalCredits.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Balance Indicator */}
              <div className="mt-4 p-4 rounded-lg border-2" style={{
                borderColor: isBalanced ? '#22c55e' : '#ef4444',
                backgroundColor: isBalanced ? '#f0fdf4' : '#fef2f2',
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <>
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Voucher is Balanced</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">Out of Balance</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Difference:</div>
                    <div className={`text-lg font-bold ${isBalanced ? 'text-green-900' : 'text-red-900'}`}>
                      {Math.abs(difference).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/vouchers')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={loading || !isBalanced}
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                onClick={handleSaveAndPost}
                disabled={loading || !isBalanced}
              >
                {loading ? 'Saving...' : 'Save & Post'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

