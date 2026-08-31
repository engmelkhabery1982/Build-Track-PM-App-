import { workingDatesBetween } from './schedulePlanning.ts';
import { calculateCpm } from './cpm.ts';

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
  /** Non-critical work with available CPM float is listed first. These are
   * candidates only; a planner must still approve every movement. */
  candidates: Array<{ scheduleId: string; totalFloatDays: number; critical: boolean; cycle: boolean }>;
}

export interface PlannedResourceCostPoint {
  date: string;
  cost: number;
}

/** Time-phases the resource plan independently of settled cash.  This is a
 * forward cost exposure used for EVM/forecast review, not a payment posting. */
export function timePhasedPlannedResourceCost(
  resources: Array<Record<string, any>>,
  assignments: Array<Record<string, any>>,
  schedules: Array<Record<string, any>> = [],
): PlannedResourceCostPoint[] {
  const resourceById = new Map(resources.map((resource) => [String(resource.id), resource]));
  const scheduleById = new Map(schedules.map((schedule) => [String(schedule.id), schedule]));
  const totals = new Map<string, number>();
  for (const assignment of assignments) {
    const resource = resourceById.get(String(assignment.resource_id || ''));
    const start = String(assignment.assignment_start || '');
    const end = String(assignment.assignment_end || start);
    if (!resource || !start || !end || end < start) continue;
    const dates = workingDatesBetween(start, end, scheduleById.get(String(assignment.schedule_id || '')) || assignment)
      .filter((date) => (!resource.availability_start_date || date >= String(resource.availability_start_date)) && (!resource.availability_end_date || date <= String(resource.availability_end_date)));
    const hours = Math.max(0, Number(assignment.planned_hours) || 0);
    const directCost = Math.max(0, Number(assignment.planned_cost) || 0);
    const cost = directCost || hours * Math.max(0, Number(resource.standard_rate) || 0);
    if (!cost || !dates.length) continue;
    for (const date of dates) totals.set(date, (totals.get(date) || 0) + cost / dates.length);
  }
  return [...totals.entries()].map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 })).sort((left, right) => left.date.localeCompare(right.date));
}

export function plannedResourceCostAt(points: PlannedResourceCostPoint[], reportDate: string): number {
  return Math.round(points.filter((point) => point.date <= reportDate).reduce((sum, point) => sum + point.cost, 0) * 100) / 100;
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
  schedules: Array<Record<string, any>> = [],
): ResourceLevelingRecommendation[] {
  const loads = calculatePlannedResourceLoads(resources, assignments, schedules)
    .filter((load) => load.overAllocatedHours > 0);
  const cpmByActivity = calculateCpm(schedules.filter((schedule) => String(schedule.activity || '').trim()) as any);
  return loads.map((load) => {
    const affected = assignments.filter((assignment) => {
      const start = String(assignment.assignment_start || '');
      const end = String(assignment.assignment_end || start);
      return String(assignment.resource_id || '') === load.resourceId && start <= load.date && load.date <= end;
    });
    const candidates = [...new Set(affected.map((assignment) => String(assignment.schedule_id || '')).filter(Boolean))]
      .map((scheduleId) => {
        const cpm = cpmByActivity.get(scheduleId);
        return { scheduleId, totalFloatDays: cpm?.totalFloat || 0, critical: Boolean(cpm?.critical), cycle: Boolean(cpm?.cycle) };
      })
      .sort((left, right) => Number(left.critical) - Number(right.critical) || Number(left.cycle) - Number(right.cycle) || right.totalFloatDays - left.totalFloatDays || left.scheduleId.localeCompare(right.scheduleId));
    return {
      resourceId: load.resourceId,
      date: load.date,
      capacityHours: load.capacityHours,
      plannedHours: load.allocatedHours,
      hoursToRelevel: load.overAllocatedHours,
      assignmentIds: affected.map((assignment) => String(assignment.id)).filter(Boolean),
      scheduleIds: [...new Set(affected.map((assignment) => String(assignment.schedule_id)).filter(Boolean))],
      candidates,
    };
  });
}

/** Spreads planned assignment hours across the assignment period. This stays
 * separate from actual Labor Duty/Equipment usage so planning never rewrites
 * recorded site facts. */
export function calculatePlannedResourceLoads(
  resources: Array<Record<string, any>>,
  assignments: Array<Record<string, any>>,
  schedules: Array<Record<string, any>> = [],
): ResourceLoad[] {
  const capacityByResource = new Map(resources.map((resource) => [String(resource.id), Math.max(0, Number(resource.daily_capacity_hours) || 0)]));
  const scheduleById = new Map(schedules.map((schedule) => [String(schedule.id), schedule]));
  const totals = new Map<string, number>();
  for (const row of assignments) {
    const resourceId = String(row.resource_id || '');
    const start = String(row.assignment_start || '');
    const end = String(row.assignment_end || start);
    const capacity = capacityByResource.get(resourceId);
    const resource = resources.find((candidate) => String(candidate.id) === resourceId);
    if (!resourceId || !start || !end || end < start || capacity === undefined || !resource) continue;
    const dates = workingDatesBetween(start, end, scheduleById.get(String(row.schedule_id || '')) || row)
      .filter((date) => (!resource.availability_start_date || date >= String(resource.availability_start_date)) && (!resource.availability_end_date || date <= String(resource.availability_end_date)));
    const hours = Math.max(0, Number(row.planned_hours) || 0);
    if (!hours) continue;
    if (!dates.length) continue;
    for (const date of dates) {
      const key = `${resourceId}|${date}`;
      totals.set(key, (totals.get(key) || 0) + hours / dates.length);
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
