import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runDataQualityChecks } from '../src/data/dataQuality.ts';

test('Control Account migration enforces one scoped main-contract account', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*44,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 44 must exist');
  const sqliteAcceptance = String.raw`
import json, sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys = ON')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT, parent_main_contract_id TEXT)')
db.execute('CREATE TABLE wbs_nodes (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT)')
db.execute('CREATE TABLE boq_headers (id TEXT PRIMARY KEY, contract_id TEXT)')
db.execute('CREATE TABLE boq_items (id TEXT PRIMARY KEY, project_id TEXT, boq_header_id TEXT)')
db.execute('CREATE TABLE cost_codes (id TEXT PRIMARY KEY, project_id TEXT)')
db.execute('CREATE TABLE contract_sov_lines (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT, payload TEXT NOT NULL)')
db.executescript(sys.stdin.read())
db.execute("INSERT INTO projects VALUES ('p1')")
db.executemany('INSERT INTO contracts VALUES (?,?,?)', [('main','p1',None),('sub','p1','main')])
db.execute("INSERT INTO wbs_nodes VALUES ('w1','p1','main')")
db.execute("INSERT INTO boq_headers VALUES ('h1','main')")
db.execute("INSERT INTO boq_items VALUES ('b1','p1','h1')")
db.execute("INSERT INTO cost_codes VALUES ('cc1','p1')")
db.execute("INSERT INTO contract_sov_lines VALUES ('s1','p1','main','b1',?)", (json.dumps({'control_account_code':'SOV-1','cost_code_id':'cc1'}),))
row = ('ca1','2026-09-01T00:00:00Z','p1','main','w1','b1','cc1','s1',json.dumps({'control_account_code':'CA-001'}))
db.execute('INSERT INTO control_accounts VALUES (?,?,?,?,?,?,?,?,?)', row)
assert db.execute('SELECT count(*) FROM control_accounts').fetchone()[0] == 1
try:
  db.execute('INSERT INTO control_accounts VALUES (?,?,?,?,?,?,?,?,?)', ('ca2','now','p1','main','w1','b1','cc1','s1',json.dumps({'control_account_code':'CA-002'})))
  raise AssertionError('duplicate scoped account must be rejected')
except sqlite3.IntegrityError: pass
try:
  db.execute('INSERT INTO control_accounts VALUES (?,?,?,?,?,?,?,?,?)', ('ca3','now','p1','sub','w1','b1','cc1','s1',json.dumps({'control_account_code':'CA-SUB'})))
  raise AssertionError('subcontract control account must be rejected')
except sqlite3.IntegrityError: pass
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], { input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  assert.equal(result, 'ok');
});

test('Control Account source assignment prevents cross-scope operational postings', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const model = rust.match(/version:\s*44,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  const sources = rust.match(/version:\s*45,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(model && sources, 'migrations 44 and 45 must exist');
  const sqliteAcceptance = String.raw`
import json, sqlite3, sys
m44, m45 = sys.stdin.read().split('\n--MIGRATION--\n', 1)
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys = ON')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT, parent_main_contract_id TEXT)')
db.execute('CREATE TABLE wbs_nodes (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT)')
db.execute('CREATE TABLE boq_headers (id TEXT PRIMARY KEY, contract_id TEXT)')
db.execute('CREATE TABLE boq_items (id TEXT PRIMARY KEY, project_id TEXT, boq_header_id TEXT, payload TEXT NOT NULL)')
db.execute('CREATE TABLE cost_codes (id TEXT PRIMARY KEY, project_id TEXT)')
db.execute('CREATE TABLE contract_sov_lines (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT, payload TEXT NOT NULL)')
for name in ('schedules','wir_entries','cost_entries','procurement','procurement_receipts'):
  db.execute(f'CREATE TABLE {name} (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, payload TEXT NOT NULL)')
db.executescript(m44)
db.executescript(m45)
db.execute("INSERT INTO projects VALUES ('p1')")
db.executemany('INSERT INTO contracts VALUES (?,?,?)', [('main','p1',None),('sub','p1','main')])
db.execute("INSERT INTO wbs_nodes VALUES ('w1','p1','main')")
db.executemany('INSERT INTO boq_headers VALUES (?,?)', [('hmain','main'),('hsub','sub')])
db.executemany('INSERT INTO boq_items VALUES (?,?,?,?)', [('bmain','p1','hmain','{}'),('bsub','p1','hsub',json.dumps({'main_boq_item_id':'bmain'}))])
db.execute("INSERT INTO cost_codes VALUES ('cc1','p1')")
db.execute("INSERT INTO contract_sov_lines VALUES ('s1','p1','main','bmain',?)", (json.dumps({'cost_code_id':'cc1'}),))
db.execute('INSERT INTO control_accounts VALUES (?,?,?,?,?,?,?,?,?)', ('ca1','now','p1','main','w1','bmain','cc1','s1',json.dumps({'control_account_code':'CA-1'})))
def source(table, identifier, contract='main', boq='bmain', payload=None):
  db.execute(f'INSERT INTO {table} (id,created_at,project_id,contract_id,boq_item_id,control_account_id,payload) VALUES (?,?,?,?,?,?,?)', (identifier,'now','p1',contract,boq,'ca1',json.dumps(payload or {})))
source('schedules','sch1',payload={'wbs_id':'w1'})
source('wir_entries','wir1','sub','bsub')
source('cost_entries','cost1',payload={'cost_code_id':'cc1'})
source('procurement','po1',payload={'cost_code_id':'cc1'})
source('procurement_receipts','grn1')
for table, payload in [('schedules',{'wbs_id':'wrong'}), ('cost_entries',{'cost_code_id':'wrong'}), ('procurement',{'cost_code_id':'wrong'})]:
  try:
    source(table, table + '-bad', payload=payload)
    raise AssertionError(f'{table} must reject a mismatched Control Account')
  except sqlite3.IntegrityError: pass
try:
  source('wir_entries','wir-bad','sub','bmain')
  raise AssertionError('subcontract source must use its mapped child BOQ item')
except sqlite3.IntegrityError: pass
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], {
    input: `${model[1]}\n--MIGRATION--\n${sources[1]}`,
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  assert.equal(result, 'ok');
});

test('Data Quality exposes unassigned and invalid Control Account facts', () => {
  const base = {
    projects: [{ id: 'p1' }], contracts: [{ id: 'main', project_id: 'p1', parent_main_contract_id: null }],
    boqHeaders: [{ id: 'h1', project_id: 'p1', contract_id: 'main' }], boqItems: [{ id: 'b1', project_id: 'p1', boq_header_id: 'h1' }],
    schedules: [], wirEntries: [], costEntries: [{ id: 'cost1', project_id: 'p1', contract_id: 'main', boq_item_id: 'b1', cost_code_id: 'cc1' }],
    reportingPeriods: [], baselines: [], wbsNodes: [{ id: 'w1', project_id: 'p1', contract_id: 'main', status: 'Active' }],
    procurement: [], procurementReceipts: [], controlAccounts: [{ id: 'ca1', project_id: 'p1', contract_id: 'main', wbs_id: 'w1', boq_item_id: 'b1', cost_code_id: 'cc1' }],
  };
  const unassigned = runDataQualityChecks(base);
  assert.ok(unassigned.some((finding) => finding.title === 'Operational facts are unassigned to a Control Account'));
  const invalid = runDataQualityChecks({ ...base, costEntries: [{ ...base.costEntries[0], control_account_id: 'missing' }] });
  assert.ok(invalid.some((finding) => finding.title === 'Operational fact is outside its Control Account scope'));
});
