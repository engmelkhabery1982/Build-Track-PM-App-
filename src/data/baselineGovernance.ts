export type BaselineActivitySnapshot = {
  schedule_id: string;
  activity_code: string;
  activity: string;
  boq_item_id: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  planned_quantity: number;
  planned_value: number;
  budget: number;
  calendar_name: string;
  critical_path: boolean;
  predecessor_links: unknown;
};

export type BaselineScheduleSummary = {
  activity_count: number;
  critical_activity_count: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_budget: number;
};

export interface BaselineActivityComparison {
  baselineActivityCount: number;
  currentActivityCount: number;
  addedActivityCount: number;
  removedActivityCount: number;
  changedActivityCount: number;
  criticalPathVariance: number;
}

export type BaselineVarianceStatus = 'Added' | 'Removed' | 'Changed' | 'Unchanged';

/** A traceable, activity-level difference between a frozen baseline and the
 * current executable plan. Values stay alongside changed fields so a reviewer
 * can inspect variance without modifying historical records. */
export interface BaselineActivityVariance {
  identity: string;
  activityCode: string;
  activity: string;
  status: BaselineVarianceStatus;
  changedFields: string[];
  baselineStartDate: string | null;
  currentStartDate: string | null;
  startVarianceDays: number | null;
  baselineEndDate: string | null;
  currentEndDate: string | null;
  finishVarianceDays: number | null;
  baselineDurationDays: number | null;
  currentDurationDays: number | null;
  durationVarianceDays: number | null;
  baselineQuantity: number | null;
  currentQuantity: number | null;
  quantityVariance: number | null;
  baselineBudget: number | null;
  currentBudget: number | null;
  budgetVariance: number | null;
  baselineCalendar: string | null;
  currentCalendar: string | null;
  baselineCritical: boolean | null;
  currentCritical: boolean | null;
}

function activityIdentity(activity: Record<string, any>): string {
  // The activity code is the stable Primavera / user-facing identifier. Local
  // database IDs can change after an import or controlled re-load.
  return String(activity.activity_code || activity.schedule_id || activity.id || '').trim();
}

function numeric(value: unknown): number {
  return Number(value) || 0;
}

function dateVarianceDays(baselineDate: string | null, currentDate: string | null): number | null {
  if (!baselineDate || !currentDate) return null;
  const baselineTime = new Date(`${baselineDate}T00:00:00`).getTime();
  const currentTime = new Date(`${currentDate}T00:00:00`).getTime();
  if (!Number.isFinite(baselineTime) || !Number.isFinite(currentTime)) return null;
  return Math.round((currentTime - baselineTime) / 86400000);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).sort().join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Produces a complete activity variance register, including unchanged scope. */
export function compareBaselineActivityDetails(
  snapshot: BaselineActivitySnapshot[] | unknown,
  currentActivities: Record<string, any>[],
): BaselineActivityVariance[] {
  const baselineRows = Array.isArray(snapshot) ? snapshot as BaselineActivitySnapshot[] : [];
  const currentRows = currentActivities.filter((row) => String(row.activity || '').trim());
  const baselineById = new Map(baselineRows.map((row) => [activityIdentity(row), row]));
  const currentById = new Map(currentRows.map((row) => [activityIdentity(row), row]));
  const identities = [...new Set([...baselineById.keys(), ...currentById.keys()])].filter(Boolean).sort();
  return identities.map((identity) => {
    const baseline = baselineById.get(identity);
    const current = currentById.get(identity);
    const baselineStartDate = baseline?.start_date || null;
    const currentStartDate = current?.start_date || null;
    const baselineEndDate = baseline?.end_date || null;
    const currentEndDate = current?.end_date || null;
    const baselineDurationDays = baseline ? numeric(baseline.duration_days) : null;
    const currentDurationDays = current ? numeric(current.duration_days) : null;
    const baselineQuantity = baseline ? numeric(baseline.planned_quantity) : null;
    const currentQuantity = current ? numeric(current.planned_quantity) : null;
    const baselineBudget = baseline ? numeric(baseline.budget || baseline.planned_value) : null;
    const currentBudget = current ? numeric(current.budget || current.planned_value) : null;
    const baselineCalendar = baseline ? String(baseline.calendar_name || 'Calendar Days') : null;
    const currentCalendar = current ? String(current.calendar_name || 'Calendar Days') : null;
    const baselineCritical = baseline ? Boolean(baseline.critical_path) : null;
    const currentCritical = current ? Boolean(current.critical_path) : null;
    const changedFields: string[] = [];
    if (baseline && current) {
      if (String(baseline.activity || '') !== String(current.activity || '')) changedFields.push('Activity name');
      if (baselineStartDate !== currentStartDate) changedFields.push('Start date');
      if (baselineEndDate !== currentEndDate) changedFields.push('Finish date');
      if (baselineDurationDays !== currentDurationDays) changedFields.push('Duration');
      if (baselineQuantity !== currentQuantity) changedFields.push('Planned quantity');
      if (baselineBudget !== currentBudget) changedFields.push('Planned budget');
      if (baselineCalendar !== currentCalendar) changedFields.push('Calendar');
      if (baselineCritical !== currentCritical) changedFields.push('Critical path');
      if (stableJson(baseline.predecessor_links) !== stableJson(current.predecessor_links)) changedFields.push('Predecessor logic');
    }
    const status: BaselineVarianceStatus = !baseline ? 'Added' : !current ? 'Removed' : changedFields.length ? 'Changed' : 'Unchanged';
    return {
      identity,
      activityCode: String(current?.activity_code || baseline?.activity_code || identity),
      activity: String(current?.activity || baseline?.activity || ''),
      status,
      changedFields,
      baselineStartDate, currentStartDate, startVarianceDays: dateVarianceDays(baselineStartDate, currentStartDate),
      baselineEndDate, currentEndDate, finishVarianceDays: dateVarianceDays(baselineEndDate, currentEndDate),
      baselineDurationDays, currentDurationDays, durationVarianceDays: baselineDurationDays === null || currentDurationDays === null ? null : currentDurationDays - baselineDurationDays,
      baselineQuantity, currentQuantity, quantityVariance: baselineQuantity === null || currentQuantity === null ? null : currentQuantity - baselineQuantity,
      baselineBudget, currentBudget, budgetVariance: baselineBudget === null || currentBudget === null ? null : currentBudget - baselineBudget,
      baselineCalendar, currentCalendar, baselineCritical, currentCritical,
    };
  });
}

/** Compares the current executable plan with a frozen approved snapshot.
 * The result is deliberately count-based: it exposes a change for review
 * without rewriting the historical baseline or silently approving variance. */
export function compareBaselineActivities(
  snapshot: BaselineActivitySnapshot[] | unknown,
  currentActivities: Record<string, any>[],
): BaselineActivityComparison {
  const baselineRows = Array.isArray(snapshot) ? snapshot as BaselineActivitySnapshot[] : [];
  const currentRows = currentActivities.filter((row) => String(row.activity || '').trim());
  const details = compareBaselineActivityDetails(baselineRows, currentRows);
  return {
    baselineActivityCount: baselineRows.length,
    currentActivityCount: currentRows.length,
    addedActivityCount: details.filter((row) => row.status === 'Added').length,
    removedActivityCount: details.filter((row) => row.status === 'Removed').length,
    changedActivityCount: details.filter((row) => row.status === 'Changed').length,
    criticalPathVariance: currentRows.filter((row) => Boolean(row.critical_path)).length - baselineRows.filter((row) => Boolean(row.critical_path)).length,
  };
}

/** Returns an immutable, audit-friendly copy of the executable schedule. */
export function createBaselineActivitySnapshot(activities: Record<string, any>[]): BaselineActivitySnapshot[] {
  return activities
    .filter((activity) => String(activity.activity || '').trim())
    .map((activity) => ({
      schedule_id: String(activity.id || ''),
      activity_code: String(activity.activity_code || ''),
      activity: String(activity.activity || ''),
      boq_item_id: activity.boq_item_id || null,
      start_date: activity.start_date || null,
      end_date: activity.end_date || null,
      duration_days: Number(activity.duration_days) || 0,
      planned_quantity: Number(activity.planned_quantity) || 0,
      planned_value: Number(activity.planned_value) || Number(activity.budget) || 0,
      budget: Number(activity.budget) || Number(activity.planned_value) || 0,
      calendar_name: String(activity.calendar_name || 'Calendar Days'),
      critical_path: Boolean(activity.critical_path),
      predecessor_links: activity.predecessor_links || null,
    }))
    .sort((left, right) => `${left.activity_code}:${left.schedule_id}`.localeCompare(`${right.activity_code}:${right.schedule_id}`));
}

export function summarizeBaselineSchedule(snapshot: BaselineActivitySnapshot[] | unknown): BaselineScheduleSummary {
  const rows = Array.isArray(snapshot) ? snapshot as BaselineActivitySnapshot[] : [];
  const starts = rows.map((row) => String(row.start_date || '')).filter(Boolean).sort();
  const ends = rows.map((row) => String(row.end_date || '')).filter(Boolean).sort();
  return {
    activity_count: rows.length,
    critical_activity_count: rows.filter((row) => row.critical_path).length,
    planned_start_date: starts[0] || null,
    planned_end_date: ends[ends.length - 1] || null,
    planned_budget: Math.round(rows.reduce((sum, row) => sum + (Number(row.budget) || 0), 0) * 100) / 100,
  };
}

/** Baselines are control points, not a label applied to an empty schedule. */
export function assertBaselineApproval(input: {
  baselineDate?: string | null;
  revisionReason?: string | null;
  activities: Record<string, any>[];
  hasPriorApprovedBaseline: boolean;
}): void {
  if (!input.baselineDate) throw new Error('An approved baseline requires an approval date.');
  if (!input.activities.some((activity) => String(activity.activity || '').trim())) {
    throw new Error('An approved baseline requires at least one scheduled activity. Import or create the controlled schedule first.');
  }
  if (input.hasPriorApprovedBaseline && !String(input.revisionReason || '').trim()) {
    throw new Error('A baseline revision requires an explicit revision reason before approval.');
  }
}
