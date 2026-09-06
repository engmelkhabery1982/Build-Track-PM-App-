# أمر العمل النشط

## C4 — Governed Primavera Reconciliation

المرجع التنفيذي الكامل:

`docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md` — قسم C4

الحالة: **IN PROGRESS — CODEX-REPAIRED FOUNDATION؛ يجب استكمال C4 قبل D1**.

الموجود: نطاق مشروع/عقد حقيقي، preview للفروق، duplicate policies، رفض الملفات
الفارغة، وحفظ ذري للأنشطة/التحديثات عبر SQLite مع reload بعد النجاح.

الناقص الملزم: auxiliary WBS/Calendars/Resources/Assignments داخل batch، حل العلاقات
إلى IDs، rollback/reload acceptance، XER round-trip، وdesktop acceptance واقعي. بعد
نجاح بوابة C4 ينتقل الوكيل تلقائيًا إلى D1 وفق Feature Catalog دون انتظار رسالة.

أمر التنفيذ والاستمرار الملزم لكل وكيل سحابي:

- `docs/agent-work-orders/MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md`
- `docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md`
- `docs/agent-work-orders/UNIVERSAL_CLOUD_AGENT_PROMPT_AR.md`
