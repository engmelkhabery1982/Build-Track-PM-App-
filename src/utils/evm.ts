import { approvedBaselinePlanForActivity } from '../data/baselineGovernance.ts';
import { distributedPlannedValueToDate, scheduleBudget } from './schedulePlanning.ts';

const money = (value: number) => Math.round(value * 100) / 100;
const datedThrough = (value: unknown, dataDate: string) => Boolean(String(value || '').slice(0, 10) && String(value || '').slice(0, 10) <= dataDate);
const approvedWir = (wir: Record<string, any>) => wir.status === 'Approved' || wir.result === 'Pass' || wir.result === 'Conditional Pass';

/**
 * One EVM calculation basis for the command centre and scheduled reports.
 * BAC/PV are frozen-baseline facts; EV is approved field quantity at the main
 * contract rate; AC is only a dated, contract-allocated actual cost. This
 * prevents project budget, future transactions, or unallocated spend from
 * silently changing the earned-value position.
 */
export function calculateEvmAtDataDate(input: {
  contractIds: string[];
  /** Child/subcontract facts that roll up to the selected main contract(s). */
  performanceContractIds?: string[];
  dataDate: string;
  schedules: Record<string, any>[];
  scheduleDistributions: Record<string, any>[];
  baselines: Record<string, any>[];
  wirEntries: Record<string, any>[];
  boqItems: Record<string, any>[];
  costEntries: Record<string, any>[];
}) {
  const contractIds = new Set(input.contractIds.filter(Boolean));
  const performanceContractIds = new Set((input.performanceContractIds || input.contractIds).filter(Boolean));
  const dataDate = String(input.dataDate || '').slice(0, 10);
  const activities = input.schedules.filter((row) => contractIds.has(String(row.contract_id || '')) && String(row.activity || '').trim());
  const plans = activities.map((activity) => approvedBaselinePlanForActivity(activity, input.scheduleDistributions, input.baselines));
  const bac = money(plans.reduce((sum, plan) => sum + scheduleBudget(plan.activity), 0));
  const pv = money(plans.reduce((sum, plan) => sum + distributedPlannedValueToDate(plan.activity, plan.distributions, dataDate), 0));
  const boqById = new Map(input.boqItems.map((item) => [String(item.id), item]));
  const explicitActivities = new Map(activities.filter((activity) => String(activity.measurement_method || '').trim()).map((activity) => [String(activity.id), activity]));
  const explicitEv = [...explicitActivities.values()].reduce((sum, activity) => {
    const method = String(activity.measurement_method);
    const budget = scheduleBudget(activity);
    if (method === 'Quantity') {
      return sum + input.wirEntries.filter((wir) => String(wir.schedule_id || '') === String(activity.id) && datedThrough(wir.inspection_date, dataDate) && approvedWir(wir)).reduce((activitySum, wir) => {
        const item = boqById.get(String(wir.boq_item_id || ''));
        const mainItem = item?.main_boq_item_id ? boqById.get(String(item.main_boq_item_id)) : item;
        return activitySum + (Number(wir.quantity) || 0) * (Number(mainItem?.unit_rate ?? wir.unit_price) || 0);
      }, 0);
    }
    if (method === '0/100') return sum + (activity.activity_status === 'Completed' && datedThrough(activity.actual_finish_date || activity.status_data_date, dataDate) ? budget : 0);
    if (method === '50/50') {
      if (activity.activity_status === 'Completed' && datedThrough(activity.actual_finish_date || activity.status_data_date, dataDate)) return sum + budget;
      return sum + (datedThrough(activity.actual_start_date || activity.status_data_date, dataDate) ? budget * 0.5 : 0);
    }
    if (method === 'Weighted Milestone') return sum + (budget * Math.max(0, Math.min(100, Number(activity.measurement_weight_pct) || 0)) / 100);
    return sum;
  }, 0);
  const legacyEv = input.wirEntries
    .filter((wir) => performanceContractIds.has(String(wir.contract_id || '')) && datedThrough(wir.inspection_date, dataDate) && approvedWir(wir) && !explicitActivities.has(String(wir.schedule_id || '')))
    .reduce((sum, wir) => {
      const item = boqById.get(String(wir.boq_item_id || ''));
      const mainItem = item?.main_boq_item_id ? boqById.get(String(item.main_boq_item_id)) : item;
      return sum + (Number(wir.quantity) || 0) * (Number(mainItem?.unit_rate ?? wir.unit_price) || 0);
    }, 0);
  const ev = money(explicitEv + legacyEv);
  const ac = money(input.costEntries
    .filter((entry) => performanceContractIds.has(String(entry.contract_id || '')) && datedThrough(entry.date, dataDate))
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0));
  // Keep absent ratios at zero. This is deliberately distinct from a real
  // negative/poor result and preserves the dashboard's existing "—" state.
  const cpi = ac > 0 ? ev / ac : 0;
  const spi = pv > 0 ? ev / pv : 0;
  const eac = money(cpi && cpi > 0 ? bac / cpi : bac);
  return {
    BAC: bac,
    PV: pv,
    EV: ev,
    AC: ac,
    CV: money(ev - ac),
    SV: money(ev - pv),
    CPI: cpi,
    SPI: spi,
    EAC: eac,
    ETC: money(Math.max(0, eac - ac)),
    VAC: money(bac - eac),
    TCPI: bac > ev && bac > ac ? (bac - ev) / (bac - ac) : 0,
  };
}
