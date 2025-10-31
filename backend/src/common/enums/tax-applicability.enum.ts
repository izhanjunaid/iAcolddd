/**
 * Tax Applicability Enum
 * Defines how tax is applied
 */
export enum TaxApplicability {
  ALL = 'ALL',                    // Apply to all transactions
  REGISTERED = 'REGISTERED',      // Only for GST-registered customers
  UNREGISTERED = 'UNREGISTERED',  // Only for non-registered customers
  COMPANY = 'COMPANY',            // Only for companies
  INDIVIDUAL = 'INDIVIDUAL',      // Only for individuals
  IMPORT = 'IMPORT',              // Import transactions
  EXPORT = 'EXPORT',              // Export transactions
  LOCAL = 'LOCAL',                // Local transactions
}

/**
 * Entity Type for Tax Configuration
 */
export enum TaxEntityType {
  CUSTOMER = 'CUSTOMER',
  PRODUCT = 'PRODUCT',
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY',
  TRANSACTION = 'TRANSACTION',
}
