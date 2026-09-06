import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { referenceProject, referenceExpected } from './fixtures/referenceProjectAcceptance.mjs';

const kpiRec = await import('../src/utils/kpiReconciliation.ts');

test('KPI Reconciliation correctly breaks down Modified Contract Value', () => {
  const input = {
    projectId: 'p1',
    dataDate: '2026-06-30',
    projects: [{ id: 'p1', name: 'Project Alpha' }],
    contracts: [
      { id: 'c1', project_id: 'p1', contract_number: 'CNT-001', title: 'Main Contract', contract_value: 1000000, status: 'Active' },
      { id: 'c2', project_id: 'p1', contract_number: 'CNT-002', title: 'Subcontract HVAC', contract_value: 200000, parent_main_contract_id: 'c1', status: 'Active' },
      { id: 'c3', project_id: 'p2', contract_number: 'CNT-003', title: 'Other Project Contract', contract_value: 500000, status: 'Active' },
    ],
    variations: [
      { id: 'v1', contract_id: 'c1', variation_number: 'VAR-01', title: 'Approved Scope Addition', cost_impact: 150000, status: 'Approved', approved_date: '2026-05-15' },
      { id: 'v2', contract_id: 'c1', variation_number: 'VAR-02', title: 'Submitted Variation Pending', cost_impact: 50000, status: 'Submitted' },
      { id: 'v3', contract_id: 'c1', variation_number: 'VAR-03', title: 'Future Approved Variation', cost_impact: 80000, status: 'Approved', approved_date: '2026-07-15' },
    ],
    schedules: [],
    scheduleDistributions: [],
    baselines: [],
    wirEntries: [],
    progressCorrections: [],
    boqItems: [],
    costEntries: [],
    procurement: [],
    procurementReceipts: [],
    cashFlow: [],
    controlAccounts: [],
    contractSovLines: [],
  };

  const rec = kpiRec.getKpiReconciliation('modified_contract_value', input);

  assert.equal(rec.kpiKey, 'modified_contract_value');
  // Base contract (1,000,000) + Approved variation dated before cut-off (150,000) = 1,150,000
  assert.equal(rec.value, 1150000);
  assert.equal(rec.contributions.length, 2);
  assert.equal(rec.isReconciled, true);
  
  // Excluded records check:
  // Subcontract c2 excluded (hierarchy rule), other project c3 excluded, v2 (submitted) excluded, v3 (after data date) excluded
  assert.ok(rec.exclusions.some(r => r.id === 'c2' && r.reason.includes('Subcontract')));
  assert.ok(rec.exclusions.some(r => r.id === 'v2' && r.reason.includes('Approved')));
  assert.ok(rec.exclusions.some(r => r.id === 'v3' && r.reason.includes('after Data Date')));
});

test('KPI Reconciliation validates Revenue EV against WIRs and Data Date', () => {
  const input = {
    projectId: 'p1',
    dataDate: '2026-06-30',
    projects: [{ id: 'p1', name: 'Project Alpha' }],
    contracts: [{ id: 'c1', project_id: 'p1', status: 'Active' }],
    variations: [],
    schedules: [{ id: 's1', contract_id: 'c1', project_id: 'p1', activity: 'Civil Works', start_date: '2026-01-01', end_date: '2026-12-31' }],
    scheduleDistributions: [],
    baselines: [{
      contract_id: 'c1',
      status: 'Approved',
      revision_number: 1,
      activity_snapshot: [{ schedule_id: 's1', activity: 'Civil Works', planned_value: 500000, budget: 500000 }],
    }],
    boqItems: [
      { id: 'b1', item_code: 'BOQ-01', description: 'Excavation', unit_rate: 100 },
      { id: 'b2', item_code: 'BOQ-02', description: 'Concrete Pouring', unit_rate: 250 },
    ],
    wirEntries: [
      { id: 'w1', contract_id: 'c1', project_id: 'p1', schedule_id: 's1', boq_item_id: 'b1', wir_number: 'WIR-001', quantity: 1000, inspection_date: '2026-06-15', status: 'Approved' },
      { id: 'w2', contract_id: 'c1', project_id: 'p1', schedule_id: 's1', boq_item_id: 'b2', wir_number: 'WIR-002', quantity: 200, inspection_date: '2026-06-25', status: 'Approved' },
      { id: 'w3', contract_id: 'c1', project_id: 'p1', schedule_id: 's1', boq_item_id: 'b1', wir_number: 'WIR-003', quantity: 500, inspection_date: '2026-06-28', status: 'Submitted' },
      { id: 'w4', contract_id: 'c1', project_id: 'p1', schedule_id: 's1', boq_item_id: 'b1', wir_number: 'WIR-004', quantity: 300, inspection_date: '2026-07-05', status: 'Approved' },
    ],
    progressCorrections: [
      { id: 'pc1', original_wir_id: 'w1', project_id: 'p1', correction_type: 'Adjustment', quantity: 100, effective_date: '2026-06-29', status: 'Posted' },
    ],
    costEntries: [],
    procurement: [],
    procurementReceipts: [],
    cashFlow: [],
    controlAccounts: [],
    contractSovLines: [],
  };

  const rec = kpiRec.getKpiReconciliation('revenue_ev', input);

  // w1: 1000 * 100 = 100,000
  // w2: 200 * 250 = 50,000
  // pc1: -100 * 100 = -10,000
  // Total EV = 140,000
  assert.equal(rec.value, 140000);
  assert.equal(rec.contributions.length, 3);
  assert.equal(rec.isReconciled, true);

  // Excluded records check:
  assert.ok(rec.exclusions.some(r => r.id === 'w3' && r.reason.includes('Approved')));
  assert.ok(rec.exclusions.some(r => r.id === 'w4' && r.reason.includes('after Data Date')));
});

test('KPI Reconciliation reconciles Delivery AC without double counting', () => {
  const input = {
    projectId: 'p1',
    dataDate: '2026-06-30',
    projects: [{ id: 'p1', name: 'Project Alpha' }],
    contracts: [{ id: 'c1', project_id: 'p1', status: 'Active' }],
    variations: [],
    schedules: [],
    scheduleDistributions: [],
    baselines: [],
    wirEntries: [],
    progressCorrections: [],
    boqItems: [],
    costEntries: [
      { id: 'ce1', contract_id: 'c1', project_id: 'p1', entry_number: 'CE-01', description: 'Site Direct Labor', amount: 45000, date: '2026-06-10', cost_category: 'Labor', is_committed: false },
      { id: 'ce2', contract_id: 'c1', project_id: 'p1', entry_number: 'CE-02', description: 'Equipment Rental June', amount: 18000, date: '2026-06-20', cost_category: 'Equipment', is_committed: false },
      { id: 'ce3', contract_id: 'c1', project_id: 'p1', entry_number: 'CE-03', description: 'Future Accrual July', amount: 25000, date: '2026-07-02', cost_category: 'Materials', is_committed: false },
    ],
    procurement: [],
    procurementReceipts: [
      { id: 'pr1', contract_id: 'c1', project_id: 'p1', receipt_number: 'GRN-01', accepted_amount: 15000, receipt_date: '2026-06-22', status: 'Accepted' },
      { id: 'pr2', contract_id: 'c1', project_id: 'p1', receipt_number: 'GRN-02', accepted_amount: 5000, receipt_date: '2026-07-05', status: 'Accepted' },
    ],
    cashFlow: [],
    controlAccounts: [],
    contractSovLines: [],
  };

  const rec = kpiRec.getKpiReconciliation('delivery_ac', input);

  // ce1 (45000) + ce2 (18000) + pr1 (15000) = 78000
  assert.equal(rec.value, 78000);
  assert.equal(rec.contributions.length, 3);
  assert.equal(rec.isReconciled, true);

  // ce3 (future date) excluded, pr2 (future date) excluded
  assert.ok(rec.exclusions.some(r => r.id === 'ce3' && r.reason.includes('after Data Date')));
  assert.ok(rec.exclusions.some(r => r.id === 'pr2' && r.reason.includes('after Data Date')));
});

test('KPI Reconciliation supports Net Cash Flow, Commitments, and Cost BAC', () => {
  const input = {
    projectId: 'p1',
    dataDate: '2026-06-30',
    projects: [{ id: 'p1', name: 'Project Alpha' }],
    contracts: [{ id: 'c1', project_id: 'p1', status: 'Active' }],
    variations: [],
    schedules: [],
    scheduleDistributions: [],
    baselines: [],
    wirEntries: [],
    progressCorrections: [],
    boqItems: [],
    costEntries: [
      { id: 'ce1', contract_id: 'c1', project_id: 'p1', amount: 50000, is_committed: true, date: '2026-06-15' },
    ],
    procurement: [
      { id: 'po1', po_number: 'PO-100', project_id: 'p1', contract_id: 'c1', vendor: 'Steel Corp', total_cost: 120000, status: 'Ordered', order_date: '2026-05-10' },
      { id: 'po2', po_number: 'PO-101', project_id: 'p1', contract_id: 'c1', vendor: 'Cement Corp', total_cost: 40000, status: 'Draft', order_date: '2026-05-10' },
    ],
    procurementReceipts: [
      { id: 'pr1', procurement_id: 'po1', contract_id: 'c1', project_id: 'p1', accepted_amount: 30000, receipt_date: '2026-06-20', status: 'Accepted' },
    ],
    cashFlow: [
      { id: 'cf1', project_id: 'p1', date: '2026-06-01', movement_type: 'Actual', inflow: 200000, outflow: 0, description: 'Client IPC #1' },
      { id: 'cf2', project_id: 'p1', date: '2026-06-20', movement_type: 'Actual', inflow: 0, outflow: 75000, description: 'Subcontractor Payout' },
      { id: 'cf3', project_id: 'p1', date: '2026-07-15', movement_type: 'Actual', inflow: 100000, outflow: 0, description: 'Future Client IPC' },
      { id: 'cf4', project_id: 'p1', date: '2026-06-25', movement_type: 'Forecast', inflow: 50000, outflow: 0, description: 'Forecast Entry' },
    ],
    controlAccounts: [
      { id: 'ca1', project_id: 'p1', contract_id: 'c1', contract_sov_line_id: 'sov1', code: 'CA-01', name: 'Civil Substructure', budget: 400000, status: 'Active' },
      { id: 'ca2', project_id: 'p1', contract_id: 'c1', contract_sov_line_id: 'sov2', code: 'CA-02', name: 'Superstructure', budget: 350000, status: 'Active' },
    ],
    contractSovLines: [
      { id: 'sov1', contract_id: 'c1', project_id: 'p1', line_number: '1', description: 'Civil Substructure', original_budget: 400000, status: 'Active' },
      { id: 'sov2', contract_id: 'c1', project_id: 'p1', line_number: '2', description: 'Superstructure', original_budget: 350000, status: 'Active' },
    ],
  };

  const cfRec = kpiRec.getKpiReconciliation('net_cash_flow', input);
  // cf1 (inflow 200,000) + cf2 (outflow -75,000) = 125,000
  assert.equal(cfRec.value, 125000);
  assert.ok(cfRec.exclusions.some(r => r.id === 'cf3' && r.reason.includes('after Data Date')));
  assert.ok(cfRec.exclusions.some(r => r.id === 'cf4' && r.reason.includes('Forecast')));

  const commitRec = kpiRec.getKpiReconciliation('commitments', input);
  // po1 (120,000 - 30,000 receipt = 90,000 open commitment)
  assert.equal(commitRec.value, 90000);
  assert.ok(commitRec.exclusions.some(r => r.id === 'po2' && r.reason.includes('Commitment')));

  const bacRec = kpiRec.getKpiReconciliation('cost_bac', input);
  // ca1 (400,000) + ca2 (350,000) = 750,000
  assert.equal(bacRec.value, 750000);

  const pvRec = kpiRec.getKpiReconciliation('cost_pv', input);
  const evRec = kpiRec.getKpiReconciliation('cost_ev', input);
  const eacRec = kpiRec.getKpiReconciliation('cost_eac', input);
  assert.equal(pvRec.kpiKey, 'cost_pv');
  assert.equal(pvRec.kpiLabel, 'Delivery Cost Planned Value (PV)');
  assert.equal(pvRec.value, 0);
  assert.equal(evRec.kpiKey, 'cost_ev');
  assert.equal(evRec.kpiLabel, 'Delivery Cost Earned Value (EV)');
  assert.equal(evRec.value, 0);
  assert.equal(eacRec.kpiKey, 'cost_eac');
  assert.equal(eacRec.kpiLabel, 'Delivery Cost Estimate at Completion (EAC)');
  assert.equal(eacRec.value, 750000);
  assert.equal(eacRec.reconciliationTotal, eacRec.value);
  assert.equal(eacRec.isReconciled, true);
});

test('Dashboard cards consume the centralized reconciled KPI values', () => {
  const dashboard = readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboard, /value: fmtMoney\(reconciledKpis\.modifiedContractValue\.value/);
  assert.match(dashboard, /value: fmtMoney\(reconciledKpis\.revenuePv\.value/);
  assert.match(dashboard, /value: fmtMoney\(reconciledKpis\.revenueEv\.value/);
  assert.match(dashboard, /value: fmtMoney\(reconciledKpis\.deliveryAc\.value/);
  assert.match(dashboard, /value: fmtMoney\(reconciledKpis\.netCashFlow\.value/);
  assert.match(dashboard, /reconciliationKey: 'open_commitment'/);
});

test('all A4 financial and EVM drill-downs reconcile on the controlled reference project', () => {
  const input = {
    projectId: 'project-acceptance-1',
    dataDate: referenceExpected.dataDate,
    ...referenceProject,
    progressCorrections: [],
    procurement: [],
    procurementReceipts: [],
    controlAccounts: [
      { id: 'ca-civil', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-civil-1', contract_sov_line_id: 'sov-civil-1', status: 'Active' },
      { id: 'ca-mep', project_id: 'project-acceptance-1', contract_id: 'contract-main-1', boq_item_id: 'boq-mep-1', contract_sov_line_id: 'sov-mep-1', status: 'Active' },
    ],
  };

  const expected = {
    modified_contract_value: referenceExpected.revisedContractValue,
    revenue_pv: referenceExpected.plannedValueToDataDate,
    revenue_ev: referenceExpected.earnedValueToDataDate,
    delivery_ac: referenceExpected.actualCostToDataDate,
    net_cash_flow: 0,
    open_commitment: 0,
    cost_bac: 1_000_000,
    cost_pv: 250_000,
    cost_ev: 250_000,
    cost_eac: 640_000,
  };

  for (const [key, value] of Object.entries(expected)) {
    const result = kpiRec.getKpiReconciliation(key, input);
    assert.equal(result.value, value, `${key} value must use the governed production calculation`);
    assert.equal(result.reconciliationTotal, value, `${key} source rows must sum to the card value`);
    assert.ok(result.discrepancy <= 0.01, `${key} discrepancy must be within one cent`);
    assert.equal(result.isReconciled, true, `${key} must be reconciled`);
  }
});
