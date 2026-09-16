# BuildTrack Agent Task Pointer

هذا الملف هو المصدر الوحيد لاختيار المهمة. Codex وحده يعدله. خطة W07–W90 مجمدة حتى
إغلاق `ORF14`; الوكيل لا يستنتج المهمة من المحادثة أو التقارير القديمة.

```text
STATE_SCHEMA=4
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=d77b8006fa1a5fba7a3abce07601c1e9cd9ebeb9
RELEASE_CANDIDATE_HEAD=befdd12c1df56e9e78ded4105fec16a9b4f77127
ACCEPTED_LINEAGE_MODE=ANCESTOR_OR_REMOTE_MAIN_ATTESTATION
ACCEPTED_ATTESTATION_FILE=docs/agent-results/CODEX_W05_ACCEPTANCE_2026-09-13.md
ACCEPTED_ATTESTATION_SHA256=17B2E5DFA5CD5EF0ECF6249882EB5788E56D62E23341CE4D42519A4F87A0793E
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
CURRENT_FEATURE=ORF00
CURRENT_TITLE=Release Truth and Version Unification
CURRENT_STATUS=READY_FOR_CODEX_LOCAL_EXECUTION
CURRENT_EXECUTOR=CODEX_LOCAL_ONLY
CODEX_REVIEW_STATUS=STABILIZATION_AUTHORITY_ACTIVATED
FEATURE_BATCH_LIMIT=1
STOP_AFTER_CURRENT_FEATURE=true
NEXT_FEATURE_REQUIRES_USER_COMMAND=true
NEXT_FEATURE_REQUIRES_CODEX_ACCEPTANCE=true
PARALLEL_CANDIDATE_FEATURES=DISABLED
OUT_OF_SCOPE_COMMITS=FORBIDDEN
SPEC_ANCHOR=ORF00
SPEC_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md
EXECUTION_PLAN_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md
READ_PACK_FILE=docs/agent-work-orders/OPERATIONAL_RELIABILITY_READ_PACKS_AR.md
READ_PACK=ORF00
GOLDEN_SCENARIO=docs/agent-work-orders/OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md
PROJECT_MODEL=docs/agent-work-orders/COMPACT_PROJECT_MODEL_AR.md
QUEUE_CURSOR=docs/agent-results/AGENT_QUEUE_CURSOR.md
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR.md
NEXT_FEATURE=ORF01
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src-tauri/src/commercial_workflow.rs|src-tauri/src/cost_plan_versioning.rs|src-tauri/src/estimate_versioning.rs|src-tauri/src/import_batch.rs|src-tauri/src/lib.rs|src-tauri/src/report_versioning.rs|src-tauri/src/supplier_ap.rs|tests/tauri-command-registration.test.mjs|docs/agent-results/ORF00_RESULT.md|docs/agent-results/ORF00_EVIDENCE.json
CONDITIONAL_MODIFY=tests/agent-work-order-contract.test.mjs|tests/agent-protected-integrity.test.mjs
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json|tools/agent-preflight.mjs|tools/agent-delivery-gate.mjs|tools/protected-file-integrity.mjs|tools/update-protected-file-manifest.mjs|tools/agent-protected-files.json|tools/agent-governance-public-key.pem
REQUIRED_GAPS=ORF00-G01|ORF00-G02|ORF00-G03|ORF00-G04|ORF00-G05|ORF00-G06|ORF00-G07|ORF00-G08|ORF00-G09|ORF00-G10
REQUIRED_TESTS=node tools/agent-preflight.mjs|npm test|npm run lint|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
KNOWN_FAILED_DELIVERY=RUST_CLAIM_REVERSAL_DATABASE_LOCK|LOCAL_CLOUD_VERSION_DIVERGENCE|NO_TRUE_E2E_ACCEPTANCE
```

## ORF00 gate meanings

- `ORF00-G01`: inventory records local/cloud heads, statuses and hashes.
- `ORF00-G02`: seven local Rust candidates preserved before integration.
- `ORF00-G03`: every hunk classified Keep/Upstream/Conflict/Reject.
- `ORF00-G04`: one clean release branch created from governed cloud base.
- `ORF00-G05`: kept hunks ported atomically; no whole-file overwrite.
- `ORF00-G06`: migrations/wrappers/invoke registrations reconcile.
- `ORF00-G07`: no user DB or secrets touched.
- `ORF00-G08`: Node/Lint/Build/Cargo/Diff evidence generated honestly.
- `ORF00-G09`: before/after recovery checkpoints and manifests exist.
- `ORF00-G10`: clean status and single candidate HEAD ready for ORF01.

القواعد:

- لا ينفذ وكيل cloud `ORF00`; هي `CODEX_LOCAL_ONLY` بسبب وجود العمل غير الملتزم محليًا.
- بعد إغلاقها يحدث Codex هذا الملف إلى ORF01؛ لا يبدأ الوكيل ORF01 من تلقاء نفسه.
- ممنوع تعديل ملفات السلطة أو توسيع allowlist أو إعادة فتح W07–W90.
- لا توجد نتيجة `CLOSED` أو 8/10 من الوكيل؛ Codex وحده يقبل البوابة.
