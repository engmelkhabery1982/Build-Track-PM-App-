/**
 * Controlled reference project used for acceptance testing.
 *
 * It is deliberately NOT seed data for the user's SQLite database. These
 * records and their expected figures are an independent, repeatable oracle
 * for the core commercial, schedule, progress and data-quality rules.
 */
export const referenceProject = {
  projects: [{ id: 'project-acceptance-1', project_code: 'PRJ-ACC-001', name: 'Reference Commercial Project' }],
  contracts: [
    { id: 'contract-main-1', project_id: 'project-acceptance-1', contract_number: 'CNT-ACC-001', contract_value: 1_000_000, start_date: '2026-01-01', end_date: '2026-06-30' },
    { id: 'contract-sub-1', project_id: 'project-acceptance-1', contract_number: 'CNT-ACC-001-SUB-001', parent_main_contract_id: 'contract-main-1', contract_value: 280_000, start_date: '2026-01-01', end_date: '2026-04-30' },
  ],
  boqHeaders: [
    { id: 'boq-main-1', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_code: 'BOQ-ACC-MAIN' },
    { id: 'boq-sub-1', project_id: 'project-acceptance-1', contract_id: 'contract-sub-1', boq_code: 'BOQ-ACC-SUB' },
  ],
  boqItems: [
    { id: 'boq-civil-1', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_header_id: 'boq-main-1', item_code: 'CIV-001', item_name: 'Concrete works', quantity: 1_000, unit_rate: 500, amount: 500_000 },
    { id: 'boq-mep-1', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_header_id: 'boq-main-1', item_code: 'MEP-001', item_name: 'MEP works', quantity: 200, unit_rate: 2_500, amount: 500_000 },
    { id: 'boq-sub-civil-1', project_id: 'project-acceptance-1', contract_id: 'contract-sub-1', boq_header_id: 'boq-sub-1', item_code: 'CIV-001-SUB', item_name: 'Concrete works subcontract', quantity: 1_000, unit_rate: 280, amount: 280_000, main_boq_item_id: 'boq-civil-1' },
  ],
  schedules: [
    { id: 'act-civil-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', activity_code: 'CIV-001-A01', activity: 'Concrete – first half', start_date: '2026-01-01', end_date: '2026-01-14', planned_quantity: 500, unit_rate: 500, calendar_name: '6-Day Week' },
    { id: 'act-civil-02', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', activity_code: 'CIV-001-A02', activity: 'Concrete – second half', start_date: '2026-01-15', end_date: '2026-01-31', planned_quantity: 500, unit_rate: 500, predecessor_item: 'act-civil-01', relationship_type: 'FS', calendar_name: '6-Day Week' },
    { id: 'act-mep-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-mep-1', activity_code: 'MEP-001-A01', activity: 'MEP installation', start_date: '2026-02-01', end_date: '2026-03-31', planned_quantity: 200, unit_rate: 2_500, predecessor_item: 'act-civil-02', relationship_type: 'FS', calendar_name: '6-Day Week' },
  ],
  scheduleDistributions: [
    { id: 'dist-civil-01', schedule_id: 'act-civil-01', period_start: '2026-01-01', period_end: '2026-01-07', planned_quantity: 200, unit_rate: 500, planned_value: 100_000 },
    { id: 'dist-civil-02', schedule_id: 'act-civil-01', period_start: '2026-01-08', period_end: '2026-01-14', planned_quantity: 300, unit_rate: 500, planned_value: 150_000 },
    { id: 'dist-civil-03', schedule_id: 'act-civil-02', period_start: '2026-01-15', period_end: '2026-01-31', planned_quantity: 500, unit_rate: 500, planned_value: 250_000 },
  ],
  wirEntries: [
    { id: 'wir-acc-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', inspection_date: '2026-01-14', quantity: 500, result: 'Pass' },
  ],
  costEntries: [
    { id: 'cost-acc-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', date: '2026-01-14', cost_type: 'Material', amount: 160_000 },
  ],
  contractSovLines: [
    { id: 'sov-civil-1', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', sov_line_code: 'SOV-CIV-001', original_budget: 500_000, status: 'Active' },
    { id: 'sov-mep-1', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-mep-1', sov_line_code: 'SOV-MEP-001', original_budget: 500_000, status: 'Active' },
  ],
  variations: [
    { id: 'var-acc-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', variation_number: 'VO-ACC-001', status: 'Approved', approved_date: '2026-01-10', cost_impact: 100_000, time_impact_days: 14 },
  ],
  cashFlow: [
    { id: 'variation_cash_forecast:var-acc-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', date: '2026-01-10', inflow: 100_000, outflow: 0, net: 100_000, movement_type: 'Forecast', status: 'Open', source_type: 'variation_cash_forecast', source_id: 'var-acc-01' },
  ],
  paymentCertificate: {
    id: 'cert-acc-01', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', certificate_number: 'PC-ACC-001', certificate_type: 'Client', certificate_date: '2026-01-31',
    gross_certified_value: 250_000, retention_rate: 5, advance_recovery: 10_000, deductions: 5_000, tax_rate: 15, status: 'Approved',
  },
  reportingPeriods: [],
  baselines: [],
};

export const referenceExpected = {
  originalContractValue: 1_000_000,
  approvedVariationValue: 100_000,
  revisedContractValue: 1_100_000,
  variationTimeImpactDays: 14,
  dataDate: '2026-01-14',
  plannedValueToDataDate: 250_000,
  earnedValueToDataDate: 250_000,
  actualCostToDataDate: 160_000,
  cpiToDataDate: 1.5625,
  spiToDataDate: 1,
  certificateNetValue: 255_875,
};
