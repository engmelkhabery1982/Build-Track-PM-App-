# BuildTrack Agent Bootstrap

اقرأ هذا الملف كاملًا؛ وهو بوابة قصيرة بدل قراءة وثائق المشروع الطويلة.

## ترتيب السلطة

`AGENTS.md` ← هذا الملف ← `ACTIVE.md` ← قسم المواصفة النشطة ← حزمة القراءة النشطة.

- `ACTIVE.md` وحده يحدد الميزة. Ledger ونتائج الوكلاء والمحادثات تاريخ فقط.
- Codex وحده يعدل ملفات السلطة ويقبل 8/10 وينقل المؤشر.
- الوكيل يسحب آخر `CLOUD_BASE_BRANCH` أولًا ويسجل HEAD الناتج باعتباره `START_HEAD`.
  `ACCEPTED_HEAD` هو سلف وظيفي موثوق للتحقق فقط، وليس commit للـcheckout أو reset.
- الوكيل ينفذ ميزة واحدة فقط فوق `START_HEAD` الفعلي.
- في Google Arena قد يكون فرع العمل `arena/*`؛ هذا مسموح إذا طابق
  `ACTIVE.WORK_BRANCH_PATTERN`. لا تغيّر المؤشر، ويظل GitHub sync إلى `main`.
- استخدم بوابات Node `.mjs` في كل الأنظمة؛ ملفات PowerShell بديل Windows فقط.
- كاتب واحد فقط لكل branch. العمل المتوازي يكون بفروع مستقلة وميزات مختلفة.

## حدود المنتج الثابتة

- عقد رئيسي واحد ينشئ مشروعًا واحدًا؛ عقد الباطن يتبع الرئيسي ولا ينشئ مشروعًا.
- BOQ الرئيسي مرجع نطاق/كمية/سعر العميل، وبند الباطن مرتبط به وتكلفته بسعر عقده.
- Variation المعتمد يضيف أثرًا قابلًا للتتبع ولا يمحو الأصل.
- Baseline مجمد، وCurrent وForecast منفصلان، وProject Data Date تاريخ قطع موحد.
- كل رقم أو كمية أو تاريخ يعود إلى سجل SQLite وحالة اعتماد. عند غياب المصدر استخدم
  `Unavailable/Requires data` ولا تخترع قيمة.
- الانتقال الحاكم وآثاره المالية وaudit داخل transaction backend واحدة.
- الحقل الجديد يحتاج Data Dictionary وmigration وmapping وtypes/UI واختبار.

## دليل التسليم

لا قيمة لعبارة “الاختبارات نجحت” دون evidence آلي: command، exit code، test count،
HEAD، file hashes، وقائمة diff. نفذ preflight قبل الكتابة وdelivery gate قبل commit.
أي ملف خارج allowlist أو حذف أو secret أو artifact أو تعديل config/lock يفشل التسليم.
