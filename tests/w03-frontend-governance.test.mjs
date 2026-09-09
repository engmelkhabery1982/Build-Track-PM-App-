import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/components/ClaimAssessmentModal.tsx', import.meta.url), 'utf8');
const claims = readFileSync(new URL('../src/data/claims.ts', import.meta.url), 'utf8');

test('W03 frontend uses atomic draft and lifecycle commands without generic status fallbacks', () => {
  const claimSection = app.slice(app.indexOf('<ClaimAssessmentModal'), app.indexOf('</>', app.indexOf('<ClaimAssessmentModal')));
  assert.match(claimSection, /saveClaimDraft\(/);
  assert.match(claimSection, /notifyClaim\(/);
  assert.match(claimSection, /startClaimAssessment\(/);
  assert.match(claimSection, /submitClaim\(/);
  assert.match(claimSection, /assessmentNotes:/);
  assert.match(claimSection, /approvalNotes:/);
  assert.match(claimSection, /lines: lines\.map/);
  assert.doesNotMatch(claimSection, /dataRepository\.(?:insert|update)\(['"](?:claims|claim_lines|variations|variation_lines)/);
  assert.doesNotMatch(claimSection, /catch\s*\{/);
});

test('W03 modal loads persisted lines and does not manufacture sample claim content', () => {
  assert.match(modal, /setLines\(initialLines\.filter\(\(line\) => line\.claim_id === claim\.id\)\)/);
  assert.match(modal, /setLines\(\[\]\)/);
  assert.doesNotMatch(modal, /Direct cost & schedule impact|Primary cost & time impact breakdown|Unforeseen physical conditions|ITEM-01/);
  assert.match(modal, /Requires setup:/);
  assert.match(modal, /getClaimFieldPermissions\(currentStatus\)/);
  assert.match(modal, /disabled=\{!fieldPermissions\.canEditAssessment\}/);
  assert.match(modal, /disabled=\{!fieldPermissions\.canEditApproval\}/);
  assert.doesNotMatch(modal, /Number\(l\.approved_value\) > 0/);
  assert.match(modal, /Contract notice terms require setup before this claim can advance/);
  assert.match(modal, /scopedHeaderIds\.has\(item\.boq_header_id\)/);
});

test('W03 typed client targets the canonical backend request names', () => {
  for (const command of ['save_claim_draft', 'notify_claim', 'start_claim_assessment', 'submit_claim', 'assess_claim', 'approve_claim', 'reject_claim', 'reopen_claim', 'convert_claim_to_variation', 'reverse_claim_conversion']) {
    assert.match(claims, new RegExp(`['"]${command}['"]`));
  }
});
