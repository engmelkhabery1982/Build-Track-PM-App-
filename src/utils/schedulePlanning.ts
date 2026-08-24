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

export const WORK_CALENDARS = ['Calendar Days', '5-Day Week', '6-Day Week', '24/7'] as const;

function isWorkingDay(date: Date, calendarName?: string | null): boolean {
  const day = date.getUTCDay();
  if (calendarName === '5-Day Week') return day >= 1 && day <= 5;
  if (calendarName === '6-Day Week') return day !== 5; // Friday is the weekly non-working day.
  return true;
}

/** Returns the duration in the selected calendar between ISO start/end dates. */
export function workingDaysBetween(start: string, end: string, calendarName?: string | null): number {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last <= first) return 0;
  let total = 0;
  const cursor = new Date(first);
  while (cursor < last) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor <= last && isWorkingDay(cursor, calendarName)) total += 1;
  }
  return total;
}

export function addWorkingDays(date: string | null | undefined, days: number, calendarName?: string | null): string | null {
  if (!date) return null;
  const cursor = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) return null;
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isWorkingDay(cursor, calendarName)) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}

export function subtractWorkingDays(date: string | null | undefined, days: number, calendarName?: string | null): string | null {
  if (!date) return null;
  const cursor = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) return null;
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (isWorkingDay(cursor, calendarName)) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
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
  const duration = workingDaysBetween(start, end, activity.calendar_name);
  const elapsed = workingDaysBetween(start, reportDate, activity.calendar_name);
  if (duration <= 0) return reportDate >= start ? budget : 0;
  return Math.round(Math.max(0, Math.min(1, elapsed / duration)) * budget * 100) / 100;
}

/**
 * Uses imported/time-phased planning data when it exists for an activity.
 * This replaces the linear fallback with the approved period distribution.
 */
export function distributedPlannedValueToDate(
  activity: Record<string, any>,
  distributions: Record<string, any>[],
  reportDate = new Date().toISOString().slice(0, 10),
): number {
  const rows = distributions.filter((distribution) => distribution.schedule_id === activity.id);
  if (rows.length === 0) return schedulePlannedValueToDate(activity, reportDate);
  return Math.round(rows.reduce((sum, distribution) => {
    const value = Number(distribution.planned_value) || ((Number(distribution.planned_quantity) || 0) * (Number(distribution.unit_rate) || 0));
    const start = String(distribution.period_start || '');
    const end = String(distribution.period_end || start);
    if (!start || reportDate < start) return sum;
    if (!end || reportDate >= end) return sum + value;
    const span = Math.max(1, Math.ceil((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
    const elapsed = Math.max(0, Math.ceil((new Date(`${reportDate}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000));
    return sum + value * Math.min(1, elapsed / span);
  }, 0) * 100) / 100;
}

export function addCalendarDays(date: string | null | undefined, days: number): string | null {
  if (!date) return null;
  // Use UTC to keep contract dates calendar-based regardless of the desktop
  // time zone or daylight-saving changes.
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return null;
  value.setUTCDate(value.getUTCDate() + (Number(days) || 0));
  return value.toISOString().slice(0, 10);
}
