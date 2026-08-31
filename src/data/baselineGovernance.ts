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

function activityIdentity(activity: Record<string, any>): string {
  return String(activity.schedule_id || activity.id || activity.activity_code || '').trim();
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
  const baselineById = new Map(baselineRows.map((row) => [activityIdentity(row), row]));
  const currentById = new Map(currentRows.map((row) => [activityIdentity(row), row]));
  let changedActivityCount = 0;
  baselineById.forEach((baseline, id) => {
    const current = currentById.get(id);
    if (!current) return;
    const changed = String(baseline.start_date || '') !== String(current.start_date || '')
      || String(baseline.end_date || '') !== String(current.end_date || '')
      || Number(baseline.duration_days) !== (Number(current.duration_days) || 0)
      || Number(baseline.planned_quantity) !== (Number(current.planned_quantity) || 0)
      || Number(baseline.budget) !== (Number(current.budget) || Number(current.planned_value) || 0)
      || String(baseline.calendar_name || '') !== String(current.calendar_name || 'Calendar Days')
      || JSON.stringify(baseline.predecessor_links || null) !== JSON.stringify(current.predecessor_links || null);
    if (changed) changedActivityCount += 1;
  });
  return {
    baselineActivityCount: baselineRows.length,
    currentActivityCount: currentRows.length,
    addedActivityCount: [...currentById.keys()].filter((id) => !baselineById.has(id)).length,
    removedActivityCount: [...baselineById.keys()].filter((id) => !currentById.has(id)).length,
    changedActivityCount,
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
