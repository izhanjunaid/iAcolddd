import React, { useState, useEffect } from 'react';
import { billingService, RateType } from '../services/billingService';
import type { CalculateStorageBillingDto, StorageBillingResult } from '../services/billingService';
import { Button } from './ui/Button';

interface StorageBillingCalculatorProps {
  onCalculationComplete?: (result: StorageBillingResult) => void;
  initialData?: Partial<CalculateStorageBillingDto>;
  customerId?: string;
}

export const StorageBillingCalculator: React.FC<StorageBillingCalculatorProps> = ({
  onCalculationComplete,
  initialData,
  customerId,
}) => {
  const [formData, setFormData] = useState<CalculateStorageBillingDto>({
    weight: initialData?.weight || 0,
    dateIn: initialData?.dateIn || '',
    dateOut: initialData?.dateOut || '',
    ratePerKgPerDay: initialData?.ratePerKgPerDay,
    rateType: initialData?.rateType,
    labourChargesIn: initialData?.labourChargesIn || 0,
    labourChargesOut: initialData?.labourChargesOut || 0,
    loadingCharges: initialData?.loadingCharges || 0,
    otherCharges: initialData?.otherCharges || 0,
    applyGst: initialData?.applyGst !== false,
    applyWht: initialData?.applyWht !== false,
    customerId: customerId || initialData?.customerId,
  });

  const [result, setResult] = useState<StorageBillingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateBilling = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.weight || formData.weight <= 0) {
        throw new Error('Weight must be greater than 0');
      }
      if (!formData.dateIn) {
        throw new Error('Date In is required');
      }
      if (!formData.dateOut) {
        throw new Error('Date Out is required');
      }

      const calculationResult = await billingService.calculateStorageBilling(formData);
      setResult(calculationResult);

      if (onCalculationComplete) {
        onCalculationComplete(calculationResult);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to calculate billing');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Storage Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg) *
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Date In */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date In *
            </label>
            <input
              type="date"
              name="dateIn"
              value={formData.dateIn as string}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Date Out */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Out *
            </label>
            <input
              type="date"
              name="dateOut"
              value={formData.dateOut as string}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Rate Per Kg Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate (PKR/kg/day)
            </label>
            <input
              type="number"
              name="ratePerKgPerDay"
              value={formData.ratePerKgPerDay || ''}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              placeholder="Auto-calculated"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for automatic rate selection</p>
          </div>

          {/* Labour Charges In */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Labour Charges In (PKR)
            </label>
            <input
              type="number"
              name="labourChargesIn"
              value={formData.labourChargesIn}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Labour Charges Out */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Labour Charges Out (PKR)
            </label>
            <input
              type="number"
              name="labourChargesOut"
              value={formData.labourChargesOut}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Loading Charges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loading Charges (PKR)
            </label>
            <input
              type="number"
              name="loadingCharges"
              value={formData.loadingCharges}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Other Charges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Charges (PKR)
            </label>
            <input
              type="number"
              name="otherCharges"
              value={formData.otherCharges}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tax Options */}
        <div className="mt-4 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="applyGst"
              checked={formData.applyGst}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Apply GST (18%)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="applyWht"
              checked={formData.applyWht}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Apply WHT (Withholding Tax)</span>
          </label>
        </div>

        {/* Calculate Button */}
        <div className="mt-6">
          <Button
            onClick={calculateBilling}
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? 'Calculating...' : 'Calculate Billing'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>

          <div className="space-y-4">
            {/* Storage Information */}
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-700 mb-2">Storage Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium">{result.weight.toLocaleString()} kg</span>

                <span className="text-gray-600">Days Stored:</span>
                <span className="font-medium">{result.daysStored} days</span>

                <span className="text-gray-600">Rate:</span>
                <span className="font-medium">PKR {result.ratePerKgPerDay.toFixed(2)}/kg/day</span>
              </div>
            </div>

            {/* Charges Breakdown */}
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-700 mb-2">Charges</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage Charges:</span>
                  <span className="font-medium">PKR {result.storageCharges.toLocaleString()}</span>
                </div>
                {result.labourCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labour Charges:</span>
                    <span className="font-medium">PKR {result.labourCharges.toLocaleString()}</span>
                  </div>
                )}
                {result.loadingCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loading Charges:</span>
                    <span className="font-medium">PKR {result.loadingCharges.toLocaleString()}</span>
                  </div>
                )}
                {result.otherCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Charges:</span>
                    <span className="font-medium">PKR {result.otherCharges.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Subtotal:</span>
                  <span>PKR {result.subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-700 mb-2">Taxes</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">GST ({result.gstRate}%):</span>
                  <span className="font-medium text-green-600">+ PKR {result.gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">WHT ({result.whtRate}%):</span>
                  <span className="font-medium text-red-600">- PKR {result.whtAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  PKR {result.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Calculation Details</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p>{result.breakdown.storageCalculation}</p>
                <p>{result.breakdown.labourCalculation}</p>
                <p>{result.breakdown.taxCalculation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageBillingCalculator;
