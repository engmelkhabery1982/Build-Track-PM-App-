# خطة الأسبوع التنفيذي — 90 تحسينًا ذريًا محكومًا

## الهدف وحدود الخطة

هذه الخطة لا تعني بناء 90 وحدة كبيرة في سبعة أيام. كل رقم أدناه هو **Increment
قبول ذري** يمكن إثباته منفردًا. الهدف هو رفع موثوقية الوظائف التشغيلية الأقرب إلى
SAP PS في النطاق والوقت والتكلفة والتقدم، مع الحفاظ على نموذج: العقد الرئيسي أولًا،
الباطن محمّل عليه، وBaseline / Current / Forecast منفصلة.

لا يُغلق أي Increment إلا بعد: اختبار موجب وسالب وcross-scope، إثبات SQLite/reopen،
تسوية رقمية، `npm test`، `npm run build`، وCargo عند لمس Rust/SQLite، ثم مراجعة
Codex. نجاح اختبار يبحث عن نص لا يكفي. أي رقم بلا مصدر معتمد يعرض `Unavailable`.

## حزم القراءة الدقيقة

- `RP-D1`: `src/App.tsx` (مواضع routing فقط)، `src/hooks/useData.ts`،
  `src/data/sqliteRepository.ts`، وحدات Rust واختبارات F1–G3 ذات الصلة فقط.
- `RP-D2`: `src/types/index.ts` (الأنواع ذات الصلة)، `src/data/dataDictionary.ts`،
  `src/utils/variationPackage.ts`، `src/utils/scopeControl.ts`، اختبارات BOQ/Variation.
- `RP-D3`: `src/utils/cpm.ts`، `schedulePlanning.ts`، `scheduleVersioning.ts`،
  `primaveraReconciliation.ts`، `resourceLoading.ts`، واختباراتها.
- `RP-D4`: `controlAccountSummary.ts`، `costPlanPhasing.ts`، `costVariance.ts`،
  `cashForecast.ts`، وحدات `commercial_workflow.rs` و`supplier_ap.rs` واختباراتها.
- `RP-D5`: `evm.ts`، `earnedSchedule.ts`، `src/data/dataQuality.ts`، منطق WIR في
  `src/App.tsx` بالمقاطع المطابقة فقط، واختبارات EVM/WIR/reconciliation.
- `RP-D6`: `src/data/governedImport.ts`، `primaveraImport.ts`،
  `src-tauri/src/import_batch.rs`، `DataTableView.tsx` في مقاطع الاستيراد فقط،
  واختبارات import/Primavera.
- `RP-D7`: `AuditTrailExplorer.tsx`، `SyncCenter.tsx`، `ExternalPortalView.tsx`،
  `ReportPack.tsx`، `report_versioning.rs`، `portalEngine.ts`، واختبارات G1–G3/E3.

لا يُفتح ملف ضخم كاملًا؛ يبدأ الوكيل بـ`rg` ثم يقرأ المقاطع اللازمة. أي توسع خارج
الحزمة يسجل سببه قبل القراءة. `DELETE_ALLOWLIST: []` طوال الأسبوع.

## عقد المواصفة الإلزامي لكل عنصر W01–W90

الوصف المختصر في قائمة الأيام يحدد النتيجة، لكنه لا يرخّص تنفيذًا جزئيًا. قبل لمس
الكود يجب تحويل **كل عنصر** إلى checklist في تقرير نتيجته، ويغطي دون استثناء:

1. النتيجة التشغيلية وحدودها ومصدر الحقيقة المعتمد، مع تعريف المدخلات والمخرجات.
2. ما هو موجود ويُحفظ `ACCEPT`، وما يحتاج إصلاحًا `REPAIR`، وما هو خارج النطاق
   `DEFER`؛ لا تعاد كتابة الجزء الصحيح ولا تُرفض الحزمة كلها.
3. مسارًا واحدًا مثبتًا: `UI → governed command/repository → SQLite transaction →
   reload/reopen → downstream consumer/reconciliation`.
4. Data Dictionary وSQL columns/foreign keys والمفاتيح المركبة وTypeScript mapping
   لكل حقل حاكم؛ يمنع الاعتماد على payload مخفي أو lookup لأول سجل.
5. الحالات القانونية والانتقالات والصلاحيات وmaker-checker وقفل الفترة، ومنع generic
   CRUD من إنشاء حالة معتمدة أو منشورة أو تعديلها.
6. الذرّية وidempotency: الفشل المتأخر يعيد كل المعاملة، والتكرار لا يضاعف الأثر،
   والعكس قيد مقابل مؤرخ ولا يمحو الحقيقة الأصلية.
7. اختبارات فعلية: موجب، سالب، cross-project/contract/control-account، locked-period،
   duplicate/idempotency، late-failure rollback، reload/reopen، audit، وتسوية رقمية
   حتى `0.01` حيث توجد قيمة مالية.
8. اختبار wiring يثبت استعمال الشاشة لأمر الإنتاج وعودة بيانات SQLite بعد إعادة
   الفتح؛ اختبار النص أو helper منفرد لا يثبت اكتمال الميزة.
9. قائمة الملفات المقروءة/المعدلة وسبب أي توسع، مع `DELETE_ALLOWLIST: []` وفحص
   الحذف/إعادة التسمية والـlockfiles قبل التسليم.
10. جدول قبول `Criterion | Evidence | PASS/FAIL/NOT RUN | Gap ID`. أي `FAIL` أو
    `NOT RUN` لبند حرج يمنع `ADVANCE`. الوكيل لا يمنح 8/10؛ Codex وحده يعتمدها.

## ملف التنفيذ الكامل W01 — إغلاق فجوات F1 للعمالة

**الحالة الحالية:** `PARTIAL — 4/10 — NOT ACCEPTED`. تحفظ الكيانات الموجودة،
المفاتيح الخارجية، التحميل، التحقق الأولي، اشتقاق تكلفة العمالة، وقيد العكس المقابل.
لا يعني وجودها قبول دورة العمل.

**مصدر الحقيقة:** رأس كشف العمالة وسطوره في SQLite، مورد العمالة النشط، تقويم/وردية
العمل، العقد الرئيسي، Activity وControl Account وCost Code ضمن النطاق نفسه، Financial
Period Lock، وCost Entries/Audit الناتجة من أمر backend واحد. الواجهة ليست مصدرًا
للحالة أو القيمة.

**ملفات MUST READ فقط:** حزمة `F1` في `FEATURE_READ_PACKS_AR.md`، قسم F1 من
`CODEX_F1_F2_VERIFICATION_2026-09-07.md`، ثم الرموز المحددة في
`src-tauri/src/labor_timesheet.rs` و`src/data/laborTimesheet.ts` و
`src/components/LaborTimesheetModal.tsx` و`tests/labor-timesheet.test.mjs`.

**الفجوات الملزمة:**

- `W01-G01 — UI wiring`: شاشة حقيقية للرأس والسطور تستدعي submit/approve/post/reverse
  وتعيد تحميل الصف وحالته وقيوده من SQLite بعد كل أمر وبعد إعادة فتح التطبيق.
- `W01-G02 — lifecycle`: إضافة Submit ومنع القفز. المسار الوحيد هو
  `Draft → Submitted → Approved → Posted → Reversed`؛ لا Approve من Draft ولا Post
  من Draft/Submitted، ولا تعديل مالي بعد الاعتماد/النشر.
- `W01-G03 — CRUD guard`: generic repository لا يستطيع كتابة status حاكم أو تعديل
  header/lines بعد خروجها من Draft؛ الحماية backend/SQL وليست تعطيل زر فقط.
- `W01-G04 — atomic audit`: validation + transition + postings + audit في transaction
  واحدة؛ فشل audit أو آخر قيد يعيد الحالة وكل القيود.
- `W01-G05 — immutable exactly-once`: يمنع `ON CONFLICT DO UPDATE` من إعادة كتابة
  حقيقة مالية منشورة. إعادة post بنفس correlation/source key تعيد النتيجة نفسها بلا
  مضاعفة أو تغيير، والتعارض المختلف يُرفض.
- `W01-G06 — reversal governance`: العكس بتاريخ عكس صريح داخل فترة مفتوحة، مع
  صلاحية وسبب ومرجع للقيد الأصلي؛ لا يستخدم work date القديم لإدخال أثر في فترة مغلقة.
- `W01-G07 — scope integrity`: إثبات أن العقد رئيسي، وأن Resource/Activity/Control
  Account/Cost Code/Project/Contract تنتمي إلى النطاق المركب نفسه؛ رفض كل cross-scope.
- `W01-G08 — calendar capacity`: مجموع ساعات العامل/اليوم/الوردية لا يتجاوز السعة
  المحكومة، واليوم غير العامل يحتاج override معتمدًا ومُدققًا.
- `W01-G09 — reconciliation`: مجموع Labor Cost Entries المنشورة يساوي مجموع
  `hours × governed rate` حتى `0.01`، وبعد العكس يصبح صافي أثر الكشف صفرًا دون حذف.
- `W01-G10 — executable evidence`: اختبارات Rust/SQLite تنفذ الدورة كاملة، الانتقالات
  غير القانونية، القفل، cross-scope، duplicate، فشل متأخر، audit، reopen، والتسوية؛
  ويضاف اختبار UI wiring. إزالة تحذيرات dead-code الناتجة عن هذا المسار.

**القبول:** لا تُغلق W01 ولا يبدأ W02 قبل PASS لكل `W01-G01..G10`، ثم نجاح كامل
Node/build/Cargo/diff. دليل التسليم يتضمن IDs للصفوف والقيود قبل/بعد reopen ومجموع
الحساب، لا مجرد أسماء دوال أو لقطات شاشة.

## ملف التنفيذ الكامل W02 — إغلاق فجوات F2 للمعدات والوقود

```text
FEATURE_ID=W02
PREREQUISITE=W01:CLOSED_8_OF_10_BY_CODEX
SOURCE_OF_TRUTH=equipment_logs|resource_masters|schedules|control_accounts|cost_entries|reporting_periods|audit_log
MODIFY_ALLOWLIST=see ACTIVE.md
DELETE_ALLOWLIST=[]
ACCEPTANCE_GAPS=W02-G01|W02-G02|W02-G03|W02-G04|W02-G05|W02-G06|W02-G07|W02-G08|W02-G09|W02-G10
DELIVERY_GATE=tools/agent-delivery-gate.ps1
AGENT_FINAL_STATE=READY_FOR_CODEX_REVIEW_OR_WIP_BLOCKED
```

**الحالة الحالية:** `IN PROGRESS — NOT ACCEPTED؛ W01 CLOSED 8/10 BY CODEX`. تحفظ
الكيانات والمخطط والتحميل والتحقق الأولي للعداد/التداخل وفصل Equipment/Fuel وقيد
العكس الموجود. W01 معتمدة في `8a0c4bd`؛ ممنوع تجاوز W02 إلى W03.

**مصدر الحقيقة:** رأس/سطور سجل المعدة في SQLite، المعدة والمورد النشطان، قراءات
العداد والفترات السابقة، الوقود والكميات والأسعار المحكومة، العقد الرئيسي، Activity/
Control Account/Cost Code، التقويم/السعة، Financial Period وCost Entries/Audit.

**ملفات MUST READ فقط:** حزمة `F2` في `FEATURE_READ_PACKS_AR.md`، قسم F2 من تقرير
التحقق، ثم الرموز المحددة في `src-tauri/src/equipment_log.rs` و
`src/data/equipmentLog.ts` و`src/components/EquipmentLogModal.tsx` و
`tests/equipment-log.test.mjs`.

**الفجوات الملزمة:**

- `W02-G01 — UI wiring`: إدخال الرأس والسطور وإجراءات submit/approve/post/reverse
  من شاشة mounted، ثم reload/reopen من SQLite دون state وهمي.
- `W02-G02 — lifecycle`: المسار الحصري
  `Draft → Submitted → Approved → Posted → Reversed` مع منع القفز والتعديل اللاحق.
- `W02-G03 — CRUD/SQL guards`: منع generic status mutation وإضافة triggers/guards
  لثبات الرأس والسطور والانتقالات القانونية، لا الاكتفاء بمنع delete.
- `W02-G04 — meter/time integrity`: رفض rollback، القراءة النهائية الأقل من البداية،
  تداخل المعدة زمنيًا، duplicate source، والساعات فوق السعة اليومية/الوردية.
- `W02-G05 — scope integrity`: المعدة والعقد الرئيسي والنشاط والحساب الرقابي وكود
  التكلفة والمشروع ضمن المفتاح المركب نفسه؛ لا أول سجل ولا cross-scope.
- `W02-G06 — separate valuation`: تكلفة تشغيل المعدة وتكلفة الوقود قيدان منفصلان
  بمصادر وأسعار ووحدات موثقة، ومجموعهما فقط هو AC الخاص بالسجل؛ لا خلط أو double count.
- `W02-G07 — atomic immutable posting`: استبدال `INSERT OR REPLACE` بحقيقة مالية
  immutable exactly-once داخل transaction تشمل audit، مع rollback كامل عند الفشل.
- `W02-G08 — governed reversal`: تاريخ عكس مفتوح وصلاحية وسبب ومرجع، وقيدان مقابلان
  يحافظان على فصل Equipment/Fuel ولا يحذفان الأصل.
- `W02-G09 — reconciliation`: Equipment AC يساوي usage × governed equipment rate،
  وFuel AC يساوي fuel quantity × governed fuel rate حتى `0.01`؛ الصافي بعد العكس صفر.
- `W02-G10 — executable evidence`: اختبارات Rust/SQLite للدورة والقفل والتداخل
  والعداد والسعة وcross-scope/idempotency/late failure/audit/reopen/reconciliation،
  واختبار UI wiring؛ إزالة dead-code الخاص بالمسار.

**القبول:** PASS لكل `W02-G01..G10` وكامل Node/build/Cargo/diff. أي اعتماد على
`INSERT OR REPLACE` أو generic status أو اختبار نصي فقط يبقي W02 مفتوحة وأقل من 8/10.

## اليوم 1 — قبول وتقسية F1–G3 (13)

1. `W01 / D1-01` العمالة: تنفيذ ملف W01 الكامل أعلاه وإغلاق `W01-G01..G10`؛ الحزمة `F1/RP-D1`. لا يبدأ W02 قبل قبول Codex.
2. `W02 / D1-02` المعدات والوقود: تنفيذ ملف W02 الكامل أعلاه وإغلاق `W02-G01..G10`؛ الحزمة `F2/RP-D1`.
3. `W03 / D1-03` المطالبات/PVO: لا BOQ/ميزانية/تاريخ قبل الاعتماد؛ التحويل ينشئ Variation واحدة قابلة للتتبع. الهدف `claims.ts` و`ClaimAssessmentModal.tsx`.
4. `W04 / D1-04` الشهادات: تجميع WIR بلا ازدواج، سعر بيع العميل منفصل عن تكلفة الباطن، وصافي الشهادة يتسوى إلى 0.01. الهدف `commercial_workflow.rs` واختبار invoice reconciliation.
5. `W05 / D1-05` توقع النقد: Actual منفصل عن Forecast، Data Date محترم، والمسدد لا يعاد إدراجه. الهدف `cashFlowForecast.ts` و`CashFlowForecastBoard.tsx`.
6. `W06 / D1-06` صحة المشروع: كل مستهلك يستخدم المحرك والإعداد المعتمد؛ المدخل المفقود يمنع Green. الهدف `governedHealthScore.ts` والبطاقة.
7. `W07 / D1-07` قرارات التسوية: Apply ينشئ Forecast Version؛ Reject/Reverse لا يغير Baseline أو Current. الهدف `resourceLevelingEngine.ts` و`ResourceLevelingRegister.tsx`.
8. `W08 / D1-08` قوالب التقارير: save/reopen/version/approval immutability؛ لقطة التقرير تحفظ template version. الهدف `ReportTemplateDesigner.tsx` و`report_versioning.rs`.
9. `W09 / D1-09` التدقيق: append-only لكل أمر حاكم، وفشل التدقيق يعيد المعاملة كاملة. الهدف `AuditTrailExplorer.tsx` ووحدات Rust الحاكمة.
10. `W10 / D1-10` المزامنة: idempotency مع التكرار وإعادة الترتيب، واستعادة cursor بعد الانقطاع. الهدف `SyncCenter.tsx` وطبقة sync.
11. `W11 / D1-11` الصلاحيات: backend يرفض direct invoke وself-approval وcross-scope لكل أمر حساس. الهدف auth/session/migrations واختبارات G2.
12. `W12 / D1-12` البوابة الخارجية: tenant/party/contract isolation ضد guessed IDs والجلسة المنتهية والمرفق غير المسموح. الهدف `portalEngine.ts` و`ExternalPortalView.tsx`.
13. `W13 / D1-13` قبول عابر: مشروع مرجعي يمر actuals→cost/progress/report/audit ثم reopen بلا فرق رقمي. الهدف fixture موحد واختبار end-to-end محلي.

## اليوم 2 — النطاق وWBS وBOQ (13)

14. `W14` قناع WBS: رفض كود مخالف أو مكرر داخل المشروع/العقد. `RP-D2`.
15. `W15` سلامة الشجرة: منع الحلقة والأب المفقود والنقل تحت حفيد.
16. `W16` قاموس النطاق: لا اعتماد بلا وصف وتسليمات ومالك.
17. `W17` OBS Responsibility: مسؤول صالح واحد لكل WBS وسجل زمني للتغيير.
18. `W18` Project Template Version: نسخ البنية دون مشاركة IDs أو actuals.
19. `W19` Project Status Profile: الانتقالات المعرفة فقط؛ لا قفز صامت.
20. `W20` Scope Baseline Snapshot: WBS+BOQ+links ثابتة وغير قابلة للتعديل.
21. `W21` BOQ→WBS completeness: كشف غير المعيّن أو cross-scope.
22. `W22` وحدات القياس: conversion master معتمد؛ رفض الوحدات غير القابلة للتحويل.
23. `W23` ربط بند الباطن بالرئيسي: لا تجاوز للرصد ولا إيراد إضافي.
24. `W24` Change Lineage: Original→Variation→Current للكمية والسعر والزمن.
25. `W25` Scope Version Compare: added/removed/changed دون تعديل النسخ.
26. `W26` Scope Reconciliation: Original + Approved Changes = Current لكل بند والمشروع بفارق ≤0.01.

## اليوم 3 — الجدول وCPM (13)

27. `W27` وراثة التقويم Project/WBS/Activity والاستثناءات بترتيب قابل للتفسير. `RP-D3`.
28. `W28` محرك وقت العمل عبر العطل والمناوبات دون يوم ثابت مخفي.
29. `W29` FS/SS/FF/SF + lag مع scope validation ورفض predecessor مفقود.
30. `W30` سجل القيود الصلبة/المرنة ورفض ما يناقض actuals/Data Date.
31. `W31` CPM deterministic: المدخل نفسه ينتج dates/float/path نفسها.
32. `W32` Critical Path Snapshot ثابت لكل Schedule Version.
33. `W33` Total/Free Float مع مصدر الحساب وعدم اعتباره استحقاقًا تعاقديًا.
34. `W34` Actual Dates: لا Finish دون Start ولا overwrite من planning import.
35. `W35` Remaining Duration: لا سالب ولا تعارض مع status/calendar.
36. `W36` Out-of-Sequence policy: Retained Logic/Progress Override معلنة.
37. `W37` Contract Milestones مرتبطة بالشبكة والتأخر لا يعدل العقد دون اعتماد.
38. `W38` Lookahead 2/4/6 أسابيع من Forecast مع سبب الإدراج.
39. `W39` Schedule QA: open ends/lags/constraints/negative float/long activities مع drill-down.

## اليوم 4 — الميزانية والتكلفة والالتزامات (13)

40. `W40` Cost Element Master مرتبط بـCBS وإلزام كل Cost Entry. `RP-D4`.
41. `W41` CBS–WBS–Control Account Matrix تمنع cross-project وتكشف الفراغات.
42. `W42` Approved Time-phased Cost Plan واحدة للنطاق وتجميدها.
43. `W43` Budget Release/Supplement/Return/Transfer كحركات ذرية.
44. `W44` Availability Control مع tolerance وoverride معتمد.
45. `W45` PO/Change/Cancel history وحساب Open Commitment بلا حذف.
46. `W46` GRNI من GRN المقبول واستبعاده عند AP settlement بلا مضاعفة AC.
47. `W47` PO–GRN–AP three-way match للكمية والسعر والضريبة.
48. `W48` Financial Period Lock/Reopen بصلاحية وسبب وتدقيق.
49. `W49` FX Version مجمدة لكل Posting وعرض transaction/functional currency.
50. `W50` Overhead Allocation مع مساهمات تساوي المصدر حتى آخر قرش.
51. `W51` ETC Method لكل Control Account ومنع fallback المخفي.
52. `W52` Period Cost Close: Budget/Commitment/GRNI/AP/AC/ETC/EAC تتسوى إلى ≤0.01.

## اليوم 5 — التقدم وEVM (13)

53. `W53` Progress Measurement Method إلزامية لكل BOQ/Activity. `RP-D5`.
54. `W54` Quantity Ledger يومي بمصدر ووحدة ومنع تجاوز Current Quantity.
55. `W55` Cumulative WIR reconciliation بلا احتساب مزدوج عبر الفترات/الشهادات.
56. `W56` Physical Progress منفصل عن Revenue EV وعن Delivery Cost.
57. `W57` Cut-off Snapshot تستبعد الحقائق بعد Data Date.
58. `W58` Late Actual Correction مرتبطة بالفترة الأصلية دون إعادة كتابة اللقطة.
59. `W59` Weighted Milestones ومجموع الأوزان =100% والتقدم ≤100%.
60. `W60` طرق 0/100 و50/50 وUnits Complete مستقلة ومثبتة.
61. `W61` Time-phased EV Baseline مجموعها = BAC حتى 0.01.
62. `W62` PV/EV/AC/SV/CV/SPI/CPI تعرض inputs/Data Date/source rows.
63. `W63` Productivity output/labor-hour وoutput/equipment-hour مع وحدة متوافقة.
64. `W64` Variance Action واحدة عند تجاوز threshold بلا duplicates.
65. `W65` BOQ↔WIR↔Activity↔EV↔Certificate reconciliation مع سبب كل فرق.

## اليوم 6 — الاستيراد المحكوم (13)

66. `W66` Mapping Profile محفوظ بإصدار ومصدر ونطاق. `RP-D6`.
67. `W67` Source Manifest ورفض schema version غير مدعوم قبل staging.
68. `W68` BOQ Import يضيف/يحدث Draft فقط ويحمي البنود/actuals المعتمدة.
69. `W69` Cost Budget Import كنسخة Draft مع control totals والفترات.
70. `W70` Actual Cost Import يلزم source key/date/currency ويمنع duplicate/locked period.
71. `W71` WIR Import يرفض over-quantity وcross-scope ويحافظ على source ID.
72. `W72` Locale normalization: عربي/UTF-8/decimal/date/timezone دون تحويل صامت.
73. `W73` External Source IDs مستقلة عن الأكواد المرئية لكل كيان.
74. `W74` Error Taxonomy: Error/Conflict/Warning/Skip؛ لا commit مع Error.
75. `W75` Repeatable Dry Run: preview/control totals متطابقة بلا كتابة.
76. `W76` Late Failure Rollback يشمل masters/rows/links/audit.
77. `W77` Batch Reversal يحفظ history ويعكس آثار الدفعة فقط.
78. `W78` Import Reconciliation source/inserted/refreshed/skipped/conflict/reversed + repair file.

## اليوم 7 — الحوكمة والإقفال والجاهزية (12)

79. `W79` Command–Permission Matrix: لا command حاكم بلا Permission واختبار رفض. `RP-D7`.
80. `W80` Maker–Checker لكل حدود الاعتماد المالية والنطاقية.
81. `W81` Period-close checklist للتسويات مع استثناءات موثقة.
82. `W82` Reopen governance بسبب وصلاحية وaudit correlation.
83. `W83` Configuration Versioning للتقويم/threshold/EV/FX/templates.
84. `W84` Segregation-of-Duties report للمجموعات المتعارضة.
85. `W85` Retention/Redaction policy تمنع token/password/binary leakage.
86. `W86` Backup/Restore proof: counts+hashes+relationships+audit.
87. `W87` Data Integrity Scanner: orphan/cross-scope/duplicate posting/unbalanced reversal.
88. `W88` Operational performance gate لـ100k row بميزانية معلنة.
89. `W89` Arabic/English acceptance في UI/PDF/Excel دون كسر أرقام/تواريخ.
90. `W90` Monthly Close Pack: hash-signed snapshot يعاد فتحه ويطابق المحركات وData Date.

## بوابة نهاية كل يوم

1. تحديث تقرير كل Increment بـPASS/FAIL/NOT RUN ومصدر كل رقم.
2. لا تبدأ التالي إذا بقي critical gap أو UI غير موصولة بـSQLite/reopen.
3. `npm test` ثم `npm run build` ثم Cargo عند اللزوم ثم `git diff --check`.
4. تشغيل Ollama read-only على الملفات ذات الصلة ومراجعة النتيجة، لا اعتمادها آليًا.
5. Commit واحد لكل Increment أو مجموعة ذرية صغيرة؛ Push إلى Agent Cloud فقط.
6. Codex وحده يضع `CLOSED — 8/10` بعد القبول المحلي والتسوية.
