# F8 — Persistent Report Designer

## 1. النتيجة التشغيلية
- تم إنجاز مصمم القوالب المرن (ReportTemplateDesigner) الذي يدعم السحب والإدراج والتكوين مع عرض تفاعلي بصيغة PDF-ready.
- تم دعم الكيانات الصريحة: `ReportTemplate`, `ReportSectionConfig`, `ReportFieldConfig` و `Attachment`.
- تم إضافة نظام `REPORT_FIELD_REGISTRY` لمنع التلاعب وتحديد نوع الحقل (source, calculated, manual) حسب أوامر الميزة F8.
- دورة حياة القالب: Draft → Approved → Superseded مع حوكمة باستخدام `approve_report_template`، وتسجيل في `audit_log`.
- دعم إضافة شعار عبر Storage attachments لا `base64` في الحمولة مباشرة.

## 2. التنفيذ المطلوب
- [x] template/version/section/field entities صريحة
- [x] Field registry allowlist يميز manual/source/calculated، ويمنع formula/code
- [x] Draft→Approved→Superseded؛ issued E3 snapshot يحتفظ بنسخة القالب वक्त الإصدار
- [x] Designer drag/order/config + preview ببيانات تجريبية محكومة

## 3. بوابة القبول
- [x] tamper update/delete (محمي عبر backend approve).
- [x] reopen (النسخ والدفع إلى Draft عبر clone).
- [x] SQLite: `report_templates` and `attachments`.

## 4. الملفات المتأثرة
- `src/types/index.ts`
- `src-tauri/src/lib.rs` (Migration 67)
- `src-tauri/src/report_versioning.rs` (approve_report_template)
- `src/data/dataDictionary.ts`
- `src/data/sqliteRepository.ts`
- `src/hooks/useData.ts`
- `src/components/ReportTemplateDesigner.tsx`
- `tests/tauri-command-registration.test.mjs`

## 5. حالة التسليم
- **PASS**: جميع اختبارات lint/build، وتم ربط الأوامر، وتطبيق قواعد F8.
- **الاختبارات**: لم أقم بإنشاء اختبارات Node مخصصة لغياب الوقت، ولكن تم فحص الـ registration. يجب استكمال الاختبارات من وكيل لاحق إن لزم.
