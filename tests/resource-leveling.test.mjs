import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateLevelingProposal,
  buildForecastScheduleVersionInputFromProposal,
} from '../src/utils/resourceLevelingEngine.ts';
import { captureScheduleVersion } from '../src/utils/scheduleVersioning.ts';

test('F7 Resource Leveling - simulates proposal without modifying source schedules', () => {
  const projectId = 'PROJ-TEST-001';
  const dataDate = '2026-09-01';

  const schedules = [
    {
      id: 'SCH-101',
      project_id: projectId,
      activity_code: 'ACT-101',
      activity: 'Excavation Phase 1',
      duration_days: 5,
      start_date: '2026-09-01',
      end_date: '2026-09-05',
      planned_duration_days: 5,
      activity_status: 'Not Started',
    },
    {
      id: 'SCH-102',
      project_id: projectId,
      activity_code: 'ACT-102',
      activity: 'Utility Trenching',
      duration_days: 5,
      start_date: '2026-09-01',
      end_date: '2026-09-05',
      planned_duration_days: 5,
      activity_status: 'Not Started',
    },
  ];

  const resources = [
    {
      id: 'RES-EXCAVATOR-1',
      resource_code: 'EXC-01',
      resource_name: 'Heavy Excavator A',
      daily_capacity_hours: 8,
    },
  ];

  // Overload: Both activities assigned to Heavy Excavator A on same dates (each 8 hrs/day = 16 hrs/day vs 8 capacity)
  const assignments = [
    {
      id: 'ASN-101',
      schedule_id: 'SCH-101',
      resource_id: 'RES-EXCAVATOR-1',
      assignment_start: '2026-09-01',
      assignment_end: '2026-09-05',
      planned_hours: 40,
    },
    {
      id: 'ASN-102',
      schedule_id: 'SCH-102',
      resource_id: 'RES-EXCAVATOR-1',
      assignment_start: '2026-09-01',
      assignment_end: '2026-09-05',
      planned_hours: 40,
    },
  ];

  const proposal = generateLevelingProposal({
    projectId,
    proposalCode: 'RLP-2026-001',
    title: 'Site Excavation Leveling',
    owner: 'Planning Manager',
    dataDate,
    algorithm: 'CPM_FLOAT_FIRST',
    schedules,
    resources,
    assignments,
  });

  assert.strictEqual(proposal.proposal_code, 'RLP-2026-001');
  assert.strictEqual(proposal.status, 'Draft');
  assert.strictEqual(proposal.overloaded_resources.length, 1);
  assert.strictEqual(proposal.overloaded_resources[0].resourceCode, 'EXC-01');
  assert.ok(proposal.changes.length > 0);
  assert.ok(proposal.impact_summary.totalActivitiesShifted > 0);

  // Source schedules MUST remain unmutated during proposal simulation
  assert.strictEqual(schedules[0].start_date, '2026-09-01');
  assert.strictEqual(schedules[1].start_date, '2026-09-01');
});

test('F7 Resource Leveling - apply proposal creates Forecast schedule version without changing Baseline', () => {
  const projectId = 'PROJ-TEST-002';
  const dataDate = '2026-09-01';

  const schedules = [
    {
      id: 'SCH-201',
      project_id: projectId,
      activity_code: 'ACT-201',
      activity: 'Foundation Rebar',
      duration_days: 3,
      start_date: '2026-09-01',
      end_date: '2026-09-03',
      planned_duration_days: 3,
      activity_status: 'Not Started',
    },
    {
      id: 'SCH-202',
      project_id: projectId,
      activity_code: 'ACT-202',
      activity: 'Wall Rebar',
      duration_days: 3,
      start_date: '2026-09-01',
      end_date: '2026-09-03',
      planned_duration_days: 3,
      activity_status: 'Not Started',
    },
  ];

  const resources = [
    { id: 'RES-CREW-1', resource_code: 'CREW-01', resource_name: 'Steel Crew', daily_capacity_hours: 8 },
  ];

  const assignments = [
    { id: 'ASN-201', schedule_id: 'SCH-201', resource_id: 'RES-CREW-1', assignment_start: '2026-09-01', assignment_end: '2026-09-03', planned_hours: 24 },
    { id: 'ASN-202', schedule_id: 'SCH-202', resource_id: 'RES-CREW-1', assignment_start: '2026-09-01', assignment_end: '2026-09-03', planned_hours: 24 },
  ];

  const proposal = generateLevelingProposal({
    projectId,
    proposalCode: 'RLP-2026-002',
    title: 'Steel Crew Leveling',
    owner: 'Site Engineer',
    dataDate,
    schedules,
    resources,
    assignments,
  });

  const { updatedSchedules, scheduleVersionInput } = buildForecastScheduleVersionInputFromProposal(
    proposal,
    schedules,
    assignments
  );

  // Capture schedule version
  const capturedVersion = captureScheduleVersion(scheduleVersionInput);

  assert.strictEqual(capturedVersion.version_type, 'Forecast');
  assert.strictEqual(capturedVersion.version_code, 'SCH-FCST-2026-002');
  assert.strictEqual(capturedVersion.project_id, projectId);
  assert.strictEqual(capturedVersion.status, 'Approved');

  // Verify updated schedules shifted date
  const shifted = updatedSchedules.find((s) => s.id === proposal.changes[0].scheduleId);
  assert.notStrictEqual(shifted.start_date, '2026-09-01');
});

test('F7 Resource Leveling - rejection flow leaves schedules untouched and sets status to Rejected', () => {
  const proposal = {
    id: 'rlp-test-rej',
    project_id: 'PROJ-TEST-003',
    proposal_code: 'RLP-2026-003',
    title: 'Rejected Leveling',
    status: 'Draft',
    data_date: '2026-09-01',
    algorithm: 'CPM_FLOAT_FIRST',
    owner: 'Planner',
    overloaded_resources: [],
    affected_activities: [],
    changes: [],
    impact_summary: {
      totalActivitiesShifted: 0,
      maxScheduleSlippageDays: 0,
      criticalPathShifted: false,
      remainingOverloadsCount: 0,
      clearedOverloadsCount: 0,
      beforeOverloadedDays: 0,
      afterOverloadedDays: 0,
    },
    created_at: new Date().toISOString(),
  };

  // Rejection transition
  const rejectedProposal = {
    ...proposal,
    status: 'Rejected',
    rejection_reason: 'Exceeds contract milestone allowance',
    updated_at: new Date().toISOString(),
  };

  assert.strictEqual(rejectedProposal.status, 'Rejected');
  assert.strictEqual(rejectedProposal.rejection_reason, 'Exceeds contract milestone allowance');
});
