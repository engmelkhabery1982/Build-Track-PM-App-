import test from 'node:test';
import assert from 'node:assert/strict';

const commercial = await import('../src/utils/commercialControl.ts');
const hierarchy = await import('../src/data/hierarchyRules.ts');
const codeControls = await import('../src/data/codeControls.ts');
const quality = await import('../src/data/dataQuality.ts');

test('Cost Change is allocated once to its selected SOV line only', () => {
  const change = { status: 'Approved', contract_sov_line_id: 'sov-1', amount: 500 };
  assert.equal(commercial.costChangeAppliesToSovLine(change, { id: 'sov-1' }), true);
  assert.equal(commercial.costChangeAppliesToSovLine(change, { id: 'sov-2' }), false);
  assert.equal(commercial.costChangeAppliesToSovLine({ status: 'Approved', amount: 500 }, { id: 'sov-1' }), false);
});

test('CBS and WBS reject parent cycles', () => {
  const costCodes = [
    { id: 'c1', parent_cost_code_id: null },
    { id: 'c2', parent_cost_code_id: 'c1' },
  ];
  assert.throws(() => hierarchy.assertValidHierarchyChange('cost_codes', costCodes, 'c1', { parent_cost_code_id: 'c2' }), /cycle/i);
  const wbs = [{ id: 'w1', parent_wbs_id: null }];
  assert.throws(() => hierarchy.assertValidHierarchyChange('wbs_nodes', wbs, 'w1', { parent_wbs_id: 'w1' }), /own parent/i);
});

test('CBS and WBS hierarchy levels are derived from the selected parent', () => {
  assert.equal(hierarchy.deriveHierarchyLevel('cost_codes', [], null), 1);
  assert.equal(hierarchy.deriveHierarchyLevel('cost_codes', [{ id: 'root', cbs_level: 1 }], 'root'), 2);
  assert.equal(hierarchy.deriveHierarchyLevel('wbs_nodes', [{ id: 'parent', wbs_level: 3 }], 'parent'), 4);
  assert.throws(() => hierarchy.deriveHierarchyLevel('wbs_nodes', [], 'missing'), /valid parent/i);
  assert.deepEqual(hierarchy.applyDerivedHierarchyLevel('cost_codes', [{ id: 'root', cbs_level: 1 }], { parent_cost_code_id: 'root', cbs_level: 99 }), { parent_cost_code_id: 'root', cbs_level: 2 });
  assert.equal(codeControls.createCodeDraft('cost_codes', []).cbs_level, 1);
  assert.equal(codeControls.createCodeDraft('wbs_nodes', []).wbs_level, 1);
});

test('certificate cash uses the net certified value and one governed movement state', () => {
  const certificate = {
    certificate_type: 'Client', status: 'Approved', gross_certified_value: 1000,
    retention_rate: 10, advance_recovery: 50, deductions: 25, tax_rate: 15,
  };
  const values = commercial.calculateCertificateValues(certificate);
  assert.deepEqual(values, { gross: 1000, retention_amount: 100, taxable_amount: 825, tax_amount: 123.75, net_certified_value: 948.75 });
  assert.equal(commercial.certificateCashStatus(certificate), 'Forecast');
  assert.equal(commercial.certificateCashDirection(certificate), 'Inflow');
  assert.equal(commercial.certificateCashStatus({ ...certificate, status: 'Paid' }), 'Actual');
  assert.equal(commercial.certificateCashDirection({ ...certificate, certificate_type: 'Subcontractor' }), 'Outflow');
  assert.equal(commercial.certificateCashStatus({ ...certificate, status: 'Draft' }), null);
});

test('certificate balances cannot exceed contractual advance or retention cap', () => {
  const certificate = { gross_certified_value: 1000, retention_rate: 10, advance_recovery: 60, deductions: 0, tax_rate: 0 };
  const balances = commercial.calculateCertificateBalances({
    contractAdvanceAmount: 100, retentionCapAmount: 150, priorAdvanceRecovery: 30, priorRetention: 60, certificate,
  });
  assert.equal(balances.cumulativeAdvanceRecovery, 90);
  assert.equal(balances.remainingAdvanceBalance, 10);
  assert.equal(balances.cumulativeRetentionAmount, 160);
  assert.equal(balances.advanceExceeded, false);
  assert.equal(balances.retentionCapExceeded, true);
});

test('purchase orders remain commitment/forecast events until an accepted cost fact exists', () => {
  assert.deepEqual(commercial.procurementPostingState({ status: 'Draft' }), {
    isCommitment: false, isForecast: false, postsActualCost: false, postsActualCash: false,
  });
  assert.deepEqual(commercial.procurementPostingState({ status: 'Ordered' }), {
    isCommitment: true, isForecast: true, postsActualCost: false, postsActualCash: false,
  });
  assert.deepEqual(commercial.procurementPostingState({ status: 'Cancelled' }), {
    isCommitment: false, isForecast: false, postsActualCost: false, postsActualCash: false,
  });
});

test('SOV forecast consumes accepted procurement cost before carrying open commitment', () => {
  const forecast = commercial.calculateSovCostForecast({
    originalBudget: 1000, approvedVariations: 100, approvedCostChanges: 50,
    procurementCommitment: 900, procurementActual: 600, otherActual: 200,
  });
  assert.deepEqual(forecast, {
    revisedBudget: 1150, procurementCommitment: 900, procurementActual: 600, otherActual: 200,
    actualCost: 800, openCommitment: 300, governedForecastFloor: 1150, requestedOverride: 0,
    forecastAtCompletion: 1150, costToComplete: 350, forecastVariance: 0, overrideBelowGovernedFloor: false,
  });
});

test('SOV forecast rejects a manual override that hides actual cost or open PO commitment', () => {
  const forecast = commercial.calculateSovCostForecast({
    originalBudget: 500, approvedVariations: 0, approvedCostChanges: 0,
    procurementCommitment: 1200, procurementActual: 700, otherActual: 100, manualForecastOverride: 900,
  });
  assert.equal(forecast.openCommitment, 500);
  assert.equal(forecast.governedForecastFloor, 1300);
  assert.equal(forecast.forecastAtCompletion, 1300);
  assert.equal(forecast.costToComplete, 500);
  assert.equal(forecast.overrideBelowGovernedFloor, true);
});

test('budget availability consumes actuals plus open commitment without double-counting accepted procurement', () => {
  const within = commercial.calculateBudgetAvailability({ revisedBudget: 1000, actualCost: 300, openCommitment: 400, proposedAmount: 200 });
  assert.deepEqual(within, {
    revisedBudget: 1000, actualCost: 300, openCommitment: 400, assignedValue: 700, proposedAmount: 200,
    projectedAssignedValue: 900, availableBudget: 300, projectedAvailableBudget: 100, status: 'At Risk', exceedsBudget: false,
  });
  const blocked = commercial.calculateBudgetAvailability({ revisedBudget: 1000, actualCost: 300, openCommitment: 400, proposedAmount: 301 });
  assert.equal(blocked.exceedsBudget, true);
  assert.equal(blocked.status, 'Blocked');
  // A receipt up to the existing commitment changes its classification from
  // open commitment to actual; it does not require a second budget amount.
  const receipt = commercial.calculateBudgetAvailability({ revisedBudget: 1000, actualCost: 700, openCommitment: 0, proposedAmount: 0 });
  assert.equal(receipt.assignedValue, 700);
  assert.equal(receipt.availableBudget, 300);
});

test('data quality exposes missing and unreconciled SOV coverage instead of hiding it', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'A', quantity: 10, unit_rate: 20 }],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    contractSovLines: [{ id: 's1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', original_budget: 150, status: 'Active' }],
    variations: [{ id: 'v1', status: 'Approved' }], variationLines: [{ id: 'vl1', variation_id: 'v1' }],
  });
  assert.ok(findings.some((finding) => finding.title === 'SOV original budget differs from BOQ'));
  assert.ok(findings.some((finding) => finding.title === 'Approved variation line not applied'));
});

test('data quality rejects accepted receipt quantities above the purchase order', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'A', quantity: 10, unit_rate: 20 }],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    procurement: [{ id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 10 }],
    procurementReceipts: [{ id: 'r1', procurement_id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', status: 'Accepted', accepted_quantity: 11 }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Accepted receipts exceed purchase order'));
});

test('data quality detects missing or duplicate governed PO cash forecasts', () => {
  const common = {
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'A', quantity: 10, unit_rate: 20 }],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    procurement: [{ id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 10, status: 'Ordered' }],
  };
  const missing = quality.runDataQualityChecks({ ...common, cashFlow: [] });
  assert.ok(missing.some((finding) => finding.title === 'Ordered purchase order missing cash forecast'));
  const duplicate = quality.runDataQualityChecks({ ...common, cashFlow: [
    { id: 'cf1', source_type: 'procurement_forecast', source_id: 'po1' },
    { id: 'cf2', source_type: 'procurement_forecast', source_id: 'po1' },
  ] });
  assert.ok(duplicate.some((finding) => finding.title === 'Duplicate purchase-order cash forecast'));
  const cancelled = quality.runDataQualityChecks({ ...common,
    procurement: [{ id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 10, status: 'Cancelled' }],
    cashFlow: [{ id: 'cf1', source_type: 'procurement_forecast', source_id: 'po1' }],
  });
  assert.ok(cancelled.some((finding) => finding.title === 'Cancelled purchase order retains cash forecast'));
});

test('data quality exposes supplier AP over-billing and over-payment', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'A', quantity: 10, unit_rate: 20 }],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    procurement: [{ id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 10 }],
    procurementReceipts: [{ id: 'r1', procurement_id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', status: 'Accepted', accepted_quantity: 5 }],
    supplierInvoices: [{ id: 'si1', project_id: 'p1', contract_id: 'c1', net_payable_amount: 100 }],
    supplierInvoiceLines: [{ id: 'sil1', supplier_invoice_id: 'si1', procurement_receipt_id: 'r1', quantity: 6 }],
    supplierInvoicePayments: [{ id: 'sip1', supplier_invoice_id: 'si1', status: 'Settled', amount: 101 }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Supplier invoice quantity exceeds accepted GRN'));
  assert.ok(findings.some((finding) => finding.title === 'Supplier payment exceeds AP'));
});

test('data quality exposes governed commercial records with invalid scope or net value', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [], boqItems: [], schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    contractSovLines: [{ id: 's1', project_id: 'p1', contract_id: 'c1', status: 'Active' }],
    costChanges: [{ id: 'cc1', project_id: 'p1', contract_id: 'wrong', contract_sov_line_id: 's1', status: 'Approved' }],
    paymentCertificates: [{ id: 'pc1', project_id: 'p1', contract_id: 'c1', certificate_type: 'Client', status: 'Approved', net_certified_value: 0 }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Governed cost change has invalid SOV allocation'));
  assert.ok(findings.some((finding) => finding.title === 'Governed payment certificate is incomplete'));
});

test('data quality flags a manual SOV forecast below the governed floor', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'A', quantity: 10, unit_rate: 100 }],
    schedules: [], wirEntries: [], reportingPeriods: [], baselines: [],
    contractSovLines: [{ id: 's1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', original_budget: 1000, forecast_override: 900, status: 'Active' }],
    procurement: [{ id: 'po1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 10, total_cost: 1200, status: 'Ordered' }],
    costEntries: [{ id: 'ce1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', source_type: 'procurement_receipt', amount: 700 }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Manual SOV forecast is below governed cost floor'));
});

test('data quality exposes approved variation scope that is missing SOV or commercial forecast', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1', item_code: 'VO-A', quantity: 1, unit_rate: 100 }],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [], cashFlow: [],
    variations: [{ id: 'v1', project_id: 'p1', contract_id: 'c1', status: 'Approved', cost_impact: 100 }],
    variationLines: [{ id: 'vl1', variation_id: 'v1', contract_id: 'c1', boq_item_id: 'b1', change_type: 'New Item', applied_at: '2026-08-30' }],
    contractSovLines: [],
  });
  assert.ok(findings.some((finding) => finding.title === 'Approved variation missing commercial cash forecast'));
  assert.ok(findings.some((finding) => finding.title === 'Approved new variation item missing SOV'));
});

test('data quality rejects an approved budget transfer without two SOV allocations', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }], boqHeaders: [], boqItems: [],
    schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    contractSovLines: [{ id: 's1', project_id: 'p1', contract_id: 'c1', status: 'Active' }],
    costChanges: [{ id: 'cc1', project_id: 'p1', contract_id: 'c1', contract_sov_line_id: 's1', transfer_from_sov_line_id: 's1', change_type: 'Budget Transfer', amount: 100, status: 'Approved' }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Budget transfer has invalid source or target'));
});
