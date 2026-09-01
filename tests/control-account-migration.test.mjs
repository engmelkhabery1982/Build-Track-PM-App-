import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
