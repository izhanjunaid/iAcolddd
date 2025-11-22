import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { financialStatementsService } from '../services/financialStatementsService';
import type { FinancialAnalysis } from '../types/financialStatements';
import { BarChart3, TrendingUp, DollarSign, Activity, PieChart, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export const FinancialAnalysisPage = () => {
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [periodStart, setPeriodStart] = useState<string>(() => {
    const date = new Date();
    date.setMonth(0, 1); // January 1st of current year
    return date.toISOString().split('T')[0];
  });

  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const performAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await financialStatementsService.performFinancialAnalysis({
        periodStart,
        periodEnd,
        includeTrends: false,
      });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to perform financial analysis');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);

    try {
      await financialStatementsService.exportFinancialAnalysisPdf({
        periodStart,
        periodEnd,
        includeTrends: false,
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRatioColor = (value: number, benchmarks: { good: number; warning: number }, higherIsBetter: boolean = true) => {
    if (higherIsBetter) {
      if (value >= benchmarks.good) return 'text-green-600 bg-green-50';
      if (value >= benchmarks.warning) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    } else {
      if (value <= benchmarks.good) return 'text-green-600 bg-green-50';
      if (value <= benchmarks.warning) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Financial Analysis
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
            <CardTitle>Perform Financial Analysis</CardTitle>
            <CardDescription>
              Comprehensive ratio analysis and financial metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              <div className="flex items-end gap-2">
                <Button onClick={performAnalysis} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Perform Analysis'}
                </Button>
                {analysis && (
                  <Button onClick={exportPdf} disabled={exportingPdf} variant="outline">
                    <FileDown className="h-4 w-4 mr-2" />
                    {exportingPdf ? 'Exporting...' : 'Export PDF'}
                  </Button>
                )}
              </div>
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

        {analysis && (
          <>
            {/* Liquidity Ratios */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Liquidity Ratios
                </CardTitle>
                <CardDescription>
                  Ability to meet short-term obligations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.liquidity.currentRatio, { good: 2, warning: 1 })}`}>
                    <div className="text-sm font-medium mb-1">Current Ratio</div>
                    <div className="text-3xl font-bold">{analysis.liquidity.currentRatio.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 2.0</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.liquidity.quickRatio, { good: 1, warning: 0.5 })}`}>
                    <div className="text-sm font-medium mb-1">Quick Ratio</div>
                    <div className="text-3xl font-bold">{analysis.liquidity.quickRatio.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 1.0</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.liquidity.cashRatio, { good: 0.5, warning: 0.2 })}`}>
                    <div className="text-sm font-medium mb-1">Cash Ratio</div>
                    <div className="text-3xl font-bold">{analysis.liquidity.cashRatio.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 0.5</div>
                  </div>

                  <div className={`p-4 rounded-lg ${analysis.liquidity.workingCapital >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    <div className="text-sm font-medium mb-1">Working Capital</div>
                    <div className="text-2xl font-bold">{formatCurrency(analysis.liquidity.workingCapital)}</div>
                    <div className="text-xs mt-1 opacity-80">Positive is good</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profitability Ratios */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Profitability Ratios
                </CardTitle>
                <CardDescription>
                  Ability to generate profit from operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.grossProfitMargin, { good: 30, warning: 20 })}`}>
                    <div className="text-sm font-medium mb-1">Gross Profit Margin</div>
                    <div className="text-3xl font-bold">{analysis.profitability.grossProfitMargin.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 30%</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.operatingMargin, { good: 15, warning: 10 })}`}>
                    <div className="text-sm font-medium mb-1">Operating Margin</div>
                    <div className="text-3xl font-bold">{analysis.profitability.operatingMargin.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 15%</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.netProfitMargin, { good: 10, warning: 5 })}`}>
                    <div className="text-sm font-medium mb-1">Net Profit Margin</div>
                    <div className="text-3xl font-bold">{analysis.profitability.netProfitMargin.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 10%</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.returnOnAssets, { good: 10, warning: 5 })}`}>
                    <div className="text-sm font-medium mb-1">Return on Assets (ROA)</div>
                    <div className="text-3xl font-bold">{analysis.profitability.returnOnAssets.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 10%</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.returnOnEquity, { good: 15, warning: 10 })}`}>
                    <div className="text-sm font-medium mb-1">Return on Equity (ROE)</div>
                    <div className="text-3xl font-bold">{analysis.profitability.returnOnEquity.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 15%</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.profitability.returnOnInvestment, { good: 12, warning: 8 })}`}>
                    <div className="text-sm font-medium mb-1">Return on Investment (ROI)</div>
                    <div className="text-3xl font-bold">{analysis.profitability.returnOnInvestment.toFixed(2)}%</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 12%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Ratios */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Efficiency Ratios
                </CardTitle>
                <CardDescription>
                  How effectively assets are being used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.efficiency.assetTurnover, { good: 1, warning: 0.5 })}`}>
                    <div className="text-sm font-medium mb-1">Asset Turnover</div>
                    <div className="text-3xl font-bold">{analysis.efficiency.assetTurnover.toFixed(2)}x</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 1.0x</div>
                  </div>

                  {analysis.efficiency.inventoryTurnover !== undefined && (
                    <div className="p-4 rounded-lg bg-purple-50 text-purple-600">
                      <div className="text-sm font-medium mb-1">Inventory Turnover</div>
                      <div className="text-3xl font-bold">{analysis.efficiency.inventoryTurnover.toFixed(2)}x</div>
                      <div className="text-xs mt-1 opacity-80">Higher is better</div>
                    </div>
                  )}

                  {analysis.efficiency.receivablesTurnover !== undefined && (
                    <div className="p-4 rounded-lg bg-purple-50 text-purple-600">
                      <div className="text-sm font-medium mb-1">Receivables Turnover</div>
                      <div className="text-3xl font-bold">{analysis.efficiency.receivablesTurnover.toFixed(2)}x</div>
                      <div className="text-xs mt-1 opacity-80">Higher is better</div>
                    </div>
                  )}

                  {analysis.efficiency.payablesTurnover !== undefined && (
                    <div className="p-4 rounded-lg bg-purple-50 text-purple-600">
                      <div className="text-sm font-medium mb-1">Payables Turnover</div>
                      <div className="text-3xl font-bold">{analysis.efficiency.payablesTurnover.toFixed(2)}x</div>
                      <div className="text-xs mt-1 opacity-80">Balanced is ideal</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Solvency Ratios */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-orange-600" />
                  Solvency Ratios
                </CardTitle>
                <CardDescription>
                  Long-term financial stability and debt capacity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.solvency.debtToAssets, { good: 0.4, warning: 0.6 }, false)}`}>
                    <div className="text-sm font-medium mb-1">Debt-to-Assets</div>
                    <div className="text-3xl font-bold">{analysis.solvency.debtToAssets.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≤ 0.4</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.solvency.debtToEquity, { good: 1, warning: 2 }, false)}`}>
                    <div className="text-sm font-medium mb-1">Debt-to-Equity</div>
                    <div className="text-3xl font-bold">{analysis.solvency.debtToEquity.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≤ 1.0</div>
                  </div>

                  <div className={`p-4 rounded-lg ${getRatioColor(analysis.solvency.equityRatio, { good: 0.5, warning: 0.3 })}`}>
                    <div className="text-sm font-medium mb-1">Equity Ratio</div>
                    <div className="text-3xl font-bold">{analysis.solvency.equityRatio.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-80">Target: ≥ 0.5</div>
                  </div>

                  {analysis.solvency.interestCoverage !== undefined && (
                    <div className={`p-4 rounded-lg ${getRatioColor(analysis.solvency.interestCoverage, { good: 3, warning: 1.5 })}`}>
                      <div className="text-sm font-medium mb-1">Interest Coverage</div>
                      <div className="text-3xl font-bold">{analysis.solvency.interestCoverage.toFixed(2)}x</div>
                      <div className="text-xs mt-1 opacity-80">Target: ≥ 3.0x</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Period:</strong> {new Date(analysis.period.start).toLocaleDateString()} to{' '}
                    {new Date(analysis.period.end).toLocaleDateString()}
                  </p>
                  <p className="mt-4 text-muted-foreground">
                    This analysis provides a comprehensive view of your company's financial health across four key dimensions:
                    liquidity (short-term obligations), profitability (earnings generation), efficiency (asset utilization),
                    and solvency (long-term stability).
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};
