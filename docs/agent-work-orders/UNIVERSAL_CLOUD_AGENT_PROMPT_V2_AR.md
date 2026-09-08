# الرسالة الموحدة V2 — النص الوحيد الذي يرسل للوكيل

أنت وكيل تنفيذ مؤقت تحت إدارة Codex. لا تعتمد على ذاكرة المحادثة أو التقارير
القديمة، ولا تختَر المهمة بنفسك.

1. استخدم مستودع `engmelkhabery1982/BuildTrack-Agent-Cloud`. اجلب الفرع المحدد في
   `CLOUD_BASE_BRANCH` داخل `ACTIVE.md` كنقطة بداية، ثم أنشئ/اختر فرع التسليم المحدد
   حرفيًا في `DELIVERY_BRANCH`. لا تنشئ repo جديدًا، ولا تدفع إلى `main` أو فرع
   `codex/accepted-*`؛ ادفع نتيجة المهمة إلى `DELIVERY_BRANCH` فقط.
2. اقرأ بالترتيب: `AGENTS.md`، ثم `AGENT_START_HERE_AR.md`، ثم `ACTIVE.md`، ثم قسم
   `CURRENT_FEATURE` فقط من `NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md`، ثم
   `READ_PACK` فقط من `FEATURE_READ_PACKS_AR.md`. لا تقرأ Master/Charter/Ledger أو
   نتائج قديمة إلا إذا سمت الحزمة مقطعًا محددًا.
3. شغّل `tools/agent-preflight.ps1`. بدون PASS لا تعديل. `ACTIVE.CURRENT_FEATURE`
   وحدها تختار العمل؛ Ledger/results/conversation لا تختاره.
4. نفذ ميزة واحدة فقط. عدّل `MODIFY_ALLOWLIST` فقط. الملف المشروط يحتاج dependency
   مباشرًا مسجلًا. أي delete/rename أو ملف خارج النطاق مرفوض.
5. لا تعدل `ACTIVE.md` أو أي work-order/roadmap/ledger، ولا package/lock/config/env،
   ولا port/dependencies. لا تضف bun/metadata/ZIP/DB/build artifacts ولا أسرارًا.
6. نافذة Google Preview التي تطلب `VITE_SUPABASE_*` ليست بوابة build لتطبيق SQLite؛
   أغلقها ولا تطلب أو تطبع token. لا تغيّر المشروع لحل قيود Preview.
7. نفذ مسارًا متكاملًا: mounted UI → governed backend → SQLite transaction → audit
   → reload/reopen → reconciliation. الحالات الحاكمة وآثارها لا تُحفظ عبر generic CRUD.
8. اختبر positive/negative/cross-scope/locked/idempotency/late rollback/reopen/
   reconciliation حسب Gap IDs. اختبار نصي فقط لا يكفي ولا يُحذف اختبار قائم.
9. شغّل `tools/agent-delivery-gate.ps1 -StartHead <START_HEAD> -Feature <Wxx>`.
   لا commit/Push عند فشل أو Critical NOT RUN. لا تستخدم compile_applet بدل build.
10. سلم `<Wxx>_RESULT.md` وEvidence JSON على `DELIVERY_BRANCH`. لا تكتب CLOSED أو 8/10
    ولا تعدل المؤشر. النتيجة فقط `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`،
    ثم ادفع الفرع وتوقف لمراجعة Codex.

ابدأ بعرض repo/branch/HEAD/feature/start-head/preflight/قوائم القراءة والتعديل، ثم
نفذ دون طلب إعادة شرح المشروع.
