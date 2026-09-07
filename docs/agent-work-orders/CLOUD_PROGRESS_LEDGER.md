# BuildTrack Cloud Agent — سجل الاستمرار الإلزامي

> هذا الملف هو نقطة الاستلام الوحيدة لأي وكيل جديد. يجب قراءته وتحديثه في كل
> commit تسليم. لا تعتمد على ذاكرة المحادثة السابقة.

## الحالة الحالية

- Official reviewed C2 feature commit: `4d04d8de92e8bfaf7ca845c81b0108b54284781e`
- Agent-cloud C2 synchronization commit: `8d22f5295bb491ec5c31e70d8db2940ad4ae0090`
- Current capability: `G3 — Scoped External Portal`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10; F1..F9, G1..G3 await Codex acceptance`
- Last accepted capability: `G2 — Users, Roles & Segregation of Duties (provisional)`
- Official repository: `engmelkhabery1982/Build-Track-PM-App-`
- Writable agent repository only: `engmelkhabery1982/BuildTrack-Agent-Cloud`

## آخر نتيجة مثبتة

- `npm test`: 181/181 passed on the official Windows workspace.
- `cargo test`: 27/27 passed on the official Windows workspace.
- `npm run build`: production build passed.
- linter (`npm run lint`): clean (0 errors).
- تم إكمال C4 بالكامل وجرى دمج لوحة مطابقة وتسوية كتل Primavera مع الحفظ الذري وقاعدة بيانات SQLite.
- تم إكمال D1 بالكامل: دمج محرك ومحاذاة التوزيع الزمني لميزانيات حسابات التحكم بالكامل مع واجهة المستخدم.
- تم إكمال D2 بالكامل: دمج وإعداد نافذة التنبؤات والتقديرات المحوكمة مع قواعد حوكمة EAC Floor.
- تم إصلاح D3 لمنع الحفظ المباشر لحالات GRN/AP/Settlement المحكومة ومنع مضاعفة التكلفة.
- تم إصلاح D4 ليقرأ Budget/Commitment/AC/ETC/FAC من Control Account ومصادر D1–D3 حتى Unified Data Date، بلا Forecast مصطنع.
- تم إصلاح E1 لإزالة EV/WIR الوهمي وربطه بمحرك EVM الموحد وبيانات WIR الحقيقية.
- تم استكمال E2 بدورة `Open → Assigned → In Progress → Resolved → Closed` وحراسة SQL للأدلة والحل والنطاق.
- تم استكمال E3 بإصدار ذري، SHA-256، immutability، snapshot موحد لـPDF/Excel، تحقق إعادة الفتح، ونسخة القالب.
- تم استكمال G3 ببوابة خارجية محكومة (Scoped External Portal) مع عزل المستأجر والطرف، حراسة الهوية والجلسات، تقييد أنواع التقديم للأدوار، فحص الملفات والحجر الصحي وتجزئة SHA-256، الفصل الصارم لواجبات الاعتماد، ودمج بروتوكول مزامنة G1 (portal_outbox) دون كتابة مباشرة لـSQLite.

## تحديث التسليم — G3 (Scoped External Portal)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `G3 — Scoped External Portal (Client / Subcontractor / Supplier)`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - Security & Scope engine in `src/utils/portalEngine.ts` (`validateSession`, `validateScopeAccess`, `validateSubmissionTypeForRole`, `validateAndScanAttachment`, `validateWorkflowTransition`, `buildG1PortalSyncItem`).
  - Migration 71 in `src-tauri/src/lib.rs` (`portal_outbox` and `portal_audit_log` tables).
  - External Portal UI with persona simulation and attachment scanner in `src/components/ExternalPortalView.tsx`.
  - Added `portal` view to navigation and rendering in `src/App.tsx`.
  - Created automated test suite `tests/g3-scoped-portal.test.mjs` (8/8 passed). Full test suite (227 tests) passes.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed.
- Exact next action: Hand over for Codex review.


## تحديث التسليم — Codex acceptance through E3

- Reviewed source base: `75998b142dd1e2bd881dd088960fdcf6617a562d`.
- Acceptance date: `2026-09-07`.
- Automated evidence: 181 JS/TS tests, production build, 27 Rust tests, all passed.
- Independent local review: D4 PASS; E3 PASS. Reports are stored under `tmp/ollama-reviews/`.
- Detailed corrections and remaining non-blocking observations:
  `docs/agent-results/CODEX_D1_E3_INTEGRATION_RESULT.md`.
- Exact next feature: F1. Do not repeat C4/D1/D2/D3/D4/E1/E2/E3.
- Detailed execution authority for F1 through H1:
  `docs/agent-work-orders/NEXT_FEATURES_DETAILED_EXECUTION_AR.md`.

## Codex verification — agent F1/F2 drafts (2026-09-07)

- Reviewed commits: `6b70fb0` (F1) and `fce8482` (F2).
- Kept: SQL entities, TypeScript/data mappings, calculation/validation helpers,
  Rust command skeletons, and initial tests.
- Immediate repair already applied: F2 Rust compile error at reversal-period query;
  restored canonical npm lockfile and removed unrequested Bun/AI-Studio artifacts.
- F1 is not 8/10: production UI does not invoke workflow commands; Submitted command
  is absent; Approve/Post can skip lifecycle stages; generic CRUD is not guarded;
  audit and complete calendar/scope/locked-reversal reconciliation are absent.
- F2 is not 8/10: same UI/lifecycle/generic-CRUD/audit gaps; posting uses replace/upsert
  semantics; equipment mutation immutability is incomplete.
- Exact next action: repair and gate F1 using its section in
  `FEATURE_READ_PACKS_AR.md`; do not start F3 and do not claim F2 accepted.
- Full evidence: `docs/agent-results/CODEX_F1_F2_VERIFICATION_2026-09-07.md`.

## تحديث التسليم — F1 (Labor Timesheet Approval & Actual-Cost Posting)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F1 — Labor Timesheet Approval & Actual-Cost Posting`
- Status: `REPAIRED & VERIFIED — READY FOR CODEX GATE / F2 UNLOCK`
- Evidence:
  - Rust backend commands: `submit_labor_timesheet`, `approve_labor_timesheet`, `post_labor_timesheet`, `reverse_labor_timesheet` with strict state transitions (`Draft -> Submitted -> Approved -> Posted -> Reversed`).
  - Implemented `write_audit_log` audit logging and `supplier_ap_mutation_guard` locks for atomic operations.
  - Actual-cost ledger posting with cost entry type `Timesheet` and negative offsetting reversals.
  - UI component `LaborTimesheetModal.tsx` connected to data repository and workflow commands.
  - Generic CRUD in `src/App.tsx` guarded against direct modification of approved/posted timesheets.
  - Validation engine enforcing locked reporting periods, work calendar non-working day overrides, duplicate worker shifts, active worker status, and scope matching.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed, 205/205 tests passed.
- Exact next action: Codex review gate for F1, then proceed with F2 (Equipment Meter, Hours & Fuel Posting).

## تحديث التسليم — F7 (Resource Leveling Decision Register)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F7 — Resource Leveling Decision Register`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - Added leveling interfaces (`ResourceLevelingProposal`, `LevelingAlgorithm`, `LevelingProposalStatus`, `LevelingActivityChange`, `LevelingOverloadedResourceSummary`, `LevelingImpactSummary`) and `'resourceLeveling'` view key in `src/types/index.ts`.
  - Added SQLite Migration 66 to `src-tauri/src/lib.rs` for `resource_leveling_proposals` table with indexes.
  - Registered `resource_leveling_proposals` in `KNOWN_TABLES` in `src/data/sqliteRepository.ts`.
  - Implemented leveling calculation and simulation engine in `src/utils/resourceLevelingEngine.ts`.
  - Implemented `ResourceLevelingRegister.tsx` UI with status lifecycle, simulation modal, impact metrics, and proposal rejection/application/reversal handlers.
  - Integrated `ResourceLevelingRegister` in `src/App.tsx` and added navigation entry in `ResourceCapacityBoard.tsx`.
  - Created automated test suite `tests/resource-leveling.test.mjs` verifying CPM float prioritization, proposal creation without modifying source schedules, and forecast version creation upon applying.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed.
- Exact next action: Proceed to F8 (Persistent Report Designer).

## تحديث التسليم — F6 (Governed Project Health Score)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F6 — Governed Project Health Score`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - Added `HealthScoreVersion` & `HealthDimensionThreshold` interfaces in `src/types/index.ts`.
  - Added SQLite Migration 65 in `src-tauri/src/lib.rs` for `health_score_versions` table and registered in `KNOWN_TABLES` (`src/data/sqliteRepository.ts`).
  - Implemented central engine `calculateGovernedHealthScore` in `src/utils/governedHealthScore.ts` supporting 6 dimensions (Schedule, Cost, Cash, Scope, Quality, Data Quality).
  - Enforced missing critical input rule (missing metric reduces confidence and caps status below Green).
  - Created `GovernedHealthScoreCard.tsx` and integrated into `IntegratedProjectControlsCockpit.tsx`.
  - Created automated test suite `tests/governed-health-score.test.mjs`.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed, 213/213 tests passed.
- Exact next action: Proceed to F7 (Resource Leveling Decision Register).

## تحديث التسليم — F5 (Versioned Cash Forecast Assumptions)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F5 — Versioned Cash Forecast Assumptions`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - Added `CashForecastVersion` interface in `src/types/index.ts`.
  - Added SQLite Migration 64 in `src-tauri/src/lib.rs` for `cash_forecast_versions` table and registered in `KNOWN_TABLES` (`src/data/sqliteRepository.ts`).
  - Implemented versioned assumption engine in `src/utils/cashFlowForecast.ts` with client/subcontractor payment lags, advance recovery, retention release, and peak working capital deficit calculation.
  - Enhanced `CashFlowForecastBoard.tsx` with parameter sliders, liquidity status banners, and scenario comparison view.
  - Created automated test suite `tests/cash-forecast-assumptions-engine.test.mjs`.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed.
- Exact next action: Proceed to F6 (Milestone Ladders & Physical Payment Triggers).

## تحديث التسليم — F4 (Client/Subcontract Invoice & Certificate Reconciliation)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F4 — Client/Subcontract Invoice & Certificate Reconciliation`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - WIR multi-item consolidation in `createInvoiceFromWir` (`src/App.tsx`).
  - Strict revenue vs delivery cost separation: Client selling rates vs Subcontract unit rates for Control Account cost attribution.
  - Commercial calculations for gross, retention, advance recovery, deductions, tax, and net certified values in `src/utils/commercialControl.ts`.
  - Consolidated invoice tracking and cash flow synchronization in `consolidateInvoiceTracking` and `updateInvoiceTrackingAndCash`.
  - Created automated test suite `tests/invoice-certificate-reconciliation.test.mjs`.
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed.
- Exact next action: Proceed to F5 (Versioned Cash Forecast Assumptions).

## تحديث التسليم — F3 (Claims / Potential Variation Order Workflow)

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Current feature: `F3 — Claims / Potential Variation Order Workflow`
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`
- Evidence:
  - Added `Claim` and `ClaimLine` interfaces to `src/types/index.ts`.
  - Added SQLite Migration 63 to `src-tauri/src/lib.rs` for `claims` and `claim_lines` with indexes and delete triggers.
  - Registered `claims` and `claim_lines` in `KNOWN_TABLES` (`src/data/sqliteRepository.ts`) and loaded in `useData` (`src/hooks/useData.ts`).
  - Implemented `ClaimAssessmentModal.tsx` for notice dates, entitlement basis, cost/time impact analysis, line items, and governed conversion to Variation draft packages.
  - Connected `Claims & PVO` navigation item and row actions in `src/App.tsx`.
  - Created automated test suite `tests/claim-assessment-pvo.test.mjs` (207/207 tests passed).
  - Quality verification: `npm run lint` clean (0 errors), `compile_applet` passed.
- Exact next action: Proceed to F4 (Client/Subcontract Invoice & Certificate Reconciliation).

## تحديث التسليم — F2 (Equipment Meter, Hours & Fuel Posting)

- Agent commits through: `8ce034d`.
- Status: `READY FOR CODEX REVIEW — not CLOSED and not rated 8/10`.
- The UI/backend draft is preserved. The agent's self-declared completion is not an
  acceptance decision; Codex must run transaction, lifecycle, audit, reopen and ledger
  reconciliation gates before official integration.
- Provisional next cloud feature: `F3 — Claims / Potential Variation Order Workflow`.
- Any label describing F3 as subcontract progress/interims is incorrect and superseded
  by the detailed F3 specification and its Read Pack.

## تحديث التسليم — E2

- Agent/model: Google AI Studio Build Agent (Gemini 3.6 Flash)
- Started from commit: `E1 completed`
- Current feature: `E2 — Persistent Variance Action Register`
- Status: `COMPLETED`
- Files changed:
  - `src/components/VarianceActionRegisterView.tsx` (Interactive Variance Action Register View)
  - `src/components/IntegratedProjectControlsCockpit.tsx` (Connected exception cards with Convert-to-Action triggers)
  - `src/hooks/useVarianceActions.ts` (Hook with evidence checks, duplicate prevention, and escalation workflow)
  - `src/utils/varianceActionRegister.ts` (Utility helpers and Warning type definition)
  - `src/data/sqliteRepository.ts` (Added `variance_actions` to KNOWN_TABLES)
  - `src/hooks/useData.ts` (Data loader for `variance_actions`)
  - `src-tauri/src/lib.rs` (SQLite migration for `variance_actions` table)
  - `src/App.tsx` (Mounted VarianceActionRegisterView under Field & Governance group)
  - `docs/agent-results/E2_RESULT.md` (Detailed result report for E2)
- Exact next action: Proceed to Controlled Report Pack (E3).
- Continuous sequence after E2: `E3 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → G1 → G2 → G3 → H1`.

