/** Selects the governed reporting horizon for executive curves. Forecast
 * dates are never inferred from a display period: the horizon must include
 * the latest schedule CPM forecast, cash commitment, or planned-resource
 * demand so the curve cannot end before a known exposure. */
export function deriveForecastHorizon(input: {
  schedules: Record<string, any>[];
  cashFlow: Record<string, any>[];
  resourceForecast: Array<{ date?: string | null }>;
  reportDate: string;
}): { startDate: string | null; endDate: string | null } {
  const dates = [
    ...input.schedules.flatMap((schedule) => [schedule.forecast_start_date || schedule.start_date, schedule.forecast_end_date || schedule.end_date]),
    ...input.cashFlow.map((row) => row.date),
    ...input.resourceForecast.map((point) => point.date),
    input.reportDate,
  ].map((date) => String(date || '').slice(0, 10)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  return { startDate: dates[0] || null, endDate: dates[dates.length - 1] || null };
}
