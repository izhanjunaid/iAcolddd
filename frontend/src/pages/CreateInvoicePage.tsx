import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StorageBillingCalculator } from '../components/StorageBillingCalculator';
import { invoiceService } from '../services/invoiceService';
import { customersService } from '../services/customers';
import type { StorageBillingResult } from '../services/billingService';
import { Button } from '../components/ui/Button';

import type { Customer } from '../types/customer';

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [billingResult, setBillingResult] = useState<StorageBillingResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await customersService.getCustomers();
      setCustomers(response.data || response);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCalculationComplete = (result: StorageBillingResult) => {
    setBillingResult(result);
    toast.success('Billing calculated successfully!');
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || !billingResult) {
      toast.error('Please complete all steps');
      return;
    }

    try {
      setCreating(true);

      const invoiceData = {
        customerId: selectedCustomer.id,
        billingData: {
          weight: billingResult.weight,
          dateIn: billingResult.dateIn,
          dateOut: billingResult.dateOut,
          daysStored: billingResult.daysStored,
          ratePerKgPerDay: billingResult.ratePerKgPerDay,
          labourCharges: billingResult.labourCharges,
          loadingCharges: billingResult.loadingCharges,
        },
        referenceNumber: referenceNumber || undefined,
        notes: invoiceNotes || undefined,
      };

      const invoice = await invoiceService.createInvoiceFromBilling(invoiceData);
      toast.success(`Invoice ${invoice.invoiceNumber} created successfully!`);
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const message = error.response?.data?.message || 'Failed to create invoice';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-gray-600 mt-1">Generate a new invoice from storage billing</p>
          </div>
          <Button
            onClick={() => navigate('/invoices')}
            variant="outline"
          >
            ← Back to Invoices
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Select Customer' },
            { num: 2, label: 'Calculate Billing' },
            { num: 3, label: 'Review & Create' },
          ].map((s, index) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }`}
                >
                  {s.num}
                </div>
                <span className="ml-2 font-medium text-gray-700">{s.label}</span>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-4 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Select Customer */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Select Customer</h3>

          {loadingCustomers ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading customers...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedCustomer?.id === customer.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{customer.name}</h4>
                      {customer.contactPerson && (
                        <p className="text-sm text-gray-600 mt-1">
                          Contact: {customer.contactPerson}
                        </p>
                      )}
                      {customer.phone && (
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                      )}
                    </div>
                    {selectedCustomer?.id === customer.id && (
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedCustomer}
            >
              Next: Calculate Billing →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Calculate Billing */}
      {step === 2 && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Customer:</strong> {selectedCustomer?.name}
            </p>
          </div>

          <StorageBillingCalculator
            customerId={selectedCustomer?.id}
            onCalculationComplete={handleCalculationComplete}
          />

          <div className="mt-6 flex justify-between">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
            >
              ← Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!billingResult}
            >
              Next: Review →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && billingResult && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Review Invoice Details</h3>

            {/* Customer Info */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Customer</h4>
              <p className="text-gray-900">{selectedCustomer?.name}</p>
              {selectedCustomer?.contactPerson && (
                <p className="text-sm text-gray-600">Contact: {selectedCustomer.contactPerson}</p>
              )}
            </div>

            {/* Billing Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Billing Summary</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-medium">{billingResult.weight.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Stored:</span>
                  <span className="font-medium">{billingResult.daysStored} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium">PKR {billingResult.ratePerKgPerDay}/kg/day</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Storage Charges:</span>
                  <span className="font-medium">PKR {billingResult.storageCharges.toLocaleString()}</span>
                </div>
                {billingResult.labourCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labour Charges:</span>
                    <span className="font-medium">PKR {billingResult.labourCharges.toLocaleString()}</span>
                  </div>
                )}
                {billingResult.loadingCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loading Charges:</span>
                    <span className="font-medium">PKR {billingResult.loadingCharges.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Subtotal:</span>
                  <span>PKR {billingResult.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>GST ({billingResult.gstRate}%):</span>
                  <span>+ PKR {billingResult.gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>WHT ({billingResult.whtRate}%):</span>
                  <span>- PKR {billingResult.whtAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">PKR {billingResult.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., PO-12345, GDN-67890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Add any additional notes for the invoice..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
            >
              ← Back to Calculator
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={creating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {creating ? 'Creating Invoice...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoicePage;
