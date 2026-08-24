import test from 'node:test';
import assert from 'node:assert/strict';

const governance = await import('../src/data/governanceRules.ts');
const codes = await import('../src/data/codeControls.ts');
const schedule = await import('../src/utils/schedulePlanning.ts');
const cpm = await import('../src/utils/cpm.ts');
const dictionary = await import('../src/data/dataDictionary.ts');
const periods = await import('../src/data/reportingPeriodGovernance.ts');
const quality = await import('../src/data/dataQuality.ts');
const primavera = await import('../src/data/primaveraImport.ts');

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

test('import dictionary maps governed schedule and commercial headers', () => {
  assert.equal(dictionary.IMPORT_FIELD_ALIASES['project code'], 'project_code');
  assert.equal(dictionary.IMPORT_FIELD_ALIASES['activity id'], 'activity_code');
  assert.equal(dictionary.IMPORT_FIELD_ALIASES['planned quantity'], 'planned_quantity');
  assert.equal(dictionary.IMPORT_FIELD_ALIASES['invoice #'], 'invoice_number');
  assert.ok(dictionary.CANONICAL_FIELDS.schedule.includes('boq_item_id'));
  assert.ok(dictionary.CANONICAL_FIELDS.financial.includes('actual_cost'));
});

test('Primavera XER import preserves calendar, logic, dates and duplicate activity IDs', () => {
  const xer = `%T\tCALENDAR\n%F\tclndr_id\tclndr_name\n%R\t1\tSix Day Calendar\n%T\tTASK\n%F\ttask_id\ttask_code\ttask_name\twbs_id\tclndr_id\ttarget_start_date\ttarget_end_date\ttarget_drtn\tdriving_path_flag\ttask_descr\n%R\t10\tACT-100\tExcavate\tWBS-01\t1\t2026-01-01 08:00\t2026-01-05 17:00\t5\tY\tInitial excavation\n%R\t11\tACT-100\tBackfill\tWBS-01\t1\t2026-01-06 08:00\t2026-01-08 17:00\t3\tN\tBackfill works\n%T\tTASKPRED\n%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\t11\t10\tPR_FS\t8\n`;
  const rows = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Activity ID'], 'ACT-100-P6-10');
  assert.equal(rows[1]['Activity ID'], 'ACT-100-P6-11');
  assert.equal(rows[1].Predecessors, 'ACT-100-P6-10');
  assert.equal(rows[1].Relationship, 'FS');
  assert.equal(rows[1]['Lag (days)'], 1);
  assert.equal(rows[0].Calendar, 'Six Day Calendar');
  assert.equal(rows[0].Start, '2026-01-01');
  assert.equal(rows[0].Critical, true);
});

test('new governed commercial and field records receive scoped codes', () => {
  const costChange = codes.prepareCodeControlledInsert('cost_changes', { contract_id: 'contract-1', title: 'Forecast correction' }, [{ id: 'old', contract_id: 'contract-1', cost_change_number: 'CC-004' }]);
  assert.equal(costChange.cost_change_number, 'CC-005');
  const daily = codes.prepareCodeControlledInsert('site_daily_reports', { project_id: 'project-1', contract_id: 'contract-1', report_date: '2026-08-24' }, [{ id: 'old', project_id: 'project-1', contract_id: 'contract-1', report_number: 'SDR-009' }]);
  assert.equal(daily.report_number, 'SDR-010');
  assert.equal(daily.report_number_locked, false);
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
  assert.equal(schedule.subtractWorkingDays('2026-01-05', 2, '5-Day Week'), '2026-01-01');
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
  const multiDependency = cpm.calculateCpm([
    { id: 'A', duration_days: 2 },
    { id: 'B', duration_days: 5 },
    { id: 'C', duration_days: 1, predecessor_items: ['A', 'B'], relationship_type: 'FS' },
  ]);
  assert.equal(multiDependency.get('C').earlyStart, 5);
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

test('field and document controls detect scope, coordinate, review and revision failures', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'project-1' }],
    contracts: [{ id: 'contract-1', project_id: 'project-1' }],
    boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', item_code: 'A-01', quantity: 10 }],
    schedules: [{ id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1' }],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    rfis: [{ id: 'rfi-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', schedule_id: 'activity-1', latitude: 91 }],
    submittals: [{ id: 'sub-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', schedule_id: 'activity-1', status: 'Approved', reviewer: '', response_date: null }],
    documents: [{ id: 'doc-1', project_id: 'project-1', supersedes_document_id: 'missing-document' }],
    quality: [],
    dailyReports: [{ id: 'daily-1', project_id: 'project-1', contract_id: 'contract-1', report_date: null, work_summary: '', manpower_count: -1 }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Invalid field coordinates'));
  assert.ok(findings.some((finding) => finding.title === 'Incomplete submittal review'));
  assert.ok(findings.some((finding) => finding.title === 'Invalid document revision chain'));
  assert.ok(findings.some((finding) => finding.title === 'Incomplete site daily report'));
});
