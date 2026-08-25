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
  assert.deepEqual(values, { gross: 1000, retention_amount: 100, tax_amount: 123.75, net_certified_value: 948.75 });
  assert.equal(commercial.certificateCashStatus(certificate), 'Forecast');
  assert.equal(commercial.certificateCashDirection(certificate), 'Inflow');
  assert.equal(commercial.certificateCashStatus({ ...certificate, status: 'Paid' }), 'Actual');
  assert.equal(commercial.certificateCashDirection({ ...certificate, certificate_type: 'Subcontractor' }), 'Outflow');
  assert.equal(commercial.certificateCashStatus({ ...certificate, status: 'Draft' }), null);
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
