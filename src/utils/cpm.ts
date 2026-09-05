import { addWorkingDays, subtractWorkingDays } from './schedulePlanning.ts';

export type NetworkActivity = {
  id: string;
  duration_days?: number | null;
  predecessor_item?: string | null;
  predecessor_items?: string[] | string | null;
  /** One edge per P6 predecessor. Legacy activities may use the fields above. */
  predecessor_links?: Array<{ predecessor_id?: string; id?: string; relationship_type?: string; lag_days?: number | string }> | string | null;
  relationship_type?: string | null;
  lag_days?: number | null;
  calendar_name?: string | null;
  calendar_exceptions?: string[] | string | null;
  /** Status-update fields are deliberately separate from planned dates. */
  activity_status?: 'Not Started' | 'In Progress' | 'Completed' | string | null;
  actual_start_date?: string | null;
  actual_finish_date?: string | null;
  remaining_duration_days?: number | null;
  constraint_type?: string | null;
  constraint_date?: string | null;
  is_milestone?: boolean | null;
};

export type CpmResult = {
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  critical: boolean;
  cycle: boolean;
};

export type CpmForecast = CpmResult & { forecastStart: string | null; forecastFinish: string | null };
export type CpmStatusForecast = CpmForecast & {
  /** Explicit data date used for this status update. */
  dataDate: string | null;
  /** The retained-logic status forecast never changes plan/baseline dates. */
  statusWarning: string | null;
};

function duration(row: NetworkActivity): number { return Math.max(0, Number(row.duration_days) || 0); }

function predecessorIds(row: NetworkActivity): string[] {
  const imported = Array.isArray(row.predecessor_items)
    ? row.predecessor_items
    : String(row.predecessor_items || '').split(',');
  return [...new Set([row.predecessor_item || '', ...imported]
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

type PredecessorEdge = { id: string; relationship: string; lag: number };

function predecessorEdges(row: NetworkActivity): PredecessorEdge[] {
  let links: Array<{ predecessor_id?: string; id?: string; relationship_type?: string; lag_days?: number | string }> = [];
  if (Array.isArray(row.predecessor_links)) links = row.predecessor_links;
  else if (typeof row.predecessor_links === 'string' && row.predecessor_links.trim()) {
    try {
      const parsed = JSON.parse(row.predecessor_links);
      if (Array.isArray(parsed)) links = parsed;
    } catch { /* Legacy comma-separated values fall through below. */ }
  }
  const imported = links.map((link) => ({
    id: String(link.predecessor_id || link.id || '').trim(),
    relationship: String(link.relationship_type || 'FS').toUpperCase(),
    lag: Number(link.lag_days) || 0,
  })).filter((link) => link.id);
  const legacy = predecessorIds(row).map((id) => ({
    id,
    relationship: String(row.relationship_type || 'FS').toUpperCase(),
    lag: Number(row.lag_days) || 0,
  }));
  const combined = imported.length ? imported : legacy;
  return [...new Map(combined.map((link) => [`${link.id}|${link.relationship}|${link.lag}`, link])).values()];
}

/** Calculates CPM dates in working-day offsets.  Each relationship is reduced
 * to ES(successor) >= ES(predecessor) + constraint, covering FS/SS/FF/SF. */
export function calculateCpm(activities: NetworkActivity[]): Map<string, CpmResult> {
  const rows = new Map(activities.map((row) => [row.id, row]));
  const successors = new Map<string, Array<{ id: string; constraint: number }>>();
  const predecessors = new Map<string, Array<{ id: string; constraint: number }>>();
  const indegree = new Map<string, number>();
  for (const row of activities) indegree.set(row.id, 0);
  for (const row of activities) {
    for (const edge of predecessorEdges(row)) {
      const predecessor = rows.get(edge.id);
      if (!predecessor || predecessor.id === row.id) continue;
      const { lag, relationship } = edge;
      const constraint = relationship === 'SS' ? lag
        : relationship === 'FF' ? duration(predecessor) + lag - duration(row)
          : relationship === 'SF' ? lag - duration(row)
            : duration(predecessor) + lag;
      successors.set(predecessor.id, [...(successors.get(predecessor.id) || []), { id: row.id, constraint }]);
      predecessors.set(row.id, [...(predecessors.get(row.id) || []), { id: predecessor.id, constraint }]);
      indegree.set(row.id, (indegree.get(row.id) || 0) + 1);
    }
  }
  const queue = activities.filter((row) => (indegree.get(row.id) || 0) === 0).map((row) => row.id);
  const ordered: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const successor of successors.get(id) || []) {
      const next = (indegree.get(successor.id) || 0) - 1;
      indegree.set(successor.id, next);
      if (next === 0) queue.push(successor.id);
    }
  }
  const cyclic = new Set(activities.filter((row) => !ordered.includes(row.id)).map((row) => row.id));
  const earlyStart = new Map<string, number>();
  for (const id of ordered) {
    const es = Math.max(0, ...(predecessors.get(id) || []).map((edge) => (earlyStart.get(edge.id) || 0) + edge.constraint));
    earlyStart.set(id, es);
  }
  const projectDuration = Math.max(0, ...ordered.map((id) => (earlyStart.get(id) || 0) + duration(rows.get(id)!)));
  const lateStart = new Map<string, number>();
  for (const id of [...ordered].reverse()) {
    const row = rows.get(id)!;
    const nextStarts = (successors.get(id) || []).map((edge) => (lateStart.get(edge.id) ?? projectDuration) - edge.constraint);
    lateStart.set(id, nextStarts.length ? Math.min(...nextStarts) : projectDuration - duration(row));
  }
  return new Map(activities.map((row) => {
    const es = earlyStart.get(row.id) || 0;
    const ls = lateStart.get(row.id) ?? es;
    const d = duration(row);
    const float = Math.max(0, Math.round((ls - es) * 100) / 100);
    return [row.id, { earlyStart: es, earlyFinish: es + d, lateStart: ls, lateFinish: ls + d, totalFloat: float, critical: float === 0 && !cyclic.has(row.id), cycle: cyclic.has(row.id) }];
  }));
}

/** Converts CPM offsets into forecast dates while preserving the editable
 * schedule dates and approved baseline. A dependency cycle deliberately
 * produces no forecast dates; it must be corrected by the planner first. */
export function calculateCpmForecast(activities: NetworkActivity[], projectStart: string | null | undefined): Map<string, CpmForecast> {
  const network = calculateCpm(activities);
  return new Map(activities.map((activity) => {
    const result = network.get(activity.id)!;
    const forecastStart = result.cycle ? null : addWorkingDays(projectStart, result.earlyStart, activity);
    const forecastFinish = result.cycle ? null : addWorkingDays(projectStart, result.earlyFinish, activity);
    return [activity.id, { ...result, forecastStart, forecastFinish }];
  }));
}

function laterDate(...dates: Array<string | null | undefined>): string | null {
  const usable = dates.filter((date): date is string => Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)));
  const sorted = usable.sort();
  return sorted.length ? sorted[sorted.length - 1] : null;
}

function shiftWorkingDays(date: string | null, days: number, calendar: NetworkActivity): string | null {
  return days >= 0 ? addWorkingDays(date, days, calendar) : subtractWorkingDays(date, Math.abs(days), calendar);
}

/**
 * Creates a retained-logic forecast from a schedule status update.  Actual
 * dates are authoritative for completed work; in-progress work resumes at
 * the Data Date for its governed remaining duration; not-started work is
 * pushed by both the Data Date and predecessor forecasts.  Planned dates and
 * baseline dates are read only in this calculation.
 */
export function calculateCpmStatusForecast(
  activities: NetworkActivity[],
  projectStart: string | null | undefined,
  dataDate: string | null | undefined,
): Map<string, CpmStatusForecast> {
  const network = calculateCpm(activities);
  const rows = new Map(activities.map((row) => [row.id, row]));
  const base = calculateCpmForecast(activities, projectStart);
  const result = new Map<string, CpmStatusForecast>();
  const ordered = [...activities].sort((left, right) => {
    const leftStart = network.get(left.id)?.earlyStart ?? Number.MAX_SAFE_INTEGER;
    const rightStart = network.get(right.id)?.earlyStart ?? Number.MAX_SAFE_INTEGER;
    return leftStart - rightStart || left.id.localeCompare(right.id);
  });

  for (const activity of ordered) {
    const cpm = network.get(activity.id)!;
    const original = base.get(activity.id)!;
    if (cpm.cycle) {
      result.set(activity.id, { ...original, dataDate: dataDate || null, statusWarning: 'Dependency cycle: status forecast was not calculated.' });
      continue;
    }
    const status = String(activity.activity_status || 'Not Started');
    const baselineStart = original.forecastStart;
    const calendar = activity;
    let forecastStart: string | null = baselineStart;
    let forecastFinish: string | null = original.forecastFinish;
    let warning: string | null = null;

    if (status === 'Completed') {
      forecastStart = activity.actual_start_date || baselineStart;
      forecastFinish = activity.actual_finish_date || forecastStart;
      if (!activity.actual_finish_date) warning = 'Completed activity has no actual finish date.';
    } else if (status === 'In Progress') {
      forecastStart = activity.actual_start_date || baselineStart;
      const remaining = Math.max(0, Number(activity.remaining_duration_days) || 0);
      const resumeDate = laterDate(dataDate || null, activity.actual_start_date || null, baselineStart);
      forecastFinish = shiftWorkingDays(resumeDate, remaining, calendar);
      if (!activity.actual_start_date) warning = 'In-progress activity has no actual start date.';
      else if (!dataDate) warning = 'In-progress activity forecast uses the planned start because no Data Date was supplied.';
    } else {
      let constrainedStart = laterDate(baselineStart, dataDate || null);
      for (const edge of predecessorEdges(activity)) {
        const predecessor = rows.get(edge.id);
        const predecessorForecast = result.get(edge.id);
        if (!predecessor || !predecessorForecast) continue;
        const relationship = edge.relationship;
        let candidate: string | null;
        if (relationship === 'SS') candidate = shiftWorkingDays(predecessorForecast.forecastStart, edge.lag, predecessor);
        else if (relationship === 'FF') {
          const requiredFinish = shiftWorkingDays(predecessorForecast.forecastFinish, edge.lag, predecessor);
          candidate = subtractWorkingDays(requiredFinish, duration(activity), calendar);
        } else if (relationship === 'SF') {
          const requiredFinish = shiftWorkingDays(predecessorForecast.forecastStart, edge.lag, predecessor);
          candidate = subtractWorkingDays(requiredFinish, duration(activity), calendar);
        } else candidate = shiftWorkingDays(predecessorForecast.forecastFinish, edge.lag, predecessor);
        constrainedStart = laterDate(constrainedStart, candidate);
      }
      forecastStart = constrainedStart;
      forecastFinish = addWorkingDays(forecastStart, duration(activity), calendar);
    }
    const constraintType = String(activity.constraint_type || 'None');
    const constraintDate = String(activity.constraint_date || '');
    if (constraintDate && constraintType === 'Start No Earlier Than') {
      forecastStart = laterDate(forecastStart, constraintDate);
      forecastFinish = addWorkingDays(forecastStart, status === 'In Progress' ? Math.max(0, Number(activity.remaining_duration_days) || 0) : duration(activity), calendar);
    } else if (constraintDate && constraintType === 'Mandatory Start') {
      forecastStart = constraintDate;
      forecastFinish = addWorkingDays(forecastStart, status === 'In Progress' ? Math.max(0, Number(activity.remaining_duration_days) || 0) : duration(activity), calendar);
      warning = warning || 'Mandatory start constraint applied.';
    } else if (constraintDate && constraintType === 'Mandatory Finish') {
      forecastFinish = constraintDate;
      forecastStart = subtractWorkingDays(forecastFinish, status === 'In Progress' ? Math.max(0, Number(activity.remaining_duration_days) || 0) : duration(activity), calendar);
      warning = warning || 'Mandatory finish constraint applied.';
    } else if (constraintDate && constraintType === 'Finish No Later Than' && forecastFinish && forecastFinish > constraintDate) {
      warning = warning || `Finish no later than constraint breached (${constraintDate}).`;
    }
    result.set(activity.id, { ...original, forecastStart, forecastFinish, dataDate: dataDate || null, statusWarning: warning });
  }
  return result;
}
