import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrimaveraReconciliation } from '../src/utils/primaveraReconciliation.ts';
import { parsePrimaveraXerTasks } from '../src/data/primaveraImport.ts';
import { readFileSync } from 'node:fs';

test('Primavera Reconciliation - enforces project_id and contract_id scope parameters', () => {
  assert.throws(() => {
    buildPrimaveraReconciliation({
      projectId: '',
      contractId: 'c-01',
      fileContent: '',
      fileName: 'test.xer',
      duplicatePolicy: 'update',
      localActivities: [],
    });
  }, /Project ID and Contract ID are required/);
});

test('Primavera Reconciliation - rejects empty or non-XER content instead of reporting success', () => {
  assert.throws(() => buildPrimaveraReconciliation({
    projectId: 'p-01', contractId: 'c-01', fileContent: 'not a primavera export', fileName: 'bad.xer',
    duplicatePolicy: 'update', localActivities: [],
  }), /no valid Primavera TASK records/i);
});

test('Primavera Reconciliation - parses XER content and identifies new activities vs local activities', () => {
  const xerContent = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn\tdriving_path_flag
%R\t10\tACT-01\tSite Clearance\t2026-06-01 08:00\t2026-06-05 17:00\t5\tY
%R\t11\tACT-02\tExcavation Work\t2026-06-06 08:00\t2026-06-12 17:00\t6\tN
`;

  const localActivities = [
    {
      id: 'act-1',
      project_id: 'p-01',
      contract_id: 'c-01',
      activity_code: 'ACT-01',
      activity: 'Site Clearance',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      duration_days: 5,
      actual_start_date: '2026-06-01',
      actual_quantity: 50,
      actual_cost: 1000
    }
  ];

  const result = buildPrimaveraReconciliation({
    projectId: 'p-01',
    contractId: 'c-01',
    fileContent: xerContent,
    fileName: 'schedule.xer',
    duplicatePolicy: 'update',
    localActivities,
  });

  assert.equal(result.stats.totalP6, 2);
  assert.equal(result.stats.synced, 1);
  assert.equal(result.stats.newInP6, 1);
  assert.equal(result.preparedInsertRows.length, 1);
  assert.equal(result.preparedInsertRows[0].activity_code, 'ACT-02');
});

test('Primavera Reconciliation - planning refresh updates dates/duration while preserving local actuals', () => {
  const xerContent = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn
%R\t10\tACT-01\tSite Clearance Revised\t2026-06-03 08:00\t2026-06-10 17:00\t7
`;

  const localActivities = [
    {
      id: 'act-1',
      project_id: 'p-01',
      contract_id: 'c-01',
      activity_code: 'ACT-01',
      activity: 'Site Clearance',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      duration_days: 5,
      actual_start_date: '2026-06-01',
      actual_quantity: 100,
      actual_cost: 2500
    }
  ];

  const result = buildPrimaveraReconciliation({
    projectId: 'p-01',
    contractId: 'c-01',
    fileContent: xerContent,
    fileName: 'update.xer',
    duplicatePolicy: 'update',
    localActivities,
  });

  assert.equal(result.stats.dateDrift, 1);
  assert.equal(result.stats.actualsPreservedCount, 1);
  assert.equal(result.preparedUpdatePatches.length, 1);

  const patch = result.preparedUpdatePatches[0].patch;
  assert.equal(patch.start_date, '2026-06-03');
  assert.equal(patch.end_date, '2026-06-10');
  assert.equal(patch.duration_days, 7);

  // Verify patch does NOT contain actuals fields, preserving local actuals
  assert.equal('actual_start_date' in patch, false);
  assert.equal('actual_quantity' in patch, false);
  assert.equal('actual_cost' in patch, false);
});

test('Primavera Reconciliation - duplicate policy "skip" ignores existing activities and inserts only new ones', () => {
  const xerContent = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn
%R\t10\tACT-01\tExisting Activity\t2026-06-01\t2026-06-05\t5
%R\t11\tACT-NEW\tBrand New Activity\t2026-06-06\t2026-06-10\t4
`;

  const localActivities = [
    {
      id: 'act-1',
      project_id: 'p-01',
      contract_id: 'c-01',
      activity_code: 'ACT-01',
      activity: 'Existing Activity',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      duration_days: 5
    }
  ];

  const result = buildPrimaveraReconciliation({
    projectId: 'p-01',
    contractId: 'c-01',
    fileContent: xerContent,
    fileName: 'schedule.xer',
    duplicatePolicy: 'skip',
    localActivities,
  });

  assert.equal(result.preparedUpdatePatches.length, 0);
  assert.equal(result.preparedInsertRows.length, 1);
  assert.equal(result.preparedInsertRows[0].activity_code, 'ACT-NEW');
});

test('Primavera Reconciliation - code matching is case-insensitive and never borrows unscoped local rows', () => {
  const xerContent = `%T\tTASK\n%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn\n%R\t10\tACT-01\tScoped Activity\t2026-06-01\t2026-06-05\t5\n`;
  const result = buildPrimaveraReconciliation({
    projectId: 'p-01', contractId: 'c-01', fileContent: xerContent, fileName: 'scope.xer', duplicatePolicy: 'update',
    localActivities: [
      { id: 'match', project_id: 'p-01', contract_id: 'c-01', activity_code: 'act-01', start_date: '2026-06-01', end_date: '2026-06-05', duration_days: 5 },
      { id: 'wrong-scope', project_id: 'p-02', contract_id: 'c-02', activity_code: 'ACT-01', start_date: '2026-01-01', end_date: '2026-01-02', duration_days: 1 },
    ],
  });
  assert.equal(result.stats.synced, 1);
  assert.equal(result.preparedUpdatePatches[0].id, 'match');
});

test('Primavera Reconciliation UI commits through the atomic desktop gateway', () => {
  const board = readFileSync(new URL('../src/components/XerReconciliationBoard.tsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(board, /await commitGovernedImport\(\{/);
  assert.match(board, /Update the UI projection only after the SQLite transaction commits/);
  assert.doesNotMatch(board, /p-01'\)/, 'The production board must not fabricate a project scope');
  assert.doesNotMatch(board, /c-01'\)/, 'The production board must not fabricate a contract scope');
  assert.match(dashboard, /onCommitSuccess=.*onDataReload/s);
});

test('Primavera Reconciliation - relationship comparison detects matched and mismatched links', () => {
  const xerContent = `%T\tTASK
%F\ttask_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\ttarget_drtn
%R\t1\tA\tFirst\t2026-06-01\t2026-06-05\t5
%R\t2\tB\tSecond\t2026-06-06\t2026-06-10\t4
%T\tTASKPRED
%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt
%R\t2\t1\tPR_FS\t16
`;

  const localActivities = [
    {
      id: 'A',
      project_id: 'p-01',
      contract_id: 'c-01',
      activity_code: 'A',
      activity: 'First',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      duration_days: 5
    },
    {
      id: 'B',
      project_id: 'p-01',
      contract_id: 'c-01',
      activity_code: 'B',
      activity: 'Second',
      start_date: '2026-06-06',
      end_date: '2026-06-10',
      duration_days: 4,
      predecessor_links: [
        { predecessor_code: 'A', relationship_type: 'FS', lag_days: 2 }
      ]
    }
  ];

  const result = buildPrimaveraReconciliation({
    projectId: 'p-01',
    contractId: 'c-01',
    fileContent: xerContent,
    fileName: 'relationships.xer',
    duplicatePolicy: 'update',
    localActivities,
  });

  assert.equal(result.relationshipDiffs.length, 1);
  assert.equal(result.relationshipDiffs[0].predCode, 'A');
  assert.equal(result.relationshipDiffs[0].succCode, 'B');
  assert.equal(result.relationshipDiffs[0].p6Type, 'FS');
  assert.equal(result.relationshipDiffs[0].p6Lag, 2); // 16 hrs / 8 hrs per day = 2 days
  assert.equal(result.relationshipDiffs[0].status, 'matched');
});
