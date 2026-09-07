# BuildTrack Agent Task Pointer

هذا الملف هو **المصدر الوحيد لاختيار المهمة**. التقارير والسجل والمحادثات لا تختار
المهمة. يملكه Codex وحده؛ الوكيل ممنوع من تعديله.

```text
STATE_SCHEMA=2
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=8a0c4bd1ec3351e6b7d50e7de8670e6b2b6d28a2
CLOUD_BASE_BRANCH=codex/accepted-w01
CURRENT_FEATURE=W02
CURRENT_TITLE=Equipment Meter Hours and Fuel Posting
CURRENT_STATUS=IN_PROGRESS_NOT_ACCEPTED
PREREQUISITE=W01:CLOSED_8_OF_10_BY_CODEX
SPEC_ANCHOR=W02
SPEC_FILE=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
READ_PACK=RP-W02
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md
NEXT_FEATURE=W03
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src-tauri/src/equipment_log.rs|src-tauri/src/lib.rs|src/data/equipmentLog.ts|src/components/EquipmentLogModal.tsx|src/types/index.ts|src/App.tsx|tests/equipment-log.test.mjs|tests/financial-ledger-migration.test.mjs|tests/tauri-command-registration.test.mjs|docs/agent-results/W02_RESULT.md|docs/agent-results/W02_EVIDENCE.json
CONDITIONAL_MODIFY=src/data/dataDictionary.ts|src/data/sqliteRepository.ts|src/hooks/useData.ts|src/utils/resourceLoading.ts|src/utils/controlAccountSummary.ts|src/utils/schedulePlanning.ts|tests/control-account-migration.test.mjs
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json
REQUIRED_GAPS=W02-G01|W02-G02|W02-G03|W02-G04|W02-G05|W02-G06|W02-G07|W02-G08|W02-G09|W02-G10
REQUIRED_TESTS=npm test|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
```

قواعد حاسمة:

- ابدأ فقط بعد نجاح `tools/agent-preflight.ps1`.
- نفذ W02 وحدها ولا تبدأ W03.
- لا تعدل قائمة `CONDITIONAL_MODIFY` إلا عند إثبات dependency مباشر وتسجيل السبب.
- لا commit ولا Push قبل نجاح `tools/agent-delivery-gate.ps1`.
- لا تكتب `PASS` أو `CLOSED` أو تقييمًا ذاتيًا. النتيجة الوحيدة المسموحة:
  `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`.

