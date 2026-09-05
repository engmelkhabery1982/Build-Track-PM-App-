# BuildTrack Cloud Agent — سجل الاستمرار الإلزامي

> هذا الملف هو نقطة الاستلام الوحيدة لأي وكيل جديد. يجب قراءته وتحديثه في كل
> commit تسليم. لا تعتمد على ذاكرة المحادثة السابقة.

## الحالة الحالية

- Official reviewed commit: `9a3f7f7336121ac7a00c6d074e862e13e28b7d52`
- Agent-cloud synchronized commit: `95c34d2bb8183e6ccb277cb2088c21ef0e858156`
- Current capability: `A4 — KPI Source Drill-down & Reconciliation`
- Status: `READY — NOT STARTED`
- Last accepted capability: `A3 — Revenue vs Delivery Cost Separation — CLOSED 8/10`
- Official repository: `engmelkhabery1982/Build-Track-PM-App-`
- Writable agent repository only: `engmelkhabery1982/BuildTrack-Agent-Cloud`

## آخر نتيجة مثبتة

- `npm test`: 142/142 passed.
- `npm run build`: passed.
- `cargo test`: 21/21 passed.
- A3 was recovered, reviewed and corrected by Codex; Google AI Studio metadata was excluded.
- Revenue and Delivery Cost are separated across the engine, Dashboard, Portfolio, Control Accounts and Report Pack.
- Missing or draft cost plans cannot fabricate Cost EAC from Revenue BAC.
- Ollama review was deferred by explicit user request; automated acceptance and Codex review passed.

## ما يجب على الوكيل التالي فعله

1. Pull آخر `main` من `BuildTrack-Agent-Cloud` قبل القراءة أو التعديل.
2. تحقق أن working tree نظيفة وسجل HEAD في تقرير البداية.
3. اقرأ الملفات بالترتيب المذكور في الأمر الموحد.
4. راجع أي عمل جزئي موجود للميزة الحالية؛ لا تبدأها من الصفر ولا تحذف الجزء الصحيح.
5. أكمل **A4 فقط** طبقًا لمعاييرها في `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md`.
6. لا تبدأ C2 قبل أن تصبح حالة A4 `READY FOR CODEX REVIEW` وتنجح أوامر الاختبار المحددة.

## قالب تحديث التسليم

على كل وكيل استبدال هذا القسم قبل آخر commit له:

- Agent/model:
- Started from commit:
- Current feature:
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
