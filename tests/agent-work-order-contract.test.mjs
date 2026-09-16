import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('operational freeze replaces feature expansion with fifteen ordered reliability gates', () => {
  const plan = read('docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md');
  let previous = -1;
  for (let index = 0; index <= 14; index += 1) {
    const id = `ORF${String(index).padStart(2, '0')}`;
    const position = plan.indexOf(`### ${id} —`);
    assert.ok(position > previous, `${id} must exist after the preceding gate`);
    previous = position;
  }
  assert.match(plan, /تم تجميد W07–W90/);
  assert.match(plan, /UI → SQLite → KPI → Report/);
  assert.match(plan, /72\/73/);
  assert.match(plan, /database is locked/);
  assert.match(plan, /Scope ≥8، Schedule ≥8، Cost ≥8، Integrated Monitoring ≥8/);
});

test('V4 prompt is token-bounded, single-gate and forbids fabricated success', () => {
  const prompt = read('docs/agent-work-orders/UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR.md');
  assert.match(prompt, /BuildTrack-Agent-Cloud\/main/);
  assert.match(prompt, /CURRENT_EXECUTOR=CODEX_LOCAL_ONLY/);
  assert.match(prompt, /لا تبدأ التالية تلقائيًا/);
  assert.match(prompt, /لا تعود إلى W07–W90/);
  assert.match(prompt, /لا تستخدم mock أو sample أو fabricated ratio/);
  assert.match(prompt, /12 ملفًا و40k حرف/);
  assert.match(prompt, /READY FOR CODEX REVIEW/);
  assert.match(prompt, /PENDING_LOCAL_CARGO/);
});

test('ACTIVE selects ORF00, freezes new features and constrains destructive behavior', () => {
  const active = read('docs/agent-work-orders/ACTIVE.md');
  assert.match(active, /STATE_SCHEMA=4/);
  assert.match(active, /EXECUTION_MODE=OPERATIONAL_RELIABILITY_FREEZE/);
  assert.match(active, /NEW_FEATURE_DEVELOPMENT=FROZEN/);
  assert.match(active, /FROZEN_FEATURE_RANGE=W07-W90/);
  assert.match(active, /OPEN_FEATURE_RANGE=ORF00-ORF14/);
  assert.match(active, /CURRENT_FEATURE=ORF00/);
  assert.match(active, /CURRENT_EXECUTOR=CODEX_LOCAL_ONLY/);
  assert.match(active, /NEXT_FEATURE=ORF01/);
  assert.match(active, /DELETE_ALLOWLIST=\[\]/);
  assert.match(active, /OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR\.md/);
  assert.match(active, /UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR\.md/);
});

test('each ORF gate has a bounded read pack and one golden acceptance authority', () => {
  const packs = read('docs/agent-work-orders/OPERATIONAL_RELIABILITY_READ_PACKS_AR.md');
  const golden = read('docs/agent-work-orders/OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md');
  for (let index = 0; index <= 14; index += 1) {
    assert.match(packs, new RegExp(`## ORF${String(index).padStart(2, '0')} `));
  }
  assert.match(packs, /12 ملفًا و40,000 حرف/);
  assert.match(golden, /ثلاثة Data Dates/);
  assert.match(golden, /Quantity و0\/100 و50\/50 وWeighted Milestone/);
  assert.match(golden, /PO جزئي الاستلام، GRN، Supplier Invoice جزئي/);
  assert.match(golden, /فرق مسموح `<= 0\.01`/);
  assert.match(golden, /retry فوري دون SQLite lock/);
});

test('portable gates enforce the operational freeze feature family and protected integrity', () => {
  const preflight = read('tools/agent-preflight.mjs');
  const delivery = read('tools/agent-delivery-gate.mjs');
  assert.match(preflight, /OPERATIONAL_RELIABILITY_FREEZE/);
  assert.match(preflight, /verifyProtectedFiles\(root\)/);
  assert.match(preflight, /UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR\.md/);
  assert.match(delivery, /\^\(W\|ORF\)/);
  assert.match(delivery, /OPEN_FEATURE_RANGE ORF00-ORF14/);
  assert.match(delivery, /feature !== active\.CURRENT_FEATURE/);
  assert.match(delivery, /detectCommandSpoofing\(root\)/);
  assert.match(delivery, /cargo test/);
  assert.match(delivery, /READY FOR CODEX REVIEW/);
});

test('accepted attestation remains canonical and line-ending independent', () => {
  const active = read('docs/agent-work-orders/ACTIVE.md');
  const parsed = Object.fromEntries(active.split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
    .map((match) => [match[1], match[2].trim()]));
  const source = read(parsed.ACCEPTED_ATTESTATION_FILE).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const digest = (text) => createHash('sha256').update(text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), 'utf8').digest('hex').toUpperCase();
  assert.equal(digest(source), parsed.ACCEPTED_ATTESTATION_SHA256);
  assert.equal(digest(source.replace(/\n/g, '\r\n')), parsed.ACCEPTED_ATTESTATION_SHA256);
});
