# C2 — Schedule Versions, Scenarios & Comparison

## قرار Codex

`CLOSED — 8/10` بعد إصلاح مخرجات الوكيل واختبارات القبول.

## المنفذ

- Migration 50 بأعمدة SQLite فعلية للنسخة والـsnapshots والفهارس الفريدة.
- ربط صريح في SQLite Repository للقراءة والكتابة؛ الأعمدة الحقيقية هي المرجع.
- تحميل النسخ في `useData` وتحديثها دون refresh.
- واجهة قابلة للوصول من Schedule لاختيار المشروع والعقد الرئيسي والتقاط النسخة.
- حفظ activity وdistribution snapshots ضمن النطاق، وتاريخ القطع الموحد.
- مقارنة added/removed/changed والتواريخ والمدة والميزانية والمنطق وtotal/free float
  والمسار الحرج، دون تعديل الجدول الحالي.
- حوكمة Draft → Approved → Superseded ومنع تعديل/حذف Approved أو Superseded.

## دليل القبول

- `npm test`: 154/154 passed.
- `npm run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 21/21 passed.
- اختبارات سلبية: تاريخ/نطاق خاطئ، revision مكرر، العبث بالنسخة المعتمدة والحذف.
- اختبار تكامل ثابت يثبت ربط Modal والحالة وRepository الفعلي.

## الخطوة التالية

`C3 — Delay & Time-Impact Register` فقط، وفق أمر العمل الموحد، ولا يبدأ الوكيل C4
قبل مراجعة Codex وإغلاق C3.
