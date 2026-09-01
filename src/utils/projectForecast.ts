/** Returns the latest executable forecast finish for one main contract.
 * Planned finish is only a fallback when CPM status forecasting has not yet
 * been run, so executive views never silently present a plan as a forecast. */
export function deriveContractForecastFinish(
  schedules: Record<string, any>[],
  contractId: string | null | undefined,
): { date: string | null; source: 'CPM Forecast' | 'Planned fallback' | 'Unavailable' } {
  const activities = schedules.filter((row) => String(row.contract_id || '') === String(contractId || '') && String(row.activity || '').trim());
  const forecastDates = activities.map((row) => String(row.forecast_end_date || '')).filter(Boolean).sort();
  if (forecastDates.length) return { date: forecastDates[forecastDates.length - 1], source: 'CPM Forecast' };
  const plannedDates = activities.map((row) => String(row.end_date || '')).filter(Boolean).sort();
  if (plannedDates.length) return { date: plannedDates[plannedDates.length - 1], source: 'Planned fallback' };
  return { date: null, source: 'Unavailable' };
}
