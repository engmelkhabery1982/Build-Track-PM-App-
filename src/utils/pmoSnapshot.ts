import { distributedPlannedValueToDate, scheduleBudget } from './schedulePlanning.ts';

/** Rebuilds an auditable PMO position from dated source records. */
export function calculatePmoSnapshot(input: {
  contract: Record<string, any>;
  dataDate: string;
  schedules: Record<string, any>[];
  scheduleDistributions: Record<string, any>[];
  wirEntries: Record<string, any>[];
  boqItems: Record<string, any>[];
  costEntries: Record<string, any>[];
}) {
  const dataDate = String(input.dataDate || '').slice(0, 10);
  if (!dataDate) throw new Error('A PMO Snapshot requires a governed Data Date.');
  const activities = input.schedules.filter((row) => row.contract_id === input.contract.id && String(row.activity || '').trim());
  const plannedValue = activities.reduce((sum, activity) => sum + distributedPlannedValueToDate(activity, input.scheduleDistributions, dataDate), 0);
  const budgetAtCompletion = activities.reduce((sum, activity) => sum + scheduleBudget(activity), 0);
  const earnedValue = input.wirEntries
    .filter((wir) => wir.project_id === input.contract.project_id && wir.contract_id === input.contract.id && String(wir.inspection_date || '').slice(0, 10) <= dataDate && (wir.status === 'Approved' || wir.result === 'Pass' || wir.result === 'Conditional Pass'))
    .reduce((sum, wir) => {
      const item = input.boqItems.find((candidate) => candidate.id === wir.boq_item_id);
      const mainItem = item?.main_boq_item_id ? input.boqItems.find((candidate) => candidate.id === item.main_boq_item_id) : item;
      return sum + (Number(wir.quantity) || 0) * (Number(mainItem?.unit_rate ?? wir.unit_price) || 0);
    }, 0);
  const actualCost = input.costEntries
    .filter((entry) => entry.project_id === input.contract.project_id && (!entry.contract_id || entry.contract_id === input.contract.id) && String(entry.date || '').slice(0, 10) <= dataDate)
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const cpi = actualCost > 0 ? earnedValue / actualCost : null;
  const spi = plannedValue > 0 ? earnedValue / plannedValue : null;
  return { plannedValue, earnedValue, actualCost, budgetAtCompletion, cpi, spi, estimateAtCompletion: cpi && cpi > 0 ? budgetAtCompletion / cpi : budgetAtCompletion };
}
