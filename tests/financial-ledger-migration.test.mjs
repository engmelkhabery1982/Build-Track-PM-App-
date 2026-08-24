import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('financial-ledger migration executes and remains synchronized in SQLite', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*21,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 21 must exist');

  // Python's standard-library SQLite is used only as an isolated in-memory
  // engine. No application database or user data is opened by this test.
  const sqliteAcceptance = String.raw`
import json, sqlite3, sys

db = sqlite3.connect(':memory:')
for table in ('cost_entries', 'cash_flow', 'variations', 'payment_certificates'):
    db.execute(f'''CREATE TABLE {table} (
      id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT,
      payload TEXT NOT NULL, created_at TEXT NOT NULL
    )''')
db.executescript(sys.stdin.read())

created = '2026-08-24T12:00:00Z'
db.execute("INSERT INTO cost_entries VALUES (?, ?, ?, ?, ?, ?)", ('cost-1', 'p-1', 'c-1', 'b-1', json.dumps({'date':'2026-08-10','amount':125.5,'cost_type':'Material'}), created))
db.execute("INSERT INTO cash_flow VALUES (?, ?, ?, ?, ?, ?)", ('cash-1', 'p-1', 'c-1', None, json.dumps({'date':'2026-08-11','inflow':0,'outflow':20,'status':'Paid'}), created))
db.execute("INSERT INTO variations VALUES (?, ?, ?, ?, ?, ?)", ('var-1', 'p-1', 'c-1', 'b-1', json.dumps({'approved_date':'2026-08-12','cost_impact':250,'status':'Approved'}), created))
db.execute("INSERT INTO payment_certificates VALUES (?, ?, ?, ?, ?, ?)", ('cert-1', 'p-1', 'c-1', None, json.dumps({'certificate_date':'2026-08-13','certificate_type':'Client','gross_certified_value':500,'status':'Approved'}), created))

assert db.execute("SELECT amount, direction, ledger_type FROM financial_ledger WHERE source_id='cost-1'").fetchone() == (125.5, 'Outflow', 'Actual Cost')
assert db.execute("SELECT amount, direction FROM financial_ledger WHERE source_id='cash-1'").fetchone() == (20.0, 'Outflow')
assert db.execute("SELECT amount, direction FROM financial_ledger WHERE source_id='var-1'").fetchone() == (250.0, 'Increase')
assert db.execute("SELECT amount, direction FROM financial_ledger WHERE source_id='cert-1'").fetchone() == (500.0, 'Inflow')

db.execute("UPDATE variations SET payload=? WHERE id='var-1'", (json.dumps({'approved_date':'2026-08-14','cost_impact':-90,'status':'Approved'}),))
db.execute("UPDATE payment_certificates SET payload=? WHERE id='cert-1'", (json.dumps({'certificate_date':'2026-08-14','certificate_type':'Subcontractor','gross_certified_value':210,'status':'Approved'}),))
assert db.execute("SELECT amount, direction, transaction_date FROM financial_ledger WHERE source_id='var-1'").fetchone() == (90.0, 'Decrease', '2026-08-14')
assert db.execute("SELECT amount, direction FROM financial_ledger WHERE source_id='cert-1'").fetchone() == (210.0, 'Outflow')
db.execute("DELETE FROM cash_flow WHERE id='cash-1'")
assert db.execute("SELECT count(*) FROM financial_ledger WHERE source_id='cash-1'").fetchone()[0] == 0
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], {
    input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  assert.equal(result, 'ok');
});

test('commercial ledger migration allocates Cost Changes and commitments in SQLite', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*22,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 22 must exist');
  const sqliteAcceptance = String.raw`
import json, sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute('''CREATE TABLE financial_ledger (
  id TEXT PRIMARY KEY, source_table TEXT NOT NULL, source_id TEXT NOT NULL,
  project_id TEXT, contract_id TEXT, boq_item_id TEXT, transaction_date TEXT,
  ledger_type TEXT NOT NULL, direction TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0,
  status TEXT, created_at TEXT NOT NULL, UNIQUE(source_table, source_id)
)''')
for table in ('cost_changes', 'procurement'):
    db.execute(f'''CREATE TABLE {table} (
      id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT,
      payload TEXT NOT NULL, created_at TEXT NOT NULL
    )''')
db.executescript(sys.stdin.read())
created = '2026-08-24T12:00:00Z'
db.execute("INSERT INTO cost_changes (id, project_id, contract_id, boq_item_id, contract_sov_line_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", ('cc-1', 'p-1', 'c-1', 'b-1', 'sov-1', json.dumps({'effective_date':'2026-08-20','amount':-75,'status':'Approved'}), created))
db.execute("INSERT INTO procurement VALUES (?, ?, ?, ?, ?, ?)", ('po-1', 'p-1', 'c-1', 'b-1', json.dumps({'order_date':'2026-08-21','quantity':4,'unit_cost':30,'status':'Ordered'}), created))
assert db.execute("SELECT amount, direction, ledger_type FROM financial_ledger WHERE source_id='cc-1'").fetchone() == (75.0, 'Decrease', 'Cost Change')
assert db.execute("SELECT amount, direction, ledger_type FROM financial_ledger WHERE source_id='po-1'").fetchone() == (120.0, 'Commitment', 'Commitment')
db.execute("UPDATE procurement SET payload=? WHERE id='po-1'", (json.dumps({'order_date':'2026-08-22','total_cost':140,'status':'Ordered'}),))
assert db.execute("SELECT amount, transaction_date FROM financial_ledger WHERE source_id='po-1'").fetchone() == (140.0, '2026-08-22')
db.execute("DELETE FROM cost_changes WHERE id='cc-1'")
assert db.execute("SELECT count(*) FROM financial_ledger WHERE source_id='cc-1'").fetchone()[0] == 0
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], {
    input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  assert.equal(result, 'ok');
});
