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
