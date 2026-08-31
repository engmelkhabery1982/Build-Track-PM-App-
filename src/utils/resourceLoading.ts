export interface ResourceLoadInput {
  id?: string;
  resource_id?: string | null;
  date?: string | null;
  total_hours?: number | null;
  days?: number | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface ResourceLoad {
  resourceId: string;
  date: string;
  allocatedHours: number;
  capacityHours: number;
  overAllocatedHours: number;
}

/** A non-mutating, date-specific recommendation.  The planner remains in
 * control: BuildTrack never shifts an activity or changes an approved plan
 * simply because a calculated capacity limit was exceeded. */
export interface ResourceLevelingRecommendation {
  resourceId: string;
  date: string;
  capacityHours: number;
  plannedHours: number;
  hoursToRelevel: number;
  assignmentIds: string[];
  scheduleIds: string[];
}

/**
 * Identifies exactly which planned assignments need a planner's attention on
 * an overloaded day.  It deliberately does not choose a new date: a valid
 * shift depends on CPM logic, calendars and constraints, which must remain
 * governed by the planner rather than silently changed by a load report.
 */
export function suggestResourceLeveling(
  resources: Array<Record<string, any>>,
  assignments: Array<Record<string, any>>,
): ResourceLevelingRecommendation[] {
  const loads = calculatePlannedResourceLoads(resources, assignments)
    .filter((load) => load.overAllocatedHours > 0);
  return loads.map((load) => {
    const affected = assignments.filter((assignment) => {
      const start = String(assignment.assignment_start || '');
      const end = String(assignment.assignment_end || start);
      return String(assignment.resource_id || '') === load.resourceId && start <= load.date && load.date <= end;
    });
    return {
      resourceId: load.resourceId,
      date: load.date,
      capacityHours: load.capacityHours,
      plannedHours: load.allocatedHours,
      hoursToRelevel: load.overAllocatedHours,
      assignmentIds: affected.map((assignment) => String(assignment.id)).filter(Boolean),
      scheduleIds: [...new Set(affected.map((assignment) => String(assignment.schedule_id)).filter(Boolean))],
    };
  });
}

/** Spreads planned assignment hours across the assignment period. This stays
 * separate from actual Labor Duty/Equipment usage so planning never rewrites
 * recorded site facts. */
export function calculatePlannedResourceLoads(
  resources: Array<Record<string, any>>,
  assignments: Array<Record<string, any>>,
): ResourceLoad[] {
  const capacityByResource = new Map(resources.map((resource) => [String(resource.id), Math.max(0, Number(resource.daily_capacity_hours) || 0)]));
  const totals = new Map<string, number>();
  for (const row of assignments) {
    const resourceId = String(row.resource_id || '');
    const start = String(row.assignment_start || '');
    const end = String(row.assignment_end || start);
    const capacity = capacityByResource.get(resourceId);
    if (!resourceId || !start || !end || end < start || capacity === undefined) continue;
    const days = Math.max(1, Math.ceil((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000) + 1);
    const hours = Math.max(0, Number(row.planned_hours) || 0);
    if (!hours) continue;
    for (let index = 0; index < days; index += 1) {
      const key = `${resourceId}|${isoPlusDays(start, index)}`;
      totals.set(key, (totals.get(key) || 0) + hours / days);
    }
  }
  return [...totals.entries()].map(([key, allocatedHours]) => {
    const [resourceId, date] = key.split('|');
    const capacityHours = capacityByResource.get(resourceId) || 0;
    const roundedAllocated = Math.round(allocatedHours * 100) / 100;
    return { resourceId, date, allocatedHours: roundedAllocated, capacityHours, overAllocatedHours: Math.max(0, Math.round((roundedAllocated - capacityHours) * 100) / 100) };
  }).sort((left, right) => left.date.localeCompare(right.date) || left.resourceId.localeCompare(right.resourceId));
}

function isoPlusDays(start: string, offset: number): string {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function resourceHours(row: ResourceLoadInput, dailyCapacity: number): { total: number; periods: number } {
  const days = Math.max(1, Math.ceil(Number(row.days) || 1));
  if (row.total_hours !== undefined && Number(row.total_hours) > 0) return { total: Number(row.total_hours), periods: days };
  const quantity = Math.max(0, Number(row.quantity) || 0);
  const unit = String(row.unit || '').toLowerCase();
  if (unit === 'hour' || unit === 'hours') return { total: quantity, periods: 1 };
  if (unit === 'week') return { total: quantity * dailyCapacity * 7, periods: 7 };
  if (unit === 'month') return { total: quantity * dailyCapacity * 30, periods: 30 };
  return { total: quantity * dailyCapacity, periods: 1 };
}

/** Spreads traceable actual assignments over their recorded work period and
 * compares each resource/day with the master daily capacity. */
export function calculateResourceLoads(
  resources: Array<Record<string, any>>,
  laborDuty: ResourceLoadInput[],
  equipment: ResourceLoadInput[],
): ResourceLoad[] {
  const capacityByResource = new Map(resources.map((resource) => [String(resource.id), Math.max(0, Number(resource.daily_capacity_hours) || 0)]));
  const totals = new Map<string, number>();
  for (const row of [...laborDuty, ...equipment]) {
    const resourceId = String(row.resource_id || '');
    const start = String(row.date || '');
    const capacity = capacityByResource.get(resourceId);
    if (!resourceId || !start || capacity === undefined) continue;
    const spread = resourceHours(row, capacity);
    for (let index = 0; index < spread.periods; index += 1) {
      const key = `${resourceId}|${isoPlusDays(start, index)}`;
      totals.set(key, (totals.get(key) || 0) + spread.total / spread.periods);
    }
  }
  return [...totals.entries()].map(([key, allocatedHours]) => {
    const [resourceId, date] = key.split('|');
    const capacityHours = capacityByResource.get(resourceId) || 0;
    const roundedAllocated = Math.round(allocatedHours * 100) / 100;
    return { resourceId, date, allocatedHours: roundedAllocated, capacityHours, overAllocatedHours: Math.max(0, Math.round((roundedAllocated - capacityHours) * 100) / 100) };
  }).sort((left, right) => left.date.localeCompare(right.date) || left.resourceId.localeCompare(right.resourceId));
}
