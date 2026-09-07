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

## اليوم 1 — قبول وتقسية F1–G3 (13)

1. `W01 / D1-01` العمالة: إثبات Draft→Submit→Approve→Post→Reverse وإعادة الفتح؛ مجموع قيود التكلفة = الساعات × الأسعار بفارق ≤0.01. الحزمة `RP-D1`؛ الهدف `labor_timesheet.rs` و`LaborTimesheetModal.tsx` واختباراتهما.
2. `W02 / D1-02` المعدات والوقود: منع تراجع/تداخل العداد، فصل Equipment وFuel، idempotency وعكس صحيح. الهدف `equipment_log.rs` و`EquipmentLogModal.tsx`.
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
