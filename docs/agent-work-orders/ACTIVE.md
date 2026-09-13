# BuildTrack Agent Task Pointer

هذا الملف هو **المصدر الوحيد لاختيار المهمة**. التقارير والسجل والمحادثات لا تختار
المهمة. يملكه Codex وحده؛ الوكيل ممنوع من تعديله.

```text
STATE_SCHEMA=3
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=d77b8006fa1a5fba7a3abce07601c1e9cd9ebeb9
ACCEPTED_LINEAGE_MODE=ANCESTOR_OR_REMOTE_MAIN_ATTESTATION
ACCEPTED_ATTESTATION_FILE=docs/agent-results/CODEX_W05_ACCEPTANCE_2026-09-13.md
ACCEPTED_ATTESTATION_SHA256=17B2E5DFA5CD5EF0ECF6249882EB5788E56D62E23341CE4D42519A4F87A0793E
CLOUD_BASE_BRANCH=main
DELIVERY_BRANCH=CURRENT_BOUND_BRANCH
HANDOFF_MARKER=[handoff]
HANDOFF_WORKFLOW=.github/workflows/arena-handoff.yml
WORK_BRANCH_PATTERN=^(main|arena/[A-Za-z0-9._-]+)$
PREFLIGHT_COMMAND=node tools/agent-preflight.mjs
DELIVERY_GATE_COMMAND=node tools/agent-delivery-gate.mjs --start-head <START_HEAD> --feature <Wxx> --allow-missing-cargo
CLOUD_CAPABILITY_MODE=IMPLEMENT_AND_HANDOFF_IF_RUST_UNAVAILABLE
DEPENDENCY_BOOTSTRAP=npm ci --ignore-scripts
CURRENT_FEATURE=W06
EXECUTION_MODE=OPEN_SEQUENTIAL_CANDIDATE_QUEUE
OPEN_FEATURE_RANGE=W04-W90
FEATURE_CARD_SYSTEM=docs/agent-work-orders/OPEN_90_FEATURE_EXECUTION_SYSTEM_AR.md
PROJECT_MODEL=docs/agent-work-orders/COMPACT_PROJECT_MODEL_AR.md
QUEUE_CURSOR=docs/agent-results/AGENT_QUEUE_CURSOR.md
CURRENT_TITLE=Governed Project Health Score
CURRENT_STATUS=CORRECTION_REQUIRED_WAITING_FOR_USER_COMMAND
CODEX_REVIEW_STATUS=W05_ACCEPTED_W06_CORRECTION_REQUIRED
FEATURE_BATCH_LIMIT=1
STOP_AFTER_CURRENT_FEATURE=true
ALL_CANDIDATE_FEATURES_OPEN=W04-W90
NEXT_FEATURE_REQUIRES_USER_COMMAND=true
NEXT_FEATURE_REQUIRES_CODEX_ACCEPTANCE=false
PARALLEL_CANDIDATE_FEATURES=DISABLED
PARALLEL_CANDIDATE_MODE=SINGLE_SESSION_SEQUENTIAL
PARALLEL_INTEGRATION_GATE=EACH_FEATURE_MUST_PASS_ITS_DELIVERY_GATE
OUT_OF_SCOPE_COMMITS=FORBIDDEN
PREREQUISITE=W05:CLOSED_8_OF_10_BY_CODEX
SPEC_ANCHOR=W06
SPEC_FILE=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
CORRECTION_FILE=docs/agent-results/CODEX_W06_REVIEW_2026-09-13.md
EXECUTION_PLAN_FILE=docs/agent-work-orders/W06_GOVERNED_PROJECT_HEALTH_CLOSURE_PLAN_AR.md
READ_PACK=F6
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V3_AR.md
NEXT_FEATURE=W07
NEXT_FEATURE_PLAN=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
FOLLOWING_FEATURE=W08
FOLLOWING_FEATURE_PLAN=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src/utils/governedHealthScore.ts|src/utils/earlyWarningSystem.ts|src/utils/projectControlAnalytics.ts|src/components/GovernedHealthScoreCard.tsx|src/components/IntegratedProjectControlsCockpit.tsx|src/data/healthScoreWorkflow.ts|src/types/index.ts|src/data/dataDictionary.ts|src/data/sqliteRepository.ts|src/hooks/useData.ts|src-tauri/src/health_score_workflow.rs|src-tauri/src/lib.rs|src/App.tsx|tests/governed-health-score.test.mjs|tests/early-warning-system.test.mjs|tests/agent-cloud-integration-gates.test.mjs|tests/tauri-command-registration.test.mjs|docs/agent-results/W06_RESULT.md|docs/agent-results/W06_EVIDENCE.json|docs/agent-results/AGENT_QUEUE_CURSOR.md
CONDITIONAL_MODIFY=src/components/Dashboard.tsx|src/components/ReportPack.tsx|src/components/PreferencesPanel.tsx
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json
REQUIRED_GAPS=W06-G01|W06-G02|W06-G03|W06-G04|W06-G05|W06-G06|W06-G07|W06-G08|W06-G09|W06-G10|W06-C01|W06-C02|W06-C03|W06-C04|W06-C05|W06-C06|W06-C07|W06-C08
REQUIRED_TESTS=npm test|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
KNOWN_FAILED_DELIVERY=[]
```

قواعد حاسمة:

- ابدأ فقط بعد نجاح `node tools/agent-preflight.mjs`.
- ابدأ من أحدث `agent-cloud/main` ومن `AGENT_QUEUE_CURSOR.next_feature`. W05 معتمدة 8/10.
- W06 مفتوحة للتصحيح، لكن لا تبدأ إلا عندما يرسل المستخدم أمر التنفيذ. لا تنتظر قبول Codex.
- لا تعدل W05 أو ملفات السلطة؛ أغلق W06-C01..C08 فقط وفق F6 وخطتها وتقرير التصحيح.
- لا تعدل قائمة `CONDITIONAL_MODIFY` إلا عند إثبات dependency مباشر وتسجيل السبب.
- لا commit ولا Push قبل نجاح `node tools/agent-delivery-gate.mjs` للميزة الحالية.
- لا تكتب `PASS` أو `CLOSED` أو تقييمًا ذاتيًا. النتيجة الوحيدة المسموحة:
  `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`.
- التنفيذ متتابع بأمر المستخدم: ميزة واحدة واختباراتها وتسليمها ثم توقف. أمر المستخدم التالي
  يفتح الميزة الرقمية التالية دون انتظار موافقة Codex؛ قرار `CLOSED — 8/10` يبقى لـCodex.

