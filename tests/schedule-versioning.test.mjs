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

  assert.throws(() => validateScheduleVersionInput({
    projectId: 'p1', contractId: 'c1', versionCode: 'CUR-01', versionName: 'Current', versionType: 'Current', status: 'Draft',
    dataDate: '2026-02-30', owner: 'Planner', reason: 'Review', activities: [{ id: 'a1', project_id: 'p1', contract_id: 'c1', activity: 'Task' }],
  }), /valid calendar date/);
  assert.throws(() => validateScheduleVersionInput({
    projectId: 'p1', contractId: 'c1', versionCode: 'CUR-01', versionName: 'Current', versionType: 'Current', status: 'Draft',
    dataDate: '2026-05-01', owner: 'Planner', reason: 'Review', activities: [{ id: 'a1', project_id: 'p2', contract_id: 'c1', activity: 'Task' }],
  }), /selected project and contract scope/);
});

test('Schedule Versioning - captured arrays are independent and live comparison uses governed Data Date', () => {
  const source = [{ id: 'a1', project_id: 'p1', activity_code: 'A1', activity: 'Task', predecessor_links: [{ predecessor_id: 'A0' }] }];
  const version = captureScheduleVersion({ projectId: 'p1', versionCode: 'CUR-01', versionName: 'Current', versionType: 'Current', status: 'Draft', dataDate: '2026-05-01', owner: 'Planner', reason: 'Review', activities: source });
  source[0].activity = 'Changed later';
  source[0].predecessor_links[0].predecessor_id = 'MUTATED';
  assert.equal(version.activity_snapshot[0].activity, 'Task');
  assert.equal(version.activity_snapshot[0].predecessor_links[0].predecessor_id, 'A0');
  const comparison = compareScheduleVersions(version, { activities: source, dataDate: '2026-05-20' });
  assert.equal(comparison.v2DataDate, '2026-05-20');
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

test('SQLite Migration 50 - schedule versions persist governed SQL fields and lifecycle', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*50,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'Migration 50 must exist in src-tauri/src/lib.rs');

  const pythonScript = String.raw`
import json, os, sqlite3, sys, tempfile

path = tempfile.mktemp(suffix='.db')
db = sqlite3.connect(path)
db.execute('PRAGMA foreign_keys = ON')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT)')
db.execute("INSERT INTO projects VALUES ('p1')")

db.executescript(sys.stdin.read())

required = {'version_code','version_name','version_type','status','revision_number','data_date','owner','reason','activity_snapshot','distribution_snapshot','activity_count','critical_activity_count','notes'}
assert required.issubset({row[1] for row in db.execute('PRAGMA table_info(schedule_versions)')})

def values(record_id='v1', code='BL-01', status='Draft', date='2026-05-01'):
    activity = [{'schedule_id':'a1','activity_code':'A1000','activity':'Excavation'}]
    payload = {'id':record_id,'project_id':'p1','contract_id':None,'version_code':code,'version_name':'Contract Baseline','version_type':'Baseline','status':status,'revision_number':1,'data_date':date,'owner':'Planner','reason':'Controlled review','activity_snapshot':activity,'distribution_snapshot':[],'activity_count':1,'critical_activity_count':0,'notes':''}
    return (record_id,'2026-05-01T00:00:00Z','2026-05-01T00:00:00Z','p1',None,code,'Contract Baseline','Baseline',status,1,date,'Planner','Controlled review',json.dumps(activity),'[]',1,0,'',json.dumps(payload))

sql = '''INSERT INTO schedule_versions (id,created_at,updated_at,project_id,contract_id,version_code,version_name,version_type,status,revision_number,data_date,owner,reason,activity_snapshot,distribution_snapshot,activity_count,critical_activity_count,notes,payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'''
db.execute(sql, values())
db.commit()
db.close()
db = sqlite3.connect(path)
db.execute('PRAGMA foreign_keys = ON')

assert db.execute("SELECT count(*) FROM schedule_versions").fetchone()[0] == 1
row = db.execute('SELECT version_code,status,data_date,activity_snapshot FROM schedule_versions WHERE id=?', ('v1',)).fetchone()
assert row[:3] == ('BL-01','Draft','2026-05-01') and json.loads(row[3])[0]['activity_code'] == 'A1000'

for bad in [values('bad-date','BAD-DATE','Draft','2026-02-30')]:
    try: db.execute(sql, bad); raise AssertionError('invalid date accepted')
    except sqlite3.IntegrityError: pass
try: db.execute(sql, values('duplicate')); raise AssertionError('duplicate revision accepted')
except sqlite3.IntegrityError: pass

payload = json.loads(db.execute('SELECT payload FROM schedule_versions WHERE id=?',('v1',)).fetchone()[0])
payload['status'] = 'Approved'
db.execute("UPDATE schedule_versions SET status='Approved', payload=? WHERE id=?", (json.dumps(payload), 'v1'))

try:
    db.execute("UPDATE schedule_versions SET owner='Tampered' WHERE id='v1'")
    raise AssertionError('approved content update accepted')
except (sqlite3.IntegrityError, sqlite3.OperationalError) as e:
    assert "Approved or Superseded schedule versions are immutable control points" in str(e)

payload['status'] = 'Superseded'
db.execute("UPDATE schedule_versions SET status='Superseded', payload=? WHERE id=?", (json.dumps(payload), 'v1'))
assert db.execute("SELECT status FROM schedule_versions WHERE id='v1'").fetchone()[0] == 'Superseded'
try:
    db.execute("DELETE FROM schedule_versions WHERE id='v1'")
    raise AssertionError('superseded version deletion accepted')
except (sqlite3.IntegrityError, sqlite3.OperationalError) as e:
    assert "Approved or Superseded schedule versions cannot be deleted" in str(e)

db.close(); os.remove(path)
print('ok')
`;

  const result = execFileSync(PYTHON_BIN, ['-c', pythonScript], {
    input: match[1],
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

  assert.equal(result, 'ok');
});

test('Schedule versions are connected to production UI, state and explicit SQLite mapping', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const hook = readFileSync(new URL('../src/hooks/useData.ts', import.meta.url), 'utf8');
  const repository = readFileSync(new URL('../src/data/sqliteRepository.ts', import.meta.url), 'utf8');
  assert.match(app, /<ScheduleVersionModal/);
  assert.match(app, /dataRepository\.insert<ScheduleVersion>\('schedule_versions'/);
  assert.match(app, /dataRepository\.update<ScheduleVersion>\('schedule_versions'.*status: 'Superseded'/s);
  assert.match(hook, /listOptional<ScheduleVersion>\('schedule_versions'\)/);
  assert.match(hook, /case 'schedule_versions': apply\(setScheduleVersions\)/);
  assert.match(repository, /tableName === "schedule_versions"/);
  assert.match(repository, /INSERT INTO schedule_versions \(/);
  assert.match(repository, /activity_snapshot = \$11/);
});
