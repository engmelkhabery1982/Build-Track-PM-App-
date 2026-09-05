import { procurementPostingState } from './commercialControl.ts';
import { distributedPlannedValueToDate } from './schedulePlanning.ts';
import { calculateEvmAtDataDate } from './evm.ts';
import {
  calculateCostVariance,
  calculateMixVariance,
  calculateProductivityVariance,
  calculateEfficiencyVariance,
} from './costVariance.ts';

const money = (value: number) => Math.round(value * 100) / 100;

/** One traceable roll-up for the governed Control Account screen. */
export function calculateControlAccountSummary(input: {
  account: Record<string, any>;
  boqItems: Record<string, any>[];
  sovLines: Record<string, any>[];
  schedules: Record<string, any>[];
  scheduleDistributions?: Record<string, any>[];
  baselines?: Record<string, any>[];
  wirEntries: Record<string, any>[];
  costEntries: Record<string, any>[];
  procurement: Record<string, any>[];
  procurementReceipts: Record<string, any>[];
}) {
  const { account } = input;
  const dataDate = String(account.data_date || '');
  const boq = input.boqItems.find((row) => row.id === account.boq_item_id);
  const sov = input.sovLines.find((row) => row.id === account.contract_sov_line_id);
  const budget = Number(sov?.revised_budget ?? sov?.original_budget ?? account.control_budget ?? account.budget) || 0;
  const baseline = (input.baselines || []).find((row) => row.contract_id === account.contract_id && row.status === 'Approved');
  if (!dataDate || !baseline) return {
    scope_quantity: Number(boq?.quantity) || 0, control_budget: money(budget),
    planned_value: null, earned_value: null, actual_cost: null, open_commitment: null, cost_to_complete: null, forecast_at_completion: null,
    source_count: 0, data_date: dataDate || null, control_status: !dataDate ? 'Data Date Required' : 'Approved Baseline Required',
    source_summary: !dataDate ? 'Set Control Data Date before using PV/EV/AC.' : 'Approve a baseline for the main contract before using PV/EV/AC.',
    usageVariance: 0, rateVariance: 0, mixVariance: 0, productivityVariance: 0, efficiencyVariance: 0,
  };
  const onOrBefore = (value: unknown) => !value || String(value) <= dataDate;
  const linked = (rows: Record<string, any>[]) => rows.filter((row) => row.control_account_id === account.id);
  const schedules = linked(input.schedules); const wirs = linked(input.wirEntries); const costs = linked(input.costEntries);
  const orders = linked(input.procurement); const receipts = linked(input.procurementReceipts);
  const scoped = (rows: Record<string, any>[]): Record<string, any>[] => rows.map((row) => ({ ...row, contract_id: row.contract_id || account.contract_id }));
  const accountEvm = calculateEvmAtDataDate({
    contractIds: [String(account.contract_id || '')],
    dataDate,
    schedules: scoped(schedules),
    scheduleDistributions: input.scheduleDistributions || [],
    baselines: input.baselines || [],
    wirEntries: scoped(wirs).map((row) => ({ ...row, boq_item_id: row.boq_item_id || account.boq_item_id })),
    boqItems: input.boqItems,
    costEntries: scoped(costs),
    controlAccounts: [{ ...account, status: account.status || 'Active' }],
    contractSovLines: input.sovLines.map((line) => ({ ...line, status: line.status || 'Active' })),
    procurement: scoped(orders),
    procurementReceipts: scoped(receipts),
  });
  const revenuePv = accountEvm.revenue.PV;
  const ac = accountEvm.cost.AC;
  const openCommitment = accountEvm.cost.openCommitment;

  const plannedQty = Number(boq?.quantity) || 0;
  const sellingRate = Number(boq?.unit_rate) || 0;
  const revenueBudget = money(plannedQty * sellingRate);
  const plannedRate = plannedQty > 0 ? budget / plannedQty : (sellingRate || 0);
  const actualQty = wirs.filter((row) => onOrBefore(row.inspection_date) && (['Pass', 'Conditional Pass'].includes(String(row.result || '')) || row.status === 'Approved'))
    .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const actualRate = actualQty > 0 ? ac / actualQty : 0;
  const revenueEv = accountEvm.revenue.EV;
  const deliveryEv = accountEvm.cost.EV ?? 0;
  const deliveryPv = accountEvm.cost.PV ?? 0;
  const costCpi = accountEvm.cost.CPI ?? 0;
  const fac = Math.max(budget, ac + openCommitment);
  const ctc = money(Math.max(0, fac - ac));
  const evmEac = accountEvm.cost.EAC ?? fac;
  const projectedMargin = revenueBudget > 0 ? money(revenueBudget - fac) : null;
  const progressMargin = money(revenueEv - ac);

  const costVar = calculateCostVariance({ qty: plannedQty, rate: plannedRate }, { qty: actualQty, rate: actualRate });
  const mixVar = calculateMixVariance({
    plannedMixRatio: Number(account.planned_mix_ratio) || 1,
    actualMixRatio: Number(account.actual_mix_ratio) || 1,
    totalActualQty: actualQty,
    plannedRate,
  });
  const prodVar = calculateProductivityVariance({
    plannedOutput: Number(account.planned_output) || plannedQty,
    actualOutput: Number(account.actual_output) || actualQty,
    plannedRate,
  });
  const effVar = calculateEfficiencyVariance({
    plannedOutput: Number(account.planned_output) || plannedQty,
    actualOutput: Number(account.actual_output) || actualQty,
    standardQtyPerOutput: Number(account.standard_qty_per_output) || (plannedQty > 0 ? 1 : 0),
    plannedRate,
  });

  return {
    scope_quantity: plannedQty,
    selling_rate: sellingRate,
    revenue_budget: revenueBudget,
    control_budget: money(budget),
    cost_rate: money(plannedRate),
    planned_value: deliveryPv,
    earned_value: deliveryEv,
    revenue_earned_value: revenueEv,
    actual_cost: money(ac),
    open_commitment: money(openCommitment),
    cost_to_complete: ctc,
    forecast_at_completion: fac,
    evm_eac: evmEac,
    projected_margin: projectedMargin,
    progress_margin: progressMargin,
    cpi: costCpi,
    source_count: schedules.length + wirs.length + costs.length + orders.length + receipts.length,
    data_date: dataDate,
    control_status: 'Ready',
    source_summary: `Activities ${schedules.length} · WIR ${wirs.length} · Costs ${costs.length} · PO ${orders.length} · GRN ${receipts.length}`,
    usageVariance: costVar.usageVariance,
    rateVariance: costVar.rateVariance,
    mixVariance: mixVar.mixVariance,
    productivityVariance: prodVar.productivityVariance,
    efficiencyVariance: effVar.efficiencyVariance,
  };
}

export interface ControlAccountPeriodBucket {
  period_name: string;
  period_start: string;
  period_end: string;
  planned_value: number;
  cumulative_planned_value: number;
  earned_value: number;
  cumulative_earned_value: number;
  actual_cost: number;
  cumulative_actual_cost: number;
  open_commitment: number;
  cost_variance: number;
  schedule_variance: number;
  cpi: number | null;
  spi: number | null;
  is_future_period: boolean;
}

/**
 * Calculates a period-by-period time-phased profile for one Control Account.
 * Honors the account's data date so past periods hold dated actuals while future
 * periods carry forward planned distributions without inventing unearned progress.
 */
export function calculateControlAccountPeriodicProfile(input: {
  account: Record<string, any>;
  periods: Array<{ period_name?: string; start_date?: string; end_date?: string; data_date?: string }>;
  boqItems: Record<string, any>[];
  sovLines: Record<string, any>[];
  schedules: Record<string, any>[];
  scheduleDistributions?: Record<string, any>[];
  baselines?: Record<string, any>[];
  wirEntries: Record<string, any>[];
  costEntries: Record<string, any>[];
  procurement: Record<string, any>[];
  procurementReceipts: Record<string, any>[];
}): ControlAccountPeriodBucket[] {
  const { account } = input;
  const dataDate = String(account.data_date || '').slice(0, 10);
  const baseline = (input.baselines || []).find((row) => row.contract_id === account.contract_id && row.status === 'Approved');
  if (!input.periods || !input.periods.length) return [];

  const sortedPeriods = [...input.periods]
    .filter((p) => p.start_date && p.end_date)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));

  const linked = (rows: Record<string, any>[]) => rows.filter((row) => row.control_account_id === account.id);
  const schedules = linked(input.schedules);
  const wirs = linked(input.wirEntries);
  const costs = linked(input.costEntries);
  const orders = linked(input.procurement);
  const receipts = linked(input.procurementReceipts);
  const postedReceiptIds = new Set(costs.filter((row) => row.source_type === 'procurement_receipt').map((row) => row.source_id));

  let prevCumPv = 0;
  let prevCumEv = 0;
  let prevCumAc = 0;

  return sortedPeriods.map((period, idx) => {
    const pStart = String(period.start_date);
    const pEnd = String(period.end_date);
    const periodName = String(period.period_name || `Period ${idx + 1}`);
    const isFuture = Boolean(dataDate && pStart > dataDate);

    // Cumulative Planned Value through period end
    const cumPv = baseline
      ? money(schedules.reduce((sum, row) => sum + distributedPlannedValueToDate(row, input.scheduleDistributions || [], pEnd), 0))
      : 0;
    const periodPv = money(Math.max(0, cumPv - prevCumPv));
    prevCumPv = cumPv;

    // Actual cutoff date for this period
    const effectiveCutoff = dataDate && pEnd > dataDate ? dataDate : pEnd;

    // Cumulative Earned Value through effective cutoff
    const cumEv = !isFuture
      ? money(wirs.filter((row) => {
          const date = String(row.inspection_date || '');
          return Boolean(date && date <= effectiveCutoff && (['Pass', 'Conditional Pass'].includes(String(row.result || '')) || row.status === 'Approved'));
        }).reduce((sum, row) => sum + (Number(row.item_amount) || ((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))), 0))
      : prevCumEv;
    const periodEv = !isFuture ? money(Math.max(0, cumEv - prevCumEv)) : 0;
    prevCumEv = cumEv;

    // Cumulative Actual Cost through effective cutoff
    const directActual = !isFuture
      ? costs.filter((row) => {
          const date = String(row.date || '');
          return Boolean(date && date <= effectiveCutoff);
        }).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
      : 0;

    const missingReceiptActual = !isFuture
      ? receipts.filter((row) => {
          const date = String(row.receipt_date || '');
          return Boolean(date && date <= effectiveCutoff && row.status === 'Accepted' && !postedReceiptIds.has(row.id));
        }).reduce((sum, row) => sum + (Number(row.accepted_amount) || 0), 0)
      : 0;

    const cumAc = !isFuture ? money(directActual + missingReceiptActual) : prevCumAc;
    const periodAc = !isFuture ? money(Math.max(0, cumAc - prevCumAc)) : 0;
    prevCumAc = cumAc;

    // Open commitments through effective cutoff
    const receiptActualForCommitment = receipts.filter((row) => {
      const date = String(row.receipt_date || '');
      return Boolean(date && date <= effectiveCutoff && row.status === 'Accepted');
    }).reduce((sum, row) => sum + (Number(row.accepted_amount) || 0), 0);

    const committed = orders.filter((row) => {
      const date = String(row.order_date || '');
      return Boolean(date && date <= effectiveCutoff && procurementPostingState(row).isCommitment);
    }).reduce((sum, row) => sum + (Number(row.total_cost) || ((Number(row.quantity) || 0) * (Number(row.unit_cost) || 0))), 0);

    const openCommitment = money(Math.max(0, committed - receiptActualForCommitment));

    const cv = money(cumEv - cumAc);
    const sv = money(cumEv - cumPv);
    const cpi = cumAc > 0 ? Math.round((cumEv / cumAc) * 1000) / 1000 : null;
    const spi = cumPv > 0 ? Math.round((cumEv / cumPv) * 1000) / 1000 : null;

    return {
      period_name: periodName,
      period_start: pStart,
      period_end: pEnd,
      planned_value: periodPv,
      cumulative_planned_value: cumPv,
      earned_value: periodEv,
      cumulative_earned_value: cumEv,
      actual_cost: periodAc,
      cumulative_actual_cost: cumAc,
      open_commitment: openCommitment,
      cost_variance: cv,
      schedule_variance: sv,
      cpi,
      spi,
      is_future_period: isFuture,
    };
  });
}

export interface ControlAccountLoadedCostSummary {
  direct_actual_cost: number;
  allocated_overhead: number;
  loaded_actual_cost: number;
  direct_forecast_at_completion: number;
  loaded_forecast_at_completion: number;
  loaded_cost_to_complete: number;
}

/**
 * Augments a Control Account summary with its allocated indirect/overhead share
 * without altering base direct costs or SQLite database tables.
 */
export function calculateControlAccountLoadedCost(
  summary: { actual_cost?: number | null; forecast_at_completion?: number | null },
  allocatedOverhead = 0,
): ControlAccountLoadedCostSummary {
  const directAc = money(Math.max(0, Number(summary?.actual_cost) || 0));
  const overhead = money(Math.max(0, Number(allocatedOverhead) || 0));
  const loadedAc = money(directAc + overhead);
  const directFac = money(Math.max(0, Number(summary?.forecast_at_completion) || 0));
  const loadedFac = money(directFac + overhead);
  return {
    direct_actual_cost: directAc,
    allocated_overhead: overhead,
    loaded_actual_cost: loadedAc,
    direct_forecast_at_completion: directFac,
    loaded_forecast_at_completion: loadedFac,
    loaded_cost_to_complete: money(Math.max(0, loadedFac - loadedAc)),
  };
}
