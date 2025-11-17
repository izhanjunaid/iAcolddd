import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { invoiceService } from '../services/invoiceService';
import type { Invoice, InvoiceFilters, InvoiceStatistics, InvoiceStatus } from '../types/invoice';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 20,
    sortBy: 'issueDate',
    sortOrder: 'DESC',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadInvoices();
    loadStatistics();
  }, [filters]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoices(filters);
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error('Failed to load invoices:', error);
      const message = error.response?.data?.message || 'Failed to load invoices. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await invoiceService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      await invoiceService.downloadPDF(invoice.id, invoice.invoiceNumber);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      const message = error.response?.data?.message || 'Failed to download PDF. Please try again.';
      toast.error(message);
    }
  };

  const handleMarkAsSent = async (id: string) => {
    try {
      await invoiceService.markAsSent(id);
      await loadInvoices();
      toast.success('Invoice marked as sent successfully');
    } catch (error: any) {
      console.error('Failed to mark as sent:', error);
      const message = error.response?.data?.message || 'Failed to mark invoice as sent. Please try again.';
      toast.error(message);
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.DRAFT;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Invoices</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage customer invoices and payments
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Dashboard
              </Link>
              <Link
                to="/invoices/create"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                + Create Invoice
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-sm text-muted-foreground mb-1">Total Invoices</div>
              <div className="text-2xl font-bold">{statistics.count.total}</div>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
              <div className="text-2xl font-bold">{formatCurrency(statistics.amount.total)}</div>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-sm text-muted-foreground mb-1">Paid</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.amount.paid)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.count.paid} invoices
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-sm text-muted-foreground mb-1">Outstanding</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(statistics.amount.outstanding)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.count.sent + statistics.count.overdue} invoices
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value as any,
                    page: 1,
                  })
                }
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Invoice Number</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                placeholder="INV-2025-0001"
                value={filters.invoiceNumber || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    invoiceNumber: e.target.value,
                    page: 1,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={filters.fromDate || ''}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value, page: 1 })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2"
                value={filters.toDate || ''}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value, page: 1 })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                setFilters({
                  page: 1,
                  limit: 20,
                  sortBy: 'issueDate',
                  sortOrder: 'DESC',
                })
              }
              className="px-4 py-2 border rounded-md hover:bg-accent text-sm"
            >
              Clear Filters
            </button>
            <label className="flex items-center gap-2 ml-4">
              <input
                type="checkbox"
                checked={filters.overdueOnly || false}
                onChange={(e) =>
                  setFilters({ ...filters, overdueOnly: e.target.checked, page: 1 })
                }
              />
              <span className="text-sm">Show Overdue Only</span>
            </label>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="border rounded-lg bg-card">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Invoice #</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Issue Date</th>
                      <th className="text-left p-4 font-medium">Due Date</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          {invoice.referenceNumber && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {invoice.referenceNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div>{invoice.customer?.name || 'N/A'}</div>
                          {invoice.customer?.contactPerson && (
                            <div className="text-xs text-muted-foreground">
                              {invoice.customer.contactPerson}
                            </div>
                          )}
                        </td>
                        <td className="p-4">{formatDate(invoice.issueDate)}</td>
                        <td className="p-4">
                          <div>{formatDate(invoice.dueDate)}</div>
                          {new Date(invoice.dueDate) < new Date() &&
                            invoice.status !== 'PAID' &&
                            invoice.status !== 'CANCELLED' && (
                              <div className="text-xs text-red-600">Overdue</div>
                            )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </div>
                          {invoice.amountPaid > 0 && (
                            <div className="text-xs text-green-600">
                              Paid: {formatCurrency(invoice.amountPaid)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDownloadPDF(invoice)}
                              className="px-3 py-1 text-sm border rounded hover:bg-accent"
                              title="Download PDF"
                            >
                              PDF
                            </button>
                            {invoice.status === 'DRAFT' && (
                              <button
                                onClick={() => handleMarkAsSent(invoice.id)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                title="Mark as Sent"
                              >
                                Send
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} invoices
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilters({ ...filters, page: pagination.page - 1 })
                    }
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                  >
                    Previous
                  </button>
                  <div className="px-3 py-1 border rounded text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <button
                    onClick={() =>
                      setFilters({ ...filters, page: pagination.page + 1 })
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default InvoicesPage;
