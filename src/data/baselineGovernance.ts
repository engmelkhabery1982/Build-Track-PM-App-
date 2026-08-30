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
