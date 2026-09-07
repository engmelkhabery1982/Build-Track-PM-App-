import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Sliders, Layers, RefreshCw, DollarSign } from 'lucide-react';
import {
  CashFlowPeriod,
  CashForecastAssumptions,
  DEFAULT_CASH_ASSUMPTIONS,
  applyCashAssumptionsToPeriods,
  getCashFlowStatus,
  compareCashForecastVersions,
} from '@/utils/cashFlowForecast';

interface CashFlowForecastBoardProps {
  data: Array<{
    period: string;
    plannedInflow: number;
    actualInflow?: number;
    plannedOutflow: number;
    actualOutflow?: number;
  }>;
  currency?: string;
}

export const CashFlowForecastBoard: React.FC<CashFlowForecastBoardProps> = ({ data, currency = '$' }) => {
  const [assumptions, setAssumptions] = useState<CashForecastAssumptions>(DEFAULT_CASH_ASSUMPTIONS);
  const [showAssumptionsPanel, setShowAssumptionsPanel] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Raw mapping to gross
  const rawData = useMemo(() => {
    return data.map(d => ({
      period: d.period,
      grossInflow: d.plannedInflow,
      grossOutflow: d.plannedOutflow,
      actualInflow: d.actualInflow,
      actualOutflow: d.actualOutflow,
    }));
  }, [data]);

  const basePeriods = useMemo(() => applyCashAssumptionsToPeriods(rawData, DEFAULT_CASH_ASSUMPTIONS), [rawData]);
  const currentPeriods = useMemo(() => applyCashAssumptionsToPeriods(rawData, assumptions), [rawData, assumptions]);

  const status = useMemo(() => getCashFlowStatus(currentPeriods), [currentPeriods]);
  const comparison = useMemo(() => compareCashForecastVersions(basePeriods, currentPeriods), [basePeriods, currentPeriods]);

  const netCumulativePosition = currentPeriods.length > 0 ? currentPeriods[currentPeriods.length - 1].cumulativeCash : 0;
  const totalActualInflows = currentPeriods.reduce((sum, p) => sum + p.actualInflow, 0);
  const totalPlannedInflows = currentPeriods.reduce((sum, p) => sum + p.plannedInflow, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <Calendar className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-gray-500">No cash flow data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Versioned Cash Forecast Engine</h3>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAssumptionsPanel(!showAssumptionsPanel)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>{showAssumptionsPanel ? 'Hide Assumptions' : 'Adjust Forecast Assumptions'}</span>
          </button>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              comparisonMode
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{comparisonMode ? 'Viewing Scenario Comparison' : 'Compare vs Baseline Version'}</span>
          </button>
        </div>
      </div>

      {/* Assumptions Adjustment Panel */}
      {showAssumptionsPanel && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Client Payment Lag (Days): {assumptions.clientPaymentLagDays}
            </label>
            <input
              type="range"
              min="0"
              max="120"
              step="15"
              value={assumptions.clientPaymentLagDays}
              onChange={(e) => setAssumptions({ ...assumptions, clientPaymentLagDays: Number(e.target.value) })}
              className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Subcontractor Payment Lag (Days): {assumptions.subcontractorPaymentLagDays}
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="15"
              value={assumptions.subcontractorPaymentLagDays}
              onChange={(e) => setAssumptions({ ...assumptions, subcontractorPaymentLagDays: Number(e.target.value) })}
              className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Advance Recovery Rate (%): {assumptions.advanceRecoveryRatePercent}%
            </label>
            <input
              type="range"
              min="0"
              max="25"
              step="5"
              value={assumptions.advanceRecoveryRatePercent}
              onChange={(e) => setAssumptions({ ...assumptions, advanceRecoveryRatePercent: Number(e.target.value) })}
              className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Net Cumulative Position */}
        <div className={`p-4 rounded-lg shadow-sm ${
          netCumulativePosition >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {netCumulativePosition >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-700">Net Cumulative Position</span>
          </div>
          <div className={`mt-2 text-xl font-semibold ${
            netCumulativePosition >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {currency}{netCumulativePosition.toLocaleString()}
          </div>
        </div>

        {/* Total Inflows */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Total Planned Inflows</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-blue-600">
            {currency}{totalPlannedInflows.toLocaleString()}
          </div>
          {totalActualInflows > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              Actual: {currency}{totalActualInflows.toLocaleString()}
            </div>
          )}
        </div>

        {/* Working Capital Peak Deficit */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Peak Working Capital Deficit</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-purple-600">
            {currency}{status.peakWorkingCapitalDeficit.toLocaleString()}
          </div>
        </div>

        {/* Liquidity Risk */}
        <div className={`p-4 rounded-lg shadow-sm ${
          status.isDeficitExpected ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center space-x-2">
            {status.isDeficitExpected ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-600" />
            )}
            <span className="text-sm font-medium text-gray-700">Liquidity Status</span>
          </div>
          <div className={`mt-2 text-xl font-semibold ${
            status.isDeficitExpected ? 'text-amber-600' : 'text-green-600'
          }`}>
            {status.isDeficitExpected ? 'Deficit Expected' : 'Cash Healthy'}
          </div>
          {status.isDeficitExpected && (
            <div className="text-sm text-gray-500 mt-1">
              Lowest: {currency}{status.lowestCashPoint.toLocaleString()} in {status.lowestPeriod}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Delta Banner */}
      {comparisonMode && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900 flex justify-between items-center">
          <div>
            <span className="font-semibold">Scenario Delta Impact vs Baseline:</span> Working Capital Peak Deficit Delta: {currency}{comparison.workingCapitalImpact.toLocaleString()} | Final Balance Delta: {currency}{comparison.finalCashDifference.toLocaleString()}
          </div>
        </div>
      )}

      {/* Cash Flow Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Inflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Outflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Period Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Balance</th>
              {comparisonMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Delta vs Baseline</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPeriods.map((period, idx) => {
              const delta = comparisonMode ? comparison.deltas[idx]?.deltaCumulative ?? 0 : 0;
              return (
                <tr key={period.period}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{period.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency}{period.plannedInflow.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency}{period.plannedOutflow.toLocaleString()}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    period.netPlanned < 0 ? 'text-red-500 font-medium' : 'text-gray-700'
                  }`}>
                    {currency}{period.netPlanned.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    period.cumulativeCash < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {currency}{period.cumulativeCash.toLocaleString()}
                  </td>
                  {comparisonMode && (
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      delta < 0 ? 'text-red-600' : delta > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {delta >= 0 ? '+' : ''}{currency}{delta.toLocaleString()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowForecastBoard;

