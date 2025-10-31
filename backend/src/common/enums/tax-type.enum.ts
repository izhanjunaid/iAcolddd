/**
 * Tax Type Enum
 * Defines the different types of taxes used in Pakistan
 */
export enum TaxType {
  GST = 'GST',                    // General Sales Tax (17-18%)
  WHT = 'WHT',                    // Withholding Tax (0.1%, 1%, 4%, etc.)
  INCOME_TAX = 'INCOME_TAX',      // Income Tax
  PROVINCIAL_TAX = 'PROVINCIAL_TAX', // Provincial Sales Tax
  CUSTOM_DUTY = 'CUSTOM_DUTY',    // Import/Export Duty
  EXCISE_DUTY = 'EXCISE_DUTY',    // Excise Duty
}

/**
 * Get display name for tax type
 */
export function getTaxTypeName(type: TaxType): string {
  const names = {
    [TaxType.GST]: 'General Sales Tax (GST)',
    [TaxType.WHT]: 'Withholding Tax (WHT)',
    [TaxType.INCOME_TAX]: 'Income Tax',
    [TaxType.PROVINCIAL_TAX]: 'Provincial Sales Tax',
    [TaxType.CUSTOM_DUTY]: 'Custom Duty',
    [TaxType.EXCISE_DUTY]: 'Excise Duty',
  };
  return names[type];
}
