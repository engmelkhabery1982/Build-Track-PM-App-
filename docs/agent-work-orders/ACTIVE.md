# BuildTrack Agent Task Pointer

هذا الملف هو المصدر الوحيد لاختيار المهمة. Codex وحده يعدله. خطة W07–W90 مجمدة حتى
إغلاق `ORF14`; الوكيل لا يستنتج المهمة من المحادثة أو التقارير القديمة.

```text
STATE_SCHEMA=4
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=47e02cdc2c4141eb6e2410d0e915f106d63b43ee
RELEASE_CANDIDATE_HEAD=47e02cdc2c4141eb6e2410d0e915f106d63b43ee
ACCEPTED_LINEAGE_MODE=ANCESTOR_OR_REMOTE_MAIN_ATTESTATION
ACCEPTED_ATTESTATION_FILE=docs/agent-results/ORF00_RESULT.md
ACCEPTED_ATTESTATION_SHA256=75D403F190670B6D7FC941BDB96F8973EFFAC30F614FBBBB18BAE94530C693E3
CLOUD_BASE_BRANCH=main
DELIVERY_BRANCH=CURRENT_BOUND_BRANCH
HANDOFF_MARKER=[handoff]
HANDOFF_WORKFLOW=.github/workflows/arena-handoff.yml
WORK_BRANCH_PATTERN=^(main|arena/[A-Za-z0-9._-]+|codex/[A-Za-z0-9._-]+)$
PREFLIGHT_COMMAND=node tools/agent-preflight.mjs
DELIVERY_GATE_COMMAND=node tools/agent-delivery-gate.mjs --start-head <START_HEAD> --feature <ORFxx> --allow-missing-cargo
CLOUD_CAPABILITY_MODE=IMPLEMENT_AND_HANDOFF_IF_RUST_UNAVAILABLE
DEPENDENCY_BOOTSTRAP=npm ci --ignore-scripts
EXECUTION_MODE=OPERATIONAL_RELIABILITY_FREEZE
NEW_FEATURE_DEVELOPMENT=FROZEN
FROZEN_FEATURE_RANGE=W07-W90
OPEN_FEATURE_RANGE=ORF00-ORF14
CURRENT_FEATURE=ORF01
CURRENT_TITLE=SQLite Transaction and Lock Reliability
CURRENT_STATUS=WAITING_FOR_USER_COMMAND
CURRENT_EXECUTOR=CODEX_LOCAL_ONLY
CODEX_REVIEW_STATUS=ORF00_CLOSED_8_OF_10_GLOBAL_CARGO_RED
FEATURE_BATCH_LIMIT=1
STOP_AFTER_CURRENT_FEATURE=true
NEXT_FEATURE_REQUIRES_USER_COMMAND=true
NEXT_FEATURE_REQUIRES_CODEX_ACCEPTANCE=true
PARALLEL_CANDIDATE_FEATURES=DISABLED
OUT_OF_SCOPE_COMMITS=FORBIDDEN
SPEC_ANCHOR=ORF01
SPEC_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md
EXECUTION_PLAN_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md
READ_PACK_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_READ_PACKS_AR.md
READ_PACK=ORF01
GOLDEN_SCENARIO=docs/agent-work-orders/OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md
PROJECT_MODEL=docs/agent-work-orders/COMPACT_PROJECT_MODEL_AR.md
QUEUE_CURSOR=docs/agent-results/AGENT_QUEUE_CURSOR.md
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR.md
NEXT_FEATURE=ORF02
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src-tauri/src/claims_workflow.rs|src-tauri/src/commercial_workflow.rs|src-tauri/src/supplier_ap.rs|src-tauri/src/certificate_workflow.rs|src-tauri/src/cash_forecast_workflow.rs|src-tauri/src/cost_plan_versioning.rs|src-tauri/src/import_batch.rs|src-tauri/src/report_versioning.rs|src-tauri/src/health_score_workflow.rs|docs/agent-results/ORF01_RESULT.md|docs/agent-results/ORF01_EVIDENCE.json
CONDITIONAL_MODIFY=[]
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json|tools/agent-preflight.mjs|tools/agent-delivery-gate.mjs|tools/protected-file-integrity.mjs|tools/update-protected-file-manifest.mjs|tools/agent-protected-files.json|tools/agent-governance-public-key.pem
REQUIRED_GAPS=ORF01-G01|ORF01-G02|ORF01-G03|ORF01-G04|ORF01-G05|ORF01-G06|ORF01-G07|ORF01-G08|ORF01-G09|ORF01-G10
REQUIRED_TESTS=node tools/agent-preflight.mjs|npm test|npm run lint|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
KNOWN_FAILED_DELIVERY=RUST_CLAIM_REVERSAL_DATABASE_LOCK|NO_TRUE_E2E_ACCEPTANCE
```

## ORF01 gate meanings

- `ORF01-G01`: the locked-period claims reversal failure is reproduced from the accepted head.
- `ORF01-G02`: every transaction early-return path is inventoried in the bounded Rust read pack.
- `ORF01-G03`: failed claims mutations explicitly roll back before returning.
- `ORF01-G04`: an immediate retry after rejection succeeds without `database is locked`.
- `ORF01-G05`: late-audit failures leave no posting, status, guard or audit residue.
- `ORF01-G06`: idempotent replay returns the original governed result without duplication.
- `ORF01-G07`: locked-period rejection preserves original source and variation history.
- `ORF01-G08`: parallel readers and sequential writers complete under the canonical pool policy.
- `ORF01-G09`: the full Rust suite passes isolated and three consecutive complete runs.
- `ORF01-G10`: Node/Lint/Build/Cargo/Diff evidence is green and the tree is clean.

القواعد:

- تم إغلاق `ORF00` في `47e02cdc2c4141eb6e2410d0e915f106d63b43ee` مع بقاء بوابة Cargo العامة حمراء بسبب عطل ORF01 المثبت.
- لا يبدأ Codex أو وكيل cloud `ORF01` قبل أمر مستخدم جديد؛ عند البدء تكون مراجعة Cargo المحلية إلزامية.
- ممنوع تعديل ملفات السلطة أو توسيع allowlist أو إعادة فتح W07–W90.
- لا توجد نتيجة `CLOSED` أو 8/10 من الوكيل؛ Codex وحده يقبل البوابة.
