# BuildTrack Cloud Agent — سجل الاستمرار الإلزامي

> هذا الملف هو نقطة الاستلام الوحيدة لأي وكيل جديد. يجب قراءته وتحديثه في كل
> commit تسليم. لا تعتمد على ذاكرة المحادثة السابقة.

## الحالة الحالية

- Official reviewed commit: `36838edd4ebeac560a2b33279cd229f80c2f2869`
- Agent-cloud synchronized commit: `6f5b598`
- Current capability: `C2 — Schedule Versions, Scenarios & Comparison`
- Status: `READY — NOT STARTED`
- Last accepted capability: `A4 — KPI Source Drill-down & Reconciliation — CLOSED 8/10`
- Official repository: `engmelkhabery1982/Build-Track-PM-App-`
- Writable agent repository only: `engmelkhabery1982/BuildTrack-Agent-Cloud`

## آخر نتيجة مثبتة

- `npm test`: 148/148 passed.
- `npm run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 21/21 passed.
- `git diff --check`: passed (line-ending warnings only).
- A4 was recovered, reviewed and corrected by Codex; unsafe unrelated changes were removed.
- Dashboard and drill-down consume the same centralized result for Contract, Revenue
  PV/EV, Delivery AC, Commitment, Cash and Cost BAC/PV/EV/EAC.
- Controlled reference-project reconciliation passed for all ten KPI keys to 0.01.
- On-demand Ollama review timed out after 180 seconds without producing a report;
  it is not recorded as a successful review.

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
