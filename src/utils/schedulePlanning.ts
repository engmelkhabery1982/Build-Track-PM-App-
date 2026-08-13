/**
 * Budget is the full approved plan for an activity. Planned Value (PV) is the
 * portion of that budget which should have been achieved by the report date.
 * With one planning table and no period profile, PV is spread linearly across
 * the activity's planned dates.
 */
export function scheduleBudget(activity: Record<string, any>): number {
  const budget = Number(activity.budget);
  if (Number.isFinite(budget) && budget > 0) return budget;
  const value = (Number(activity.planned_quantity) || 0) * (Number(activity.unit_rate) || 0);
  return Math.round(value * 100) / 100;
}

export function schedulePlannedValueToDate(
  activity: Record<string, any>,
  reportDate = new Date().toISOString().slice(0, 10),
): number {
  const budget = scheduleBudget(activity);
  const start = String(activity.start_date || '');
  const end = String(activity.end_date || '');
  if (!budget || !start || !end) return 0;
  if (reportDate < start) return 0;
  if (reportDate >= end) return budget;
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  const reportMs = new Date(`${reportDate}T00:00:00`).getTime();
  const duration = endMs - startMs;
  if (duration <= 0) return reportDate >= start ? budget : 0;
  return Math.round(Math.max(0, Math.min(1, (reportMs - startMs) / duration)) * budget * 100) / 100;
}

export function addCalendarDays(date: string | null | undefined, days: number): string | null {
  if (!date) return null;
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + (Number(days) || 0));
  return value.toISOString().slice(0, 10);
}
