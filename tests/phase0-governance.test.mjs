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
const baselines = await import('../src/data/baselineGovernance.ts');
const productivity = await import('../src/utils/resourceProductivity.ts');
const resourceLoading = await import('../src/utils/resourceLoading.ts');
const cashForecast = await import('../src/utils/cashForecast.ts');
const paymentTerms = await import('../src/utils/paymentTerms.ts');
const pmoSnapshot = await import('../src/utils/pmoSnapshot.ts');

test('canonical status dictionary rejects synonyms', () => {
  assert.equal(dictionary.isCanonicalStatus('variation', 'Approved'), true);
  assert.equal(dictionary.isCanonicalStatus('variation', 'Approve'), false);
  assert.equal(dictionary.isCanonicalStatus('reportingPeriod', 'Locked'), true);
});

test('PMO Snapshot uses only dated PV, approved WIR and actual-cost facts through its data date', () => {
  const snapshot = pmoSnapshot.calculatePmoSnapshot({
    contract: { id: 'c1', project_id: 'p1' }, dataDate: '2026-01-10',
    schedules: [{ id: 'a1', contract_id: 'c1', activity: 'Install', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 100, unit_rate: 10 }], scheduleDistributions: [],
    boqItems: [{ id: 'b1', unit_rate: 10 }],
    wirEntries: [{ project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 30, inspection_date: '2026-01-09', status: 'Approved' }, { project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', quantity: 70, inspection_date: '2026-01-11', status: 'Approved' }],
    costEntries: [{ project_id: 'p1', contract_id: 'c1', date: '2026-01-09', amount: 250 }, { project_id: 'p1', contract_id: 'c1', date: '2026-01-11', amount: 750 }],
  });
  assert.equal(snapshot.earnedValue, 300);
  assert.equal(snapshot.actualCost, 250);
  assert.equal(snapshot.budgetAtCompletion, 1000);
  assert.ok(snapshot.plannedValue > 0 && snapshot.plannedValue < 1000);
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

test('Primavera XER retains planned labour and equipment assignments on the activity', () => {
  const xer = `%T\tRSRC\n%F\trsrc_id\trsrc_short_name\trsrc_name\trsrc_type\n%R\t1\tCREW-01\tConcrete Crew\tRT_Labor\n%R\t2\tCRANE-01\tTower Crane\tRT_Equip\n%T\tTASK\n%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn\n%R\t10\tACT-10\tPour Concrete\t2026-01-01\t2026-01-05\t5\n%T\tTASKRSRC\n%F\ttask_id\trsrc_id\ttarget_qty\ttarget_cost\n%R\t10\t1\t40\t800\n%R\t10\t2\t20\t1200\n`;
  const [row] = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(row['Planned Labor Hours'], 40);
  assert.equal(row['Planned Equipment Hours'], 20);
  assert.equal(row['Planned Resource Cost'], 2000);
  assert.match(row.Notes, /Concrete Crew/);
});

test('Primavera XER calendar data preserves custom working days and exceptions', () => {
  const xer = `%T\tCALENDAR
%F\tclndr_id\tclndr_name\tclndr_data
%R\t1\tShift Calendar\t(0||CalendarData()((0||DaysOfWeek()((0||1()((0||0(s|08:00|f|16:00)())))(0||2()())(0||3()((0||0(s|08:00|f|16:00)())))(0||4()())(0||5()((0||0(s|08:00|f|16:00)())))(0||6()())(0||7()())))(0||Exceptions()((0||0(d|46024)())))))
%T\tTASK
%F\ttask_id\ttask_code\ttask_name\tclndr_id\ttarget_start_date\ttarget_end_date
%R\t10\tACT-1\tShift work\t1\t2026-01-01\t2026-01-10
`;
  const [row] = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(row['Calendar Pattern'], 'Custom');
  assert.deepEqual(JSON.parse(row['Calendar Working Days']), [1, 3, 5]);
  assert.deepEqual(JSON.parse(row['Calendar Exceptions']), ['2026-01-02']);
  assert.equal(schedule.workingDaysBetween('2026-01-01', '2026-01-07', { calendar_name: 'Custom', calendar_working_days: row['Calendar Working Days'], calendar_exceptions: row['Calendar Exceptions'] }), 2);
});

test('Primavera XER converts lag hours using the activity calendar day-hours', () => {
  const xer = `%T\tCALENDAR
%F\tclndr_id\tclndr_name\tday_hr_cnt
%R\t1\tTen-hour shift\t10
%T\tTASK
%F\ttask_id\ttask_code\ttask_name\tclndr_id
%R\t1\tA\tFirst\t1
%R\t2\tB\tSecond\t1
%T\tTASKPRED
%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt
%R\t2\t1\tPR_FS\t15
`;
  const rows = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(rows[1]['Lag (days)'], 1.5);
  assert.equal(rows[0]['Calendar Hours Per Day'], 10);
});

test('planned resource loading uses the governed activity work days, not weekends', () => {
  const loads = resourceLoading.calculatePlannedResourceLoads(
    [{ id: 'r1', daily_capacity_hours: 8 }],
    [{ resource_id: 'r1', schedule_id: 'a1', assignment_start: '2026-03-06', assignment_end: '2026-03-09', planned_hours: 16 }],
    [{ id: 'a1', calendar_name: '5-Day Week' }],
  );
  assert.deepEqual(loads.map((load) => load.date), ['2026-03-06', '2026-03-09']);
  assert.deepEqual(loads.map((load) => load.allocatedHours), [8, 8]);
});

test('Primavera import preserves every predecessor relationship and CPM applies each link', () => {
  const xer = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_drtn
%R\t1\tA\tExcavate\t4
%R\t2\tB\tSurvey\t3
%R\t3\tC\tConcrete\t2
%T\tTASKPRED
%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt
%R\t3\t1\tPR_FS\t0
%R\t3\t2\tPR_SS\t16
`;
  const rows = primavera.parsePrimaveraXerTasks(xer);
  const links = JSON.parse(rows.find((row) => row['Activity ID'] === 'C')['Predecessor Links']);
  assert.deepEqual(links, [
    { predecessor_code: 'A', relationship_type: 'FS', lag_days: 0 },
    { predecessor_code: 'B', relationship_type: 'SS', lag_days: 2 },
  ]);
  const network = cpm.calculateCpm([
    { id: 'A', duration_days: 4 },
    { id: 'B', duration_days: 3 },
    { id: 'C', duration_days: 2, predecessor_links: links.map((link) => ({ ...link, predecessor_id: link.predecessor_code })) },
  ]);
  assert.equal(network.get('C').earlyStart, 4);
});

test('Primavera XER import retains supported constraints and milestones', () => {
  const xer = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_drtn\tcstr_type\tcstr_date\ttask_type
%R\t1\tM-01\tContract Milestone\t0\tCS_MFO\t2026-03-31 17:00\tTT_Mile
`;
  const [row] = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(row['Constraint Type'], 'Mandatory Finish');
  assert.equal(row['Constraint Date'], '2026-03-31');
  assert.equal(row.Milestone, true);
});

test('Primavera XER import resolves the P6 WBS code, name and parent', () => {
  const xer = `%T\tPROJWBS
%F\twbs_id\twbs_short_name\twbs_name\tparent_wbs_id
%R\t1\tBLD\tBuilding Works\t
%R\t2\tBLD.10\tStructure\t1
%T\tTASK
%F\ttask_id\ttask_code\ttask_name\twbs_id\ttarget_start_date\ttarget_end_date\ttarget_drtn
%R\t10\tACT-10\tExcavate\t2\t2026-01-01\t2026-01-03\t3
`;
  const [row] = primavera.parsePrimaveraXerTasks(xer);
  assert.equal(row.WBS, 'BLD.10');
  assert.equal(row['WBS Name'], 'Structure');
  assert.equal(row['WBS Parent'], 'BLD');
  assert.deepEqual(JSON.parse(row['WBS Hierarchy']).map((node) => node.code), ['BLD', 'BLD.10']);
});

test('approved baselines freeze activity-level schedule scope and require a governed revision', () => {
  const activities = [
    { id: 'a-2', activity_code: 'B', activity: 'Concrete', start_date: '2026-01-08', end_date: '2026-01-12', duration_days: 4, planned_quantity: 50, budget: 2000, calendar_name: '6-Day Week', critical_path: true },
    { id: 'a-1', activity_code: 'A', activity: 'Excavate', start_date: '2026-01-01', end_date: '2026-01-07', duration_days: 6, planned_quantity: 100, planned_value: 1000 },
  ];
  const snapshot = baselines.createBaselineActivitySnapshot(activities);
  assert.deepEqual(snapshot.map((row) => row.activity_code), ['A', 'B']);
  assert.deepEqual(baselines.summarizeBaselineSchedule(snapshot), {
    activity_count: 2, critical_activity_count: 1, planned_start_date: '2026-01-01', planned_end_date: '2026-01-12', planned_budget: 3000,
  });
  assert.deepEqual(baselines.compareBaselineActivities(snapshot, [
    { ...activities[0], duration_days: 5 },
    { id: 'a-3', activity_code: 'C', activity: 'Commission', start_date: '2026-01-13', end_date: '2026-01-14', duration_days: 1, planned_quantity: 1, budget: 20 },
  ]), {
    baselineActivityCount: 2, currentActivityCount: 2, addedActivityCount: 1, removedActivityCount: 1, changedActivityCount: 1, criticalPathVariance: 0,
  });
  const detail = baselines.compareBaselineActivityDetails(snapshot, [
    { ...activities[0], start_date: '2026-01-10', end_date: '2026-01-16', duration_days: 5, planned_quantity: 55, budget: 2100, calendar_name: 'Calendar Days', critical_path: false, predecessor_links: [{ predecessor_id: 'A', relationship: 'FS' }] },
    { id: 'a-3', activity_code: 'C', activity: 'Commission', start_date: '2026-01-13', end_date: '2026-01-14', duration_days: 1, planned_quantity: 1, budget: 20 },
  ]);
  const changed = detail.find((row) => row.activityCode === 'B');
  assert.equal(changed?.status, 'Changed');
  assert.ok(changed?.changedFields.includes('Start date'));
  assert.ok(changed?.changedFields.includes('Predecessor logic'));
  assert.equal(changed?.finishVarianceDays, 4);
  assert.equal(detail.find((row) => row.activityCode === 'A')?.status, 'Removed');
  assert.equal(detail.find((row) => row.activityCode === 'C')?.status, 'Added');
  assert.throws(() => baselines.assertBaselineApproval({ baselineDate: '2026-01-12', revisionReason: '', activities: [], hasPriorApprovedBaseline: false }), /at least one scheduled activity/i);
  assert.throws(() => baselines.assertBaselineApproval({ baselineDate: '2026-01-12', revisionReason: '', activities, hasPriorApprovedBaseline: true }), /revision reason/i);
  assert.doesNotThrow(() => baselines.assertBaselineApproval({ baselineDate: '2026-01-12', revisionReason: 'Client-approved extension', activities, hasPriorApprovedBaseline: true }));
});

test('data quality flags approved legacy baselines without an activity snapshot', () => {
  const findings = quality.runDataQualityChecks({
    projects: [], contracts: [], boqHeaders: [], boqItems: [], schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [],
    baselines: [{ id: 'legacy-baseline', status: 'Approved', contract_id: 'contract-1' }],
  });
  assert.ok(findings.some((finding) => finding.title === 'Approved baseline missing activity snapshot'));
});

test('data quality rejects a schedule activity assigned to a cross-project WBS node', () => {
  const findings = quality.runDataQualityChecks({
    projects: [{ id: 'p1' }, { id: 'p2' }],
    contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'i1', project_id: 'p1', boq_header_id: 'h1' }],
    schedules: [{ id: 'a1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'i1', wbs_id: 'w2', activity: 'Controlled activity', duration_days: 1 }],
    wbsNodes: [{ id: 'w2', project_id: 'p2', contract_id: 'c2', status: 'Active' }],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
  });
  assert.ok(findings.some((finding) => finding.title === 'Schedule WBS relationship mismatch'));
});

test('data quality rejects invalid and cyclic schedule dependencies', () => {
  const source = {
    projects: [{ id: 'project-1' }], contracts: [{ id: 'contract-1', project_id: 'project-1' }], boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', quantity: 2 }],
    schedules: [
      { id: 'a', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'A', duration_days: 1, predecessor_item: 'b' },
      { id: 'b', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'B', duration_days: 1, predecessor_item: 'a' },
    ],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
  };
  const findings = quality.runDataQualityChecks(source);
  assert.ok(findings.some((finding) => finding.title === 'Schedule network contains a dependency cycle'));
});

test('data quality rejects an activity using an inactive work calendar', () => {
  const source = {
    projects: [{ id: 'project-1' }], contracts: [{ id: 'contract-1', project_id: 'project-1' }], boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', quantity: 1 }],
    schedules: [{ id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'Install', calendar_id: 'cal-old' }],
    workCalendars: [{ id: 'cal-old', calendar_code: 'CAL-OLD', calendar_name: 'Retired', working_pattern: '6-Day Week', status: 'Inactive' }],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
  };
  assert.ok(quality.runDataQualityChecks(source).some((finding) => finding.title === 'Activity references an inactive or missing work calendar'));
});

test('data quality rejects a legacy free-text Primavera calendar without a governed master', () => {
  const source = {
    projects: [{ id: 'project-1' }], contracts: [{ id: 'contract-1', project_id: 'project-1' }], boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', quantity: 1 }],
    schedules: [{ id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'Install', calendar_name: 'Six Day Calendar' }],
    workCalendars: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
  };
  assert.ok(quality.runDataQualityChecks(source).some((finding) => finding.title === 'Activity uses an unmapped calendar name'));
});

test('resource productivity is traceable only from linked quantity and labour hours', () => {
  assert.deepEqual(productivity.calculateProductivityMetrics({ plannedQuantity: 100, plannedLaborHours: 20, actualQuantity: 72, actualLaborHours: 18 }), {
    plannedProductivity: 5, actualProductivity: 4, variancePct: -20,
  });
  assert.deepEqual(productivity.calculateProductivityMetrics({ plannedQuantity: 100, plannedLaborHours: 0, actualQuantity: 72, actualLaborHours: 0 }), {
    plannedProductivity: null, actualProductivity: null, variancePct: null,
  });
});

test('resource loading spreads assignments and flags daily over-allocation', () => {
  const loads = resourceLoading.calculateResourceLoads(
    [{ id: 'labor-1', daily_capacity_hours: 8 }],
    [{ resource_id: 'labor-1', date: '2026-02-01', total_hours: 12, days: 1 }],
    [],
  );
  assert.deepEqual(loads, [{ resourceId: 'labor-1', date: '2026-02-01', allocatedHours: 12, capacityHours: 8, overAllocatedHours: 4 }]);
  const source = {
    projects: [], contracts: [], boqHeaders: [], boqItems: [], schedules: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    resourceMasters: [{ id: 'labor-1', resource_code: 'LAB-01', resource_name: 'Mason Crew', resource_type: 'Labor', daily_capacity_hours: 8, status: 'Active' }],
    laborDuty: [{ id: 'duty-1', resource_id: 'labor-1', date: '2026-02-01', total_hours: 12, days: 1 }], equipment: [],
  };
  assert.ok(quality.runDataQualityChecks(source).some((finding) => finding.title === 'Resource is over-allocated'));
});

test('data quality rejects resource records outside their linked activity scope', () => {
  const activity = { id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'Install', start_date: '2026-01-10', end_date: '2026-01-20', planned_quantity: 10 };
  const source = {
    projects: [{ id: 'project-1' }], contracts: [{ id: 'contract-1', project_id: 'project-1' }], boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', quantity: 10 }], schedules: [activity],
    scheduleDistributions: [], wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    laborDuty: [{ id: 'labour-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', schedule_id: 'activity-1', date: '2026-01-09' }],
  };
  assert.ok(quality.runDataQualityChecks(source).some((finding) => finding.title === 'Resource allocation is outside activity scope'));
});

test('cash forecast separates settled cash from open forecast and excludes cancelled movements', () => {
  const point = cashForecast.cashForecastAt([
    { id: 'actual-in', date: '2026-01-05', movement_type: 'Actual', status: 'Settled', inflow: 1000, outflow: 0 },
    { id: 'actual-out', date: '2026-01-06', movement_type: 'Manual', status: 'Settled', inflow: 0, outflow: 200 },
    { id: 'forecast-out', date: '2026-01-15', movement_type: 'Forecast', status: 'Open', inflow: 0, outflow: 300 },
    { id: 'cancelled', date: '2026-01-12', movement_type: 'Forecast', status: 'Cancelled', inflow: 0, outflow: 999 },
  ], '2026-01-31');
  assert.deepEqual(point, { actualNet: 800, openForecastNet: -300, forecastNet: 500 });
});

test('payment terms produce a governed invoice due date', () => {
  assert.equal(paymentTerms.dueDateFromTerms('2026-02-10', 30), '2026-03-12');
  assert.equal(paymentTerms.dueDateFromTerms('2026-02-10', -10), '2026-02-10');
  assert.equal(paymentTerms.dueDateFromTerms(null, 30), null);
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
  assert.deepEqual(schedule.reconcileScheduleDistributions(activity, distributions), {
    plannedQuantity: 100, plannedValue: 1000, distributedQuantity: 100, distributedValue: 1000,
    remainingQuantity: 0, remainingValue: 0, isOverAllocated: false, isComplete: true,
  });
  assert.throws(() => schedule.assertValidScheduleDistribution(
    activity,
    { id: 'd3', schedule_id: 'a1', period_start: '2026-01-15', period_end: '2026-01-20', planned_quantity: 1, unit_rate: 10 },
    distributions,
  ), /exceeds the activity plan/i);
  assert.throws(() => schedule.assertValidScheduleDistribution(
    activity,
    { id: 'd3', schedule_id: 'a1', period_start: '2026-01-15', period_end: '2026-01-20', planned_quantity: 1, unit_rate: 11 },
    [],
  ), /must match the governed activity unit rate/i);
});

test('calendar additions preserve the ISO date contract', () => {
  assert.equal(schedule.addCalendarDays('2026-01-30', 2), '2026-02-01');
  assert.equal(schedule.addCalendarDays(null, 2), null);
  assert.equal(schedule.addWorkingDays('2026-01-01', 2, '5-Day Week'), '2026-01-05');
  assert.equal(schedule.subtractWorkingDays('2026-01-05', 2, '5-Day Week'), '2026-01-01');
  assert.equal(schedule.workingDaysBetween('2026-01-01', '2026-01-05', '5-Day Week'), 2);
  const calendar = { calendar_name: '6-Day Week', calendar_exceptions: '2026-01-04, 2026-01-05' };
  assert.equal(schedule.workingDaysBetween('2026-01-01', '2026-01-06', calendar), 2);
  assert.equal(schedule.addWorkingDays('2026-01-01', 3, calendar), '2026-01-07');
  const activity = { start_date: '2026-01-01', end_date: '2026-01-06', planned_quantity: 100, unit_rate: 10, ...calendar };
  assert.equal(schedule.schedulePlannedValueToDate(activity, '2026-01-04'), 500);
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

test('CPM forecast writes separate forecast dates without changing planned dates', () => {
  const forecast = cpm.calculateCpmForecast([
    { id: 'A', duration_days: 2, calendar_name: 'Calendar Days' },
    { id: 'B', duration_days: 3, predecessor_item: 'A', relationship_type: 'FS', lag_days: 1, calendar_name: 'Calendar Days' },
  ], '2026-01-01');
  assert.equal(forecast.get('A').forecastStart, '2026-01-01');
  assert.equal(forecast.get('A').forecastFinish, '2026-01-03');
  assert.equal(forecast.get('B').forecastStart, '2026-01-04');
  assert.equal(forecast.get('B').forecastFinish, '2026-01-07');
});

test('CPM status forecast honors Data Date, actuals, remaining duration, and retained logic', () => {
  const statusForecast = cpm.calculateCpmStatusForecast([
    { id: 'A', duration_days: 5, calendar_name: 'Calendar Days', activity_status: 'Completed', actual_start_date: '2026-01-01', actual_finish_date: '2026-01-08', remaining_duration_days: 0 },
    { id: 'B', duration_days: 4, predecessor_item: 'A', relationship_type: 'FS', calendar_name: 'Calendar Days', activity_status: 'In Progress', actual_start_date: '2026-01-09', remaining_duration_days: 2 },
    { id: 'C', duration_days: 3, predecessor_item: 'B', relationship_type: 'FS', calendar_name: 'Calendar Days', activity_status: 'Not Started' },
  ], '2026-01-01', '2026-01-12');
  assert.equal(statusForecast.get('A').forecastFinish, '2026-01-08', 'completed activity keeps its actual finish');
  assert.equal(statusForecast.get('B').forecastFinish, '2026-01-14', 'in-progress activity uses remaining duration from the Data Date');
  assert.equal(statusForecast.get('C').forecastStart, '2026-01-14', 'not-started successor retains predecessor logic after the update');
  assert.equal(statusForecast.get('C').forecastFinish, '2026-01-17');
});

test('CPM status forecast applies governed constraints and reports breached finish limit', () => {
  const forecast = cpm.calculateCpmStatusForecast([
    { id: 'A', duration_days: 2, calendar_name: 'Calendar Days', constraint_type: 'Start No Earlier Than', constraint_date: '2026-02-05' },
    { id: 'B', duration_days: 3, calendar_name: 'Calendar Days', constraint_type: 'Finish No Later Than', constraint_date: '2026-02-03' },
  ], '2026-02-01', '2026-02-01');
  assert.equal(forecast.get('A').forecastStart, '2026-02-05');
  assert.equal(forecast.get('A').forecastFinish, '2026-02-07');
  assert.match(forecast.get('B').statusWarning || '', /breached/);
});

test('data quality identifies inconsistent schedule status updates', () => {
  const source = {
    projects: [{ id: 'project-1' }],
    contracts: [{ id: 'contract-1', project_id: 'project-1' }],
    boqHeaders: [{ id: 'header-1', project_id: 'project-1', contract_id: 'contract-1' }],
    boqItems: [{ id: 'item-1', project_id: 'project-1', contract_id: 'contract-1', boq_header_id: 'header-1', item_code: 'A', quantity: 10 }],
    schedules: [{ id: 'activity-1', project_id: 'project-1', contract_id: 'contract-1', boq_item_id: 'item-1', activity: 'Install', planned_quantity: 10, activity_status: 'Completed', actual_start_date: '2026-02-05', actual_finish_date: '', remaining_duration_days: 2 }],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
  };
  const findings = quality.runDataQualityChecks(source);
  assert.ok(findings.some((finding) => finding.title === 'Schedule status update is invalid'));
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

test('planned resource assignments are governed by activity scope, dates and resource type', () => {
  const base = {
    projects: [{ id: 'p1' }], contracts: [{ id: 'c1', project_id: 'p1' }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'c1' }],
    boqItems: [{ id: 'b1', project_id: 'p1', contract_id: 'c1', boq_header_id: 'h1', item_code: 'B-1', quantity: 10 }],
    schedules: [{ id: 'a1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', activity: 'Install', start_date: '2026-03-01', end_date: '2026-03-10', planned_quantity: 10 }],
    wirEntries: [], costEntries: [], reportingPeriods: [], baselines: [],
    resourceMasters: [{ id: 'r1', resource_code: 'LAB-1', resource_name: 'Crew', resource_type: 'Labor', daily_capacity_hours: 8, status: 'Active' }],
  };
  const valid = quality.runDataQualityChecks({ ...base, scheduleResourceAssignments: [{ id: 'ra1', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', schedule_id: 'a1', resource_id: 'r1', resource_type: 'Labor', assignment_start: '2026-03-01', assignment_end: '2026-03-10', planned_hours: 40, planned_cost: 800 }] });
  assert.equal(valid.some((finding) => finding.title === 'Planned resource assignment is invalid'), false);
  const invalid = quality.runDataQualityChecks({ ...base, scheduleResourceAssignments: [{ id: 'ra2', project_id: 'p1', contract_id: 'c1', boq_item_id: 'b1', schedule_id: 'a1', resource_id: 'r1', resource_type: 'Equipment', assignment_start: '2026-02-28', assignment_end: '2026-03-10', planned_hours: 40, planned_cost: 800 }] });
  assert.equal(invalid.some((finding) => finding.title === 'Planned resource assignment is invalid'), true);
});

test('planned resource load profile detects capacity overload before site actuals are posted', () => {
  const loads = resourceLoading.calculatePlannedResourceLoads(
    [{ id: 'r1', daily_capacity_hours: 8 }],
    [{ resource_id: 'r1', assignment_start: '2026-03-01', assignment_end: '2026-03-02', planned_hours: 20 }],
  );
  assert.equal(loads.length, 2);
  assert.equal(loads[0].allocatedHours, 10);
  assert.equal(loads[0].overAllocatedHours, 2);
});

test('planned resource load respects the governed resource availability window', () => {
  const loads = resourceLoading.calculatePlannedResourceLoads(
    [{ id: 'r1', daily_capacity_hours: 8, availability_start_date: '2026-03-02', availability_end_date: '2026-03-03' }],
    [{ resource_id: 'r1', assignment_start: '2026-03-01', assignment_end: '2026-03-04', planned_hours: 16 }],
  );
  assert.deepEqual(loads.map((load) => load.date), ['2026-03-02', '2026-03-03']);
  assert.deepEqual(loads.map((load) => load.allocatedHours), [8, 8]);
});

test('resource calendar controls planned resource dates and shift hours override generic day hours', () => {
  assert.equal(schedule.calendarHoursPerDay({ hours_per_day: 6, shift_definitions: '[{"start":"07:00","end":"12:00"},{"start":"13:00","end":"17:00"}]' }), 9);
  assert.equal(schedule.calendarShiftHours({ shift_definitions: '[{"start":"bad","end":"17:00"}]' }), null);
  const loads = resourceLoading.calculatePlannedResourceLoads(
    [{ id: 'r1', daily_capacity_hours: 8, calendar_id: 'cal-5' }],
    [{ resource_id: 'r1', schedule_id: 'a1', assignment_start: '2026-03-05', assignment_end: '2026-03-08', planned_hours: 16 }],
    [{ id: 'a1', calendar_name: 'Calendar Days' }],
    [{ id: 'cal-5', calendar_name: 'Crew Week', working_pattern: '5-Day Week', hours_per_day: 9 }],
  );
  assert.deepEqual(loads.map((load) => load.date), ['2026-03-05', '2026-03-06']);
  assert.deepEqual(loads.map((load) => load.allocatedHours), [8, 8]);
  assert.deepEqual(loads.map((load) => load.capacityHours), [9, 9]);
});

test('resource leveling recommendations identify affected activities without changing the plan', () => {
  const assignments = [
    { id: 'ra-1', schedule_id: 'a-1', resource_id: 'r1', assignment_start: '2026-03-01', assignment_end: '2026-03-01', planned_hours: 6 },
    { id: 'ra-2', schedule_id: 'a-2', resource_id: 'r1', assignment_start: '2026-03-01', assignment_end: '2026-03-01', planned_hours: 5 },
  ];
  const schedules = [
    { id: 'a-1', activity: 'Critical predecessor', duration_days: 1 },
    { id: 'a-2', activity: 'Critical successor', duration_days: 4, predecessor_item: 'a-1' },
    { id: 'a-3', activity: 'Flexible activity', duration_days: 1 },
  ];
  assignments[0].schedule_id = 'a-2';
  assignments[1].schedule_id = 'a-3';
  const recommendations = resourceLoading.suggestResourceLeveling([{ id: 'r1', daily_capacity_hours: 8 }], assignments, schedules);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].hoursToRelevel, 3);
  assert.deepEqual(recommendations[0].scheduleIds, ['a-2', 'a-3']);
  assert.deepEqual(recommendations[0].candidates[0], { scheduleId: 'a-3', totalFloatDays: 4, critical: false, cycle: false });
  assert.equal(assignments[0].assignment_start, '2026-03-01');
});

test('planned resource cost forecast is time-phased by the activity calendar and remains separate from cash', () => {
  const points = resourceLoading.timePhasedPlannedResourceCost(
    [{ id: 'r1', standard_rate: 20 }],
    [{ resource_id: 'r1', schedule_id: 'a1', assignment_start: '2026-03-06', assignment_end: '2026-03-09', planned_hours: 16 }],
    [{ id: 'a1', calendar_name: '5-Day Week' }],
  );
  assert.deepEqual(points, [{ date: '2026-03-06', cost: 160 }, { date: '2026-03-09', cost: 160 }]);
  assert.equal(resourceLoading.plannedResourceCostAt(points, '2026-03-06'), 160);
});

test('approved baseline freezes the time-phased PV profile instead of using later live edits', () => {
  const activity = { id: 'a1', contract_id: 'c1', activity_code: 'A-01', activity: 'Install', start_date: '2026-01-01', end_date: '2026-01-10', planned_quantity: 10, unit_rate: 100, budget: 1000 };
  const frozen = baselines.createBaselineDistributionSnapshot([{ schedule_id: 'a1', period_start: '2026-01-01', period_end: '2026-01-05', planned_quantity: 10, unit_rate: 100 }], [activity]);
  const plan = baselines.approvedBaselinePlanForActivity(activity, [{ schedule_id: 'a1', period_start: '2026-01-06', period_end: '2026-01-10', planned_quantity: 10, unit_rate: 100, planned_value: 1000 }], [{ contract_id: 'c1', status: 'Approved', revision_number: 1, activity_snapshot: [activity], distribution_snapshot: frozen }]);
  assert.equal(plan.usesApprovedBaseline, true);
  assert.equal(schedule.distributedPlannedValueToDate(plan.activity, plan.distributions, '2026-01-05'), 1000);
});
