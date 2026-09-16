# BuildTrack Agent Bootstrap — Operational Reliability Freeze

## ترتيب السلطة

`AGENTS.md` ← هذا الملف ← `ACTIVE.md` ← قسم ORF الحالي في الخطة ← حزمة القراءة.

اقرأ فقط المسارات التي يسميها `ACTIVE.md`: `SPEC_FILE` و`READ_PACK_FILE` و
`UNIFIED_PROMPT` و`GOLDEN_SCENARIO` عند طلب ORF الحالية.

كل ملفات W07–W90 وV1/V2/V3 وMaster/Ledger أصبحت تاريخًا غير منفذ حتى `ORF14`.

## قاعدة البدء

1. اسحب أحدث `CLOUD_BASE_BRANCH` دون reset/force.
2. سجل HEAD وشغل `PREFLIGHT_COMMAND`.
3. إذا كانت `CURRENT_EXECUTOR=CODEX_LOCAL_ONLY` فتوقف دون تعديل.
4. غير ذلك نفذ `CURRENT_FEATURE` فقط، من read pack الحالي وفي allowlist فقط.
5. سلم Result/Evidence/commit ثم توقف. لا تبدأ `NEXT_FEATURE` دون تحديث Codex للسلطة.

## ثوابت المنتج

- عقد رئيسي واحد ينشئ مشروعًا واحدًا؛ الباطن تابع ولا ينشئ مشروعًا.
- BOQ الرئيسي مرجع نطاق/كمية/سعر عميل، والباطن تكلفة مرتبطة به.
- Variation أثر مستقل مؤرخ، ولا يمحو الأصل.
- Baseline وCurrent وForecast منفصلة، وData Date موحد.
- Revenue منفصل عن Delivery Cost؛ Cost indicators تحتاج Approved Cost Plan.
- كل رقم يعود إلى SQLite وسجل وحالة اعتماد؛ الغياب = Unavailable لا صفرًا مخترعًا.
- كل انتقال حاكم وآثاره وaudit في transaction واحدة قابلة للrollback/retry.

## ممنوعات التجميد

- إضافة شاشة/ميزة/تكامل أو إعادة تصميم UX خارج فجوة قبول مثبتة.
- mock success، sample production data، hidden fallback، أو تعديل expected لإمرار الاختبار.
- حذف/rename/whole-file overwrite أو تعديل package/config/authority.
- قراءة المشروع كاملًا؛ القراءة المقيدة إلزامية.

Codex وحده يعلن `CLOSED — 8/10` ويحدث المؤشر ويبني الإصدار.
