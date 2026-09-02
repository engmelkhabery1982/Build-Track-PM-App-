const money = (value: number) => Math.round(value * 100) / 100;

export interface CostInput {
  qty: number;
  rate: number;
}

export interface CostVarianceResult {
  plannedCost: number;
  actualCost: number;
  usageVariance: number;
  rateVariance: number;
  totalVariance: number;
}

/**
 * Calculates usage and rate variances between planned and actual costs.
 *
 * Usage Variance = (Planned Qty - Actual Qty) * Planned Rate
 * Rate Variance  = (Planned Rate - Actual Rate) * Actual Qty
 * Total Variance = Planned Cost - Actual Cost = Usage Variance + Rate Variance
 */
export function calculateCostVariance(
  planned: CostInput,
  actual: CostInput
): CostVarianceResult {
  const plannedQty = Number(planned?.qty) || 0;
  const plannedRate = Number(planned?.rate) || 0;
  const actualQty = Number(actual?.qty) || 0;
  const actualRate = Number(actual?.rate) || 0;

  const plannedCost = money(plannedQty * plannedRate);
  const actualCost = money(actualQty * actualRate);

  const usageVariance = money((plannedQty - actualQty) * plannedRate);
  const rateVariance = money((plannedRate - actualRate) * actualQty);
  const totalVariance = money(plannedCost - actualCost);

  return {
    plannedCost,
    actualCost,
    usageVariance,
    rateVariance,
    totalVariance,
  };
}
