import { useState, useEffect } from 'react';
import { fiscalPeriodsApi } from '../services/fiscal-periods';
import type { FiscalYear, FiscalPeriod, CreateFiscalYearDto } from '../types/fiscal-period';

export default function FiscalPeriodsPage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<FiscalYear | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<FiscalPeriod | null>(null);

  const [newFiscalYear, setNewFiscalYear] = useState<CreateFiscalYearDto>({
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadFiscalYears();
    loadCurrentPeriod();
  }, []);

  const loadFiscalYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fiscalPeriodsApi.getFiscalYears({ limit: 100 });
      setFiscalYears(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load fiscal years');
      console.error('Error loading fiscal years:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPeriod = async () => {
    try {
      const period = await fiscalPeriodsApi.getCurrentPeriod();
      setCurrentPeriod(period);
    } catch (err) {
      console.error('Error loading current period:', err);
    }
  };

  const handleCreateFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await fiscalPeriodsApi.createFiscalYear(newFiscalYear);
      setShowCreateDialog(false);
      setNewFiscalYear({
        year: new Date().getFullYear() + 1,
        startDate: '',
        endDate: '',
      });
      await loadFiscalYears();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create fiscal year');
      console.error('Error creating fiscal year:', err);
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to close this period? This action cannot be easily undone.')) {
      return;
    }

    try {
      setError(null);
      await fiscalPeriodsApi.closePeriod({ periodId });
      await loadFiscalYears();
      await loadCurrentPeriod();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close period');
      console.error('Error closing period:', err);
    }
  };

  const handleReopenPeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to reopen this period?')) {
      return;
    }

    try {
      setError(null);
      await fiscalPeriodsApi.reopenPeriod(periodId);
      await loadFiscalYears();
      await loadCurrentPeriod();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reopen period');
      console.error('Error reopening period:', err);
    }
  };

  const getPeriodStatusClass = (period: FiscalPeriod) => {
    if (period.isClosed) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (currentPeriod && period.id === currentPeriod.id) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getPeriodStatusLabel = (period: FiscalPeriod) => {
    if (period.isClosed) return 'Closed';
    if (currentPeriod && period.id === currentPeriod.id) return 'Current';
    return 'Open';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading fiscal periods...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fiscal Periods</h1>
          <p className="text-gray-600 mt-1">Manage fiscal years and monthly periods (July - June)</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Fiscal Year
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {currentPeriod && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-900">Current Period</div>
          <div className="text-green-800 mt-1">
            {currentPeriod.periodName} ({new Date(currentPeriod.startDate).toLocaleDateString()} - {new Date(currentPeriod.endDate).toLocaleDateString()})
          </div>
        </div>
      )}

      {fiscalYears.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">No fiscal years found.</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Fiscal Year
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {fiscalYears.map((fiscalYear) => (
            <div key={fiscalYear.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">
                      FY {fiscalYear.year}-{fiscalYear.year + 1}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {new Date(fiscalYear.startDate).toLocaleDateString()} - {new Date(fiscalYear.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {fiscalYear.isClosed ? (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                        Closed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                        Open
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {fiscalYear.periods?.map((period) => (
                    <div
                      key={period.id}
                      className={`p-4 rounded border-2 ${getPeriodStatusClass(period)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{period.periodName}</div>
                          <div className="text-xs mt-1">
                            Period {period.periodNumber}
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-white rounded">
                          {getPeriodStatusLabel(period)}
                        </span>
                      </div>

                      <div className="text-xs mt-2 space-y-1">
                        <div>{new Date(period.startDate).toLocaleDateString()}</div>
                        <div>{new Date(period.endDate).toLocaleDateString()}</div>
                      </div>

                      {!fiscalYear.isClosed && (
                        <div className="mt-3 space-y-2">
                          {!period.isClosed ? (
                            <button
                              onClick={() => handleClosePeriod(period.id)}
                              className="w-full px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Close Period
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReopenPeriod(period.id)}
                              className="w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Reopen Period
                            </button>
                          )}
                        </div>
                      )}

                      {period.closedAt && (
                        <div className="text-xs text-gray-600 mt-2">
                          Closed: {new Date(period.closedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Fiscal Year Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Fiscal Year</h2>

            <form onSubmit={handleCreateFiscalYear}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fiscal Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="2020"
                    max="2100"
                    value={newFiscalYear.year}
                    onChange={(e) =>
                      setNewFiscalYear({
                        ...newFiscalYear,
                        year: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    E.g., 2025 represents FY 2025-2026 (July 1, 2025 - June 30, 2026)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newFiscalYear.startDate}
                    onChange={(e) =>
                      setNewFiscalYear({
                        ...newFiscalYear,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be July 1</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newFiscalYear.endDate}
                    onChange={(e) =>
                      setNewFiscalYear({
                        ...newFiscalYear,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be June 30</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

