# BuildTrack Agent Task Pointer

هذا الملف هو **المصدر الوحيد لاختيار المهمة**. التقارير والسجل والمحادثات لا تختار
المهمة. يملكه Codex وحده؛ الوكيل ممنوع من تعديله.

```text
STATE_SCHEMA=2
OWNER=CODEX
AGENT_MUST_NOT_EDIT=true
ACCEPTED_HEAD=ffeb0aeae3d4b72a67825b2b94226454a4147389
CLOUD_BASE_BRANCH=main
DELIVERY_BRANCH=main
CURRENT_FEATURE=W04
CURRENT_TITLE=Governed Payment Certificate and Invoice Reconciliation Correction
CURRENT_STATUS=IN_PROGRESS_NOT_ACCEPTED
FEATURE_BATCH_LIMIT=1
STOP_AFTER_CURRENT_FEATURE=true
OUT_OF_SCOPE_COMMITS=FORBIDDEN
PREREQUISITE=W03:CLOSED_8_OF_10_BY_CODEX
SPEC_ANCHOR=W04
SPEC_FILE=docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md
CORRECTION_FILE=docs/agent-work-orders/W04_CODEX_REVIEW_AND_CORRECTION_AR.md
READ_PACK=RP-W04
UNIFIED_PROMPT=docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_V2_AR.md
NEXT_FEATURE=W05
DELETE_ALLOWLIST=[]
MODIFY_ALLOWLIST=src-tauri/src/certificate_workflow.rs|src-tauri/src/lib.rs|src/components/PaymentCertificateWorkbench.tsx|src/data/commercialWorkflow.ts|src/data/index.ts|src/data/sqliteRepository.ts|src/hooks/useData.ts|src/types/index.ts|src/utils/commercialControl.ts|src/App.tsx|tests/invoice-certificate-reconciliation.test.mjs|tests/payment-certificate-governance.test.mjs|tests/tauri-command-registration.test.mjs|docs/agent-results/W04_RESULT.md|docs/agent-results/W04_EVIDENCE.json
CONDITIONAL_MODIFY=src/data/dataDictionary.ts|src/utils/paymentTerms.ts|src/utils/quantityLedger.ts|tests/phase1-commercial.test.mjs|tests/contract-schedule-wir-acceptance-20260825.test.mjs
FORBIDDEN=AGENTS.md|docs/agent-work-orders/**|package.json|package-lock.json|bun.lock|src-tauri/Cargo.toml|src-tauri/Cargo.lock|vite.config.*|.env*|metadata.json
REQUIRED_GAPS=W04-G01|W04-G02|W04-G03|W04-G04|W04-G05|W04-G06|W04-G07|W04-G08|W04-G09|W04-G10|W04-R01|W04-R02|W04-R03|W04-R04|W04-R05|W04-R06|W04-R07|W04-R08|W04-R09|W04-R10|W04-R11|W04-R12
REQUIRED_TESTS=npm test|npm run build|cargo test --manifest-path src-tauri/Cargo.toml|git diff --check
KNOWN_FAILED_DELIVERY=archive/w04-unreviewed-20260909
```

قواعد حاسمة:

- ابدأ فقط بعد نجاح `tools/agent-preflight.ps1`.
- ابدأ من `ACCEPTED_HEAD` الذي يحتوي W03 المقبولة؛ لا تنسخ commit التسليم المرفوض كاملًا.
- نفذ تصحيح W04 وحده ولا تبدأ W05 أو Report Designer.
- الحزمة السابقة في `KNOWN_FAILED_DELIVERY` مرجع فشل فقط وليست base ولا مصدر كود.
- لا تعدل قائمة `CONDITIONAL_MODIFY` إلا عند إثبات dependency مباشر وتسجيل السبب.
- لا commit ولا Push قبل نجاح `tools/agent-delivery-gate.ps1`.
- لا تكتب `PASS` أو `CLOSED` أو تقييمًا ذاتيًا. النتيجة الوحيدة المسموحة:
  `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`.

