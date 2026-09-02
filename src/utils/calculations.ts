import type { BOQItem, Schedule, BOQItemActivity, BOQActivitySummary } from '../types';

export function calculateBOQActivityAllocation(
  boqItem: BOQItem,
  links: BOQItemActivity[],
  activities: Schedule[]
): BOQActivitySummary {
  const boqItemQuantity = boqItem.quantity || 0;
  const boqItemAmount = boqItem.amount || 0;

  let totalAllocatedQty = 0;
  let totalAllocatedCost = 0;
  let totalAllocationPct = 0;

  for (const link of links) {
    totalAllocatedQty += link.allocated_quantity || 0;
    totalAllocatedCost += link.allocated_cost || 0;
    totalAllocationPct += link.allocation_pct || 0;
  }

  const remainingQty = boqItemQuantity - totalAllocatedQty;
  const remainingCost = boqItemAmount - totalAllocatedCost;

  // Over-allocation occurs when:
  // 1. Total percentage exceeds 100% (with small tolerance for rounding)
  // 2. Total allocated quantity exceeds BOQ item quantity
  // 3. Total allocated cost exceeds BOQ item amount
  const isOverAllocated =
    totalAllocationPct > 100.01 ||
    totalAllocatedQty > boqItemQuantity + 0.01 ||
    totalAllocatedCost > boqItemAmount + 0.01;

  return {
    boq_item_id: boqItem.id,
    total_allocated_quantity: totalAllocatedQty,
    total_allocated_cost: totalAllocatedCost,
    total_allocation_pct: totalAllocationPct,
    remaining_quantity: remainingQty,
    remaining_cost: remainingCost,
    is_over_allocated: isOverAllocated,
    boq_item_quantity: boqItemQuantity,
    boq_item_amount: boqItemAmount,
  };
}

export function calculateMilestoneProgress(
  steps: MilestoneLadderStep[],
  progressList: ActivityMilestoneProgress[]
): MilestoneProgressResult {
  if (steps.length === 0) {
    return {
      earnedProgressPct: 0,
      totalWeightPct: 0,
      completedStepsCount: 0,
      totalStepsCount: 0,
      isFullyCompleted: false,
    };
  }

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  // Calculate total weight and validate
  const totalWeightPct = sortedSteps.reduce((sum, step) => sum + (step.weight_pct || 0), 0);

  // Build completion map
  const completionMap = new Map<string, ActivityMilestoneProgress>();
  for (const progress of progressList) {
    completionMap.set(progress.step_id, progress);
  }

  // Calculate earned progress
  let earnedProgressPct = 0;
  let completedStepsCount = 0;
  let currentPendingStep: MilestoneLadderStep | undefined;

  for (const step of sortedSteps) {
    const progress = completionMap.get(step.id);
    const isCompleted = progress?.is_completed === true || progress?.is_completed === 1;

    if (isCompleted) {
      earnedProgressPct += step.weight_pct || 0;
      completedStepsCount++;
    } else if (!currentPendingStep) {
      // First incomplete step is the current pending step
      currentPendingStep = step;
    }
  }

  // Normalize earned progress if total weight is not exactly 100%
  // This handles templates where weights don't sum to exactly 100
  if (totalWeightPct > 0 && Math.abs(totalWeightPct - 100) > 0.01) {
    earnedProgressPct = (earnedProgressPct / totalWeightPct) * 100;
  }

  const isFullyCompleted = completedStepsCount === sortedSteps.length;

  return {
    earnedProgressPct: Math.round(earnedProgressPct * 100) / 100, // Round to 2 decimals
    totalWeightPct: Math.round(totalWeightPct * 100) / 100,
    completedStepsCount,
    totalStepsCount: sortedSteps.length,
    isFullyCompleted,
    currentPendingStep: isFullyCompleted ? undefined : currentPendingStep,
  };
}
