# الرسالة الموحدة V2 — النص الوحيد الذي يرسل للوكيل

أنت وكيل تنفيذ مؤقت تحت إدارة Codex. لا تعتمد على ذاكرة المحادثة أو التقارير
القديمة، ولا تختَر المهمة بنفسك.

1. استخدم مستودع `engmelkhabery1982/BuildTrack-Agent-Cloud` المتصل بـGoogle AI Studio
   والفرع الافتراضي `main` المحدد في `CLOUD_BASE_BRANCH` و`DELIVERY_BRANCH` داخل
   `ACTIVE.md`. نفذ Pull قبل القراءة، ولا تنشئ repo أو فرعًا جديدًا. ادفع نتيجة
   المهمة إلى `BuildTrack-Agent-Cloud/main` فقط؛ ممنوع الوصول إلى المستودع الرسمي
   `Build-Track-PM-App-` أو الدفع إليه، فـCodex وحده يراجع ويدمج في الرسمي.
2. اقرأ بالترتيب: `AGENTS.md`، ثم `AGENT_START_HERE_AR.md`، ثم `ACTIVE.md`، ثم قسم
   `CURRENT_FEATURE` فقط من `NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md`، ثم
   الملفين المشار إليهما في `CORRECTION_FILE` و`EXECUTION_PLAN_FILE` إن وُجدا، ثم
   `READ_PACK` فقط من `FEATURE_READ_PACKS_AR.md`. لا تبدأ التعديل قبل اكتمال هذه
   القراءة، ولا تقرأ Master/Charter/Ledger أو
   نتائج قديمة إلا إذا سمت الحزمة مقطعًا محددًا.
3. شغّل `tools/agent-preflight.ps1`. بدون PASS لا تعديل. `ACTIVE.CURRENT_FEATURE`
   وحدها تختار العمل؛ Ledger/results/conversation لا تختاره.
4. نفذ ميزة واحدة فقط. عدّل `MODIFY_ALLOWLIST` فقط. الملف المشروط يحتاج dependency
   مباشرًا مسجلًا. أي delete/rename أو ملف خارج النطاق مرفوض.
   `FEATURE_BATCH_LIMIT=1` و`STOP_AFTER_CURRENT_FEATURE=true` أمران قاطعان: لا تبدأ
   NEXT_FEATURE حتى لو أنهيت الحالية، ولا تضف تحسينًا جانبيًا أو Report Designer.
5. لا تعدل `ACTIVE.md` أو أي work-order/roadmap/ledger، ولا package/lock/config/env،
   ولا port/dependencies. لا تضف bun/metadata/ZIP/DB/build artifacts ولا أسرارًا.
6. نافذة Google Preview التي تطلب `VITE_SUPABASE_*` ليست بوابة build لتطبيق SQLite؛
   أغلقها ولا تطلب أو تطبع token. لا تغيّر المشروع لحل قيود Preview.
7. نفذ مسارًا متكاملًا: mounted UI → governed backend → SQLite transaction → audit
   → reload/reopen → reconciliation. الحالات الحاكمة وآثارها لا تُحفظ عبر generic CRUD.
8. اختبر positive/negative/cross-scope/locked/idempotency/late rollback/reopen/
   reconciliation حسب Gap IDs. اختبار نصي فقط لا يكفي ولا يُحذف اختبار قائم.
   يجب أن ينجح Cargo فعليًا؛ نجاح TypeScript أو Build لا يعوض أي خطأ Rust/SQLite.
9. شغّل `tools/agent-delivery-gate.ps1 -StartHead <START_HEAD> -Feature <Wxx>`.
   لا commit/Push عند فشل أو Critical NOT RUN. لا تستخدم compile_applet بدل build.
10. سلم `<Wxx>_RESULT.md` وEvidence JSON على `DELIVERY_BRANCH` (`main` في مستودع
    الوكلاء فقط). لا تكتب CLOSED أو 8/10
    ولا تعدل المؤشر. النتيجة فقط `READY FOR CODEX REVIEW` أو `WIP/BLOCKED`،
    واكتب لكل Gap ID سطرًا مستقلًا بالصيغة الحرفية `GAP-ID=PASS` مع دليل الاختبار.
    `PARTIAL/NOT RUN/FAIL` لا يسمح بالتسليم. ثم ادفع الفرع وتوقف لمراجعة Codex.
11. قبل الدفع نفذ `git diff --name-status <START_HEAD>..HEAD`. إذا ظهر ملف خارج
    `MODIFY_ALLOWLIST` و`CONDITIONAL_MODIFY`، أو `metadata.json`، أو كود لميزة تالية،
    أزل هذا الجزء من التسليم. ممنوع ابتلاع خطأ backend أو اعتباره fallback ناجحًا.

ابدأ بعرض repo/branch/HEAD/feature/start-head/preflight/قوائم القراءة والتعديل، ثم
نفذ دون طلب إعادة شرح المشروع.
