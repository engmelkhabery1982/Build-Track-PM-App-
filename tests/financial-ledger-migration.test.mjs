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

test('schedule scope repair derives missing project IDs from the selected contract', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*23,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 23 must exist');
  const sqliteAcceptance = String.raw`
import json, sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT)')
db.execute('CREATE TABLE schedules (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL)')
db.execute("INSERT INTO contracts VALUES ('contract-1', 'project-1')")
db.execute("INSERT INTO schedules VALUES ('schedule-1', NULL, 'contract-1', ?)", (json.dumps({'activity_code':'EC1000','project_id':None}),))
db.executescript(sys.stdin.read())
project_id, payload = db.execute("SELECT project_id, payload FROM schedules WHERE id='schedule-1'").fetchone()
assert project_id == 'project-1'
assert json.loads(payload)['project_id'] == 'project-1'
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], { input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  assert.equal(result, 'ok');
});

test('procurement receipt migration creates a controlled actual-cost source table', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*25,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 25 must exist');
  const sqliteAcceptance = String.raw`
import sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE boq_items (id TEXT PRIMARY KEY)')
db.executescript(sys.stdin.read())
db.execute("INSERT INTO procurement_receipts VALUES ('r-1','2026-08-25','p-1','c-1',NULL,'b-1',NULL,NULL,?)", ('{"receipt_number":"GRN-001","procurement_id":"po-1","status":"Accepted"}',))
try:
    db.execute("INSERT INTO procurement_receipts VALUES ('r-2','2026-08-25','p-1','c-1',NULL,'b-1',NULL,NULL,?)", ('{"receipt_number":"grn-001","procurement_id":"po-1","status":"Accepted"}',))
    raise AssertionError('receipt number must be unique')
except sqlite3.IntegrityError:
    pass
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], { input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  assert.equal(result, 'ok');
});

test('supplier AP migration protects vendor invoice and payment references', () => {
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const match = rust.match(/version:\s*26,[\s\S]*?sql:\s*r#"([\s\S]*?)"#,\s*kind:/);
  assert.ok(match, 'migration 26 must exist');
  const sqliteAcceptance = String.raw`
import sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE contracts (id TEXT PRIMARY KEY)')
db.execute('CREATE TABLE boq_items (id TEXT PRIMARY KEY)')
db.executescript(sys.stdin.read())
db.execute("INSERT INTO supplier_invoices VALUES ('si1','2026-08-25','p1','c1',NULL,NULL,NULL,NULL,?)", ('{"supplier_party_id":"sup1","invoice_number":"SI-77"}',))
try:
  db.execute("INSERT INTO supplier_invoices VALUES ('si2','2026-08-25','p1','c1',NULL,NULL,NULL,NULL,?)", ('{"supplier_party_id":"sup1","invoice_number":"si-77"}',))
  raise AssertionError('supplier invoice must be unique per supplier')
except sqlite3.IntegrityError: pass
db.execute("INSERT INTO supplier_invoice_payments VALUES ('pay1','2026-08-25','p1','c1',NULL,NULL,NULL,NULL,?)", ('{"payment_number":"PAY-77"}',))
try:
  db.execute("INSERT INTO supplier_invoice_payments VALUES ('pay2','2026-08-25','p1','c1',NULL,NULL,NULL,NULL,?)", ('{"payment_number":"pay-77"}',))
  raise AssertionError('payment number must be unique')
except sqlite3.IntegrityError: pass
print('ok')
`;
  const result = execFileSync('python', ['-c', sqliteAcceptance], { input: match[1], encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  assert.equal(result, 'ok');
});
