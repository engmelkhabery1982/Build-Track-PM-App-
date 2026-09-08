# BuildTrack Agent Task Pointer

هذا الملف هو **المصدر الوحيد لاختيار المهمة**. التقارير والسجل والمحادثات لا تختار
المهمة. يملكه Codex وحده؛ الوكيل ممنوع من تعديله.

```text
STATE_SCHEMA=2
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=73fd3bdea4be2f4f4838d2e3e8b1a77671abae24
CLOUD_BASE_BRANCH=codex/accepted-w02
CURRENT_FEATURE=W03
CURRENT_TITLE=Claims and Potential Variation Order Governance
CURRENT_STATUS=IN_PROGRESS_NOT_ACCEPTED
PREREQUISITE=W02:CLOSED_8_OF_10_BY_CODEX
SPEC_ANCHOR=W03
SPEC_FILE=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
READ_PACK=RP-W03
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md
NEXT_FEATURE=W04
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src-tauri/src/claims_workflow.rs|src-tauri/src/lib.rs|src/data/claims.ts|src/components/ClaimAssessmentModal.tsx|src/types/index.ts|src/App.tsx|tests/claim-assessment-pvo.test.mjs|tests/tauri-command-registration.test.mjs|docs/agent-results/W03_RESULT.md|docs/agent-results/W03_EVIDENCE.json
CONDITIONAL_MODIFY=src/data/dataDictionary.ts|src/data/sqliteRepository.ts|src/hooks/useData.ts|src/data/variationPackage.ts|src/data/commercialWorkflow.ts|src/utils/delayImpact.ts|tests/phase1-commercial.test.mjs|tests/delay-impact-register.test.mjs
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json
REQUIRED_GAPS=W03-G01|W03-G02|W03-G03|W03-G04|W03-G05|W03-G06|W03-G07|W03-G08|W03-G09|W03-G10
REQUIRED_TESTS=npm test|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
```

قواعد حاسمة:

- ابدأ فقط بعد نجاح `tools/agent-preflight.ps1`.
- نفذ W03 وحدها ولا تبدأ W04.
- لا تعدل قائمة `CONDITIONAL_MODIFY` إلا عند إثبات dependency مباشر وتسجيل السبب.
- لا commit ولا Push قبل نجاح `tools/agent-delivery-gate.ps1`.
- لا تكتب `PASS` أو `CLOSED` أو تقييمًا ذاتيًا. النتيجة الوحيدة المسموحة:
  `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`.

