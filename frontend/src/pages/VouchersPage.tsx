import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { vouchersService } from '../services/vouchersService';
import { VoucherType, type Voucher } from '../types/voucher';
import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';

export const VouchersPage = () => {
  const navigate = useNavigate();
  const canCreate = usePermission('vouchers.create');
  const canUpdate = usePermission('vouchers.update');
  const canDelete = usePermission('vouchers.delete');
  const canPost = usePermission('vouchers.post');

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [voucherType, setVoucherType] = useState<VoucherType | ''>('');
  const [isPosted, setIsPosted] = useState<boolean | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadVouchers();
  }, [search, voucherType, isPosted, fromDate, toDate]);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: any = { limit: 100 };
      if (search) filters.search = search;
      if (voucherType) filters.voucherType = voucherType;
      if (isPosted !== '') filters.isPosted = isPosted;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;

      const response = await vouchersService.getVouchers(filters);
      setVouchers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id: string) => {
    if (!confirm('Are you sure you want to post this voucher? It cannot be edited after posting.')) {
      return;
    }

    try {
      await vouchersService.postVoucher(id);
      await loadVouchers();
      toast.success('Voucher posted successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to post voucher. Please try again.';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) {
      return;
    }

    try {
      await vouchersService.deleteVoucher(id);
      await loadVouchers();
      toast.success('Voucher deleted successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete voucher. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Vouchers</h1>
            <div className="flex gap-2">
              <Link to="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
              {canCreate && (
                <Link to="/vouchers/journal/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Journal Voucher
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Vouchers</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div>
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as any)}
                >
                  <option value="">All Types</option>
                  <option value={VoucherType.JOURNAL}>Journal</option>
                  <option value={VoucherType.PAYMENT}>Payment</option>
                  <option value={VoucherType.RECEIPT}>Receipt</option>
                </select>
              </div>
              <div>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={isPosted === '' ? '' : isPosted ? 'true' : 'false'}
                  onChange={(e) =>
                    setIsPosted(e.target.value === '' ? '' : e.target.value === 'true')
                  }
                >
                  <option value="">All Status</option>
                  <option value="false">Draft</option>
                  <option value="true">Posted</option>
                </select>
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No vouchers found. Create your first voucher to get started.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-mono font-semibold">
                          {voucher.voucherNumber}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                            {voucher.voucherType}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(voucher.voucherDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {voucher.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(voucher.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {voucher.isPosted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                              <CheckCircle className="h-3 w-3" />
                              Posted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                              <XCircle className="h-3 w-3" />
                              Draft
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/vouchers/${voucher.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!voucher.isPosted && canPost && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(voucher.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {!voucher.isPosted && canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(voucher.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

