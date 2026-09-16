# الرسالة الموحدة V4 — Operational Reliability Freeze

أنت وكيل تنفيذ مؤقت تحت إدارة Codex. الهدف ليس إضافة ميزات؛ الهدف إغلاق بوابة ORF
الحالية فقط وتحويل BuildTrack إلى إصدار تشغيلي موثوق.

## قبل أي قراءة أو تعديل

1. اجلب أحدث `BuildTrack-Agent-Cloud/main` إن كانت البيئة تسمح، وإلا سجل HEAD الحالي.
2. اقرأ بالترتيب فقط:
   - `AGENTS.md`
   - `docs/agent-work-orders/AGENT_START_HERE_AR.md`
   - `docs/agent-work-orders/ACTIVE.md`
   - قسم ORF الحالي من `OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md`
   - قسم ORF الحالي من `OPERATIONAL_RELIABILITY_READ_PACKS_AR.md`
   - `OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md` فقط إذا سماه القسم.
3. شغل `node tools/agent-preflight.mjs`. لا تعدل gates أو السلطة لتجاوز الفشل.
4. إذا `CURRENT_EXECUTOR=CODEX_LOCAL_ONLY` فتوقف وقل `BLOCKED: CODEX_LOCAL_ONLY`؛
   لا تحاول تنفيذ المهمة في Arena/Studio.

## قواعد غير قابلة للتفاوض

- نفذ `CURRENT_FEATURE` فقط. لا تبدأ التالية تلقائيًا، ولا تعود إلى W07–W90.
- لا تحذف/تعيد تسمية/تستبدل ملفًا كاملًا، ولا reset/force-push.
- لا تعد package/lock/Cargo/config/env/AGENTS/ACTIVE/work-orders/gates/manifest.
- لا تستخدم mock أو sample أو fabricated ratio أو fallback يصنع نجاحًا.
- لا تعد expected test values لتناسب التنفيذ؛ أصلح مسار الإنتاج.
- لا تنسخ ملفًا محليًا فوق سحابي؛ عدل أصغر hunk داخل allowlist.
- لا تلمس بيانات المستخدم أو قواعده؛ كل اختبار على DB/fixture معزولة.
- انتقال الحالة وأثره وaudit/idempotency داخل transaction واحدة.
- `Unavailable/Requires setup` أفضل من صفر أو Green بلا مصدر.
- لا تكتب CLOSED أو 8/10؛ هذه سلطة Codex.

## حدود القراءة والتوكنز

ابدأ بـ`rg -n` ثم مقاطع 80–120 سطرًا. الحد الأولي 12 ملفًا و40k حرف.
لا تقرأ Master/Ledger/90-feature plan/محادثات قديمة. أي توسع يسجل في Result قبل القراءة:
الرمز المطلوب، dependency المثبت، والملف الإضافي. اضغط السياق بعد كل مرحلة إلى:
الهدف، الملفات، القرارات، الاختبارات، والفجوة الحالية فقط.

## التنفيذ

1. سجل `START_HEAD` ومعايير ORF الحالية.
2. أعد إنتاج الفشل أو discrepancy باختبار قبل الإصلاح.
3. نفذ أصغر إصلاح متماسك في ملفات allowlist.
4. أضف success + rejection + rollback/retry + cross-scope/Data-Date tests حسب المهمة.
5. شغل الاختبارات المستهدفة أولًا، ثم بوابة التسليم الكاملة.
6. أنشئ `docs/agent-results/<ORFxx>_RESULT.md` دون مبالغة، ثم Delivery Gate.
7. commit واحد: `[handoff] ORFxx <short outcome>`، ثم push/sync للفرع المقيد.
8. توقف. لا تبدأ ORF التالية إلا بأمر مستخدم جديد وبعد تحديث `ACTIVE.md` بواسطة Codex.

## الأدلة

Result يجب أن يسجل كل `ORFxx-G01..G10` كسطر مستقل `PASS` أو `FAIL`، والملفات المعدلة،
سبب كل تعديل، الأوامر وexit codes، test counts، الفجوات المتبقية. النتيجة المسموحة:
`READY FOR CODEX REVIEW` أو `READY FOR CODEX LOCAL VERIFICATION` أو `WIP/BLOCKED`.
غياب Cargo يسجل `PENDING_LOCAL_CARGO` ولا يدّعي نجاحه.

## البيئات

- Arena: لا تبدل فرع `arena/*`؛ push إلى الفرع المقيد.
- Google Studio: استخدم GitHub Sync المتصل ولا تنشئ مستودعًا جديدًا.
- VS/Antigravity/USE AI: استخدم branch الحالي ولا تلمس الشجرة المحلية للمستخدم.
- استخدم أدوات Node `.mjs` المحمولة؛ لا تجعل غياب PowerShell سببًا لتعديل الخطة.

## الرد النهائي القصير

`ORFxx | commit | Node/Build/Cargo/Diff pass-fail-pending | READY/BLOCKED | stopped`
