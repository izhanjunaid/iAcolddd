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
  TableRow,
} from '../components/ui/Table';
import { financialStatementsService } from '../services/financialStatementsService';
import type { CashFlowStatement } from '../types/financialStatements';
import { FileText, TrendingUp, TrendingDown, DollarSign, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export const CashFlowStatementPage = () => {
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);
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
  const [exportingPdf, setExportingPdf] = useState(false);

  const generateStatement = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await financialStatementsService.generateCashFlowStatement({
        periodStart,
        periodEnd,
        indirectMethod: true,
        includeMetrics,
        postedOnly: true,
      });
      setCashFlow(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate cash flow statement');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);

    try {
      await financialStatementsService.exportCashFlowPdf({
        periodStart,
        periodEnd,
        indirectMethod: true,
        includeMetrics,
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

  const renderLineItems = (items: any[]) => {
    if (!items || items.length === 0) return null;

    return items.map((item, index) => (
      <TableRow key={index}>
        <TableCell className="pl-6">{item.label}</TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(item.amount)}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Cash Flow Statement
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
            <CardTitle>Generate Cash Flow Statement</CardTitle>
            <CardDescription>
              Statement of Cash Flows using the Indirect Method
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
            </div>
            <div className="flex gap-2">
              <Button onClick={generateStatement} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Cash Flow Statement'}
              </Button>
              {cashFlow && (
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

        {cashFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{cashFlow.title}</CardTitle>
              <CardDescription>
                For the period {new Date(cashFlow.periodStart).toLocaleDateString()} to{' '}
                {new Date(cashFlow.periodEnd).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Operating Activities */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-blue-600">CASH FLOWS FROM OPERATING ACTIVITIES</h2>
                <Table>
                  <TableBody>
                    <TableRow className="font-semibold">
                      <TableCell>Net Income</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(cashFlow.operatingActivities.netIncome)}
                      </TableCell>
                    </TableRow>

                    {cashFlow.operatingActivities.adjustments.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold text-sm text-muted-foreground pt-4">
                            Adjustments to reconcile net income:
                          </TableCell>
                        </TableRow>
                        {renderLineItems(cashFlow.operatingActivities.adjustments)}
                      </>
                    )}

                    {cashFlow.operatingActivities.workingCapitalChanges.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold text-sm text-muted-foreground pt-4">
                            Changes in working capital:
                          </TableCell>
                        </TableRow>
                        {renderLineItems(cashFlow.operatingActivities.workingCapitalChanges)}
                      </>
                    )}

                    <TableRow className="font-bold border-t-2 border-blue-600 bg-blue-50">
                      <TableCell>Net Cash from Operating Activities</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">
                        {formatCurrency(cashFlow.operatingActivities.netCashFromOperating)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Investing Activities */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-purple-600">CASH FLOWS FROM INVESTING ACTIVITIES</h2>
                <Table>
                  <TableBody>
                    {cashFlow.investingActivities.items.length > 0 ? (
                      <>
                        {renderLineItems(cashFlow.investingActivities.items)}
                        <TableRow className="font-bold border-t-2 border-purple-600 bg-purple-50">
                          <TableCell>Net Cash from Investing Activities</TableCell>
                          <TableCell className="text-right font-mono text-purple-600">
                            {formatCurrency(cashFlow.investingActivities.netCashFromInvesting)}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No investing activities during this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Financing Activities */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-green-600">CASH FLOWS FROM FINANCING ACTIVITIES</h2>
                <Table>
                  <TableBody>
                    {cashFlow.financingActivities.items.length > 0 ? (
                      <>
                        {renderLineItems(cashFlow.financingActivities.items)}
                        <TableRow className="font-bold border-t-2 border-green-600 bg-green-50">
                          <TableCell>Net Cash from Financing Activities</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(cashFlow.financingActivities.netCashFromFinancing)}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No financing activities during this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Cash Summary */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <h2 className="text-xl font-bold mb-4">CASH SUMMARY</h2>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Net Change in Cash</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {cashFlow.cashSummary.netCashChange >= 0 ? (
                          <span className="text-green-600 flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {formatCurrency(cashFlow.cashSummary.netCashChange)}
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center justify-end gap-1">
                            <TrendingDown className="h-4 w-4" />
                            {formatCurrency(cashFlow.cashSummary.netCashChange)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cash at Beginning of Period</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(cashFlow.cashSummary.cashBeginning)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-bold text-lg border-t-2">
                      <TableCell>Cash at End of Period</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(cashFlow.cashSummary.cashEnding)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Cash Flow Metrics */}
              {includeMetrics && cashFlow.metrics && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cash Flow Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Operating Cash Flow Ratio</div>
                      <div className="text-2xl font-bold">{cashFlow.metrics.operatingCashFlowRatio.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Operating CF / Net Income</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Free Cash Flow</div>
                      <div className="text-2xl font-bold">{formatCurrency(cashFlow.metrics.freeCashFlow)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Operating CF - CapEx</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Cash Flow Margin</div>
                      <div className="text-2xl font-bold">{cashFlow.metrics.cashFlowMargin.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Operating CF / Revenue</div>
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
