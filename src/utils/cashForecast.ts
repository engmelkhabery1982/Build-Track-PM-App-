export interface CashForecastPoint {
  actualNet: number;
  forecastNet: number;
  openForecastNet: number;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A governed cash row participates only when it is dated and not cancelled.
 * Forecast rows are expected cash, while Actual/Manual rows are settled cash.
 * Keeping them separate prevents a forecast from being presented as cash in
 * bank and prevents cancelled projections from remaining on executive charts.
 */
export function isActiveCashMovement(row: Record<string, any>): boolean {
  return Boolean(String(row.date || '')) && !['Cancelled', 'Rejected', 'Reversed'].includes(String(row.status || ''));
}

export function cashForecastAt(
  rows: Record<string, any>[],
  reportDate: string,
): CashForecastPoint {
  const dated = rows.filter((row) => isActiveCashMovement(row) && String(row.date) <= reportDate);
  const actualNet = dated
    .filter((row) => String(row.movement_type || 'Manual') !== 'Forecast')
    .reduce((sum, row) => sum + (Number(row.inflow) || 0) - (Number(row.outflow) || 0), 0);
  const openForecastNet = dated
    .filter((row) => String(row.movement_type || '') === 'Forecast' && ['Open', 'Approved', 'Submitted', ''].includes(String(row.status || '')))
    .reduce((sum, row) => sum + (Number(row.inflow) || 0) - (Number(row.outflow) || 0), 0);
  return {
    actualNet: rounded(actualNet),
    openForecastNet: rounded(openForecastNet),
    forecastNet: rounded(actualNet + openForecastNet),
  };
}
