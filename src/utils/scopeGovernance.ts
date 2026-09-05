export interface SiteTask {
  taskId: string;
  description: string;
  boqItemId?: string | null;
  variationId?: string | null;
  qty: number;
  estimatedRate: number;
  sourceType?: string;
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
 * Identifies operational scope facts that are not backed by either an
 * authorised BOQ item or an approved variation. The caller owns project/date
 * scoping; this function never invents a contractual link.
 */
export function detectScopeCreep(params: ScopeCreepParams): ScopeCreepResult {
  const boqSet = new Set(params.contractBoqItemIds.filter(Boolean));
  const variationSet = new Set(params.approvedVariationIds.filter(Boolean));
  const unmappedTasks = params.siteTasks.filter((task) => {
    const hasBoq = Boolean(task.boqItemId && boqSet.has(task.boqItemId));
    const hasVariation = Boolean(task.variationId && variationSet.has(task.variationId));
    return !hasBoq && !hasVariation;
  });
  const creepCostEstimate = unmappedTasks.reduce(
    (sum, task) => sum + Math.max(0, Number(task.qty) || 0) * Math.max(0, Number(task.estimatedRate) || 0),
    0,
  );
  return {
    hasScopeCreep: unmappedTasks.length > 0,
    unmappedTasksCount: unmappedTasks.length,
    creepCostEstimate: Math.round(creepCostEstimate * 100) / 100,
    unmappedTasks,
  };
}
