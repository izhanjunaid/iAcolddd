import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calculator, DollarSign, Receipt } from 'lucide-react';
import { taxService } from '../services/tax';
import type { TaxType, TaxCalculationResult } from '../types/tax';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { Badge } from './ui/Badge';

interface TaxCalculatorProps {
  onCalculate?: (result: TaxCalculationResult) => void;
}

interface CalculatorForm {
  amount: number;
  taxType: TaxType;
  customerId?: string;
  productId?: string;
}

export function TaxCalculator({ onCalculate }: TaxCalculatorProps) {
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CalculatorForm>({
    defaultValues: {
      taxType: 'GST' as TaxType,
    },
  });

  const watchTaxType = watch('taxType');

  const handleCalculate = async (data: CalculatorForm) => {
    try {
      setCalculating(true);
      const calculationResult = await taxService.calculateTax({
        amount: data.amount,
        taxType: data.taxType,
        customerId: data.customerId || undefined,
        productId: data.productId || undefined,
      });

      setResult(calculationResult);
      onCalculate?.(calculationResult);
    } catch (err: any) {
      console.error('Failed to calculate tax:', err);
      alert(err.response?.data?.message || 'Failed to calculate tax');
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tax Calculator
        </CardTitle>
        <CardDescription>
          Calculate taxes for any amount with Pakistan FBR rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(handleCalculate)} className="space-y-4">
          <div>
            <Label htmlFor="calc-amount">Amount (PKR) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="calc-amount"
                type="number"
                step="0.01"
                min="0"
                className="pl-10"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' },
                  valueAsNumber: true,
                })}
                placeholder="100000.00"
              />
            </div>
            {errors.amount && (
              <span className="text-sm text-destructive">{errors.amount.message}</span>
            )}
          </div>

          <div>
            <Label htmlFor="calc-taxType">Tax Type *</Label>
            <Select value={watchTaxType} onValueChange={(value) => setValue('taxType', value as TaxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GST">GST (General Sales Tax)</SelectItem>
                <SelectItem value="WHT">WHT (Withholding Tax)</SelectItem>
                <SelectItem value="INCOME_TAX">Income Tax</SelectItem>
                <SelectItem value="PROVINCIAL_TAX">Provincial Tax</SelectItem>
                <SelectItem value="CUSTOM_DUTY">Custom Duty</SelectItem>
                <SelectItem value="EXCISE_DUTY">Excise Duty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="calc-customerId">Customer ID (Optional)</Label>
            <Input
              id="calc-customerId"
              {...register('customerId')}
              placeholder="UUID of customer for specific rate"
            />
            <span className="text-xs text-muted-foreground">
              Leave empty to use default tax rate
            </span>
          </div>

          <div>
            <Label htmlFor="calc-productId">Product ID (Optional)</Label>
            <Input
              id="calc-productId"
              {...register('productId')}
              placeholder="UUID of product for specific rate"
            />
            <span className="text-xs text-muted-foreground">
              Leave empty to use default tax rate
            </span>
          </div>

          <Button type="submit" className="w-full" disabled={calculating}>
            {calculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Tax
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-6 border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Calculation Result</h4>
              <Badge variant={result.isExempt ? 'secondary' : 'default'}>
                {result.isExempt ? 'Tax Exempt' : `${result.taxRate}%`}
              </Badge>
            </div>

            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Taxable Amount:</span>
                <span className="font-medium">{formatCurrency(result.taxableAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tax Rate:</span>
                <span className="font-medium">{result.taxRate}%</span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Tax Amount:</span>
                <span className="font-bold text-lg">{formatCurrency(result.taxAmount)}</span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Grand Total:</span>
                <span className="font-bold text-lg text-primary">
                  {formatCurrency(result.taxableAmount + result.taxAmount)}
                </span>
              </div>

              {result.isExempt && result.exemptionReason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <Receipt className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-yellow-900">Tax Exempt</div>
                      <div className="text-xs text-yellow-700 mt-1">{result.exemptionReason}</div>
                    </div>
                  </div>
                </div>
              )}

              {result.appliedRate && !result.isExempt && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">Applied Rate:</div>
                    <div className="text-xs text-blue-700 mt-1">
                      {result.appliedRate.name} ({result.appliedRate.rate}%)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2">
              Calculation performed at {new Date().toLocaleString('en-PK')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
