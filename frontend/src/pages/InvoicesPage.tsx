import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { invoiceService } from '../services/invoiceService';
import type { Invoice, InvoiceFilters, InvoiceStatistics, InvoiceStatus } from '../types/invoice';

type PaymentMode = 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER';

interface PaymentFormData {
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  bankReference?: string;
}

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

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  // Credit Note modal state
  const [showCNModal, setShowCNModal] = useState(false);
  const [cnData, setCnData] = useState({ amount: 0, reason: '' });
  const [processingCN, setProcessingCN] = useState(false);

  // Debit Note modal state
  const [showDNModal, setShowDNModal] = useState(false);
  const [dnData, setDnData] = useState({ amount: 0, reason: '' });
  const [processingDN, setProcessingDN] = useState(false);

  // Add Charge modal state
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeData, setChargeData] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    reason: '',
  });
  const [processingCharge, setProcessingCharge] = useState(false);

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

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.balanceDue || (invoice.totalAmount - invoice.amountPaid),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    if (paymentData.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    try {
      setProcessingPayment(true);
      await invoiceService.recordPayment(selectedInvoice.id, paymentData);
      toast.success('Payment recorded successfully! Receipt Voucher created.');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      await loadInvoices();
      await loadStatistics();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      const message = error.response?.data?.message || 'Failed to record payment. Please try again.';
      toast.error(message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const openCNModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCnData({
      amount: invoice.balanceDue || (invoice.totalAmount - invoice.amountPaid) || 0,
      reason: '',
    });
    setShowCNModal(true);
  };

  const handleCreateCN = async () => {
    if (!selectedInvoice) return;
    if (cnData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!cnData.reason) {
      toast.error('Reason is required');
      return;
    }

    try {
      setProcessingCN(true);
      await invoiceService.createCreditNote(selectedInvoice.id, cnData);
      toast.success('Credit Note created successfully');
      setShowCNModal(false);
      setSelectedInvoice(null);
      await loadInvoices();
      await loadStatistics();
    } catch (error: any) {
      console.error('Failed to create Credit Note:', error);
      toast.error(error.response?.data?.message || 'Failed to create Credit Note');
    } finally {
      setProcessingCN(false);
    }
  };

  const openDNModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDnData({
      amount: 0,
      reason: '',
    });
    setShowDNModal(true);
  };

  const handleCreateDN = async () => {
    if (!selectedInvoice) return;
    if (dnData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!dnData.reason) {
      toast.error('Reason is required');
      return;
    }

    try {
      setProcessingDN(true);
      await invoiceService.createDebitNote(selectedInvoice.id, dnData);
      toast.success('Debit Note created successfully');
      setShowDNModal(false);
      setSelectedInvoice(null);
      await loadInvoices();
      await loadStatistics();
    } catch (error: any) {
      console.error('Failed to create Debit Note:', error);
      toast.error(error.response?.data?.message || 'Failed to create Debit Note');
    } finally {
      setProcessingDN(false);
    }
  };

  const openChargeModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setChargeData({ description: '', quantity: 1, unitPrice: 0, taxRate: 0, reason: '' });
    setShowChargeModal(true);
  };

  const handleAddCharge = async () => {
    if (!selectedInvoice) return;
    if (!chargeData.description) {
      toast.error('Description is required');
      return;
    }
    if (chargeData.unitPrice <= 0) {
      toast.error('Unit price must be greater than 0');
      return;
    }

    try {
      setProcessingCharge(true);
      await invoiceService.addMiscCharge(selectedInvoice.id, {
        description: chargeData.description,
        quantity: chargeData.quantity,
        unitPrice: chargeData.unitPrice,
        taxRate: chargeData.taxRate || undefined,
        reason: chargeData.reason || undefined,
      });
      toast.success('Charge submitted for approval. A second user must approve it before it is applied.');
      setShowChargeModal(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      console.error('Failed to submit charge:', error);
      toast.error(error.response?.data?.message || 'Failed to submit charge');
    } finally {
      setProcessingCharge(false);
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
                to="/cold-store/outward-gate-passes"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                → Outward Gate Passes
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="container mx-auto px-4 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">
              Invoices are generated automatically
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Storage invoices are created when an <strong>Outward Gate Pass</strong> is approved.
              Go to <Link to="/cold-store/outward-gate-passes" className="underline font-medium">Cold Store → Outward Gate Passes</Link> to initiate billing.
            </p>
          </div>
        </div>
      </div>

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
                            {(invoice.status === 'SENT' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE' || invoice.status === 'PAID') && (
                              <>
                                {(invoice.status !== 'PAID' && invoice.status !== 'OVERDUE' ? true : invoice.balanceDue > 0) && (
                                  <button
                                    onClick={() => openPaymentModal(invoice)}
                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                    title="Record Payment"
                                  >
                                    Pay
                                  </button>
                                )}
                                {invoice.invoiceType !== 'CREDIT_NOTE' && (
                                  <button
                                    onClick={() => openCNModal(invoice)}
                                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 ml-2"
                                    title="Create Credit Note"
                                  >
                                    CN
                                  </button>
                                )}
                                {invoice.invoiceType !== 'DEBIT_NOTE' && (
                                  <button
                                    onClick={() => openDNModal(invoice)}
                                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 ml-2"
                                    title="Create Debit Note"
                                  >
                                    DN
                                  </button>
                                )}
                                <button
                                  onClick={() => openChargeModal(invoice)}
                                  className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 ml-2"
                                  title="Add Miscellaneous Charge"
                                >
                                  +Charge
                                </button>
                              </>
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

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Invoice: {selectedInvoice.invoiceNumber} |
              Balance: {formatCurrency(selectedInvoice.balanceDue || (selectedInvoice.totalAmount - selectedInvoice.amountPaid))}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Mode</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={paymentData.paymentMode}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value as PaymentMode })}
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              {paymentData.paymentMode === 'CHEQUE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cheque Number</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={paymentData.chequeNumber || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, chequeNumber: e.target.value })}
                      placeholder="CHQ-123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cheque Date</label>
                    <input
                      type="date"
                      className="w-full border rounded-md px-3 py-2"
                      value={paymentData.chequeDate || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, chequeDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={paymentData.bankName || ''}
                      onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                      placeholder="HBL, MCB, etc."
                    />
                  </div>
                </>
              )}

              {paymentData.paymentMode === 'ONLINE_TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Reference</label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    value={paymentData.bankReference || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, bankReference: e.target.value })}
                    placeholder="Transaction ID"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {showCNModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Create Credit Note</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Invoice: {selectedInvoice.invoiceNumber}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2"
                  value={cnData.amount}
                  onChange={(e) => setCnData({ ...cnData, amount: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current Balance: {formatCurrency(selectedInvoice.balanceDue || (selectedInvoice.totalAmount - selectedInvoice.amountPaid))}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2"
                  value={cnData.reason}
                  onChange={(e) => setCnData({ ...cnData, reason: e.target.value })}
                  placeholder="Reason for return/adjustment..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCNModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
                disabled={processingCN}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCN}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                disabled={processingCN}
              >
                {processingCN ? 'Creating...' : 'Create Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debit Note Modal */}
      {showDNModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Create Debit Note</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Invoice: {selectedInvoice.invoiceNumber}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2"
                  value={dnData.amount}
                  onChange={(e) => setDnData({ ...dnData, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2"
                  value={dnData.reason}
                  onChange={(e) => setDnData({ ...dnData, reason: e.target.value })}
                  placeholder="Reason for adjustment/charge..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDNModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
                disabled={processingDN}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDN}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                disabled={processingDN}
              >
                {processingDN ? 'Creating...' : 'Create Debit Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      {showChargeModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Add Miscellaneous Charge</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Invoice: {selectedInvoice.invoiceNumber}
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-4">
              ⚠ This charge requires approval from a second user before it is applied.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                  value={chargeData.description}
                  onChange={(e) => setChargeData({ ...chargeData, description: e.target.value })}
                  placeholder="Demurrage fee, handling penalty, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2"
                    value={chargeData.quantity}
                    onChange={(e) => setChargeData({ ...chargeData, quantity: Number(e.target.value) })}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price (PKR) *</label>
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2"
                    value={chargeData.unitPrice}
                    onChange={(e) => setChargeData({ ...chargeData, unitPrice: Number(e.target.value) })}
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2"
                  value={chargeData.taxRate}
                  onChange={(e) => setChargeData({ ...chargeData, taxRate: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>

              {chargeData.unitPrice > 0 && (
                <div className="bg-gray-50 rounded-md p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>PKR {(chargeData.quantity * chargeData.unitPrice).toLocaleString()}</span>
                  </div>
                  {chargeData.taxRate > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({chargeData.taxRate}%):</span>
                      <span>PKR {(chargeData.quantity * chargeData.unitPrice * chargeData.taxRate / 100).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t mt-1 pt-1">
                    <span>Total:</span>
                    <span>PKR {(chargeData.quantity * chargeData.unitPrice * (1 + (chargeData.taxRate || 0) / 100)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Reason / Justification</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2"
                  value={chargeData.reason}
                  onChange={(e) => setChargeData({ ...chargeData, reason: e.target.value })}
                  placeholder="Why is this charge being added?"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
                disabled={processingCharge}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCharge}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                disabled={processingCharge}
              >
                {processingCharge ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
