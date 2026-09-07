import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cloud continuation specification retains every ordered F1-H1 feature gate', () => {
  const specification = read('docs/agent-work-orders/NEXT_FEATURES_DETAILED_EXECUTION_AR.md');
  const ordered = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'G1', 'G2', 'G3', 'H1'];
  let previous = -1;
  for (const feature of ordered) {
    const position = specification.indexOf(`## ${feature} —`);
    assert.ok(position > previous, `${feature} must exist after the preceding feature`);
    previous = position;
  }
  assert.match(specification, /DELETE_ALLOWLIST: \[\]/);
  assert.match(specification, /READY FOR CODEX REVIEW/);
  assert.match(specification, /WIP\/BLOCKED/);
  assert.match(specification, /لا `CLOSED` ولا تقييم 8\/10 ذاتي/);
});

test('universal agent prompt enforces governed sources, atomic transitions and honest test evidence', () => {
  const prompt = read('docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md');
  assert.match(prompt, /NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR\.md/);
  assert.match(prompt, /W01-G01\.\.W01-G10/);
  assert.match(prompt, /W02-G01\.\.W02-G10/);
  assert.match(prompt, /PARTIAL — 4\/10 — NOT ACCEPTED/);
  assert.match(prompt, /لا تختلق `EV\/PV\/ETC\/FAC\/progress`/);
  assert.match(prompt, /backend ذريًا يشمل validation \+ transition \+ postings \+ audit \+ rollback/);
  assert.match(prompt, /PASS\/FAIL\/NOT RUN/);
  assert.match(prompt, /IN PROGRESS — provisional cloud execution/);
  assert.match(prompt, /لا تمنح نفسك `CLOSED 8\/10`/);
  assert.match(prompt, /MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR\.md` كاملًا/);
  assert.match(prompt, /PROJECT_CHARTER_AR\.md` كاملًا/);
  assert.match(prompt, /إيصال قراءة/);
  assert.match(prompt, /RECOVER:/);
  assert.match(prompt, /DEFINE:/);
  assert.match(prompt, /BASELINE:/);
  assert.match(prompt, /IMPLEMENT:/);
  assert.match(prompt, /VERIFY:/);
  assert.match(prompt, /INSPECT:/);
  assert.match(prompt, /HANDOVER:/);
  assert.match(prompt, /ADVANCE:/);
});

test('active and master work orders point to the current gate and detailed authority', () => {
  const active = read('docs/agent-work-orders/ACTIVE.md');
  const master = read('docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md');
  assert.match(active, /## W02 \/ D1-02 — /);
  assert.match(active, /IN PROGRESS — Codex acceptance and hardening/);
  assert.match(active, /W01: `CLOSED — 8\/10 — CODEX ACCEPTED`/);
  assert.match(active, /NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR\.md/);
  assert.match(master, /NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR\.md/);
  assert.match(master, /NEXT_FEATURES_DETAILED_EXECUTION_AR\.md/);
  assert.match(master, /F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → G1 → G2 → G3 → H1/);
  assert.match(master, /ممنوع اختيار `find\(\)` لأول version\/contract\/control account/);
});

test('next-week execution plan contains exactly 90 ordered atomic increments and seven daily gates', () => {
  const plan = read('docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md');
  for (let index = 1; index <= 90; index += 1) {
    const id = `W${String(index).padStart(2, '0')}`;
    assert.ok(plan.includes(`\`${id}`), `${id} must be present`);
  }
  assert.equal((plan.match(/## اليوم /g) || []).length, 7);
  assert.match(plan, /DELETE_ALLOWLIST: \[\]/);
  assert.match(plan, /Codex وحده يضع `CLOSED — 8\/10`/);
  for (let index = 1; index <= 10; index += 1) {
    assert.match(plan, new RegExp(`W01-G${String(index).padStart(2, '0')}`));
    assert.match(plan, new RegExp(`W02-G${String(index).padStart(2, '0')}`));
  }
  assert.match(plan, /UI → governed command\/repository → SQLite transaction/);
  assert.match(plan, /PARTIAL — 4\/10 — NOT ACCEPTED/);
});

test('every remaining feature has a token-bounded file read pack', () => {
  const readPacks = read('docs/agent-work-orders/FEATURE_READ_PACKS_AR.md');
  const specification = read('docs/agent-work-orders/NEXT_FEATURES_DETAILED_EXECUTION_AR.md');
  const prompt = read('docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md');
  const master = read('docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md');
  for (const feature of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'G1', 'G2', 'G3', 'H1']) {
    assert.match(readPacks, new RegExp(`## ${feature}(?: / W\\d+)? —`), `${feature} must have an explicit read pack`);
  }
  assert.match(readPacks, /الحد الأولي: 12 ملفًا و40,000 حرف/);
  assert.match(readPacks, /يحظر فتح `src\/App\.tsx` أو/);
  assert.match(readPacks, /package-lock\.json/);
  assert.match(readPacks, /CODEX_F1_F2_VERIFICATION_2026-09-07\.md` — قسم F1 فقط/);
  assert.match(readPacks, /CODEX_F1_F2_VERIFICATION_2026-09-07\.md` — قسم F2 فقط/);
  assert.match(readPacks, /src\/components\/LaborTimesheetModal\.tsx/);
  assert.match(readPacks, /src\/components\/EquipmentLogModal\.tsx/);
  assert.match(specification, /FEATURE_READ_PACKS_AR\.md/);
  assert.match(prompt, /FEATURE_READ_PACKS_AR\.md/);
  assert.match(master, /FEATURE_READ_PACKS_AR\.md/);
});
