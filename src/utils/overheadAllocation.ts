const money = (value: number) => Math.round(value * 100) / 100;

export type OverheadAllocationBasis =
  | 'Direct Cost'
  | 'Earned Value'
  | 'Labor Cost'
  | 'Budget'
  | 'Uniform';

export interface OverheadSourceInput {
  id?: string;
  code?: string;
  name?: string;
  amount: number;
}

export interface DirectTargetAccountInput {
  id: string;
  code?: string;
  name?: string;
  directCost?: number;
  earnedValue?: number;
  laborCost?: number;
  budget?: number;
}

export interface OverheadAllocationLine {
  targetAccountId: string;
  targetCode: string;
  targetName: string;
  basisValue: number;
  allocationPercentage: number;
  allocatedAmount: number;
}

export interface OverheadAllocationResult {
  sourceId: string | null;
  sourceCode: string | null;
  totalSourceOverhead: number;
  allocationBasis: OverheadAllocationBasis;
  allocations: OverheadAllocationLine[];
  totalAllocated: number;
  unallocatedAmount: number;
  isFullyAllocated: boolean;
}

/**
 * Distributes indirect/overhead expenses from an indirect pool or control account
 * across target direct control accounts according to the selected allocation key.
 *
 * It is non-destructive: it calculates the distributed portion without altering
 * raw cost entries, purchase orders or baseline budgets.
 */
export function calculateOverheadAllocation(input: {
  source: OverheadSourceInput;
  targets: DirectTargetAccountInput[];
  basis?: OverheadAllocationBasis;
}): OverheadAllocationResult {
  const sourceAmount = money(Math.max(0, Number(input.source?.amount) || 0));
  const basis = input.basis || 'Direct Cost';
  const targets = input.targets || [];

  if (!targets.length || sourceAmount <= 0) {
    return {
      sourceId: input.source?.id || null,
      sourceCode: input.source?.code || null,
      totalSourceOverhead: sourceAmount,
      allocationBasis: basis,
      allocations: targets.map((target) => ({
        targetAccountId: target.id,
        targetCode: target.code || target.id,
        targetName: target.name || '',
        basisValue: 0,
        allocationPercentage: 0,
        allocatedAmount: 0,
      })),
      totalAllocated: 0,
      unallocatedAmount: sourceAmount,
      isFullyAllocated: sourceAmount === 0,
    };
  }

  // Determine basis weight for each target
  const weights = targets.map((target) => {
    let weight = 0;
    switch (basis) {
      case 'Direct Cost':
        weight = Math.max(0, Number(target.directCost) || 0);
        break;
      case 'Earned Value':
        weight = Math.max(0, Number(target.earnedValue) || 0);
        break;
      case 'Labor Cost':
        weight = Math.max(0, Number(target.laborCost) || 0);
        break;
      case 'Budget':
        weight = Math.max(0, Number(target.budget) || 0);
        break;
      case 'Uniform':
      default:
        weight = 1;
        break;
    }
    return weight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // If total weight is 0 (e.g. no costs yet posted), fall back safely to uniform distribution
  const effectiveWeights = totalWeight > 0 ? weights : targets.map(() => 1);
  const effectiveTotalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0);

  let distributedSum = 0;
  const rawAllocations = targets.map((target, idx) => {
    const weight = effectiveWeights[idx];
    const percentage = effectiveTotalWeight > 0 ? (weight / effectiveTotalWeight) * 100 : 0;
    const allocated = effectiveTotalWeight > 0 ? money((weight / effectiveTotalWeight) * sourceAmount) : 0;
    distributedSum += allocated;
    return {
      targetAccountId: target.id,
      targetCode: target.code || target.id,
      targetName: target.name || '',
      basisValue: weights[idx],
      allocationPercentage: Math.round(percentage * 10000) / 10000,
      allocatedAmount: allocated,
    };
  });

  // Reconcile rounding difference to the largest allocation so sum exactly equals sourceAmount
  const remainder = money(sourceAmount - distributedSum);
  if (remainder !== 0 && rawAllocations.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < rawAllocations.length; i++) {
      if (rawAllocations[i].allocatedAmount > rawAllocations[maxIdx].allocatedAmount) {
        maxIdx = i;
      }
    }
    rawAllocations[maxIdx].allocatedAmount = money(rawAllocations[maxIdx].allocatedAmount + remainder);
  }

  const finalTotalAllocated = money(rawAllocations.reduce((sum, line) => sum + line.allocatedAmount, 0));

  return {
    sourceId: input.source?.id || null,
    sourceCode: input.source?.code || null,
    totalSourceOverhead: sourceAmount,
    allocationBasis: basis,
    allocations: rawAllocations,
    totalAllocated: finalTotalAllocated,
    unallocatedAmount: money(Math.max(0, sourceAmount - finalTotalAllocated)),
    isFullyAllocated: Math.abs(finalTotalAllocated - sourceAmount) <= 0.000001,
  };
}
