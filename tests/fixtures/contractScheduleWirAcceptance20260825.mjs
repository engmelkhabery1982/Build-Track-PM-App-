/**
 * Controlled acceptance data for the contract → BOQ → activity → WIR chain.
 * It is deliberately self-contained: it must never read or write a live SQLite
 * database, and its values are used only by acceptance tests.
 */
export const contractScheduleWirReference = {
  project: { id: 'p-accept-01', project_code: 'PRJ-ACCEPT-01', title: 'Acceptance Project' },
  otherProject: { id: 'p-accept-02', project_code: 'PRJ-ACCEPT-02', title: 'Other Project' },
  mainContract: {
    id: 'c-main-01', project_id: 'p-accept-01', contract_number: 'CNT-ACCEPT-01',
    contract_value: 1_000_000, start_date: '2026-01-01', end_date: '2026-06-30',
  },
  subcontract: {
    id: 'c-sub-01', project_id: 'p-accept-01', contract_number: 'SUB-ACCEPT-01',
    parent_main_contract_id: 'c-main-01', contract_value: 400_000,
  },
  boqHeader: { id: 'bh-main-01', project_id: 'p-accept-01', contract_id: 'c-main-01', boq_code: 'BOQ-ACCEPT' },
  boqItem: {
    id: 'bi-main-01', project_id: 'p-accept-01', contract_id: 'c-main-01',
    boq_header_id: 'bh-main-01', item_code: 'A-100', description: 'Concrete works',
    quantity: 1_000, unit_rate: 100,
  },
  activities: [
    { id: 'act-01', project_id: 'p-accept-01', contract_id: 'c-main-01', boq_item_id: 'bi-main-01', activity: 'Pour zone A', planned_quantity: 400, duration_days: 5 },
    { id: 'act-02', project_id: 'p-accept-01', contract_id: 'c-main-01', boq_item_id: 'bi-main-01', activity: 'Pour zone B', planned_quantity: 600, duration_days: 4, predecessor_item: 'act-01', relationship_type: 'FS', lag_days: 2 },
  ],
  acceptedWir: {
    id: 'wir-01', project_id: 'p-accept-01', contract_id: 'c-main-01', boq_item_id: 'bi-main-01',
    inspection_date: '2026-01-12', result: 'Pass', quantity: 350,
  },
  approvedVariation: {
    id: 'var-01', project_id: 'p-accept-01', contract_id: 'c-main-01', status: 'Approved',
    variation_number: 'VO-001', cost_impact: 125_000, time_impact_days: 14,
    approval_date: '2026-02-15',
  },
};

export function validAcceptanceSource() {
  const reference = structuredClone(contractScheduleWirReference);
  return {
    projects: [reference.project],
    contracts: [reference.mainContract, reference.subcontract],
    boqHeaders: [reference.boqHeader],
    boqItems: [reference.boqItem],
    schedules: reference.activities,
    wirEntries: [reference.acceptedWir],
    costEntries: [],
    reportingPeriods: [],
    baselines: [],
  };
}
