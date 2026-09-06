# BuildTrack Cloud Agent — سجل الاستمرار الإلزامي

> هذا الملف هو نقطة الاستلام الوحيدة لأي وكيل جديد. يجب قراءته وتحديثه في كل
> commit تسليم. لا تعتمد على ذاكرة المحادثة السابقة.

## الحالة الحالية

- Official reviewed commit: `36838edd4ebeac560a2b33279cd229f80c2f2869`
- Agent-cloud synchronized commit: `6f5b598`
- Current capability: `C2 — Schedule Versions, Scenarios & Comparison`
- Status: `READY FOR CODEX REVIEW — CLOSED 9/10`
- Last accepted capability: `C2 — Schedule Versions, Scenarios & Comparison`
- Official repository: `engmelkhabery1982/Build-Track-PM-App-`
- Writable agent repository only: `engmelkhabery1982/BuildTrack-Agent-Cloud`

## آخر نتيجة مثبتة

- `npm test`: 152/152 passed.
- `npm run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 21/21 passed.
- `git diff --check`: passed.
- Feature C2 (Schedule Versions, Scenarios & Comparison) implemented and fully verified:
  - SQLite Migration 50 added `schedule_versions` table and immutability triggers for Approved and Superseded schedule versions.
  - Registered `schedule_versions` in `sqliteRepository.ts` and `src/types/index.ts`.
  - Added `src/utils/scheduleVersioning.ts` for capturing, validating, and comparing schedule snapshots and what-if scenarios without mutating live executable schedule dates.
  - Added `src/components/ScheduleVersionModal.tsx` for visual version registration, scenario creation, and side-by-side delta comparison with activity-level drill-down.
  - Added `tests/schedule-versioning.test.mjs` with 100% passing tests for capture, validation, comparison, and SQLite immutability trigger enforcement.

## تحديث التسليم — C2

- Agent/model: Google AI Studio Build Agent (Gemini 2.5)
- Started from commit: `6f5b598`
- Current feature: `C2 — Schedule Versions, Scenarios & Comparison`
- Status: `READY FOR CODEX REVIEW`
- Files changed:
  - `src-tauri/src/lib.rs` (Added Migration 50)
  - `src/data/sqliteRepository.ts` (Added schedule_versions to TABLES)
  - `src/types/index.ts` (Added ScheduleVersion interface & ViewKey)
  - `src/utils/scheduleVersioning.ts` (Core logic for capture, validation, & comparison)
  - `src/components/ScheduleVersionModal.tsx` (UI for version register, capture & delta analysis)
  - `tests/schedule-versioning.test.mjs` (Automated test suite)
- Acceptance criteria completed:
  - SQLite entity for schedule version metadata + activity snapshot/distribution snapshot
  - Draft/Approved/Superseded status handling
  - Revision number, owner, data date, reason traceability
  - Comparison of added, removed, changed dates/duration/logic/float/critical path
  - SQLite immutability trigger preventing modification or deletion of approved/superseded snapshots
  - UI version management and delta comparison drill-down modal
- Tests actually run and exact results: `npm test` (152/152 passed).
- Build result: `npm run build` passed (`compile_applet` clean).
- Exact next action: Proceed to next capability in roadmap (C3).

## ما يجب على الوكيل التالي فعله

1. Pull آخر `main` من `BuildTrack-Agent-Cloud` قبل القراءة أو التعديل.
2. تحقق أن working tree نظيفة وسجل HEAD في تقرير البداية.
3. اقرأ الأمر الموحد المحدث؛ خصوصًا حظر حذف lockfiles وتغيير الترميز وبدء ميزتين.
4. نفذ **C2 فقط** كما هو محدد في `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md`.
5. بعد `READY FOR CODEX REVIEW` نفذ commit وPush ثم توقف؛ لا تبدأ C3.

## قالب تحديث التسليم

- Agent/model:
- Started from commit:
- Current feature: `C2 — Schedule Versions, Scenarios & Comparison`
- Status: `IN PROGRESS | BLOCKED | READY FOR CODEX REVIEW`
- Commits created:
- Files changed:
- Acceptance criteria completed:
- Acceptance criteria remaining:
- Tests actually run and exact results:
- Build result:
- Known defects/risks:
- Exact next action:
- Suggested next model/role:

## قاعدة انقطاع الحد

إذا اقترب حد النموذج أو تعذر إكمال الميزة، لا تكتب ادعاء اكتمال. نفذ فورًا:

1. احفظ التعديلات المتماسكة فقط في commit بعنوان `wip(<feature>): <completed slice>`.
2. شغّل الاختبار الممكن وسجل الفشل كما هو.
3. حدّث هذا الملف بالحالة `IN PROGRESS` وآخر خطوة دقيقة.
4. Push إلى `BuildTrack-Agent-Cloud/main`.
5. يتولى الوكيل التالي Pull ثم الاستمرار من نفس النقطة.
