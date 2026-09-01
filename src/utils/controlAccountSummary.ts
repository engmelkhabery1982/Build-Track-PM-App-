import { procurementPostingState } from './commercialControl.ts';
import { distributedPlannedValueToDate } from './schedulePlanning.ts';

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
  const budget = Number(sov?.revised_budget ?? sov?.original_budget) || 0;
  const baseline = (input.baselines || []).find((row) => row.contract_id === account.contract_id && row.status === 'Approved');
  if (!dataDate || !baseline) return {
    scope_quantity: Number(boq?.quantity) || 0, control_budget: money(budget),
    planned_value: null, earned_value: null, actual_cost: null, open_commitment: null, cost_to_complete: null, forecast_at_completion: null,
    source_count: 0, data_date: dataDate || null, control_status: !dataDate ? 'Data Date Required' : 'Approved Baseline Required',
    source_summary: !dataDate ? 'Set Control Data Date before using PV/EV/AC.' : 'Approve a baseline for the main contract before using PV/EV/AC.',
  };
  const onOrBefore = (value: unknown) => !value || String(value) <= dataDate;
  const linked = (rows: Record<string, any>[]) => rows.filter((row) => row.control_account_id === account.id);
  const schedules = linked(input.schedules); const wirs = linked(input.wirEntries); const costs = linked(input.costEntries);
  const orders = linked(input.procurement); const receipts = linked(input.procurementReceipts);
  const pv = schedules.reduce((sum, row) => sum + distributedPlannedValueToDate(row, input.scheduleDistributions || [], dataDate), 0);
  const ev = wirs.filter((row) => onOrBefore(row.inspection_date) && (['Pass', 'Conditional Pass'].includes(String(row.result || '')) || row.status === 'Approved'))
    .reduce((sum, row) => sum + (Number(row.item_amount) || ((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))), 0);
  const directActual = costs.filter((row) => onOrBefore(row.date)).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const receiptActual = receipts.filter((row) => onOrBefore(row.receipt_date) && row.status === 'Accepted').reduce((sum, row) => sum + (Number(row.accepted_amount) || 0), 0);
  const postedReceiptIds = new Set(costs.filter((row) => row.source_type === 'procurement_receipt').map((row) => row.source_id));
  const missingReceiptActual = receipts.filter((row) => onOrBefore(row.receipt_date) && row.status === 'Accepted' && !postedReceiptIds.has(row.id)).reduce((sum, row) => sum + (Number(row.accepted_amount) || 0), 0);
  const ac = directActual + missingReceiptActual;
  const committed = orders.filter((row) => onOrBefore(row.order_date) && procurementPostingState(row).isCommitment).reduce((sum, row) => sum + (Number(row.total_cost) || ((Number(row.quantity) || 0) * (Number(row.unit_cost) || 0))), 0);
  const openCommitment = Math.max(0, committed - receiptActual);
  const fac = Math.max(budget, ac + openCommitment);
  return {
    scope_quantity: Number(boq?.quantity) || 0, control_budget: money(budget), planned_value: money(pv), earned_value: money(ev), actual_cost: money(ac),
    open_commitment: money(openCommitment), cost_to_complete: money(Math.max(0, fac - ac)), forecast_at_completion: money(fac),
    source_count: schedules.length + wirs.length + costs.length + orders.length + receipts.length,
    data_date: dataDate, control_status: 'Ready', source_summary: `Activities ${schedules.length} · WIR ${wirs.length} · Costs ${costs.length} · PO ${orders.length} · GRN ${receipts.length}`,
  };
}
