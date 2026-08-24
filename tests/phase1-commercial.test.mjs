import test from 'node:test';
import assert from 'node:assert/strict';

const commercial = await import('../src/utils/commercialControl.ts');
const hierarchy = await import('../src/data/hierarchyRules.ts');

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
