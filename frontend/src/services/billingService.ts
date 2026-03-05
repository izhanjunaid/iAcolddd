import api from './api';

// Billing calculation types
export enum RateType {
  DAILY = 'DAILY',
  SEASONAL = 'SEASONAL',
  MONTHLY = 'MONTHLY',
}

export interface CalculateStorageBillingDto {
  weight: number;
  dateIn: Date | string;
  dateOut: Date | string;
  ratePerKgPerDay?: number;
  rateType?: RateType;
  customerId?: string;
  productCategoryId?: string;
  labourChargesIn?: number;
  labourChargesOut?: number;
  loadingCharges?: number;
  otherCharges?: number;
  applyGst?: boolean;
  applyWht?: boolean;
}

export interface StorageBillingResult {
  weight: number;
  daysStored: number;
  ratePerKgPerDay: number;
  storageCharges: number;
  labourCharges: number;
  loadingCharges: number;
  otherCharges: number;
  subtotal: number;
  gstAmount: number;
  gstRate: number;
  whtAmount: number;
  whtRate: number;
  totalAmount: number;
  dateIn: string;
  dateOut: string;
  breakdown: {
    storageCalculation: string;
    labourCalculation: string;
    taxCalculation: string;
  };
}

// Calculate storage billing
async function calculateStorageBilling(data: CalculateStorageBillingDto): Promise<StorageBillingResult> {
  const response = await api.post('/billing/calculate-storage', data);
  return response.data;
}

// Calculate seasonal billing
async function calculateSeasonalBilling(data: CalculateStorageBillingDto): Promise<StorageBillingResult> {
  const response = await api.post('/billing/calculate-storage/seasonal', data);
  return response.data;
}

// Calculate monthly billing
async function calculateMonthlyBilling(data: CalculateStorageBillingDto): Promise<StorageBillingResult> {
  const response = await api.post('/billing/calculate-storage/monthly', data);
  return response.data;
}

// Run month-end accrual
async function runAccrual(periodEndDate: string): Promise<any> {
  const response = await api.post('/billing/accruals/run', { periodEndDate });
  return response.data;
}

// Reverse an accrual
async function reverseAccrual(originalVoucherId: string, reversalDate: string): Promise<any> {
  const response = await api.post('/billing/accruals/reverse', { originalVoucherId, reversalDate });
  return response.data;
}

export const billingService = {
  calculateStorageBilling,
  calculateSeasonalBilling,
  calculateMonthlyBilling,
  runAccrual,
  reverseAccrual,
};

export default billingService;
