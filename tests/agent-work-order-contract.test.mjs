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
  const prompt = read('docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md');
  assert.match(prompt, /NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR\.md/);
  assert.match(prompt, /CURRENT_FEATURE/);
  assert.match(prompt, /DELIVERY_BRANCH/);
  assert.match(prompt, /BuildTrack-Agent-Cloud\/main/);
  assert.match(prompt, /ممنوع الوصول إلى المستودع الرسمي/);
  assert.match(prompt, /agent-preflight\.mjs/);
  assert.match(prompt, /agent-delivery-gate\.mjs/);
  assert.match(prompt, /WORK_BRANCH_PATTERN/);
  assert.match(prompt, /MODIFY_ALLOWLIST/);
  assert.match(prompt, /أي delete\/rename/);
  assert.match(prompt, /لا تكتب CLOSED أو 8\/10/);
  assert.match(prompt, /VITE_SUPABASE_\*/);
  assert.match(prompt, /mounted UI → governed backend → SQLite/);
  assert.match(prompt, /FEATURE_BATCH_LIMIT=1/);
  assert.match(prompt, /CORRECTION_FILE/);
  assert.match(prompt, /EXECUTION_PLAN_FILE/);
  assert.match(prompt, /GAP-ID=PASS/);
  assert.match(prompt, /git diff --name-status/);
  assert.match(prompt, /نجاح TypeScript أو Build لا يعوض أي خطأ Rust\/SQLite/);
});

test('active and master work orders point to the current gate and detailed authority', () => {
  const active = read('docs/agent-work-orders/ACTIVE.md');
  const master = read('docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md');
  assert.match(active, /CURRENT_FEATURE=W04/);
  assert.match(active, /CURRENT_STATUS=IN_PROGRESS_NOT_ACCEPTED/);
  assert.match(active, /PREREQUISITE=W03:CLOSED_8_OF_10_BY_CODEX/);
  assert.match(active, /CLOUD_BASE_BRANCH=main/);
  assert.match(active, /DELIVERY_BRANCH=main/);
  assert.match(active, /FEATURE_BATCH_LIMIT=1/);
  assert.match(active, /STOP_AFTER_CURRENT_FEATURE=true/);
  assert.match(active, /AGENT_MUST_NOT_EDIT=true/);
  assert.match(active, /DELETE_ALLOWLIST=\[\]/);
  assert.match(active, /NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR\.md/);
  assert.match(master, /مرجع أرشيفي — ليس مصدر اختيار مهمة/);
  assert.match(master, /AGENT_START_HERE_AR\.md/);
  assert.match(master, /ممنوع اختيار `find\(\)` لأول version\/contract\/control account/);
});

test('machine agent gates enforce accepted ancestry, allowlists and executable evidence', () => {
  const preflight = read('tools/agent-preflight.ps1');
  const delivery = read('tools/agent-delivery-gate.ps1');
  const portablePreflight = read('tools/agent-preflight.mjs');
  const portableDelivery = read('tools/agent-delivery-gate.mjs');
  assert.match(preflight, /git status --porcelain=v1/);
  assert.match(preflight, /merge-base --is-ancestor/);
  assert.match(preflight, /CURRENT_FEATURE/);
  assert.match(preflight, /WORK_BRANCH_PATTERN/);
  assert.match(delivery, /outside MODIFY_ALLOWLIST/);
  assert.match(delivery, /delete\/rename forbidden/);
  assert.match(delivery, /npm test/);
  assert.match(delivery, /npm run build/);
  assert.match(delivery, /cargo test --manifest-path/);
  assert.match(delivery, /Get-FileHash/);
  assert.match(delivery, /EVIDENCE\.json/);
  assert.match(delivery, /missing required \$\{Feature\}_RESULT\.md/);
  assert.match(delivery, /READY FOR CODEX REVIEW/);
  assert.match(delivery, /REQUIRED_GAPS/);
  assert.match(delivery, /exact independent gate line/);
  assert.match(preflight, /CORRECTION_FILE/);
  assert.match(preflight, /EXECUTION_PLAN_FILE/);
  assert.match(delivery, /evidenceChanges/);
  assert.match(portablePreflight, /WORK_BRANCH_PATTERN/);
  assert.match(portablePreflight, /merge-base/);
  assert.match(portablePreflight, /REMOTE_MAIN_ATTESTATION/);
  assert.match(portablePreflight, /ACCEPTED_ATTESTATION_SHA256/);
  assert.match(portablePreflight, /origin\/\$\{active\.CLOUD_BASE_BRANCH\}/);
  assert.match(portableDelivery, /READY FOR CODEX REVIEW/);
  assert.match(portableDelivery, /REQUIRED_GAPS/);
  assert.match(portableDelivery, /execute\('npm', \['run', 'build'\]\)/);
  assert.match(portableDelivery, /execute\('cargo', \['test'/);
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
    assert.match(plan, new RegExp(`W03-G${String(index).padStart(2, '0')}`));
    assert.match(plan, new RegExp(`W04-G${String(index).padStart(2, '0')}`));
  }
  assert.match(plan, /مخطط `variations` و`variation_lines` الحالي يعتمد أعمدة النطاق و`payload`/);
  assert.match(plan, /لا مدة notice افتراضية 28 يومًا/);
  assert.match(plan, /لا يحتوي Payment Certificate\/Cash Forecast\/Report Designer/);
  assert.match(plan, /append-only payments/);
  assert.match(plan, /لا تخلط W05 Cash Forecast مع W04/);
  assert.match(plan, /UI → governed command\/repository → SQLite transaction/);
  assert.match(plan, /PARTIAL — 4\/10 — NOT ACCEPTED/);
});

test('every remaining feature has a token-bounded file read pack', () => {
  const readPacks = read('docs/agent-work-orders/FEATURE_READ_PACKS_AR.md');
  const specification = read('docs/agent-work-orders/NEXT_FEATURES_DETAILED_EXECUTION_AR.md');
  const prompt = read('docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md');
  const master = read('docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md');
  for (const feature of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'G1', 'G2', 'G3', 'H1']) {
    assert.match(readPacks, new RegExp(`## ${feature}(?: / W\\d+)?(?: / RP-W\\d+)? —`), `${feature} must have an explicit read pack`);
  }
  assert.match(readPacks, /الحد الأولي: 12 ملفًا و40,000 حرف/);
  assert.match(readPacks, /يحظر فتح `src\/App\.tsx` أو/);
  assert.match(readPacks, /package-lock\.json/);
  assert.match(readPacks, /CODEX_F1_F2_VERIFICATION_2026-09-07\.md` — قسم F1 فقط/);
  assert.match(readPacks, /CODEX_F1_F2_VERIFICATION_2026-09-07\.md` — قسم F2 فقط/);
  assert.match(readPacks, /src\/components\/LaborTimesheetModal\.tsx/);
  assert.match(readPacks, /src\/components\/EquipmentLogModal\.tsx/);
  assert.match(readPacks, /src-tauri\/src\/claims_workflow\.rs/);
  assert.match(readPacks, /src\/components\/ClaimAssessmentModal\.tsx/);
  assert.match(readPacks, /## F4 \/ W04 \/ RP-W04/);
  assert.match(readPacks, /W04_CODEX_REVIEW_AND_CORRECTION_AR\.md/);
  assert.match(readPacks, /W04_EXECUTION_CLOSURE_PLAN_AR\.md/);
  assert.match(readPacks, /tests\/tauri-command-registration\.test\.mjs/);
  assert.match(specification, /FEATURE_READ_PACKS_AR\.md/);
  assert.match(prompt, /FEATURE_READ_PACKS_AR\.md/);
  assert.match(master, /FEATURE_READ_PACKS_AR\.md/);
});
