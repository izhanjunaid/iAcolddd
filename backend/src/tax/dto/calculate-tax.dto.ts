import { IsNumber, IsOptional, IsString, IsUUID, IsEnum, Min } from 'class-validator';
import { TaxType } from '../../common/enums/tax-type.enum';

export class CalculateTaxDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(TaxType)
  taxType: TaxType;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  transactionType?: string;
}

export class CalculateInvoiceTaxDto {
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsUUID()
  customerId: string;

  @IsOptional()
  items?: Array<{
    productId: string;
    amount: number;
  }>;
}

export class TaxCalculationResult {
  taxType: TaxType;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  isExempt: boolean;
  exemptionReason?: string;
  appliedRate?: {
    id: string;
    name: string;
    rate: number;
  };
}

export class InvoiceTaxCalculationResult {
  subtotal: number;
  gstAmount: number;
  whtAmount: number;
  incomeTaxAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  taxBreakdown: TaxCalculationResult[];
}
