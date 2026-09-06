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
    schedule_activity_id: 't2',
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
    { id: 't1', project_id: 'proj-101', contract_id: 'ctr-202', activity_code: 'A1000', activity: 'Foundation', start_date: '2026-01-01', end_date: '2026-03-31', forecast_end_date: '2026-03-31', duration_days: 90 },
    { id: 't2', project_id: 'proj-101', contract_id: 'ctr-202', activity_code: 'A2000', activity: 'Superstructure', start_date: '2026-04-01', end_date: '2026-08-31', forecast_end_date: '2026-08-31', duration_days: 153, predecessor_item: 't1', relationship_type: 'FS' },
    { id: 't3', project_id: 'proj-101', contract_id: 'ctr-202', activity_code: 'A3000', activity: 'MEP Fitout', start_date: '2026-09-01', end_date: '2026-12-31', forecast_end_date: '2026-12-31', duration_days: 122, predecessor_item: 't2', relationship_type: 'FS' },
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
  assert.equal(tia.postDelayFinishDate, '2027-01-20', 'TIA forecast reflects the modeled 20-day CPM fragnet impact');
  assert.equal(tia.forecastRevisedFinishDate, '2027-01-15', 'Revised forecast finish must be extended by approved 15 EOT days');
  assert.equal(tia.criticalPathAffected, true, 'Activity on critical path must affect critical path');
  assert.equal(tia.netCpmImpactDays, 20);
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

test('C3 — SQLite scope, baseline, workflow, and immutability governance', () => {
  const rust = fs.readFileSync(path.resolve('src-tauri/src/lib.rs'), 'utf8');
  const migration51 = rust.match(/version:\s*51,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/)?.[1];
  const migration52 = rust.match(/version:\s*52,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/)?.[1];
  assert.ok(migration51 && migration52, 'Delay register migrations 51 and 52 must exist');
  const script = String.raw`
import json, sqlite3, sys
m51, m52 = sys.stdin.read().split('\n--M52--\n')
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
db.executescript('''
CREATE TABLE projects(id TEXT PRIMARY KEY);
CREATE TABLE contracts(id TEXT PRIMARY KEY, project_id TEXT, parent_main_contract_id TEXT, payload TEXT);
CREATE TABLE schedules(id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT);
CREATE TABLE wbs_nodes(id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT);
CREATE TABLE variations(id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT);
CREATE TABLE project_baselines(id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT);
CREATE TABLE schedule_versions(id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, status TEXT, payload TEXT);
INSERT INTO projects VALUES ('p1'); INSERT INTO projects VALUES ('p2');
INSERT INTO contracts VALUES ('c1','p1',NULL,'{}');
INSERT INTO contracts VALUES ('sub1','p1','c1','{}');
INSERT INTO schedules VALUES ('a1','p1','c1','{}');
INSERT INTO schedules VALUES ('a2','p2','c1','{}');
INSERT INTO wbs_nodes VALUES ('w1','p1','c1','{}');
INSERT INTO variations VALUES ('v1','p1','c1','{}');
INSERT INTO schedule_versions VALUES ('bl1','p1','c1','Approved','{}');
''')
db.executescript(m51); db.executescript(m52)
cols = {r[1] for r in db.execute('PRAGMA table_info(delay_events)')}
assert {'baseline_id','analysis_date','pre_impact_finish','post_impact_finish'}.issubset(cols)

fields = 'id,created_at,updated_at,project_id,contract_id,wbs_id,schedule_activity_id,variation_id,baseline_id,analysis_date,pre_impact_finish,post_impact_finish,delay_code,event_name,event_category,discovery_date,root_cause,responsible_party,entitlement_type,requested_extension_days,approved_extension_days,mitigation_action,status,cpm_impact_days,time_impact_analysis,notes,payload'
def values(record_id='d1', contract='c1', activity='a1', status='Identified', approved=0, baseline=None):
  payload={'id':record_id,'project_id':'p1','contract_id':contract,'schedule_activity_id':activity,'status':status}
  return (record_id,'2026-01-01','2026-01-01','p1',contract,'w1',activity,'v1',baseline,'2026-02-01','2026-12-31','2027-01-10','DEL-001','Late access','Employer Delay','2026-02-01','Late access','Employer','Compensable & Excusable',10,approved,'Recover sequence',status,10,'{}','',json.dumps(payload))
sql = f'INSERT INTO delay_events ({fields}) VALUES ({",".join(["?"]*27)})'
db.execute(sql, values())
for bad in [values('bad-sub','sub1'), values('bad-scope','c1','a2')]:
  try: db.execute(sql,bad); raise AssertionError('invalid delay-event scope accepted')
  except sqlite3.DatabaseError: pass
try: db.execute(sql,values('bad-approved','c1','a1','Approved',10,None)); raise AssertionError('approved event without baseline accepted')
except sqlite3.DatabaseError: pass

payload=json.loads(db.execute("SELECT payload FROM delay_events WHERE id='d1'").fetchone()[0]); payload['status']='Submitted'
db.execute("UPDATE delay_events SET status='Submitted',payload=? WHERE id='d1'",(json.dumps(payload),))
payload['status']='Approved'; payload['baseline_id']='bl1'; payload['approved_extension_days']=10
db.execute("UPDATE delay_events SET status='Approved',baseline_id='bl1',approved_extension_days=10,payload=? WHERE id='d1'",(json.dumps(payload),))
try: db.execute("UPDATE delay_events SET event_name='Tampered' WHERE id='d1'"); raise AssertionError('approved event was mutable')
except sqlite3.DatabaseError: pass
payload['status']='Closed'
db.execute("UPDATE delay_events SET status='Closed',payload=? WHERE id='d1'",(json.dumps(payload),))
try: db.execute("DELETE FROM delay_events WHERE id='d1'"); raise AssertionError('closed event was deletable')
except sqlite3.DatabaseError: pass
print('ok')
`;
  const result = execFileSync(PYTHON_BIN, ['-c', script], {
    input: `${migration51}\n--M52--\n${migration52}`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  assert.equal(result, 'ok');
});
