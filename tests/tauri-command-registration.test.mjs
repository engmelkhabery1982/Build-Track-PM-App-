import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const libPath = new URL('../src-tauri/src/lib.rs', import.meta.url);

test('desktop commands used by the application are registered with Tauri', async () => {
  const source = await readFile(libPath, 'utf8');
  const handler = source.match(/\.invoke_handler\(tauri::generate_handler!\[([\s\S]*?)\]\)/)?.[1];

  assert.ok(handler, 'Tauri must declare an invoke_handler for desktop commands.');

  const requiredCommands = [
    'commit_governed_import',
    'reverse_governed_import',
    'reverse_supplier_ap_posting',
    'approve_supplier_invoice',
    'settle_supplier_invoice_payment',
    'approve_purchase_order',
    'accept_procurement_receipt',
    'cancel_purchase_order',
    'amend_purchase_order',
    'approve_cost_change',
    'approve_variation',
    'approve_payment_certificate',
    'create_payment_certificate_draft',
    'submit_payment_certificate',
    'approve_payment_certificate_governed',
    'record_partial_payment',
    'reverse_certificate_governed',
    'get_certificate_partial_payments',
    'settle_payment_certificate',
    'reverse_commercial_posting',
    'reverse_variation',
    'save_cash_forecast_version',
    'approve_cash_forecast_version',
    'reopen_cash_forecast_version',
    'get_cash_forecast_version',
    'list_cash_forecast_versions',
    'save_health_score_version',
    'approve_health_score_version',
    'reopen_health_score_version',
    'get_health_score_version',
    'list_health_score_versions',
    'approve_cost_plan_version',
    'approve_estimate_version',
    'approve_labor_timesheet',
    'post_labor_timesheet',
    'reverse_labor_timesheet',
    'submit_equipment_log',
    'approve_equipment_log',
    'post_equipment_log',
    'reverse_equipment_log',
    'save_claim_draft',
    'notify_claim',
    'start_claim_assessment',
    'submit_claim',
    'assess_claim',
    'approve_claim',
    'reject_claim',
    'reopen_claim',
    'convert_claim_to_variation',
    'reverse_claim_conversion',
    'issue_report_version',
    'approve_report_template',
    'save_excel_download',
    'save_document_attachment',
    'backup_local_database',
    'verify_local_backup',
    'stage_local_restore',
  ];

  for (const command of requiredCommands) {
    assert.match(handler, new RegExp(`\\b${command}\\b`), `${command} is not registered.`);
  }
});

test('SQLite migration versions are unique and strictly increase in declaration order', async () => {
  const source = await readFile(libPath, 'utf8');
  const migrations = source.match(/let migrations = vec!\[([\s\S]*?)\];/m)?.[1];

  assert.ok(migrations, 'BuildTrack must declare its SQLite migration list.');

  const versions = [...migrations.matchAll(/version:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.ok(versions.length > 0, 'At least one SQLite migration must be registered.');
  assert.equal(new Set(versions).size, versions.length, 'SQLite migration versions must be unique.');

  const sorted = [...versions].sort((left, right) => left - right);
  assert.deepEqual(versions, sorted, 'SQLite migrations must be declared in ascending version order.');
});

test('a staged restore is applied during desktop startup', async () => {
  const source = await readFile(libPath, 'utf8');

  assert.match(
    source,
    /\.setup\(\|app\|\s*\{[\s\S]*?apply_staged_restore\(app\.handle\(\)\)/,
    'BuildTrack must apply a verified staged restore before normal startup.',
  );
});
