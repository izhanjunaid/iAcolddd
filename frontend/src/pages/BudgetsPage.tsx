import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { budgetsApi } from '../services/budgetsService';
import type { BudgetVsActualRow } from '../services/budgetsService';
import { fiscalPeriodsApi } from '../services/fiscal-periods';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BudgetsPage: React.FC = () => {
    const [fiscalYears, setFiscalYears] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [report, setReport] = useState<BudgetVsActualRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fiscalPeriodsApi.getFiscalYears().then(res => {
            const years = res.data || res;
            setFiscalYears(Array.isArray(years) ? years : []);
        });
    }, []);

    const loadReport = async (yearId: string) => {
        setSelectedYear(yearId);
        setLoading(true);
        try {
            const data = await budgetsApi.getBudgetVsActual(yearId);
            setReport(data);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const varianceColor = (v: number) => {
        if (v > 0) return 'text-green-600';
        if (v < 0) return 'text-red-600';
        return '';
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Budget vs Actual</h1>

            <div className="flex items-center gap-4">
                <select value={selectedYear} onChange={e => loadReport(e.target.value)}
                    className="border rounded px-3 py-2 text-sm min-w-[200px]">
                    <option value="">Select Fiscal Year</option>
                    {fiscalYears.map((fy: any) => (
                        <option key={fy.id} value={fy.id}>{fy.yearName || fy.name || fy.year}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p className="text-muted-foreground">Loading report...</p>
            ) : report.length === 0 ? (
                <div className="border rounded-lg p-8 text-center text-muted-foreground bg-card">
                    {selectedYear ? 'No budget data for this fiscal year' : 'Select a fiscal year to view Budget vs Actual report'}
                </div>
            ) : (
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Account</th>
                                <th className="px-4 py-3 text-left font-medium">Month</th>
                                <th className="px-4 py-3 text-right font-medium">Budget</th>
                                <th className="px-4 py-3 text-right font-medium">Actual</th>
                                <th className="px-4 py-3 text-right font-medium">Variance</th>
                                <th className="px-4 py-3 text-right font-medium">Var %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.map((row, i) => (
                                <tr key={i} className="border-t hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs">{row.accountCode}</span>
                                        <span className="ml-2">{row.accountName}</span>
                                    </td>
                                    <td className="px-4 py-3">{MONTHS[row.month - 1]}</td>
                                    <td className="px-4 py-3 text-right font-mono">{row.budgetedAmount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono">{row.actualAmount.toLocaleString()}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${varianceColor(row.variance)}`}>{row.variance.toLocaleString()}</td>
                                    <td className={`px-4 py-3 text-right font-mono ${varianceColor(row.variancePercent)}`}>{row.variancePercent}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BudgetsPage;
