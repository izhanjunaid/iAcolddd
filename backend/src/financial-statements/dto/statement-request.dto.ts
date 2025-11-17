import { IsDate, IsOptional, IsEnum, IsBoolean, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StatementFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum ComparisonType {
  NONE = 'none',
  PRIOR_PERIOD = 'prior-period',
  PRIOR_YEAR = 'prior-year',
  BUDGET = 'budget',
}

/**
 * Base DTO for all financial statement requests
 */
export class BaseStatementRequestDto {
  @ApiProperty({ description: 'Statement period start date' })
  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @ApiProperty({ description: 'Statement period end date' })
  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @ApiPropertyOptional({ description: 'Include previous period comparison', default: false })
  @IsOptional()
  @IsBoolean()
  includeComparison?: boolean;

  @ApiPropertyOptional({ enum: ComparisonType, default: ComparisonType.NONE })
  @IsOptional()
  @IsEnum(ComparisonType)
  comparisonType?: ComparisonType;

  @ApiPropertyOptional({ description: 'Previous period start date (for custom comparison)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  previousPeriodStart?: Date;

  @ApiPropertyOptional({ description: 'Previous period end date (for custom comparison)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  previousPeriodEnd?: Date;

  @ApiPropertyOptional({ description: 'Company/organization name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ enum: StatementFormat, default: StatementFormat.JSON })
  @IsOptional()
  @IsEnum(StatementFormat)
  format?: StatementFormat;

  @ApiPropertyOptional({ description: 'Include only posted vouchers', default: true })
  @IsOptional()
  @IsBoolean()
  postedOnly?: boolean;
}

/**
 * Balance Sheet specific request
 */
export class BalanceSheetRequestDto extends BaseStatementRequestDto {
  @ApiPropertyOptional({ description: 'Include financial metrics', default: true })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;

  @ApiPropertyOptional({ description: 'Show detailed breakdown', default: false })
  @IsOptional()
  @IsBoolean()
  detailed?: boolean;

  @ApiPropertyOptional({ description: 'Include zero-balance accounts', default: false })
  @IsOptional()
  @IsBoolean()
  includeZeroBalances?: boolean;
}

/**
 * Income Statement specific request
 */
export class IncomeStatementRequestDto extends BaseStatementRequestDto {
  @ApiPropertyOptional({ description: 'Use multi-step format', default: true })
  @IsOptional()
  @IsBoolean()
  multiStep?: boolean;

  @ApiPropertyOptional({ description: 'Include EBITDA calculation', default: true })
  @IsOptional()
  @IsBoolean()
  includeEbitda?: boolean;

  @ApiPropertyOptional({ description: 'Tax rate for calculations (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Number of shares for EPS calculation' })
  @IsOptional()
  @IsNumber()
  sharesOutstanding?: number;

  @ApiPropertyOptional({ description: 'Include profit margins', default: true })
  @IsOptional()
  @IsBoolean()
  includeMargins?: boolean;
}

/**
 * Cash Flow Statement specific request
 */
export class CashFlowStatementRequestDto extends BaseStatementRequestDto {
  @ApiPropertyOptional({ description: 'Use indirect method', default: true })
  @IsOptional()
  @IsBoolean()
  indirectMethod?: boolean;

  @ApiPropertyOptional({ description: 'Include cash flow metrics', default: true })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;

  @ApiPropertyOptional({ description: 'Capital expenditure for free cash flow calculation' })
  @IsOptional()
  @IsNumber()
  capitalExpenditure?: number;
}

/**
 * Financial Analysis request
 */
export class FinancialAnalysisRequestDto {
  @ApiProperty({ description: 'Analysis period start date' })
  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @ApiProperty({ description: 'Analysis period end date' })
  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @ApiPropertyOptional({ description: 'Include trend analysis', default: false })
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean;

  @ApiPropertyOptional({ description: 'Number of shares for per-share calculations' })
  @IsOptional()
  @IsNumber()
  sharesOutstanding?: number;

  @ApiPropertyOptional({ description: 'Annual revenue for efficiency ratios' })
  @IsOptional()
  @IsNumber()
  annualRevenue?: number;
}

/**
 * Export options DTO
 */
export class ExportOptionsDto {
  @ApiProperty({ description: 'Statement type to export' })
  @IsString()
  statementType: 'balance-sheet' | 'income-statement' | 'cash-flow' | 'changes-in-equity';

  @ApiProperty({ description: 'Statement period start date' })
  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @ApiProperty({ description: 'Statement period end date' })
  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @ApiProperty({ enum: StatementFormat })
  @IsEnum(StatementFormat)
  format: StatementFormat;

  @ApiPropertyOptional({ description: 'Include comparison' })
  @IsOptional()
  @IsBoolean()
  includeComparison?: boolean;

  @ApiPropertyOptional({ description: 'File name (without extension)' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Company logo URL for PDF export' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Additional notes for statement' })
  @IsOptional()
  @IsString()
  notes?: string;
}
