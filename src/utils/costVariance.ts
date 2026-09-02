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

export interface MixInput {
  plannedMixRatio: number;
  actualMixRatio: number;
  totalActualQty: number;
  plannedRate: number;
}

export interface MixVarianceResult {
  plannedMixRatio: number;
  actualMixRatio: number;
  totalActualQty: number;
  plannedRate: number;
  mixVariance: number;
}

export interface ProductivityInput {
  plannedOutput: number;
  actualOutput: number;
  plannedRate: number;
}

export interface ProductivityVarianceResult {
  plannedOutput: number;
  actualOutput: number;
  plannedRate: number;
  productivityVariance: number;
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

/**
 * Calculates mix variance for resource allocation.
 *
 * Mix Variance = (Planned Mix Ratio - Actual Mix Ratio) * Total Actual Qty * Planned Rate
 */
export function calculateMixVariance(
  input: MixInput
): MixVarianceResult {
  const plannedMixRatio = Number(input?.plannedMixRatio) || 0;
  const actualMixRatio = Number(input?.actualMixRatio) || 0;
  const totalActualQty = Number(input?.totalActualQty) || 0;
  const plannedRate = Number(input?.plannedRate) || 0;

  const mixVariance = money((plannedMixRatio - actualMixRatio) * totalActualQty * plannedRate);

  return {
    plannedMixRatio,
    actualMixRatio,
    totalActualQty,
    plannedRate,
    mixVariance,
  };
}

/**
 * Calculates productivity variance based on actual vs planned output.
 *
 * Productivity Variance = (Actual Output - Planned Output) * Planned Rate
 */
export function calculateProductivityVariance(
  input: ProductivityInput
): ProductivityVarianceResult {
  const plannedOutput = Number(input?.plannedOutput) || 0;
  const actualOutput = Number(input?.actualOutput) || 0;
  const plannedRate = Number(input?.plannedRate) || 0;

  const productivityVariance = money((actualOutput - plannedOutput) * plannedRate);

  return {
    plannedOutput,
    actualOutput,
    plannedRate,
    productivityVariance,
  };
}
