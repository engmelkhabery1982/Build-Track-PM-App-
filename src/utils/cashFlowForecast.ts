export interface CashFlowPeriod {
  period: string;
  plannedInflow: number;
  actualInflow: number;
  plannedOutflow: number;
  actualOutflow: number;
  netPlanned: number;
  netActual: number;
  cumulativeCash: number;
}

export function calculateCashFlowForecast(
  periods: Array<{
    period: string;
    plannedInflow: number;
    actualInflow?: number;
    plannedOutflow: number;
    actualOutflow?: number;
  }>
): CashFlowPeriod[] {
  if (periods.length === 0) return [];

  let cumulativeCash = 0;
  return periods.map((period, index) => {
    const actualIn = period.actualInflow ?? 0;
    const actualOut = period.actualOutflow ?? 0;
    const netPlanned = period.plannedInflow - period.plannedOutflow;
    const netActual = actualIn - actualOut;

    cumulativeCash += index === 0 ? netActual : netActual;

    return {
      period: period.period,
      plannedInflow: period.plannedInflow,
      actualInflow: actualIn,
      plannedOutflow: period.plannedOutflow,
      actualOutflow: actualOut,
      netPlanned,
      netActual,
      cumulativeCash,
    };
  });
}

export function getCashFlowStatus(periods: CashFlowPeriod[]) {
  const result = {
    isDeficitExpected: false,
    lowestCashPoint: 0,
    lowestPeriod: '',
  };

  if (periods.length === 0) return result;

  let minCash = Infinity;
  let minPeriod = '';

  for (const period of periods) {
    if (period.cumulativeCash < minCash) {
      minCash = period.cumulativeCash;
      minPeriod = period.period;
    }
  }

  return {
    isDeficitExpected: minCash < 0,
    lowestCashPoint: minCash,
    lowestPeriod: minPeriod,
  };
}
