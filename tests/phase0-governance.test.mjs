import test from 'node:test';
import assert from 'node:assert/strict';

const governance = await import('../src/data/governanceRules.ts');
const codes = await import('../src/data/codeControls.ts');
const schedule = await import('../src/utils/schedulePlanning.ts');
const cpm = await import('../src/utils/cpm.ts');
const dictionary = await import('../src/data/dataDictionary.ts');
const periods = await import('../src/data/reportingPeriodGovernance.ts');
const quality = await import('../src/data/dataQuality.ts');

test('canonical status dictionary rejects synonyms', () => {
  assert.equal(dictionary.isCanonicalStatus('variation', 'Approved'), true);
  assert.equal(dictionary.isCanonicalStatus('variation', 'Approve'), false);
  assert.equal(dictionary.isCanonicalStatus('reportingPeriod', 'Locked'), true);
});

test('financial and date governance catches invalid data', () => {
  assert.throws(() => governance.assertRecordGovernance('cost_entries', { amount: -1 }), /cannot be negative/i);
  assert.throws(() => governance.assertRecordGovernance('contracts', { contract_value: -1 }), /cannot be negative/i);
  assert.throws(() => governance.assertRecordGovernance('wir_entries', { from_date: '2026-02-02', to_date: '2026-02-01' }), /earlier/i);
  assert.doesNotThrow(() => governance.assertRecordGovernance('variations', { cost_impact: -1500 }));
});

test('SOV rates and purchase-order codes are governed by contract scope', () => {
  assert.throws(() => governance.assertRecordGovernance('contract_sov_lines', { retention_rate: 101 }), /cannot exceed 100/i);
  assert.throws(() => governance.assertRecordGovernance('contract_sov_lines', { original_budget: -1 }), /cannot be negative/i);
  const rows = [{ id: 'po-1', contract_id: 'contract-1', purchase_order_number: 'PO-001' }];
  assert.throws(() => codes.assertCodeIsUnique('procurement', { id: 'po-2', contract_id: 'contract-1', purchase_order_number: 'PO-001' }, rows), /already exists/i);
  assert.doesNotThrow(() => codes.assertCodeIsUnique('procurement', { id: 'po-2', contract_id: 'contract-2', purchase_order_number: 'PO-001' }, rows));
});

test('codes remain unique inside the governed scope', () => {
  const rows = [{ id: 'a', project_id: 'p1', contract_number: 'CNT-001' }];
  assert.throws(() => codes.assertCodeIsUnique('contracts', { id: 'b', project_id: 'p1', contract_number: 'CNT-001' }, rows), /already exists/i);
  assert.doesNotThrow(() => codes.assertCodeIsUnique('contracts', { id: 'b', project_id: 'p2', contract_number: 'CNT-001' }, rows));
});

test('planned value uses approved distribution before linear fallback', () => {
  const activity = { id: 'a1', start_date: '2026-01-01', end_date: '2026-01-31', planned_quantity: 100, unit_rate: 10 };
  assert.equal(schedule.scheduleBudget(activity), 1000);
  assert.equal(schedule.schedulePlannedValueToDate(activity, '2025-12-31'), 0);
  assert.equal(schedule.schedulePlannedValueToDate(activity, '2026-01-31'), 1000);
  const distributions = [
    { schedule_id: 'a1', period_start: '2026-01-01', period_end: '2026-01-07', planned_quantity: 20, unit_rate: 10 },
    { schedule_id: 'a1', period_start: '2026-01-08', period_end: '2026-01-14', planned_quantity: 80, unit_rate: 10 },
  ];
  assert.equal(schedule.distributedPlannedValueToDate(activity, distributions, '2026-01-07'), 200);
  assert.equal(schedule.distributedPlannedValueToDate(activity, distributions, '2026-01-14'), 1000);
});

test('calendar additions preserve the ISO date contract', () => {
  assert.equal(schedule.addCalendarDays('2026-01-30', 2), '2026-02-01');
  assert.equal(schedule.addCalendarDays(null, 2), null);
  assert.equal(schedule.addWorkingDays('2026-01-01', 2, '5-Day Week'), '2026-01-05');
  assert.equal(schedule.workingDaysBetween('2026-01-01', '2026-01-05', '5-Day Week'), 2);
});

test('CPM respects relationship types and reports dependency cycles', () => {
  const network = cpm.calculateCpm([
    { id: 'A', duration_days: 5 },
    { id: 'B', duration_days: 3, predecessor_item: 'A', relationship_type: 'FS', lag_days: 1 },
    { id: 'C', duration_days: 2, predecessor_item: 'A', relationship_type: 'SS', lag_days: 2 },
  ]);
  assert.equal(network.get('B').earlyStart, 6);
  assert.equal(network.get('C').earlyStart, 2);
  const cyclic = cpm.calculateCpm([
    { id: 'A', duration_days: 1, predecessor_item: 'B', relationship_type: 'FS' },
    { id: 'B', duration_days: 1, predecessor_item: 'A', relationship_type: 'FS' },
  ]);
  assert.equal(cyclic.get('A').cycle, true);
  assert.equal(cyclic.get('B').cycle, true);
});

test('locked reporting periods block dated inserts, updates and deletes', () => {
  const locked = [{ id: 'period-1', project_id: 'project-1', period_name: 'January close', start_date: '2026-01-01', end_date: '2026-01-31', data_date: '2026-01-31', status: 'Locked' }];
  assert.throws(() => periods.assertRecordPeriodIsOpen(locked, { project_id: 'project-1', inspection_date: '2026-01-15' }), /January close/);
  assert.throws(() => periods.assertRecordPeriodIsOpen(locked, { project_id: 'project-1', inspection_date: '2026-02-01' }, { project_id: 'project-1', inspection_date: '2026-01-15' }), /Locked/);
  assert.doesNotThrow(() => periods.assertRecordPeriodIsOpen(locked, { project_id: 'project-1', inspection_date: '2026-02-01' }));
  assert.throws(() => periods.assertReportingPeriodMutation('delete', undefined, locked[0]), /cannot be deleted/);
});

test('reporting periods require a clean, non-overlapping governed range', () => {
  const january = { id: 'jan', project_id: 'project-1', period_name: 'January', start_date: '2026-01-01', end_date: '2026-01-31', data_date: '2026-01-31', status: 'Locked' };
  assert.throws(() => periods.assertReportingPeriodDefinition({ id: 'jan-2', project_id: 'project-1', period_name: 'Overlap', start_date: '2026-01-15', end_date: '2026-02-15', data_date: '2026-02-15', status: 'Open' }, [january]), /cannot overlap/);
  assert.throws(() => periods.assertReportingPeriodDefinition({ id: 'feb', project_id: 'project-1', period_name: 'February', start_date: '2026-02-01', end_date: '2026-02-28', status: 'Locked' }, [january]), /data date is required/i);
  assert.doesNotThrow(() => periods.assertReportingPeriodDefinition({ id: 'feb', project_id: 'project-1', period_name: 'February', start_date: '2026-02-01', end_date: '2026-02-28', data_date: '2026-02-28', status: 'Open' }, [january]));
});

test('acceptance data-quality dashboard detects relationship, quantity and period failures', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'project-1' }],
    contracts: [{ id: 'contract-1', project_id: 'project-1' }],
    boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', boq_header_id: 'header-1', item_code: 'A-01', quantity: 10 }],
    schedules: [{ id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'Install', planned_quantity: 12 }],
    wirEntries: [{ id: 'wir-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', result: 'Pass', quantity: 11 }],
    costEntries: [{ id: 'cost-1', project_id: 'project-1', amount: 100 }],
    reportingPeriods: [{ id: 'period-1', project_id: 'project-1', period_name: 'Bad close', start_date: '2026-02-01', end_date: '2026-01-31', data_date: '2026-01-31', status: 'Locked' }],
    baselines: [],
  });
  assert.ok(findings.some((finding) => finding.title === 'Planned quantities exceed BOQ'));
  assert.ok(findings.some((finding) => finding.title === 'Measured quantities exceed BOQ'));
  assert.ok(findings.some((finding) => finding.title === 'Cost entry without full allocation'));
  assert.ok(findings.some((finding) => finding.title === 'Reporting-period governance issue'));
});
