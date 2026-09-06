import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  validateDelayEventInput,
  calculateTimeImpactAnalysis,
  calculateProjectDelaySummary,
} from '../src/utils/delayImpact.ts';

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

test('C3 — Delay Event Input Validation', () => {
  const validEvent = {
    id: 'evt-1',
    project_id: 'proj-101',
    contract_id: 'ctr-202',
    delay_code: 'DEL-2026-001',
    event_name: 'Unforeseen Utility Line Collision',
    event_category: 'Employer Delay',
    discovery_date: '2026-03-15',
    root_cause: 'Utility mapping inaccurate on client drawing',
    responsible_party: 'Employer / Engineer',
    entitlement_type: 'Compensable & Excusable',
    requested_extension_days: 14,
    approved_extension_days: 10,
    status: 'Approved',
  };

  const res = validateDelayEventInput(validEvent);
  assert.equal(res.valid, true, 'Valid delay event must pass validation');
  assert.equal(res.errors.length, 0);

  // Negative test - missing code and invalid dates
  const invalidEvent = {
    ...validEvent,
    delay_code: '',
    discovery_date: 'invalid-date',
    requested_extension_days: -5,
    status: 'UnknownStatus',
  };

  const invalidRes = validateDelayEventInput(invalidEvent);
  assert.equal(invalidRes.valid, false, 'Invalid event must fail validation');
  assert.ok(invalidRes.errors.some((e) => e.includes('Delay code')), 'Must report missing delay code');
  assert.ok(invalidRes.errors.some((e) => e.includes('Discovery date')), 'Must report invalid discovery date');
  assert.ok(invalidRes.errors.some((e) => e.includes('Requested extension days')), 'Must report negative requested days');
  assert.ok(invalidRes.errors.some((e) => e.toLowerCase().includes('status')), 'Must report invalid status');
});

test('C3 — Time Impact Analysis (TIA) Calculation & Baseline Immutability', () => {
  const baselineFinishDate = '2026-12-31';
  const tasks = [
    { id: 't1', wbs_id: 'wbs-1', name: 'Foundation', start_date: '2026-01-01', end_date: '2026-03-31', float: 0, is_critical: true },
    { id: 't2', wbs_id: 'wbs-2', name: 'Superstructure', start_date: '2026-04-01', end_date: '2026-08-31', float: 0, is_critical: true },
    { id: 't3', wbs_id: 'wbs-3', name: 'MEP Fitout', start_date: '2026-09-01', end_date: '2026-12-31', float: 10, is_critical: false },
  ];

  const delayEvent = {
    id: 'evt-1',
    project_id: 'proj-101',
    contract_id: 'ctr-202',
    schedule_activity_id: 't2',
    delay_code: 'DEL-2026-002',
    event_name: 'Rebar Supply Delay',
    event_category: 'Employer Delay',
    discovery_date: '2026-04-10',
    root_cause: 'Delayed client approval of shop drawings',
    responsible_party: 'Engineer',
    entitlement_type: 'Compensable & Excusable',
    requested_extension_days: 20,
    approved_extension_days: 15,
    status: 'Approved',
  };

  const tia = calculateTimeImpactAnalysis(delayEvent, tasks, baselineFinishDate);

  assert.equal(tia.baselineFinishDate, '2026-12-31', 'Original baseline finish must match');
  assert.equal(tia.preDelayFinishDate, '2026-12-31');
  assert.equal(tia.postDelayFinishDate, '2027-01-15', 'Post-delay finish must be offset by approved EOT days for approved event');
  assert.equal(tia.forecastRevisedFinishDate, '2027-01-15', 'Revised forecast finish must be extended by approved 15 EOT days');
  assert.equal(tia.criticalPathAffected, true, 'Activity on critical path must affect critical path');
  assert.equal(tia.netCpmImpactDays, 15);
});

test('C3 — Project Delay Summary Aggregation', () => {
  const baselineFinishDate = '2026-12-31';
  const events = [
    {
      id: 'e1',
      project_id: 'p1',
      delay_code: 'DEL-1',
      event_name: 'Site Access Delay',
      event_category: 'Employer Delay',
      discovery_date: '2026-02-01',
      root_cause: 'Land acquisition',
      responsible_party: 'Client',
      entitlement_type: 'Compensable & Excusable',
      requested_extension_days: 30,
      approved_extension_days: 25,
      status: 'Approved',
      cpm_impact_days: 30,
    },
    {
      id: 'e2',
      project_id: 'p1',
      delay_code: 'DEL-2',
      event_name: 'Extreme Weather',
      event_category: 'Force Majeure',
      discovery_date: '2026-03-01',
      root_cause: 'Unseasonal flooding',
      responsible_party: 'N/A',
      entitlement_type: 'Excusable Non-Compensable',
      requested_extension_days: 10,
      approved_extension_days: 10,
      status: 'Approved',
      cpm_impact_days: 10,
    },
    {
      id: 'e3',
      project_id: 'p1',
      delay_code: 'DEL-3',
      event_name: 'Subcontractor Equipment Breakdown',
      event_category: 'Contractor Delay',
      discovery_date: '2026-04-01',
      root_cause: 'Poor maintenance',
      responsible_party: 'Subcontractor',
      entitlement_type: 'Non-Excusable Non-Compensable',
      requested_extension_days: 15,
      approved_extension_days: 0,
      status: 'Rejected',
      cpm_impact_days: 15,
    },
  ];

  const summary = calculateProjectDelaySummary(events, baselineFinishDate);

  assert.equal(summary.totalIdentifiedDelays, 3);
  assert.equal(summary.totalRequestedDays, 55);
  assert.equal(summary.totalApprovedEotDays, 35);
  assert.equal(summary.approvedEmployerDelays, 25);
  assert.equal(summary.totalCpmImpactDays, 40);
  assert.equal(summary.originalBaselineFinish, '2026-12-31');
  assert.equal(summary.revisedForecastFinish, '2027-02-04', '35 approved EOT days extended from 2026-12-31');
});

test('C3 — Production Files Structure & Integration Check', () => {
  const libRsPath = path.resolve('src-tauri/src/lib.rs');
  const libRsContent = fs.readFileSync(libRsPath, 'utf8');
  assert.ok(libRsContent.includes('delay_events'), 'Migration 51 in lib.rs must create delay_events table');
  assert.ok(libRsContent.includes('delay_events_immutable_delete_v1'), 'Migration 51 must include trigger preventing deletion of approved/closed delay events');

  const sqliteRepoPath = path.resolve('src/data/sqliteRepository.ts');
  const sqliteRepoContent = fs.readFileSync(sqliteRepoPath, 'utf8');
  assert.ok(sqliteRepoContent.includes('"delay_events"'), 'sqliteRepository.ts must register delay_events in TABLES set');
  assert.ok(sqliteRepoContent.includes('INSERT INTO delay_events'), 'sqliteRepository.ts must contain explicit delay_events insert mapping');
  assert.ok(sqliteRepoContent.includes('UPDATE delay_events'), 'sqliteRepository.ts must contain explicit delay_events update mapping');

  const useDataPath = path.resolve('src/hooks/useData.ts');
  const useDataContent = fs.readFileSync(useDataPath, 'utf8');
  assert.ok(useDataContent.includes('delayEvents'), 'useData.ts must export delayEvents state');
  assert.ok(useDataContent.includes("listOptional<DelayEvent>('delay_events')"), 'useData.ts must load delay_events from database');

  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('DelayRegisterModal'), 'App.tsx must import and render DelayRegisterModal');
  assert.ok(appContent.includes('Delay & Time-Impact Register'), 'App.tsx toolbar must provide Delay & Time-Impact Register button');
});
