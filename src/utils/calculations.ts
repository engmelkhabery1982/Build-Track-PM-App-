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
