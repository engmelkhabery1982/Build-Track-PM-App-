import type { CostCurveType, CostPhasingResult, TimePhasedCostBucket } from '../types';
import type { 
  BOQItem, 
  Schedule, 
  BOQItemActivity, 
  BOQActivitySummary,
  MilestoneLadderStep,
  ActivityMilestoneProgress,
  MilestoneProgressResult,
  EACMethod,
  EACMethodResult,
  MultiMethodEACSummary
} from '../types';

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

export function distributeCostTimePhased(params: {
  totalCost: number;
  periodsCount: number;
  curveType: CostCurveType;
  periodDates?: Array<{ start: string; end: string }>;
}): CostPhasingResult {
  const { totalCost, periodsCount, curveType, periodDates } = params;

  if (periodsCount <= 0) {
    return {
      totalCost,
      curveType,
      buckets: [],
      checksumValid: false,
    };
  }

  // Generate raw weights based on curve type
  const rawWeights: number[] = [];

  switch (curveType) {
    case 'linear':
      // Equal distribution across all periods
      for (let i = 0; i < periodsCount; i++) {
        rawWeights.push(1.0);
      }
      break;

    case 'bell_curve':
      // Normal distribution (Gaussian) centered at middle period
      const mean = (periodsCount - 1) / 2;
      const stdDev = periodsCount / 6; // ~99.7% within range
      for (let i = 0; i < periodsCount; i++) {
        const exponent = -Math.pow(i - mean, 2) / (2 * Math.pow(stdDev, 2));
        rawWeights.push(Math.exp(exponent));
      }
      break;

    case 'front_loaded':
      // Exponential decay: higher at start, lower at end
      for (let i = 0; i < periodsCount; i++) {
        rawWeights.push(Math.exp(-2 * i / periodsCount));
      }
      break;

    case 'back_loaded':
      // Exponential growth: lower at start, higher at end
      for (let i = 0; i < periodsCount; i++) {
        rawWeights.push(Math.exp(2 * i / periodsCount) - 1);
      }
      break;

    case 's_curve':
      // Logistic S-curve: slow start, rapid middle, slow end
      for (let i = 0; i < periodsCount; i++) {
        const t = i / (periodsCount - 1); // Normalize to [0, 1]
        const k = 10; // Steepness factor
        const x = k * (t - 0.5);
        const sigmoid = 1 / (1 + Math.exp(-x));
        // Use derivative of sigmoid for distribution weights
        rawWeights.push(sigmoid * (1 - sigmoid) * k);
      }
      break;

    case 'custom':
    default:
      // Fallback to linear
      for (let i = 0; i < periodsCount; i++) {
        rawWeights.push(1.0);
      }
      break;
  }

  // Normalize weights to sum to 1.0
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = rawWeights.map(w => w / totalWeight);

  // Calculate planned costs with penny-perfect reconciliation
  const buckets: TimePhasedCostBucket[] = [];
  let cumulativePlanned = 0;
  let allocatedTotal = 0;

  for (let i = 0; i < periodsCount; i++) {
    const weightPct = normalizedWeights[i] * 100;
    
    // Calculate planned cost for this period
    let plannedCost: number;
    if (i === periodsCount - 1) {
      // Last period: allocate remaining to ensure exact total
      plannedCost = totalCost - allocatedTotal;
    } else {
      // Round to 2 decimal places (penny precision)
      plannedCost = Math.round(normalizedWeights[i] * totalCost * 100) / 100;
      allocatedTotal += plannedCost;
    }

    cumulativePlanned += plannedCost;

    // Generate period dates if not provided
    const periodStart = periodDates?.[i]?.start || `Period ${i + 1} Start`;
    const periodEnd = periodDates?.[i]?.end || `Period ${i + 1} End`;

    buckets.push({
      periodIndex: i,
      periodStart,
      periodEnd,
      weightPct: Math.round(weightPct * 100) / 100,
      plannedCost: Math.round(plannedCost * 100) / 100,
      cumulativePlannedCost: Math.round(cumulativePlanned * 100) / 100,
    });
  }

  // Verify checksum: total of all planned costs must equal totalCost
  const sumPlannedCosts = buckets.reduce((sum, b) => sum + b.plannedCost, 0);
  const checksumValid = Math.abs(sumPlannedCosts - totalCost) < 0.01;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    curveType,
    buckets,
    checksumValid,
  };
}

export function calculateMultiMethodEAC(params: {
  bac: number;
  ev: number;
  ac: number;
  pv?: number;
  cpi?: number;
  spi?: number;
  bottomUpEtc?: number;
}): MultiMethodEACSummary {
  const { bac, ev, ac, pv, bottomUpEtc } = params;

  // Safely derive CPI and SPI with division-by-zero guards
  const cpi = params.cpi !== undefined 
    ? params.cpi 
    : ac > 0 ? ev / ac : (ev === 0 ? 1.0 : 0);

  const spi = params.spi !== undefined
    ? params.spi
    : (pv !== undefined && pv > 0) ? ev / pv : (ev === 0 ? 1.0 : 0);

  // Method 1: Budget Rate (Atypical variances)
  // ETC = BAC - EV, EAC = AC + (BAC - EV)
  const budgetRateETC = bac - ev;
  const budgetRateEAC = ac + budgetRateETC;
  const budgetRateVAC = bac - budgetRateEAC;
  const budgetRateVACPct = bac !== 0 ? (budgetRateVAC / bac) * 100 : 0;

  // Method 2: CPI Extrapolated (Typical cost variances)
  // ETC = (BAC - EV) / CPI, EAC = BAC / CPI or AC + (BAC - EV) / CPI
  const cpiETC = cpi > 0 ? (bac - ev) / cpi : 0;
  const cpiEAC = cpi > 0 ? bac / cpi : ac + cpiETC;
  const cpiVAC = bac - cpiEAC;
  const cpiVACPct = bac !== 0 ? (cpiVAC / bac) * 100 : 0;

  // Method 3: Composite CPI*SPI (Cost and schedule impacted)
  // ETC = (BAC - EV) / (CPI * SPI), EAC = AC + ETC
  const compositeFactor = cpi * spi;
  const compositeETC = compositeFactor > 0 ? (bac - ev) / compositeFactor : 0;
  const compositeEAC = ac + compositeETC;
  const compositeVAC = bac - compositeEAC;
  const compositeVACPct = bac !== 0 ? (compositeVAC / bac) * 100 : 0;

  // Method 4: Bottom-Up (Management re-estimate)
  // ETC = provided bottomUpEtc, EAC = AC + bottomUpEtc
  const bottomUpETCValue = bottomUpEtc !== undefined ? bottomUpEtc : budgetRateETC;
  const bottomUpEAC = ac + bottomUpETCValue;
  const bottomUpVAC = bac - bottomUpEAC;
  const bottomUpVACPct = bac !== 0 ? (bottomUpVAC / bac) * 100 : 0;

  // TCPI calculations with division-by-zero guards
  // TCPI to BAC = (BAC - EV) / (BAC - AC)
  const tcpiBac = (bac - ac) !== 0 ? (bac - ev) / (bac - ac) : 0;

  // TCPI to EAC: Use recommended EAC (determined below)
  // For now, use CPI-based EAC as default for TCPI calculation
  const defaultEAC = cpiEAC;
  const tcpiEac = (defaultEAC - ac) !== 0 ? (bac - ev) / (defaultEAC - ac) : 0;

  // Build methods record
  const methods: Record<EACMethod, EACMethodResult> = {
    budget_rate: {
      method: 'budget_rate',
      name: 'Budget Rate (Atypical)',
      description: 'Assumes current variances are atypical and future work will proceed at planned rate',
      etc: Math.round(budgetRateETC * 100) / 100,
      eac: Math.round(budgetRateEAC * 100) / 100,
      vac: Math.round(budgetRateVAC * 100) / 100,
      vacPct: Math.round(budgetRateVACPct * 100) / 100,
    },
    cpi_extrapolated: {
      method: 'cpi_extrapolated',
      name: 'CPI Extrapolated (Typical)',
      description: 'Assumes current cost performance will continue for remaining work',
      etc: Math.round(cpiETC * 100) / 100,
      eac: Math.round(cpiEAC * 100) / 100,
      vac: Math.round(cpiVAC * 100) / 100,
      vacPct: Math.round(cpiVACPct * 100) / 100,
    },
    composite_cpi_spi: {
      method: 'composite_cpi_spi',
      name: 'Composite CPI×SPI',
      description: 'Accounts for both cost and schedule performance impacts',
      etc: Math.round(compositeETC * 100) / 100,
      eac: Math.round(compositeEAC * 100) / 100,
      vac: Math.round(compositeVAC * 100) / 100,
      vacPct: Math.round(compositeVACPct * 100) / 100,
    },
    bottom_up: {
      method: 'bottom_up',
      name: 'Bottom-Up Re-estimate',
      description: 'Based on detailed management re-estimate of remaining work',
      etc: Math.round(bottomUpETCValue * 100) / 100,
      eac: Math.round(bottomUpEAC * 100) / 100,
      vac: Math.round(bottomUpVAC * 100) / 100,
      vacPct: Math.round(bottomUpVACPct * 100) / 100,
    },
  };

  // Recommendation logic based on PMI best practices
  let recommendedMethod: EACMethod;
  if (spi < 0.85) {
    // Any schedule delay should use composite method to account for both cost and schedule impacts
    recommendedMethod = 'composite_cpi_spi';
  } else if (cpi < 1.0) {
    // Cost overrun but schedule acceptable: use CPI extrapolation
    recommendedMethod = 'cpi_extrapolated';
  } else {
    // Performance on track or ahead: use budget rate
    recommendedMethod = 'budget_rate';
  }

  const recommendedEAC = methods[recommendedMethod].eac;

  // Recalculate TCPI to recommended EAC
  const finalTcpiEac = (recommendedEAC - ac) !== 0 ? (bac - ev) / (recommendedEAC - ac) : 0;

  return {
    bac: Math.round(bac * 100) / 100,
    ev: Math.round(ev * 100) / 100,
    ac: Math.round(ac * 100) / 100,
    cpi: Math.round(cpi * 1000) / 1000,
    spi: Math.round(spi * 1000) / 1000,
    methods,
    tcpiBac: Number((Math.round(tcpiBac * 1000) / 1000).toFixed(3)),
    tcpiEac: Number((Math.round(finalTcpiEac * 1000) / 1000).toFixed(3)),
    recommendedMethod,
    recommendedEAC: Math.round(recommendedEAC * 100) / 100,
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
    const isCompleted = progress?.is_completed === true || 
                        progress?.is_completed?.toString() === '1';

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

