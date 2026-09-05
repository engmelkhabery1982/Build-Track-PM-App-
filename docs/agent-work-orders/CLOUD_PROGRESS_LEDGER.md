# BuildTrack Cloud Agent — سجل الاستمرار الإلزامي

> هذا الملف هو نقطة الاستلام الوحيدة لأي وكيل جديد. يجب قراءته وتحديثه في كل
> commit تسليم. لا تعتمد على ذاكرة المحادثة السابقة.

## الحالة الحالية

- Official reviewed commit: `2d73c49764c9a24d7fd80f5dd030e9519508dcc0`
- Agent-cloud synchronized commit: `d10fe8d39c9f92a6ef437008528adf906bcbbc64`
- Current capability: `A3 — Revenue vs Delivery Cost Separation`
- Status: `READY — NOT STARTED`
- Last accepted capability: `A2 — Unified Project Data Date — CLOSED 8/10`
- Official repository: `engmelkhabery1982/Build-Track-PM-App-`
- Writable agent repository only: `engmelkhabery1982/BuildTrack-Agent-Cloud`

## آخر نتيجة مثبتة

- `npm test`: 136/136 passed.
- `npm run build`: passed.
- `cargo test`: 21/21 passed.
- Agent-cloud tree is identical to the reviewed official tree at the synchronization point.

## ما يجب على الوكيل التالي فعله

1. Pull آخر `main` من `BuildTrack-Agent-Cloud` قبل القراءة أو التعديل.
2. تحقق أن working tree نظيفة وسجل HEAD في تقرير البداية.
3. اقرأ الملفات بالترتيب المذكور في الأمر الموحد.
4. راجع أي عمل جزئي موجود للميزة الحالية؛ لا تبدأها من الصفر ولا تحذف الجزء الصحيح.
5. أكمل **A3 فقط** طبقًا لمعاييرها في `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md`.
6. لا تبدأ A4 قبل أن تصبح حالة A3 `READY FOR CODEX REVIEW` وتنجح أوامر الاختبار المحددة.

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
