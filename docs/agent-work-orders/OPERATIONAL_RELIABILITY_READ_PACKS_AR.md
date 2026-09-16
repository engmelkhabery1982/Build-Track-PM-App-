# BuildTrack — حزم القراءة المقيدة لخطة ORF

## البروتوكول

اقرأ `AGENTS.md` ثم `AGENT_START_HERE_AR.md` ثم `ACTIVE.md` ثم قسم ORF الحالي من
الخطة الرئيسية وهذه الحزمة فقط. ابدأ بـ`rg` وافتح المقاطع المطلوبة بحد أقصى أولي
12 ملفًا و40,000 حرف. لا تفتح ملفًا كاملًا من App/lib/types/repository. لا تقرأ
node_modules/dist/target/lockfiles/databases/archives. القراءة لا تعني إذن تعديل؛
`ACTIVE.MODIFY_ALLOWLIST` هو إذن التعديل الوحيد.

## ORF00 — Codex local only

- `git status/diff/worktree/log` metadata.
- الملفات المحلية السبعة المسجلة في Result، ونظائرها من release base بالمقاطع المختلفة فقط.
- `src-tauri/src/lib.rs`: modules/migrations/wrappers/invoke_handler فقط.
- `tests/tauri-command-registration.test.mjs`.
- أدوات gates وmanifest قراءة فقط.

## ORF01 — Transaction locks

- `src-tauri/src/claims_workflow.rs`: open_pool/transaction/period-lock/tests فقط.
- بقية `src-tauri/src/*workflow.rs`, `supplier_ap.rs`, `import_batch.rs`,
  `cost_plan_versioning.rs`, `report_versioning.rs`: `begin`, early returns, rollback فقط.
- Rust tests داخل الوحدات نفسها.
- ممنوع UI والحسابات.

## ORF02 — Schema/commands

- `src-tauri/src/lib.rs`: migrations/wrappers/invoke_handler فقط.
- `src/data/sqliteRepository.ts`: KNOWN_TABLES/mappings/guards فقط.
- `src/data/dataDictionary.ts` و`src/types/index.ts`: الحقول الحرجة فقط.
- `tests/tauri-command-registration.test.mjs` واختبارات migrations/backup.

## ORF03 — Contract authority

- `src/data/contractRules.ts`, `contractScope.ts`, `governanceRules.ts`.
- contract/project sections من repository/hooks/types/App فقط.
- `tests/contract-schedule-wir-acceptance-20260825.test.mjs` وأي contract migration test.

## ORF04 — BOQ/SOV/Variation

- `src/data/variationPackage.ts`, `commercialWorkflow.ts`.
- `src-tauri/src/commercial_workflow.rs`.
- `src/utils/commercialControl.ts`, `quantityLedger.ts`.
- BOQ/SOV/variation mappings فقط، واختبارات phase1 commercial/data quality.

## ORF05 — WIR/quantity

- `src/utils/quantityLedger.ts`, `src/utils/evm.ts`: Revenue EV فقط.
- WIR/progress correction mappings/migrations/forms فقط.
- contract/WIR/invoice reconciliation tests.

## ORF06 — Import

- `src/data/governedImport.ts`, `primaveraImport.ts`.
- `src/utils/primaveraReconciliation.ts`, `xerEngine.ts`.
- `src/components/XerReconciliationBoard.tsx`.
- `src-tauri/src/import_batch.rs` واختبارات Primavera/import batch فقط.

## ORF07 — CPM/baseline/status

- `src/utils/cpm.ts`, `schedulePlanning.ts`, `scheduleVersioning.ts`.
- `src/data/baselineGovernance.ts`.
- Schedule version modal/three-way overlay بالمقاطع المرتبطة.
- schedule/baseline/CPM/TIA tests فقط.

## ORF08 — Revenue progress

- `src/utils/evm.ts`, `earnedSchedule.ts`, `schedulePlanning.ts`.
- measurement/distribution/baseline data فقط.
- EVM/milestone/time-phased tests.

## ORF09 — Cost plan

- `src/data/costPlanVersioning.ts`, `src-tauri/src/cost_plan_versioning.rs`.
- `src/utils/controlAccountSummary.ts`, `costPlanPhasing.ts`, `overheadAllocation.ts`.
- Control Account/SOV/Cost Plan slices فقط والاختبارات المرتبطة.

## ORF10 — Actual/commitment/AP/certificates

- `src-tauri/src/supplier_ap.rs`, `certificate_workflow.rs`, `commercial_workflow.rs`.
- `src/data/supplierAp.ts`, `commercialWorkflow.ts`, labor/equipment gateways.
- `commercialControl.ts`, `paymentTerms.ts`.
- AP/PO/GRN/certificate/labor/equipment tests فقط.

## ORF11 — EVM/Health

- `docs/agent-results/CODEX_W06_REVIEW_2026-09-13.md`: Round 10 فقط.
- `src/utils/evm.ts`, `governedHealthScore.ts`.
- `src-tauri/src/health_score_workflow.rs`.
- health workflow/card/cockpit consumers بالمقاطع فقط.
- health/EVM/parity tests.

## ORF12 — Dashboard/report

- `src/utils/kpiReconciliation.ts`.
- Dashboard/ReportPack/Portfolio KPI blocks فقط.
- `src/data/reportVersioning.ts`, `src-tauri/src/report_versioning.rs`.
- KPI/report/data-date tests.

## ORF13 — E2E

- Golden Scenario والfixtures الخاصة به.
- production gateways/forms المذكورة في السيناريو فقط.
- installer/manual acceptance harness؛ لا تعِد تصميم UI.

## ORF14 — Release

- backup/restore tools، Tauri config/build scripts، migration version، installer output manifest.
- لا تقرأ business source إلا إذا كشف قبول ORF13 regression محددًا.
