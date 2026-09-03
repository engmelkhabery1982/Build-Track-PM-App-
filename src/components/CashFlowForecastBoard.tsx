import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { CashFlowPeriod, calculateCashFlowForecast, getCashFlowStatus } from '@/utils/cashFlowForecast';

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
  const periods = useMemo(() => calculateCashFlowForecast(data), [data]);
  const status = useMemo(() => getCashFlowStatus(periods), [periods]);
  
  const netCumulativePosition = periods.length > 0 ? periods[periods.length - 1].cumulativeCash : 0;
  const totalActualInflows = periods.reduce((sum, p) => sum + p.actualInflow, 0);
  const totalPlannedInflows = periods.reduce((sum, p) => sum + p.plannedInflow, 0);

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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Cumulative Position */}
        <div className={`p-4 rounded-lg shadow-sm ${
          status.netCumulativePosition >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center space-x-2">
            {status.netCumulativePosition >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium">Net Cumulative Position</span>
          </div>
          <div className={`mt-2 text-xl font-semibold ${
            status.netCumulativePosition >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {currency}{netCumulativePosition.toLocaleString()}
          </div>
        </div>

        {/* Total Inflows */}
        <div className="p-4 bg-blue-50 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Total Inflows</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-blue-600">
            {currency}{totalActualInflows.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Planned: {currency}{totalPlannedInflows.toLocaleString()}
          </div>
        </div>

        {/* Liquidity Risk */}
        <div className={`p-4 rounded-lg shadow-sm ${
          status.isDeficitExpected ? 'bg-amber-50' : 'bg-green-50'
        }`}>
          <div className="flex items-center space-x-2">
            {status.isDeficitExpected ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-600" />
            )}
            <span className="text-sm font-medium">Liquidity Risk</span>
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

      {/* Cash Flow Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Inflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Inflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Outflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Outflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Period Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period.period}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{period.period}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency}{period.plannedInflow.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {period.actualInflow ? `${currency}${period.actualInflow.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency}{period.plannedOutflow.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {period.actualOutflow ? `${currency}${period.actualOutflow.toLocaleString()}` : '-'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  (period.netActual ?? period.netPlanned) < 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {currency}{(period.netActual ?? period.netPlanned).toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  period.cumulativeCash < 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {currency}{period.cumulativeCash.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowForecastBoard;
