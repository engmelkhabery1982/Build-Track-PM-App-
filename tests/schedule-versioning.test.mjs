import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  captureScheduleVersion,
  compareScheduleVersions,
  validateScheduleVersionInput,
} from '../src/utils/scheduleVersioning.ts';

function getPythonBin() {
  if (process.env.PYTHON) return process.env.PYTHON;
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return 'python3';
  } catch {
    return 'python';
  }
}
const PYTHON_BIN = getPythonBin();

test('Schedule Versioning - captureScheduleVersion creates valid immutable snapshot', () => {
  const activities = [
    {
      id: 'act-1',
      activity_code: 'A1000',
      activity: 'Excavation & Shoring',
      start_date: '2026-05-01',
      end_date: '2026-05-15',
      duration_days: 14,
      planned_quantity: 500,
      planned_value: 25000,
      budget: 25000,
      critical_path: true,
      calendar_name: '6-Day Week',
    },
    {
      id: 'act-2',
      activity_code: 'A1010',
      activity: 'Foundation Concrete Pour',
      start_date: '2026-05-16',
      end_date: '2026-05-30',
      duration_days: 14,
      planned_quantity: 300,
      planned_value: 45000,
      budget: 45000,
      critical_path: true,
      calendar_name: '6-Day Week',
    },
  ];

  const version = captureScheduleVersion({
    projectId: 'proj-100',
    contractId: 'cont-200',
    versionCode: 'BL-01',
    versionName: 'Initial Contract Baseline',
    versionType: 'Baseline',
    status: 'Approved',
    dataDate: '2026-05-01',
    owner: 'Chief Planner',
    reason: 'Formal contract award baseline approval',
    activities,
  });

  assert.equal(version.project_id, 'proj-100');
  assert.equal(version.contract_id, 'cont-200');
  assert.equal(version.version_code, 'BL-01');
  assert.equal(version.version_type, 'Baseline');
  assert.equal(version.status, 'Approved');
  assert.equal(version.activity_count, 2);
  assert.equal(version.critical_activity_count, 2);
  assert.equal(version.activity_snapshot.length, 2);
  assert.equal(version.activity_snapshot[0].activity_code, 'A1000');
});

test('Schedule Versioning - validateScheduleVersionInput enforces governance constraints', () => {
  assert.throws(
    () =>
      validateScheduleVersionInput({
        projectId: '',
        versionCode: 'BL-01',
        versionName: 'Baseline',
        versionType: 'Baseline',
        status: 'Approved',
        dataDate: '2026-05-01',
        owner: 'Planner',
        reason: 'Reason',
        activities: [{ id: '1', activity: 'Task 1' }],
      }),
    /Project ID is required/
  );

  assert.throws(
    () =>
      validateScheduleVersionInput({
        projectId: 'p1',
        versionCode: 'BL-01',
        versionName: 'Baseline',
        versionType: 'Baseline',
        status: 'Approved',
        dataDate: '2026-05-01',
        owner: 'Planner',
        reason: '',
        activities: [{ id: '1', activity: 'Task 1' }],
      }),
    /reason is required/
  );

  assert.throws(
    () =>
      validateScheduleVersionInput({
        projectId: 'p1',
        versionCode: 'BL-01',
        versionName: 'Baseline',
        versionType: 'Baseline',
        status: 'Draft',
        dataDate: '2026-05-01',
        owner: 'Planner',
        reason: 'Draft creation',
        activities: [],
      }),
    /requires at least one active schedule activity/
  );
});

test('Schedule Versioning - compareScheduleVersions accurately computes activity and metric deltas', () => {
  const v1Activities = [
    {
      id: 'act-1',
      activity_code: 'A1000',
      activity: 'Excavation',
      start_date: '2026-05-01',
      end_date: '2026-05-10',
      duration_days: 10,
      budget: 10000,
      critical_path: true,
    },
    {
      id: 'act-2',
      activity_code: 'A1010',
      activity: 'Steel Fixing',
      start_date: '2026-05-11',
      end_date: '2026-05-20',
      duration_days: 10,
      budget: 20000,
      critical_path: false,
    },
  ];

  const v2Activities = [
    {
      id: 'act-1',
      activity_code: 'A1000',
      activity: 'Excavation',
      start_date: '2026-05-01',
      end_date: '2026-05-15', // +5 days delay
      duration_days: 15,
      budget: 12000, // +2000 budget
      critical_path: true,
    },
    {
      id: 'act-3',
      activity_code: 'A1020',
      activity: 'Concrete Pouring (New Scope)',
      start_date: '2026-05-16',
      end_date: '2026-05-25',
      duration_days: 10,
      budget: 30000,
      critical_path: true,
    },
  ];

  const v1 = captureScheduleVersion({
    projectId: 'p1',
    versionCode: 'BL-01',
    versionName: 'Original Baseline',
    versionType: 'Baseline',
    status: 'Approved',
    dataDate: '2026-05-01',
    owner: 'Planner A',
    reason: 'Original Baseline',
    activities: v1Activities,
  });

  const v2 = captureScheduleVersion({
    projectId: 'p1',
    versionCode: 'FCST-01',
    versionName: 'May Forecast Update',
    versionType: 'Forecast',
    status: 'Approved',
    dataDate: '2026-05-15',
    owner: 'Planner B',
    reason: 'Site progress update and scope addition',
    activities: v2Activities,
  });

  const comparison = compareScheduleVersions(v1, v2);

  assert.equal(comparison.totalV1Activities, 2);
  assert.equal(comparison.totalV2Activities, 2);
  assert.equal(comparison.addedCount, 1); // A1020 added
  assert.equal(comparison.removedCount, 1); // A1010 removed
  assert.equal(comparison.changedCount, 1); // A1000 dates/duration/budget changed
  assert.equal(comparison.finishVarianceDays, 5); // 2026-05-20 vs 2026-05-25 (+5d)
  assert.equal(comparison.budgetVariance, 12000); // 30,000 + 12,000 - 30,000 = 12,000
});

test('SQLite Migration 50 - schedule_versions table and immutability triggers', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*50,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'Migration 50 must exist in src-tauri/src/lib.rs');

  const pythonScript = String.raw`
import json, sqlite3, sys

db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys = ON')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT)')
db.execute("INSERT INTO projects VALUES ('p1')")

db.executescript(sys.stdin.read())

# 1. Insert Draft Schedule Version
payload_draft = json.dumps({
    'version_code': 'BL-01',
    'version_name': 'Draft Baseline',
    'version_type': 'Baseline',
    'status': 'Draft',
    'owner': 'John Doe',
    'reason': 'Initial Draft'
})
db.execute(
    "INSERT INTO schedule_versions (id, created_at, updated_at, project_id, contract_id, payload) VALUES (?,?,?,?,?,?)",
    ('v1', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', 'p1', None, payload_draft)
)

assert db.execute("SELECT count(*) FROM schedule_versions").fetchone()[0] == 1

# 2. Update Draft Version to Approved
payload_approved = json.dumps({
    'version_code': 'BL-01',
    'version_name': 'Approved Contract Baseline',
    'version_type': 'Baseline',
    'status': 'Approved',
    'owner': 'John Doe',
    'reason': 'Approved by Client'
})
db.execute("UPDATE schedule_versions SET payload=? WHERE id=?", (payload_approved, 'v1'))

# 3. Attempt to update Approved Version (MUST FAIL via trigger)
try:
    payload_modified = json.dumps({
        'version_code': 'BL-01',
        'version_name': 'Tampered Approved Baseline',
        'version_type': 'Baseline',
        'status': 'Approved',
        'owner': 'Hacker',
        'reason': 'Unauthorized Edit'
    })
    db.execute("UPDATE schedule_versions SET payload=? WHERE id=?", (payload_modified, 'v1'))
    raise AssertionError("Approved schedule version update MUST be rejected by immutability trigger")
except (sqlite3.IntegrityError, sqlite3.OperationalError) as e:
    assert "Approved or Superseded schedule versions are immutable control points" in str(e)

# 4. Attempt to delete Approved Version (MUST FAIL via trigger)
try:
    db.execute("DELETE FROM schedule_versions WHERE id=?", ('v1',))
    raise AssertionError("Approved schedule version deletion MUST be rejected by immutability trigger")
except (sqlite3.IntegrityError, sqlite3.OperationalError) as e:
    assert "Approved or Superseded schedule versions cannot be deleted" in str(e)

print('ok')
`;

  const result = execFileSync(PYTHON_BIN, ['-c', pythonScript], {
    input: match[1],
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

  assert.equal(result, 'ok');
});
