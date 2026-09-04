export interface SiteTask {
  taskId: string;
  description: string;
  boqItemId?: string;
  variationId?: string;
  qty: number;
  estimatedRate: number;
}

export interface ScopeCreepParams {
  contractBoqItemIds: string[];
  approvedVariationIds: string[];
  siteTasks: SiteTask[];
}

export interface ScopeCreepResult {
  hasScopeCreep: boolean;
  unmappedTasksCount: number;
  creepCostEstimate: number;
  unmappedTasks: SiteTask[];
}

/**
 * SC-08: Contractual Scope Boundary & Scope Creep Detector
 * Identifies unauthorized site activities not mapped to approved contract BOQ items
 * or approved Variation Orders (VO), computing potential financial exposure.
 */
export function detectScopeCreep(params: ScopeCreepParams): ScopeCreepResult {
  const { contractBoqItemIds, approvedVariationIds, siteTasks } = params;

  const boqSet = new Set(contractBoqItemIds);
  const voSet = new Set(approvedVariationIds);

  const unmappedTasks = siteTasks.filter((task) => {
    const hasValidBoq = task.boqItemId ? boqSet.has(task.boqItemId) : false;
    const hasValidVariation = task.variationId ? voSet.has(task.variationId) : false;
    return !hasValidBoq && !hasValidVariation;
  });

  const creepCostEstimate = unmappedTasks.reduce(
    (sum, task) => sum + task.qty * task.estimatedRate,
    0
  );

  return {
    hasScopeCreep: unmappedTasks.length > 0,
    unmappedTasksCount: unmappedTasks.length,
    creepCostEstimate: Number(creepCostEstimate.toFixed(2)),
    unmappedTasks,
  };
}
