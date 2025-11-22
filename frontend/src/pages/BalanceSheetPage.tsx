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
import type { BalanceSheet } from '../types/financialStatements';
import { FileText, Download, CheckCircle, AlertCircle, TrendingUp, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export const BalanceSheetPage = () => {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
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

  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [detailed, setDetailed] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const generateStatement = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await financialStatementsService.generateBalanceSheet({
        periodStart,
        periodEnd,
        includeMetrics,
        detailed,
        includeZeroBalances: false,
        postedOnly: true,
      });
      setBalanceSheet(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);

    try {
      await financialStatementsService.exportBalanceSheetPdf({
        periodStart,
        periodEnd,
        includeMetrics,
        detailed,
        includeZeroBalances: false,
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

  const renderSection = (section: any, isSubsection: boolean = false) => {
    if (!section || section.lineItems.length === 0) return null;

    return (
      <div className={isSubsection ? 'ml-4' : ''}>
        {section.lineItems.map((item: any, index: number) => (
          <TableRow
            key={index}
            className={`${item.isBold ? 'font-semibold' : ''} ${item.level === 0 ? 'font-bold' : ''}`}
          >
            <TableCell
              className={`${item.level === 1 ? 'pl-6' : item.level === 2 ? 'pl-12' : 'pl-2'} ${item.isBold ? 'font-semibold' : ''}`}
              style={{ fontFamily: 'ui-sans-serif, system-ui' }}
            >
              {item.label}
            </TableCell>
            <TableCell className={`text-right tabular-nums ${item.isBold ? 'font-semibold' : ''}`}>
              {formatCurrency(item.amount)}
            </TableCell>
          </TableRow>
        ))}
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
              Balance Sheet
            </h1>
            <div className="flex gap-2">
              <Link to="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Parameters Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Balance Sheet</CardTitle>
            <CardDescription>
              Statement of Financial Position as of a specific date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                <Label htmlFor="periodEnd">As of Date</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMetrics}
                    onChange={(e) => setIncludeMetrics(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include Metrics</span>
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailed}
                    onChange={(e) => setDetailed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Detailed View</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateStatement} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Balance Sheet'}
              </Button>
              {balanceSheet && (
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
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {balanceSheet && (
          <>
            {/* Professional Statement Header */}
            <Card className="mb-8 shadow-lg border-2">
              <CardContent className="pt-8">
                {/* Company Name */}
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    {balanceSheet.companyName || 'YOUR COMPANY NAME'}
                  </h2>
                  <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    STATEMENT OF FINANCIAL POSITION
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    As at {new Date(balanceSheet.periodEnd).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {balanceSheet.isBalanced ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Accounts Balanced
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex items-center gap-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Unbalanced - Difference: {formatCurrency(balanceSheet.balanceDifference || 0)}
                    </span>
                  )}
                </div>

                {/* Main Statement Table */}
                <div className="max-w-4xl mx-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-primary">
                        <TableHead className="font-bold text-base">Note</TableHead>
                        <TableHead className="font-bold text-base text-right tabular-nums">
                          Amount (PKR)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* ASSETS */}
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell colSpan={2} className="font-bold text-lg py-4" style={{ fontFamily: 'Georgia, serif' }}>
                          ASSETS
                        </TableCell>
                      </TableRow>

                      {/* Non-Current Assets */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={2} className="font-semibold text-base py-3 pl-4">
                          Non-Current Assets
                        </TableCell>
                      </TableRow>
                      {renderSection(balanceSheet.assets.nonCurrentAssets)}
                      <TableRow className="border-t border-slate-300 bg-slate-50">
                        <TableCell className="pl-4 font-semibold">Total Non-Current Assets</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(balanceSheet.assets.nonCurrentAssets.subtotal)}
                        </TableCell>
                      </TableRow>

                      {/* Current Assets */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={2} className="font-semibold text-base py-3 pl-4">
                          Current Assets
                        </TableCell>
                      </TableRow>
                      {renderSection(balanceSheet.assets.currentAssets)}
                      <TableRow className="border-t border-slate-300 bg-slate-50">
                        <TableCell className="pl-4 font-semibold">Total Current Assets</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(balanceSheet.assets.currentAssets.subtotal)}
                        </TableCell>
                      </TableRow>

                      {/* Total Assets */}
                      <TableRow className="border-y-2 border-primary bg-blue-50">
                        <TableCell className="font-bold text-base py-4">TOTAL ASSETS</TableCell>
                        <TableCell className="text-right font-bold text-base tabular-nums py-4">
                          {formatCurrency(balanceSheet.assets.totalAssets)}
                        </TableCell>
                      </TableRow>

                      {/* EQUITY AND LIABILITIES */}
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell colSpan={2} className="font-bold text-lg py-4 pt-6" style={{ fontFamily: 'Georgia, serif' }}>
                          EQUITY AND LIABILITIES
                        </TableCell>
                      </TableRow>

                      {/* Equity Section */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={2} className="font-semibold text-base py-3 pl-4">
                          Equity
                        </TableCell>
                      </TableRow>
                      {renderSection(balanceSheet.equity.shareCapital)}
                      {renderSection(balanceSheet.equity.reserves)}
                      <TableRow>
                        <TableCell className="pl-6">Retained Earnings</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(balanceSheet.equity.retainedEarnings)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-6">Current Year Profit/(Loss)</TableCell>
                        <TableCell className={`text-right tabular-nums ${balanceSheet.equity.currentYearProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(balanceSheet.equity.currentYearProfit)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-t border-slate-300 bg-slate-50">
                        <TableCell className="pl-4 font-semibold">Total Equity</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(balanceSheet.equity.totalEquity)}
                        </TableCell>
                      </TableRow>

                      {/* Non-Current Liabilities */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={2} className="font-semibold text-base py-3 pl-4 pt-6">
                          Non-Current Liabilities
                        </TableCell>
                      </TableRow>
                      {balanceSheet.liabilities.nonCurrentLiabilities.lineItems.length > 0 ? (
                        <>
                          {renderSection(balanceSheet.liabilities.nonCurrentLiabilities)}
                          <TableRow className="border-t border-slate-300 bg-slate-50">
                            <TableCell className="pl-4 font-semibold">Total Non-Current Liabilities</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatCurrency(balanceSheet.liabilities.nonCurrentLiabilities.subtotal)}
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="pl-6 text-muted-foreground italic">
                            No non-current liabilities
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Current Liabilities */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={2} className="font-semibold text-base py-3 pl-4">
                          Current Liabilities
                        </TableCell>
                      </TableRow>
                      {renderSection(balanceSheet.liabilities.currentLiabilities)}
                      <TableRow className="border-t border-slate-300 bg-slate-50">
                        <TableCell className="pl-4 font-semibold">Total Current Liabilities</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(balanceSheet.liabilities.currentLiabilities.subtotal)}
                        </TableCell>
                      </TableRow>

                      {/* Total Liabilities */}
                      <TableRow className="border-t-2 bg-slate-100">
                        <TableCell className="pl-4 font-bold">TOTAL LIABILITIES</TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatCurrency(balanceSheet.liabilities.totalLiabilities)}
                        </TableCell>
                      </TableRow>

                      {/* Grand Total */}
                      <TableRow className="border-y-2 border-primary bg-blue-50">
                        <TableCell className="font-bold text-base py-4">TOTAL EQUITY AND LIABILITIES</TableCell>
                        <TableCell className="text-right font-bold text-base tabular-nums py-4">
                          {formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Statement Footer */}
                  <div className="mt-8 text-sm text-muted-foreground">
                    <p className="italic">The accompanying notes form an integral part of these financial statements.</p>
                    <p className="mt-2">Generated on: {new Date(balanceSheet.generatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Metrics & Ratios */}
            {includeMetrics && balanceSheet.metrics && (
              <Card className="shadow-lg border-2">
                <CardHeader className="bg-slate-50">
                  <CardTitle className="flex items-center gap-2 text-xl" style={{ fontFamily: 'Georgia, serif' }}>
                    <TrendingUp className="h-6 w-6" />
                    Key Financial Ratios & Metrics
                  </CardTitle>
                  <CardDescription>Analysis of financial position and liquidity</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Liquidity Metrics */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-base border-b pb-2">Liquidity Ratios</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm font-medium text-blue-900">Working Capital</div>
                          <div className="text-2xl font-bold text-blue-700 tabular-nums">
                            {formatCurrency(balanceSheet.metrics.workingCapital)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Current Assets - Current Liabilities</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-sm font-medium text-green-900">Current Ratio</div>
                          <div className="text-2xl font-bold text-green-700 tabular-nums">
                            {balanceSheet.metrics.currentRatio.toFixed(2)}:1
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {balanceSheet.metrics.currentRatio >= 2 ? 'Excellent' :
                              balanceSheet.metrics.currentRatio >= 1.5 ? 'Good' :
                                balanceSheet.metrics.currentRatio >= 1 ? 'Adequate' : 'Weak'}
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="text-sm font-medium text-emerald-900">Quick Ratio (Acid Test)</div>
                          <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                            {balanceSheet.metrics.quickRatio.toFixed(2)}:1
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {balanceSheet.metrics.quickRatio >= 1 ? 'Healthy' : 'Needs Attention'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Solvency Metrics */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-base border-b pb-2">Solvency Ratios</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-900">Debt-to-Equity Ratio</div>
                          <div className="text-2xl font-bold text-purple-700 tabular-nums">
                            {balanceSheet.metrics.debtToEquityRatio.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {balanceSheet.metrics.debtToEquityRatio <= 1 ? 'Conservative' :
                              balanceSheet.metrics.debtToEquityRatio <= 2 ? 'Moderate' : 'Aggressive'}
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="text-sm font-medium text-indigo-900">Equity Ratio</div>
                          <div className="text-2xl font-bold text-indigo-700 tabular-nums">
                            {((balanceSheet.equity.totalEquity / balanceSheet.assets.totalAssets) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Equity / Total Assets</div>
                        </div>
                        <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                          <div className="text-sm font-medium text-violet-900">Debt Ratio</div>
                          <div className="text-2xl font-bold text-violet-700 tabular-nums">
                            {((balanceSheet.liabilities.totalLiabilities / balanceSheet.assets.totalAssets) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Total Debt / Total Assets</div>
                        </div>
                      </div>
                    </div>

                    {/* Profitability Metrics */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-base border-b pb-2">Profitability Ratios</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="text-sm font-medium text-amber-900">Return on Assets (ROA)</div>
                          <div className="text-2xl font-bold text-amber-700 tabular-nums">
                            {balanceSheet.metrics.returnOnAssets.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Net Income / Total Assets</div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-sm font-medium text-orange-900">Return on Equity (ROE)</div>
                          <div className="text-2xl font-bold text-orange-700 tabular-nums">
                            {balanceSheet.metrics.returnOnEquity.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Net Income / Total Equity</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-sm font-medium text-red-900">Asset Utilization</div>
                          <div className="text-2xl font-bold text-red-700 tabular-nums">
                            {((balanceSheet.equity.currentYearProfit / balanceSheet.assets.totalAssets) * 100).toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Profit / Assets</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interpretation Guide */}
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      <strong>Note:</strong> Financial ratios provide insights into liquidity, solvency, and profitability.
                      Industry benchmarks and historical trends should be considered for comprehensive analysis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};
