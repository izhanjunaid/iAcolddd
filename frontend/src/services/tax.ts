import { api } from './api';
import type {
  TaxRate,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  QueryTaxRatesDto,
  TaxRatesResponse,
  TaxCalculationRequest,
  TaxCalculationResult,
  InvoiceTaxCalculationRequest,
  InvoiceTaxCalculationResult,
  TaxConfiguration,
  CreateTaxConfigurationDto,
  TaxEntityType,
} from '../types/tax';

export const taxService = {
  // ==========================================
  // TAX RATE MANAGEMENT
  // ==========================================

  /**
   * Get all tax rates with pagination and filtering
   */
  async getTaxRates(query: QueryTaxRatesDto = {}): Promise<TaxRatesResponse> {
    const response = await api.get<TaxRatesResponse>('/tax/rates', {
      params: query,
    });
    return response.data;
  },

  /**
   * Get a single tax rate by ID
   */
  async getTaxRate(id: string): Promise<TaxRate> {
    const response = await api.get<TaxRate>(`/tax/rates/${id}`);
    return response.data;
  },

  /**
   * Create a new tax rate
   */
  async createTaxRate(data: CreateTaxRateDto): Promise<TaxRate> {
    const response = await api.post<TaxRate>('/tax/rates', data);
    return response.data;
  },

  /**
   * Update a tax rate
   */
  async updateTaxRate(id: string, data: UpdateTaxRateDto): Promise<TaxRate> {
    const response = await api.patch<TaxRate>(`/tax/rates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a tax rate
   */
  async deleteTaxRate(id: string): Promise<void> {
    await api.delete(`/tax/rates/${id}`);
  },

  // ==========================================
  // TAX CALCULATION
  // ==========================================

  /**
   * Calculate tax for a given amount
   */
  async calculateTax(data: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const response = await api.post<TaxCalculationResult>('/tax/calculate', data);
    return response.data;
  },

  /**
   * Calculate all taxes for an invoice
   */
  async calculateInvoiceTaxes(data: InvoiceTaxCalculationRequest): Promise<InvoiceTaxCalculationResult> {
    const response = await api.post<InvoiceTaxCalculationResult>('/tax/calculate-invoice', data);
    return response.data;
  },

  // ==========================================
  // TAX CONFIGURATION (EXEMPTIONS)
  // ==========================================

  /**
   * Create a tax configuration/exemption
   */
  async createTaxConfiguration(data: CreateTaxConfigurationDto): Promise<TaxConfiguration> {
    const response = await api.post<TaxConfiguration>('/tax/configurations', data);
    return response.data;
  },

  /**
   * Get tax configurations for an entity
   */
  async getTaxConfigurationsForEntity(
    entityType: TaxEntityType,
    entityId: string
  ): Promise<TaxConfiguration[]> {
    const response = await api.get<TaxConfiguration[]>(
      `/tax/configurations/${entityType}/${entityId}`
    );
    return response.data;
  },

  /**
   * Delete a tax configuration
   */
  async deleteTaxConfiguration(id: string): Promise<void> {
    await api.delete(`/tax/configurations/${id}`);
  },

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Get default tax rate for a specific tax type
   */
  async getDefaultTaxRate(taxType: string): Promise<TaxRate | null> {
    const response = await this.getTaxRates({
      taxType: taxType as any,
      isActive: true,
      limit: 100,
    });

    const defaultRate = response.data.find((rate) => rate.isDefault);
    return defaultRate || null;
  },

  /**
   * Get active tax rates grouped by type
   */
  async getActiveTaxRatesByType(): Promise<Record<string, TaxRate[]>> {
    const response = await this.getTaxRates({
      isActive: true,
      limit: 100,
    });

    const grouped: Record<string, TaxRate[]> = {};
    response.data.forEach((rate) => {
      if (!grouped[rate.taxType]) {
        grouped[rate.taxType] = [];
      }
      grouped[rate.taxType].push(rate);
    });

    return grouped;
  },
};
