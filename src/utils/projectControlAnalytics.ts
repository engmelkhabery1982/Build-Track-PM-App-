import { calculateEarnedSchedule, type EarnedScheduleResult } from './earnedSchedule.ts';
import { detectScopeCreep, type ScopeCreepResult, type SiteTask } from './scopeGovernance.ts';
import { calculateBoqWasteLedger, type BoqWasteLedgerResult } from './scopeReconciliation.ts';

type Row = Record<string, any>;

const datedAt = (row: Row, keys: string[], dataDate?: string): boolean => {
  if (!dataDate) return true;
  const value = keys.map((key) => String(row[key] || '').slice(0, 10)).find(Boolean);
  return !value || value <= dataDate;
};

const acceptedWir = (row: Row): boolean =>
  row.status === 'Approved' || row.result === 'Pass' || row.result === 'Conditional Pass';

const normalizeUnit = (value: unknown): string => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

export interface OperationalScopeInput {
  boqItems: Row[];
  variations: Row[];
  schedules: Row[];
  wirEntries: Row[];
  costEntries: Row[];
  procurementReceipts: Row[];
  dataDate?: string;
}

/** Builds a scope exception report from real operational facts only. */
export function buildOperationalScopeReport(input: OperationalScopeInput): ScopeCreepResult {
  const authorisedItems = input.boqItems.map((row) => String(row.id || '')).filter(Boolean);
  const approvedVariations = input.variations
    .filter((row) => row.status === 'Approved' && datedAt(row, ['approved_date'], input.dataDate))
    .map((row) => String(row.id || '')).filter(Boolean);
  const facts: SiteTask[] = [];
  const add = (row: Row, sourceType: string, idField: string, descriptionField: string, quantityField: string, rateField: string) => {
    // Indirect/administrative records may legitimately have no BOQ. Only an
    // explicitly scope-controlled record, or one carrying physical quantity,
    // enters the contractual boundary test.
    const quantity = Number(row[quantityField]) || 0;
    const scopeControlled = row.scope_control_required === true || quantity > 0 || Boolean(row.boq_item_id || row.variation_id);
    if (!scopeControlled) return;
    facts.push({
      taskId: String(row[idField] || row.id || ''),
      description: String(row[descriptionField] || row.description || sourceType),
      boqItemId: row.boq_item_id || null,
      variationId: row.variation_id || null,
      qty: quantity || 1,
      estimatedRate: Number(row[rateField]) || Number(row.amount) || Number(row.accepted_amount) || 0,
      sourceType,
    });
  };
  input.schedules.filter((row) => datedAt(row, ['status_data_date', 'start_date'], input.dataDate))
    .forEach((row) => add(row, 'Schedule', 'activity_code', 'activity', 'planned_quantity', 'unit_rate'));
  input.wirEntries.filter((row) => acceptedWir(row) && datedAt(row, ['inspection_date'], input.dataDate))
    .forEach((row) => add(row, 'WIR', 'wir_number', 'work_type', 'quantity', 'unit_price'));
  input.costEntries.filter((row) => datedAt(row, ['date'], input.dataDate))
    .forEach((row) => add(row, 'Cost', 'id', 'boq_item_name', 'quantity', 'unit_rate'));
  input.procurementReceipts.filter((row) => row.status === 'Accepted' && datedAt(row, ['receipt_date'], input.dataDate))
    .forEach((row) => add(row, 'GRN', 'receipt_number', 'item', 'accepted_quantity', 'unit_cost'));
  return detectScopeCreep({ contractBoqItemIds: authorisedItems, approvedVariationIds: approvedVariations, siteTasks: facts });
}

export interface WasteLedgerRow extends BoqWasteLedgerResult {
  itemCode: string;
  description: string;
  unit: string;
  allowancePercent: number | null;
  isAssessable: boolean;
  unitMismatchCount: number;
}

export function buildBoqWasteLedger(input: {
  boqItems: Row[];
  procurementReceipts: Row[];
  wirEntries: Row[];
  progressCorrections?: Row[];
  dataDate?: string;
}): WasteLedgerRow[] {
  const itemById = new Map(input.boqItems.map((row) => [String(row.id), row]));
  const mainItems = input.boqItems.filter((row) => !row.main_boq_item_id);
  const wirById = new Map(input.wirEntries.map((row) => [String(row.id), row]));
  return mainItems.map((item) => {
    const itemId = String(item.id);
    const unit = normalizeUnit(item.unit);
    const receipts = input.procurementReceipts.filter((row) => row.status === 'Accepted'
      && datedAt(row, ['receipt_date'], input.dataDate)
      && String(row.boq_item_id || '') === itemId);
    const comparableReceipts = receipts.filter((row) => !unit || normalizeUnit(row.unit) === unit);
    const purchasedQty = comparableReceipts.reduce((sum, row) => sum + (Number(row.accepted_quantity) || 0), 0);
    const purchasedCost = comparableReceipts.reduce((sum, row) => sum + (Number(row.accepted_amount) || (Number(row.accepted_quantity) || 0) * (Number(row.unit_cost) || 0)), 0);
    const installedWirs = input.wirEntries.filter((row) => {
      if (!acceptedWir(row) || !datedAt(row, ['inspection_date'], input.dataDate)) return false;
      const linkedItem = itemById.get(String(row.boq_item_id || ''));
      return String(linkedItem?.main_boq_item_id || linkedItem?.id || '') === itemId && (!unit || !row.unit || normalizeUnit(row.unit) === unit);
    });
    let installedQty = installedWirs.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    (input.progressCorrections || []).filter((row) => row.status === 'Posted' && datedAt(row, ['effective_date'], input.dataDate)).forEach((row) => {
      const original = wirById.get(String(row.original_wir_id || ''));
      const linkedItem = original ? itemById.get(String(original.boq_item_id || '')) : null;
      if (String(linkedItem?.main_boq_item_id || linkedItem?.id || '') !== itemId) return;
      const quantity = Math.abs(Number(row.quantity) || 0);
      installedQty += row.correction_type === 'Reinstatement' ? quantity : -quantity;
    });
    installedQty = Math.max(0, installedQty);
    const allowanceRaw = item.waste_allowance_percent;
    const allowancePercent = allowanceRaw === '' || allowanceRaw === null || allowanceRaw === undefined
      ? null : Number(allowanceRaw);
    const isAssessable = comparableReceipts.length > 0 && allowancePercent !== null
      && Number.isFinite(allowancePercent) && allowancePercent >= 0;
    const weightedRate = purchasedQty > 0 ? purchasedCost / purchasedQty : Number(item.unit_rate) || 0;
    const result = calculateBoqWasteLedger({
      boqItemId: itemId,
      contractualWasteAllowancePercent: isAssessable ? allowancePercent! : 0,
      purchasedQty,
      certifiedInstalledQty: installedQty,
      unitRate: weightedRate,
    });
    return {
      ...result,
      itemCode: String(item.item_code || ''),
      description: String(item.item_name || item.description || ''),
      unit: String(item.unit || ''),
      allowancePercent,
      isAssessable,
      unitMismatchCount: receipts.length - comparableReceipts.length,
      isExcessiveWaste: isAssessable && result.isExcessiveWaste,
      excessWasteQty: isAssessable ? result.excessWasteQty : 0,
      excessWasteCost: isAssessable ? result.excessWasteCost : 0,
    };
  }).filter((row) => row.purchasedQty > 0 || row.certifiedInstalledQty > 0 || row.unitMismatchCount > 0);
}

export function calculateEarnedScheduleFromSeries(
  points: Array<{ date?: string; planned: number; earned: number }>,
  dataDate?: string,
): (EarnedScheduleResult & { periodCount: number }) | null {
  const eligible = points
    .filter((row) => !dataDate || !row.date || row.date <= dataDate)
    .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')));
  if (eligible.length < 2 || !eligible.some((row) => Number(row.planned) > 0)) return null;
  const result = calculateEarnedSchedule({
    actualTime: eligible.length - 1,
    earnedValue: Number(eligible[eligible.length - 1].earned) || 0,
    cumulativePlannedValues: eligible.map((row) => Number(row.planned) || 0),
  });
  return { ...result, periodCount: eligible.length - 1 };
}
