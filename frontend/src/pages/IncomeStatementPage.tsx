import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { financialStatementsService } from '../services/financialStatementsService';
import type { IncomeStatement } from '../types/financialStatements';
import { FileText, TrendingUp, TrendingDown, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export const IncomeStatementPage = () => {
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [periodStart, setPeriodStart] = useState<string>(() => {
    const date = new Date();
    date.setMonth(0, 1); // January 1st of current year
    return date.toISOString().split('T')[0];
  });

  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [includeEbitda, setIncludeEbitda] = useState(true);
  const [includeMargins, setIncludeMargins] = useState(true);
  const [taxRate, setTaxRate] = useState(29);
  const [exportingPdf, setExportingPdf] = useState(false);

  const generateStatement = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await financialStatementsService.generateIncomeStatement({
        periodStart,
        periodEnd,
        multiStep: true,
        includeEbitda,
        includeMargins,
        taxRate,
        postedOnly: true,
      });
      setIncomeStatement(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate income statement');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);

    try {
      await financialStatementsService.exportIncomeStatementPdf({
        periodStart,
        periodEnd,
        multiStep: true,
        includeEbitda,
        includeMargins,
        taxRate,
        postedOnly: true,
      });
      toast.success('PDF exported successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderSection = (section: any, title: string) => {
    if (!section || section.lineItems.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 text-primary">{title}</h3>
        <Table>
          <TableBody>
            {section.lineItems.map((item: any, index: number) => (
              <TableRow key={index} className={item.isBold ? 'font-semibold' : ''}>
                <TableCell className={`pl-${item.level * 4}`}>
                  {item.label}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Income Statement (P&L)
            </h1>
            <div className="flex gap-2">
              <Link to="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Parameters Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Income Statement</CardTitle>
            <CardDescription>
              Profit & Loss Statement for a specific period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEbitda}
                    onChange={(e) => setIncludeEbitda(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">EBITDA</span>
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMargins}
                    onChange={(e) => setIncludeMargins(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Margins</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateStatement} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Income Statement'}
              </Button>
              {incomeStatement && (
                <Button onClick={exportPdf} disabled={exportingPdf} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  {exportingPdf ? 'Exporting...' : 'Export PDF'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {incomeStatement && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{incomeStatement.title}</CardTitle>
              <CardDescription>
                For the period {new Date(incomeStatement.periodStart).toLocaleDateString()} to{' '}
                {new Date(incomeStatement.periodEnd).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Revenue Section */}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 text-primary">REVENUE</h2>
                {renderSection(incomeStatement.revenue.operatingRevenue, 'Operating Revenue')}
                {renderSection(incomeStatement.revenue.otherIncome, 'Other Income')}
                <div className="flex justify-between items-center font-bold text-lg border-t-2 border-primary pt-2 mt-2">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(incomeStatement.revenue.totalRevenue)}</span>
                </div>
              </div>

              {/* Cost of Goods Sold */}
              {incomeStatement.costOfGoodsSold.items.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4 text-primary">COST OF GOODS SOLD</h2>
                  <Table>
                    <TableBody>
                      {incomeStatement.costOfGoodsSold.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.label}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total COGS</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(incomeStatement.costOfGoodsSold.total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Gross Profit */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Gross Profit</h3>
                    {includeMargins && (
                      <p className="text-sm text-muted-foreground">
                        Margin: {incomeStatement.grossProfit.margin.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(incomeStatement.grossProfit.amount)}
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 text-primary">OPERATING EXPENSES</h2>
                {renderSection(incomeStatement.operatingExpenses.administrative, 'Administrative Expenses')}
                {renderSection(incomeStatement.operatingExpenses.selling, 'Selling Expenses')}
                {renderSection(incomeStatement.operatingExpenses.general, 'General Expenses')}
                <div className="flex justify-between items-center font-bold border-t-2 pt-2 mt-2">
                  <span>Total Operating Expenses</span>
                  <span>{formatCurrency(incomeStatement.operatingExpenses.totalOperating)}</span>
                </div>
              </div>

              {/* Operating Income (EBIT) */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Operating Income (EBIT)</h3>
                    {includeMargins && (
                      <p className="text-sm text-muted-foreground">
                        Margin: {incomeStatement.operatingIncome.margin.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(incomeStatement.operatingIncome.amount)}
                  </div>
                </div>
              </div>

              {/* EBITDA */}
              {includeEbitda && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold">EBITDA</h3>
                      <p className="text-sm text-muted-foreground">
                        Earnings Before Interest, Tax, Depreciation & Amortization
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(incomeStatement.ebitda.amount)}
                    </div>
                  </div>
                </div>
              )}

              {/* Other Expenses */}
              {incomeStatement.otherExpenses.total > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4 text-primary">OTHER EXPENSES</h2>
                  {renderSection(incomeStatement.otherExpenses.financial, 'Financial Expenses')}
                  {renderSection(incomeStatement.otherExpenses.other, 'Other Non-Operating Expenses')}
                  <div className="flex justify-between items-center font-bold border-t-2 pt-2 mt-2">
                    <span>Total Other Expenses</span>
                    <span>{formatCurrency(incomeStatement.otherExpenses.total)}</span>
                  </div>
                </div>
              )}

              {/* Income Before Tax */}
              <div className="mb-6">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Income Before Tax</span>
                  <span>{formatCurrency(incomeStatement.tax.taxableIncome)}</span>
                </div>
              </div>

              {/* Tax */}
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <span>Tax ({incomeStatement.tax.taxRate}%)</span>
                  <span>{formatCurrency(incomeStatement.tax.taxAmount)}</span>
                </div>
              </div>

              {/* Net Income */}
              <div className={`p-4 rounded-lg ${incomeStatement.netIncome.amount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      Net Income
                      {incomeStatement.netIncome.amount >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                    </h3>
                    {includeMargins && (
                      <p className="text-sm text-muted-foreground">
                        Net Margin: {incomeStatement.netIncome.margin.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className={`text-3xl font-bold ${incomeStatement.netIncome.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(incomeStatement.netIncome.amount)}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              {includeMargins && incomeStatement.metrics && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-bold mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm text-muted-foreground">Gross Margin</div>
                      <div className="text-lg font-bold">{incomeStatement.metrics.grossProfitMargin.toFixed(2)}%</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm text-muted-foreground">Operating Margin</div>
                      <div className="text-lg font-bold">{incomeStatement.metrics.operatingMargin.toFixed(2)}%</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm text-muted-foreground">Net Margin</div>
                      <div className="text-lg font-bold">{incomeStatement.metrics.netProfitMargin.toFixed(2)}%</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm text-muted-foreground">ROS</div>
                      <div className="text-lg font-bold">{incomeStatement.metrics.returnOnSales.toFixed(2)}%</div>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm text-muted-foreground">Expense Ratio</div>
                      <div className="text-lg font-bold">{incomeStatement.metrics.expenseRatio.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};
