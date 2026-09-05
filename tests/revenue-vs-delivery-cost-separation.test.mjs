import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEvmAtDataDate } from '../src/utils/evm.ts';
import { calculateControlAccountSummary } from '../src/utils/controlAccountSummary.ts';

test('A3 — Revenue vs Delivery Cost Separation: selling rate is separated from cost plan rate', () => {
  const dataDate = '2026-03-31';
  
  // Main contract with selling rate of 500 SAR/unit, 1000 units = 500,000 Revenue BAC
  const boqItems = [
    { id: 'boq-main-1', contract_id: 'c-main', item_code: 'BOQ-01', description: 'Excavation & Shoring', quantity: 1000, unit_rate: 500, total_amount: 500000 },
  ];

  const baselines = [
    { id: 'base-1', contract_id: 'c-main', project_id: 'p-1', status: 'Approved', approval_date: '2026-01-01' },
  ];

  const schedules = [
    {
      id: 'sch-1',
      contract_id: 'c-main',
      project_id: 'p-1',
      activity: 'Excavation Works',
      measurement_method: 'Quantity',
      planned_quantity: 1000,
      planned_start: '2026-01-01',
      planned_finish: '2026-06-30',
      total_cost: 500000,
      unit_cost: 280, // Internal cost rate: 280 SAR/unit
      cost_budget: 280000, // Total delivery cost plan: 280,000 SAR
    },
  ];

  const scheduleDistributions = [
    { schedule_id: 'sch-1', period_date: '2026-01-31', planned_value: 80000 },
    { schedule_id: 'sch-1', period_date: '2026-02-28', planned_value: 120000 },
    { schedule_id: 'sch-1', period_date: '2026-03-31', planned_value: 100000 }, // Total PV to date = 300,000 (selling value)
  ];

  // Approved WIR: 500 units inspected and passed by March 31
  const wirEntries = [
    {
      id: 'wir-1',
      contract_id: 'c-main',
      schedule_id: 'sch-1',
      boq_item_id: 'boq-main-1',
      inspection_date: '2026-03-15',
      quantity: 500,
      status: 'Approved',
      result: 'Pass',
    },
  ];

  // Actual cost incurred for the 500 units is 160,000 SAR (higher than planned 500 * 280 = 140,000)
  const costEntries = [
    { id: 'cost-1', contract_id: 'c-main', date: '2026-01-31', amount: 50000 },
    { id: 'cost-2', contract_id: 'c-main', date: '2026-02-28', amount: 60000 },
    { id: 'cost-3', contract_id: 'c-main', date: '2026-03-20', amount: 50000 },
    // Future cost entry after dataDate - must be ignored!
    { id: 'cost-future', contract_id: 'c-main', date: '2026-04-15', amount: 30000 },
  ];

  // Control accounts representing the cost plan
  const controlAccounts = [
    {
      id: 'ca-1',
      contract_id: 'c-main',
      project_id: 'p-1',
      boq_item_id: 'boq-main-1',
      contract_sov_line_id: 'sov-1',
      control_account_code: 'CA-EXC-01',
      budget: 280000,
      data_date: dataDate,
      status: 'Active',
    },
  ];

  const contractSovLines = [
    { id: 'sov-1', contract_id: 'c-main', original_budget: 280000, revised_budget: 280000, status: 'Active' },
  ];

  const result = calculateEvmAtDataDate({
    contractIds: ['c-main'],
    dataDate,
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    boqItems,
    costEntries,
    controlAccounts,
    contractSovLines,
  });

  // 1. Revenue metrics verification (Selling rate 500 SAR)
  assert.equal(result.revenue.BAC, 500000, 'Revenue BAC should be 500,000 SAR');
  assert.equal(result.revenue.PV, 300000, 'Revenue PV to date should be 300,000 SAR');
  assert.equal(result.revenue.EV, 250000, 'Revenue EV (500 units * 500 SAR) should be 250,000 SAR');
  assert.equal(result.revenue.SV, -50000, 'Revenue SV should be -50,000 SAR');
  assert.equal(result.revenue.SPI, 250000 / 300000, 'Revenue SPI should be ~0.833');

  // 2. Delivery Cost metrics verification (Internal Cost budget 280,000 SAR)
  assert.equal(result.cost.hasCostPlan, true, 'hasCostPlan should be true');
  assert.equal(result.cost.status, 'Ready', 'Cost status should be Ready');
  assert.equal(result.cost.BAC, 280000, 'Cost BAC should be 280,000 SAR, NOT selling price');
  assert.equal(result.cost.PV, 168000, 'Cost PV (300,000 * 280/500) should be 168,000 SAR');
  assert.equal(result.cost.EV, 140000, 'Cost EV (250,000 * 280/500) should be 140,000 SAR');
  assert.equal(result.cost.AC, 160000, 'Cost AC should be 160,000 SAR (excluding future 30,000 SAR)');
  
  // Cost CPI = Cost EV / AC = 140,000 / 160,000 = 0.875 (over budget!)
  assert.equal(result.cost.CPI, 0.875, 'Cost CPI must be 0.875, NOT Revenue EV/AC');
  assert.equal(result.cost.CV, -20000, 'Cost CV (140,000 - 160,000) should be -20,000 SAR');
  
  // Cost EAC = Cost BAC / Cost CPI = 280,000 / 0.875 = 320,000 SAR
  assert.equal(result.cost.EAC, 320000, 'Cost EAC must be based on Cost BAC (320,000), NEVER Revenue BAC');
  assert.equal(result.cost.ETC, 160000, 'Cost ETC (320,000 - 160,000) should be 160,000 SAR');
  assert.equal(result.cost.VAC, -40000, 'Cost VAC (280,000 - 320,000) should be -40,000 SAR');

  // 3. Commercial & Margin verification
  assert.equal(result.margin.grossMarginBAC, 220000, 'Gross Margin BAC should be 220,000 SAR (500k - 280k)');
  assert.equal(result.margin.grossMarginBACPct, 44, 'Gross Margin BAC % should be 44%');
  assert.equal(result.margin.projectedMarginEAC, 180000, 'Projected Margin EAC should be 180,000 SAR (500k - 320k)');
  assert.equal(result.margin.projectedMarginEACPct, 36, 'Projected Margin EAC % should be 36%');
  assert.equal(result.margin.progressMargin, 90000, 'Progress Margin (Revenue EV 250k - AC 160k) should be 90,000 SAR');
});

test('A3 — Missing Cost Plan: cost forecast returns Unavailable and never invents EAC from Revenue BAC', () => {
  const dataDate = '2026-03-31';
  
  const boqItems = [
    { id: 'boq-main-1', contract_id: 'c-main', item_code: 'BOQ-01', description: 'Turnkey Works', quantity: 100, unit_rate: 1000, total_amount: 100000 },
  ];

  const baselines = [
    { id: 'base-1', contract_id: 'c-main', project_id: 'p-1', status: 'Approved', approval_date: '2026-01-01' },
  ];

  const schedules = [
    {
      id: 'sch-1',
      contract_id: 'c-main',
      project_id: 'p-1',
      activity: 'General Construction',
      measurement_method: '0/100',
      total_cost: 100000,
      planned_start: '2026-01-01',
      planned_finish: '2026-06-30',
      // No unit_cost, no cost_budget provided
    },
  ];

  const scheduleDistributions = [
    { schedule_id: 'sch-1', period_date: '2026-03-31', planned_value: 50000 },
  ];

  const wirEntries = [];
  const costEntries = [
    { id: 'cost-1', contract_id: 'c-main', date: '2026-02-15', amount: 25000 },
  ];

  // No control accounts or SOV lines provided!
  const result = calculateEvmAtDataDate({
    contractIds: ['c-main'],
    dataDate,
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    boqItems,
    costEntries,
    controlAccounts: [],
    contractSovLines: [],
  });

  // Revenue metrics exist
  assert.equal(result.revenue.BAC, 100000, 'Revenue BAC should be 100,000 SAR');
  assert.equal(result.revenue.PV, 50000, 'Revenue PV should be 50,000 SAR');
  
  // Cost indicators MUST be Unavailable / null
  assert.equal(result.cost.hasCostPlan, false, 'hasCostPlan should be false');
  assert.equal(result.cost.status, 'Unavailable', 'Cost status should be Unavailable');
  assert.equal(result.cost.BAC, null, 'Cost BAC should be null');
  assert.equal(result.cost.PV, null, 'Cost PV should be null');
  assert.equal(result.cost.EV, null, 'Cost EV should be null');
  assert.equal(result.cost.AC, 25000, 'Cost AC is known from cost entries');
  assert.equal(result.cost.CPI, null, 'Cost CPI should be null');
  assert.equal(result.cost.EAC, null, 'Cost EAC must NOT be fabricated from Revenue BAC');
  assert.equal(result.cost.ETC, null, 'Cost ETC should be null');
  assert.equal(result.cost.VAC, null, 'Cost VAC should be null');
  assert.equal(result.margin.grossMarginBAC, null, 'Gross margin should be null without cost plan');
});

test('A3 — Control Account Summary adheres to strict revenue vs delivery cost separation', () => {
  const dataDate = '2026-03-31';

  const boqItems = [
    { id: 'boq-1', item_code: 'BOQ-CONC-01', description: 'Reinforced Concrete', quantity: 200, unit_rate: 600, total_amount: 120000 },
  ];

  const sovLines = [
    { id: 'sov-1', contract_id: 'c-main', original_budget: 80000, revised_budget: 80000 },
  ];

  const baselines = [
    { id: 'base-1', contract_id: 'c-main', status: 'Approved' },
  ];

  const schedules = [
    { id: 'sch-1', control_account_id: 'ca-1', contract_id: 'c-main', boq_item_id: 'boq-1', activity: 'Concrete works', budget: 120000 },
  ];

  const scheduleDistributions = [
    { schedule_id: 'sch-1', period_date: '2026-03-31', planned_value: 40000 },
  ];

  const wirEntries = [
    {
      id: 'wir-1',
      control_account_id: 'ca-1',
      inspection_date: '2026-03-10',
      quantity: 100, // 50% completed
      status: 'Approved',
      result: 'Pass',
    },
  ];

  const costEntries = [
    { id: 'cost-1', control_account_id: 'ca-1', date: '2026-03-15', amount: 45000 },
  ];

  const summary = calculateControlAccountSummary({
    account: {
      id: 'ca-1',
      contract_id: 'c-main',
      boq_item_id: 'boq-1',
      contract_sov_line_id: 'sov-1',
      data_date: dataDate,
    },
    boqItems,
    sovLines,
    baselines,
    schedules,
    scheduleDistributions,
    wirEntries,
    costEntries,
    procurement: [],
    procurementReceipts: [],
  });

  assert.equal(summary.control_status, 'Ready');
  assert.equal(summary.scope_quantity, 200, 'Scope quantity should be 200');
  assert.equal(summary.selling_rate, 600, 'Selling rate should be 600 SAR/unit');
  assert.equal(summary.revenue_budget, 120000, 'Revenue budget should be 120,000 SAR');
  assert.equal(summary.control_budget, 80000, 'Delivery Cost budget should be 80,000 SAR');
  assert.equal(summary.cost_rate, 400, 'Cost unit rate should be 80,000 / 200 = 400 SAR/unit');
  assert.equal(summary.revenue_earned_value, 60000, 'Revenue EV (100 * 600) should be 60,000 SAR');
  assert.equal(summary.earned_value, 40000, 'Delivery Cost EV (100 * 400) should be 40,000 SAR');
  assert.equal(summary.actual_cost, 45000, 'AC should be 45,000 SAR');
  assert.equal(summary.cpi, 40000 / 45000, 'CPI should be 40k / 45k = ~0.888');
  assert.equal(summary.forecast_at_completion, 80000, 'Committed floor FAC should be 80,000 SAR');
  assert.equal(summary.evm_eac, 90000, 'Cost EVM EAC should be 80,000 / (40k/45k) = 90,000 SAR');
  assert.equal(summary.projected_margin, 40000, 'Projected margin should be 120k - 80k = 40,000 SAR');
  assert.equal(summary.progress_margin, 15000, 'Progress margin should be Revenue EV 60k - AC 45k = 15,000 SAR');
});

test('A3 — Multiple Control Accounts rollup matches project-level Delivery Cost BAC and EAC', () => {
  const dataDate = '2026-06-30';

  const boqItems = [
    { id: 'boq-1', item_code: 'BOQ-01', description: 'Substructure', quantity: 500, unit_rate: 1000, total_amount: 500000 },
    { id: 'boq-2', item_code: 'BOQ-02', description: 'Superstructure', quantity: 500, unit_rate: 1500, total_amount: 750000 },
  ];

  const contractSovLines = [
    { id: 'sov-1', contract_id: 'c-main', original_budget: 350000, revised_budget: 350000, status: 'Active' },
    { id: 'sov-2', contract_id: 'c-main', original_budget: 450000, revised_budget: 450000, status: 'Active' },
  ];

  const controlAccounts = [
    { id: 'ca-1', contract_id: 'c-main', boq_item_id: 'boq-1', contract_sov_line_id: 'sov-1', data_date: dataDate, status: 'Active' },
    { id: 'ca-2', contract_id: 'c-main', boq_item_id: 'boq-2', contract_sov_line_id: 'sov-2', data_date: dataDate, status: 'Active' },
  ];

  const baselines = [
    { id: 'base-1', contract_id: 'c-main', status: 'Approved' },
  ];

  const schedules = [
    { id: 'sch-1', contract_id: 'c-main', activity: 'Substructure Works', control_account_id: 'ca-1', planned_start: '2026-01-01', planned_finish: '2026-06-30', total_cost: 500000 },
    { id: 'sch-2', contract_id: 'c-main', activity: 'Superstructure Works', control_account_id: 'ca-2', planned_start: '2026-04-01', planned_finish: '2026-12-31', total_cost: 750000 },
  ];

  const scheduleDistributions = [
    { schedule_id: 'sch-1', period_date: '2026-06-30', planned_value: 500000 },
    { schedule_id: 'sch-2', period_date: '2026-06-30', planned_value: 250000 },
  ];

  const wirEntries = [
    { id: 'wir-1', contract_id: 'c-main', schedule_id: 'sch-1', boq_item_id: 'boq-1', control_account_id: 'ca-1', inspection_date: '2026-06-15', quantity: 500, status: 'Approved' },
    { id: 'wir-2', contract_id: 'c-main', schedule_id: 'sch-2', boq_item_id: 'boq-2', control_account_id: 'ca-2', inspection_date: '2026-06-20', quantity: 100, status: 'Approved' },
  ];

  const costEntries = [
    { id: 'cost-1', contract_id: 'c-main', control_account_id: 'ca-1', date: '2026-06-25', amount: 320000 },
    { id: 'cost-2', contract_id: 'c-main', control_account_id: 'ca-2', date: '2026-06-28', amount: 120000 },
    { id: 'cost-future', contract_id: 'c-main', control_account_id: 'ca-2', date: '2026-07-15', amount: 90000 }, // beyond cut-off
  ];

  const result = calculateEvmAtDataDate({
    contractIds: ['c-main'],
    dataDate,
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    boqItems,
    costEntries,
    controlAccounts,
    contractSovLines,
  });

  // Total Revenue BAC = 500,000 + 750,000 = 1,250,000 SAR
  assert.equal(result.revenue.BAC, 1250000);
  // Total Cost BAC = 350,000 + 450,000 = 800,000 SAR
  assert.equal(result.cost.BAC, 800000);
  // Revenue EV = 500*1000 + 100*1500 = 500,000 + 150,000 = 650,000 SAR
  assert.equal(result.revenue.EV, 650000);
  // Cost EV is valued per Control Account: 100% * 350,000 + 20% * 450,000.
  // A single portfolio cost/revenue ratio would incorrectly return 416,000.
  assert.equal(result.cost.EV, 440000);
  // Cost PV is also time-phased per Control Account: 100% * 350,000 + 1/3 * 450,000.
  assert.equal(result.cost.PV, 500000);
  // Cost AC = 320,000 + 120,000 = 440,000 SAR
  assert.equal(result.cost.AC, 440000);
  // Gross Margin BAC = 1,250,000 - 800,000 = 450,000 SAR (36%)
  assert.equal(result.margin.grossMarginBAC, 450000);
  assert.equal(result.margin.grossMarginBACPct, 36);
});

test('A3 — Negative actual cost reversals and future transactions are governed safely', () => {
  const dataDate = '2026-05-31';

  const boqItems = [{ id: 'boq-1', quantity: 100, unit_rate: 1000 }];
  const baselines = [{ id: 'b-1', contract_id: 'c-1', status: 'Approved' }];
  const schedules = [{ id: 'sch-1', contract_id: 'c-1', activity: 'Civil Works', planned_start: '2026-01-01', planned_finish: '2026-12-31', total_cost: 100000, cost_budget: 60000 }];
  const scheduleDistributions = [{ schedule_id: 'sch-1', period_date: '2026-05-31', planned_value: 40000 }];
  const wirEntries = [{ id: 'wir-1', contract_id: 'c-1', boq_item_id: 'boq-1', schedule_id: 'sch-1', inspection_date: '2026-05-15', quantity: 30, status: 'Approved' }];
  const controlAccounts = [{ id: 'ca-1', contract_id: 'c-1', contract_sov_line_id: 'sov-1', data_date: dataDate, status: 'Active' }];
  const contractSovLines = [{ id: 'sov-1', contract_id: 'c-1', original_budget: 60000, revised_budget: 60000, status: 'Active' }];

  // Actual cost entries including an accounting credit/reversal (-5,000 SAR) and a future charge
  const costEntries = [
    { id: 'cost-1', contract_id: 'c-1', date: '2026-03-01', amount: 20000 },
    { id: 'cost-2', contract_id: 'c-1', date: '2026-04-01', amount: -5000 }, // Reversal
    { id: 'cost-3', contract_id: 'c-1', date: '2026-05-01', amount: 10000 },
    { id: 'cost-4', contract_id: 'c-1', date: '2026-06-01', amount: 50000 }, // Beyond dataDate
  ];

  const result = calculateEvmAtDataDate({
    contractIds: ['c-1'],
    dataDate,
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    boqItems,
    costEntries,
    controlAccounts,
    contractSovLines,
  });

  // AC should be 20,000 - 5,000 + 10,000 = 25,000 SAR
  assert.equal(result.cost.AC, 25000);
  assert.equal(result.cost.BAC, 60000);
  assert.equal(result.revenue.EV, 30000);
  assert.equal(result.cost.EV, 18000); // 30,000 * 0.6
  assert.equal(result.cost.CV, -7000); // 18,000 - 25,000
});

test('A3 — Draft SOV budget cannot activate delivery-cost performance indicators', () => {
  const result = calculateEvmAtDataDate({
    contractIds: ['c-1'], dataDate: '2026-05-31',
    schedules: [{ id: 'sch-1', contract_id: 'c-1', activity: 'Works', start_date: '2026-01-01', end_date: '2026-12-31', budget: 100000 }],
    scheduleDistributions: [], baselines: [], wirEntries: [], boqItems: [], costEntries: [],
    controlAccounts: [{ id: 'ca-1', contract_id: 'c-1', contract_sov_line_id: 'sov-1', status: 'Active' }],
    contractSovLines: [{ id: 'sov-1', contract_id: 'c-1', original_budget: 60000, status: 'Draft' }],
  });
  assert.equal(result.cost.hasCostPlan, false);
  assert.equal(result.cost.status, 'Approved Baseline Required');
  assert.equal(result.cost.BAC, null);
  assert.equal(result.cost.EAC, null);
});

