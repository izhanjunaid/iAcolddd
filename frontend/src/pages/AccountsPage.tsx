import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { AccountSelector } from '../components/AccountSelector';
import { accountsService } from '../services/accountsService';
import type { Account, CreateAccountDto, AccountType, AccountNature, AccountCategory } from '../types/account';
import { AccountSubCategory, FinancialStatement } from '../types/account';

// Validation schema
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  code: z.string().optional(),
  parentAccountId: z.string().optional(),
  accountType: z.enum(['CONTROL', 'SUB_CONTROL', 'DETAIL']),
  nature: z.enum(['DEBIT', 'CREDIT']),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  
  // New Phase 1 fields
  subCategory: z.nativeEnum(AccountSubCategory).optional().nullable(),
  financialStatement: z.nativeEnum(FinancialStatement).optional().nullable(),
  statementSection: z.string().optional().nullable(),
  displayOrder: z.number().min(0).optional(),
  
  // Behavior flags
  isCashAccount: z.boolean().optional(),
  isBankAccount: z.boolean().optional(),
  isDepreciable: z.boolean().optional(),
  requireCostCenter: z.boolean().optional(),
  requireProject: z.boolean().optional(),
  allowDirectPosting: z.boolean().optional(),
  
  openingBalance: z.number().min(0).optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

export const AccountsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTree, setAccountTree] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountType: 'DETAIL',
      nature: 'DEBIT',
      category: 'ASSET',
      openingBalance: 0,
    },
  });

  useEffect(() => {
    loadAccounts();
    loadAccountTree();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsService.getAccounts({ limit: 100 });
      setAccounts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadAccountTree = async () => {
    try {
      const tree = await accountsService.getAccountTree();
      setAccountTree(tree);
    } catch (err: any) {
      console.error('Failed to load account tree:', err);
    }
  };

  const onSubmit = async (data: AccountFormData) => {
    try {
      setError(null);
      
      // Prepare submit data
      const submitData = { ...data };
      
      if (editingAccount) {
        // When editing, remove code field (not allowed in update)
        delete submitData.code;
        await accountsService.updateAccount(editingAccount.id, submitData);
      } else {
        // When creating, remove empty code field so backend can auto-generate
        if (!submitData.code || submitData.code.trim() === '') {
          delete submitData.code;
        }
        await accountsService.createAccount(submitData as CreateAccountDto);
      }
      
      await loadAccounts();
      await loadAccountTree();
      setShowForm(false);
      setEditingAccount(null);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save account');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      code: account.code,
      parentAccountId: account.parentAccountId || undefined,
      accountType: account.accountType,
      nature: account.nature,
      category: account.category,
      openingBalance: account.openingBalance,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      setError(null);
      await accountsService.deleteAccount(id);
      await loadAccounts();
      await loadAccountTree();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
    reset();
  };

  const renderAccountTree = (accounts: Account[], level = 0) => {
    return accounts.map((account) => (
      <div key={account.id}>
        <div
          style={{ paddingLeft: `${level * 24}px` }}
          className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b"
        >
          <div className="flex-1">
            <span className="font-medium">{account.code}</span>
            <span className="ml-4">{account.name}</span>
            <span className="ml-4 text-xs text-gray-500">
              ({account.accountType})
            </span>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              account.nature === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {account.nature}
            </span>
            <span className="px-2 py-1 rounded text-xs bg-gray-100">
              {account.category}
            </span>
            {!account.isSystem && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(account)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(account.id)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
        {account.children && account.children.length > 0 && renderAccountTree(account.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add Account'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingAccount ? 'Edit Account' : 'Create New Account'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Account Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="e.g., Cash in Hand"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="code">Account Code (auto-generated if empty)</Label>
                    <Input
                      id="code"
                      {...register('code')}
                      placeholder="e.g., 1-0001"
                      disabled={!!editingAccount}
                    />
                  </div>

                  <div>
                    <Label htmlFor="parentAccountId">Parent Account (optional)</Label>
                    <select
                      id="parentAccountId"
                      {...register('parentAccountId')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- Root Account --</option>
                      {accounts
                        .filter(acc => acc.accountType !== 'DETAIL')
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank for root account (must be CONTROL type)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="accountType">Account Type *</Label>
                    <select
                      id="accountType"
                      {...register('accountType')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="CONTROL">CONTROL</option>
                      <option value="SUB_CONTROL">SUB_CONTROL</option>
                      <option value="DETAIL">DETAIL</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="nature">Nature *</Label>
                    <select
                      id="nature"
                      {...register('nature')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="DEBIT">DEBIT</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      {...register('category')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="ASSET">ASSET</option>
                      <option value="LIABILITY">LIABILITY</option>
                      <option value="EQUITY">EQUITY</option>
                      <option value="REVENUE">REVENUE</option>
                      <option value="EXPENSE">EXPENSE</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="openingBalance">Opening Balance</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.01"
                      {...register('openingBalance', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* New Phase 1 Fields */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Account Classification & Behavior</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subCategory">Sub Category</Label>
                      <select
                        id="subCategory"
                        {...register('subCategory')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">-- Select Sub Category --</option>
                        {Object.values(AccountSubCategory).map(subCat => (
                          <option key={subCat} value={subCat}>
                            {subCat.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="financialStatement">Financial Statement</Label>
                      <select
                        id="financialStatement"
                        {...register('financialStatement')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">-- Select Statement --</option>
                        {Object.values(FinancialStatement).map(stmt => (
                          <option key={stmt} value={stmt}>
                            {stmt.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="statementSection">Statement Section</Label>
                      <Input
                        id="statementSection"
                        {...register('statementSection')}
                        placeholder="e.g., Current Assets, Operating Expenses"
                      />
                    </div>

                    <div>
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        {...register('displayOrder', { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-md font-medium mb-2">Behavior Flags</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isCashAccount"
                          {...register('isCashAccount')}
                          className="rounded"
                        />
                        <Label htmlFor="isCashAccount">Cash Account</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isBankAccount"
                          {...register('isBankAccount')}
                          className="rounded"
                        />
                        <Label htmlFor="isBankAccount">Bank Account</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDepreciable"
                          {...register('isDepreciable')}
                          className="rounded"
                        />
                        <Label htmlFor="isDepreciable">Depreciable</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requireCostCenter"
                          {...register('requireCostCenter')}
                          className="rounded"
                        />
                        <Label htmlFor="requireCostCenter">Require Cost Center</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requireProject"
                          {...register('requireProject')}
                          className="rounded"
                        />
                        <Label htmlFor="requireProject">Require Project</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowDirectPosting"
                          {...register('allowDirectPosting')}
                          className="rounded"
                        />
                        <Label htmlFor="allowDirectPosting">Allow Direct Posting</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Nature</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub Category</TableHead>
                    <TableHead>Financial Statement</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Opening Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{account.accountType}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          account.nature === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {account.nature}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs bg-gray-100">
                          {account.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        {account.subCategory ? (
                          <span className="px-2 py-1 rounded text-xs bg-purple-100">
                            {account.subCategory.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {account.financialStatement ? (
                          <span className="px-2 py-1 rounded text-xs bg-orange-100">
                            {account.financialStatement.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {account.isCashAccount && (
                            <span className="px-1 py-0.5 rounded text-xs bg-green-100 text-green-800">Cash</span>
                          )}
                          {account.isBankAccount && (
                            <span className="px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Bank</span>
                          )}
                          {account.isDepreciable && (
                            <span className="px-1 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Depr</span>
                          )}
                          {account.requireCostCenter && (
                            <span className="px-1 py-0.5 rounded text-xs bg-red-100 text-red-800">CC</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{Number(account.openingBalance).toFixed(2)}</TableCell>
                      <TableCell>
                        {!account.isSystem && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(account)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(account.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Account Hierarchy</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {renderAccountTree(accountTree)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

