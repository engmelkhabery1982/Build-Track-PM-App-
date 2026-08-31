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

export const WORK_CALENDARS = ['Calendar Days', '5-Day Week', '6-Day Week', '24/7', 'Custom'] as const;

export type CalendarInput = string | null | undefined | {
  calendar_name?: string | null;
  calendar_exceptions?: string[] | string | null;
  calendar_working_days?: number[] | string | null;
};

function calendarDetails(input?: CalendarInput): { name: string; exceptions: Set<string>; workingDays: Set<number> } {
  if (typeof input === 'string' || !input) return { name: input || 'Calendar Days', exceptions: new Set(), workingDays: new Set() };
  const raw = input.calendar_exceptions;
  let values: unknown[] = Array.isArray(raw) ? raw : String(raw || '').split(/[,;\n]+/);
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) values = parsed; } catch { /* comma-separated remains valid */ }
  }
  const rawDays = input.calendar_working_days;
  let dayValues: unknown[] = Array.isArray(rawDays) ? rawDays : String(rawDays || '').split(/[,;\s]+/);
  if (typeof rawDays === 'string' && rawDays.trim().startsWith('[')) {
    try { const parsed = JSON.parse(rawDays); if (Array.isArray(parsed)) dayValues = parsed; } catch { /* delimited values remain valid */ }
  }
  return {
    name: String(input.calendar_name || 'Calendar Days'),
    exceptions: new Set(values.map((value) => String(value || '').trim().slice(0, 10)).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))),
    workingDays: new Set(dayValues.map((value) => String(value ?? '').trim()).filter(Boolean).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)),
  };
}

function isWorkingDay(date: Date, calendar?: CalendarInput): boolean {
  const { name, exceptions, workingDays } = calendarDetails(calendar);
  if (exceptions.has(date.toISOString().slice(0, 10))) return false;
  const day = date.getUTCDay();
  if (workingDays.size) return workingDays.has(day);
  if (name === '5-Day Week') return day >= 1 && day <= 5;
  if (name === '6-Day Week') return day !== 5; // Friday is the weekly non-working day.
  return true;
}

/** Returns the duration in the selected calendar between ISO start/end dates. */
export function workingDaysBetween(start: string, end: string, calendar?: CalendarInput): number {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last <= first) return 0;
  let total = 0;
  const cursor = new Date(first);
  while (cursor < last) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor <= last && isWorkingDay(cursor, calendar)) total += 1;
  }
  return total;
}

export function addWorkingDays(date: string | null | undefined, days: number, calendar?: CalendarInput): string | null {
  if (!date) return null;
  const cursor = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) return null;
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isWorkingDay(cursor, calendar)) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}

export function subtractWorkingDays(date: string | null | undefined, days: number, calendar?: CalendarInput): string | null {
  if (!date) return null;
  const cursor = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) return null;
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (isWorkingDay(cursor, calendar)) remaining -= 1;
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
  const duration = workingDaysBetween(start, end, activity);
  const elapsed = workingDaysBetween(start, reportDate, activity);
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

export interface ScheduleDistributionReconciliation {
  plannedQuantity: number;
  plannedValue: number;
  distributedQuantity: number;
  distributedValue: number;
  remainingQuantity: number;
  remainingValue: number;
  isOverAllocated: boolean;
  isComplete: boolean;
}

/**
 * Reconciles the time-phased rows to their one executable activity.  The
 * activity is the commercial source of truth: a distribution may split its
 * quantity across periods, but it must never redefine the unit rate, quantity
 * or total budget of that activity.
 */
export function reconcileScheduleDistributions(
  activity: Record<string, any>,
  distributions: Record<string, any>[],
): ScheduleDistributionReconciliation {
  const plannedQuantity = Math.max(0, Number(activity.planned_quantity) || 0);
  const plannedValue = scheduleBudget(activity);
  const rows = distributions.filter((row) => row.schedule_id === activity.id);
  const distributedQuantity = Math.round(rows.reduce((sum, row) => sum + (Number(row.planned_quantity) || 0), 0) * 10000) / 10000;
  const distributedValue = Math.round(rows.reduce((sum, row) => {
    const value = Number(row.planned_value);
    return sum + (Number.isFinite(value) ? value : (Number(row.planned_quantity) || 0) * (Number(row.unit_rate) || 0));
  }, 0) * 100) / 100;
  const remainingQuantity = Math.round((plannedQuantity - distributedQuantity) * 10000) / 10000;
  const remainingValue = Math.round((plannedValue - distributedValue) * 100) / 100;
  const isOverAllocated = remainingQuantity < -0.000001 || remainingValue < -0.01;
  return {
    plannedQuantity,
    plannedValue,
    distributedQuantity,
    distributedValue,
    remainingQuantity: Math.max(0, remainingQuantity),
    remainingValue: Math.max(0, remainingValue),
    isOverAllocated,
    isComplete: rows.length > 0 && !isOverAllocated && Math.abs(remainingQuantity) <= 0.000001 && Math.abs(remainingValue) <= 0.01,
  };
}

export function assertValidScheduleDistribution(
  activity: Record<string, any>,
  distribution: Record<string, any>,
  siblingDistributions: Record<string, any>[],
): void {
  const periodStart = String(distribution.period_start || '');
  const periodEnd = String(distribution.period_end || '');
  if (!periodStart || !periodEnd) throw new Error('Time-phased distribution requires both period start and period end.');
  if (periodEnd < periodStart) throw new Error('Distribution period end cannot be earlier than period start.');
  const activityStart = String(activity.start_date || '');
  const activityEnd = String(activity.end_date || '');
  if ((activityStart && periodStart < activityStart) || (activityEnd && periodEnd > activityEnd)) {
    throw new Error(`Distribution period must stay within the activity dates (${activityStart || 'not set'} to ${activityEnd || 'not set'}).`);
  }
  const quantity = Number(distribution.planned_quantity) || 0;
  if (quantity <= 0) throw new Error('Time-phased planned quantity must be greater than zero.');
  const activityRate = Number(activity.unit_rate) || 0;
  const rate = Number(distribution.unit_rate) || 0;
  if (Math.abs(rate - activityRate) > 0.000001) {
    throw new Error('Time-phased unit rate must match the governed activity unit rate.');
  }
  const reconciliation = reconcileScheduleDistributions(activity, [
    ...siblingDistributions.filter((row) => row.id !== distribution.id),
    distribution,
  ]);
  if (reconciliation.isOverAllocated) {
    throw new Error(`Time-phased allocation exceeds the activity plan: planned ${reconciliation.plannedQuantity.toLocaleString()} quantity / ${reconciliation.plannedValue.toLocaleString()} value, allocated ${reconciliation.distributedQuantity.toLocaleString()} quantity / ${reconciliation.distributedValue.toLocaleString()} value.`);
  }
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
