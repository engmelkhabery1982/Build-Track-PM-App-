# BuildTrack — أمر العمل السحابي الموحد لجميع الوكلاء

## 1. السلطة والهدف

أنت وكيل تنفيذ مؤقت تحت مراجعة Codex. الهدف هو تطوير وظائف التحكم التشغيلي في
المشروع إلى مستوى عملي يقارب الوظيفة المقابلة في SAP PS بدرجة 8/10 داخل النطاق،
مع أرقام وعلاقات قابلة للتدقيق. لا تدّعي أن BuildTrack يطابق SAP ERP كاملًا.

تعمل فقط على:

`https://github.com/engmelkhabery1982/BuildTrack-Agent-Cloud`

لا تدفع إلى المستودع الرسمي، لا تنشر release، لا تعدّل بيانات مستخدم حقيقية، ولا
ترفع secrets أو قواعد SQLite أو `node_modules` أو `dist` أو `target` أو ZIP/PATCH.

## 2. بروتوكول الاستلام — إلزامي لكل وكيل وكل نموذج

نفذ هذا قبل اقتراح أو تعديل أي كود:

1. Pull آخر `main` من Agent Cloud وتحقق من HEAD وworking tree.
2. اقرأ كاملًا وبالترتيب:
   - `AGENTS.md`
   - `docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md`
   - `docs/agent-work-orders/PROJECT_CHARTER_AR.md`
   - هذا الملف.
   - `docs/FEATURE_CATALOG_37_AND_CONTINUATION_AR.md`
   - `docs/SAP_OPERATIONAL_CONTROL_ROADMAP_AR.md`
   - نتيجة الميزة السابقة تحت `docs/agent-results/`.
3. افحص آخر 10 commits وأي diff غير مكتمل للميزة النشطة.
4. شغّل اختبارات الأساس قبل التعديل. إذا كانت فاشلة، سجل الفشل ولا تخفّض اختبارًا.
5. اكتب في رد البداية: HEAD، الميزة النشطة، الموجود منها، الناقص، الملفات المتوقعة،
   ومصدر الحقيقة. لا تطلب من المستخدم إعادة شرح المشروع.
6. أكمل الميزة المسجلة في `CLOUD_PROGRESS_LEDGER.md` من آخر نقطة. ممنوع اختيار ميزة
   أخرى أو إعادة عمل جزء موجود لأن محادثتك لا تتذكره.

عند اختلاف حالة قديمة في Roadmap أو تقرير سابق، يكون ترتيب السلطة:
`CLOUD_PROGRESS_LEDGER.md` ثم هذا الأمر ثم `ACTIVE.md` ثم Feature Catalog ثم Roadmap.
تُستخدم Roadmap لتعريف القدرة ومعيارها، لا لتجاوز حالة الاستمرار الأحدث.

## 3. نموذج العمل غير القابل للكسر

1. عقد رئيسي واحد ينشئ مشروعًا واحدًا. عقد الباطن يتبع الرئيسي ولا ينشئ مشروعًا.
2. BOQ الرئيسي هو مرجع نطاق وكمية وسعر العميل. بند الباطن مرتبط ببند رئيسي.
3. كمية وتقدم الباطن يحملان مرة واحدة إلى الرئيسي؛ تكلفة الباطن تستخدم سعر/تكلفة
   عقده، بينما قيمة تقدم العميل تستخدم سعر البند الرئيسي.
4. Variation المعتمد يضيف سطر نطاق/كمية/سعر/زمن قابلًا للتتبع، ولا يمحو الأصل.
5. Baseline المعتمد مجمد. Current وForecast منفصلان ولا يعيدان كتابة Baseline.
6. Project Data Date هو cut-off واحد للتحليل؛ لا يغير السجلات المصدرية.
7. كل رقم مالي أو كمية أو تاريخ يجب أن يعود إلى صفوف SQLite محددة وحالة اعتماد.
8. عند غياب مصدر كافٍ اعرض `Unavailable / Requires data` ولا تخترع صفرًا أو fallback.
9. أسماء الحقول تتبع Data Dictionary. الحقل الجديد يتطلب تعريفًا وSQLite migration
   وrepository mapping وTypeScript/UI واختبار migration؛ ممنوع حقل JSON خفي فقط.
10. لا تكرر الحساب داخل Dashboard/modal/test. استخدم دالة إنتاج مركزية تعيد الإجمالي
    وصفوف المساهمة حتى يكون drill-down مطابقًا للبطاقة.

## 4. سياسة إنقاذ العمل وعدم رفض الحزمة كاملة

عند استلام عمل وكيل سابق، صنف كل ملف أو hunk إلى:

- `ACCEPT`: صحيح ومتكامل.
- `REPAIR`: مفيد لكن يحتاج تصحيحًا قبل القبول.
- `DEFER`: صحيح لكنه خارج الميزة الحالية؛ يحتفظ به في commit منفصل ولا يدمج الآن.
- `REMOVE-UNSAFE`: mock أو رقم مخترع أو secret أو artifact أو كود يفسد الحوكمة.

لا تحذف الحزمة كلها بسبب عيب جزئي. أصلح واحتفظ بالمفيد. إذا انتهت الميزة دون 8/10،
سجلها `PARTIAL — <score>/10` مع فجوات دقيقة، ولا تزور علامة النجاح. Codex يراجع
ويصحح ويقرر الدمج الرسمي النهائي.

## 5. قواعد Git والتسليم

- العمل متسلسل على `BuildTrack-Agent-Cloud/main` لتوافق Google AI Studio GitHub Sync.
- وكيل واحد يكتب في اللحظة نفسها. قبل كل جلسة: Pull. بعد كل وحدة: test ثم commit ثم Push.
- لا تستخدم force-push ولا تعيد كتابة history.
- ميزة واحدة في كل سلسلة commits؛ لا تجمع A3 وA4 أو غيرهما في commit واحد.
- عناوين commits: `feat(a3): ...`، `test(a3): ...` أو `wip(a3): ...` عند انقطاع الحد.
- حدث `CLOUD_PROGRESS_LEDGER.md` في آخر commit لكل جلسة.
- Codex وحده ينقل المحتوى إلى المستودع الرسمي بعد المراجعة والإصلاح.

## 6. بوابة القبول المشتركة

لا تسجل `READY FOR CODEX REVIEW` إلا إذا توفر:

1. معايير قبول مكتوبة واختبار موجب واختبار سلبي واختبار reconciliation.
2. `npm test` ناجح دون حذف أو إضعاف اختبار.
3. `npm run build` ناجح.
4. `cargo test --manifest-path src-tauri/Cargo.toml` عند لمس Rust/SQLite/migrations.
5. `git diff --check` ناجح وworking tree نظيفة بعد commit.
6. تقرير `docs/agent-results/<FEATURE>_RESULT.md` يذكر ما نفذ وما لم ينفذ فعلًا.
7. لا توجد أرقام mock أو schema assumptions أو ملفات مولدة.

## 7. قائمة التنفيذ بالترتيب

### A3 — فصل Revenue/Progress Value عن Delivery Cost

**الهدف:** منع استعمال سعر العميل أو EV الإيرادي كمؤشر لكفاءة تكلفة التنفيذ.

**مصادر الحقيقة:** الإيراد من العقد الرئيسي وBOQ/SOV المعتمد؛ تكلفة الخطة من
Cost Control/Control Account/CBS/approved cost plan الحقيقي؛ AC من قيود التكلفة
المؤرخة المقبولة؛ commitment من PO المفتوح المقبول.

**المطلوب:**

- جرد فعلي لحقول الميزانية والتكلفة الموجودة قبل إنشاء حقل.
- تعريف Revenue BAC/PV/EV وDelivery Cost BAC/PV/EV/AC/ETC/EAC وMargin بوضوح.
- عدم استخدام Revenue BAC في Cost EAC.
- إذا لا توجد تكلفة خطة معتمدة، تعرض مؤشرات التكلفة `Unavailable` لا سعر البيع.
- ربط Dashboard وControl Account وReport Pack بنفس محرك الحساب.
- حوكمة سالب/غياب التكلفة وتواريخ ما بعد Data Date.

**قبول 8/10:** مشروع له selling rate مختلف عن cost plan يثبت فصل المؤشرين؛ مشروع
بلا cost plan لا يعطي forecast تكلفة مخترعًا؛ كل totals تطابق مصادرها.

### A4 — KPI Source Drill-down & Reconciliation

**الهدف:** كل بطاقة رئيسية تفتح صفوف المصدر التي تكوّن الرقم نفسه.

**المطلوب:** دوال مركزية تعيد `{value, contributions, exclusions, basis}` لـContract,
Variation, PV, EV, AC, Commitment, Cash وForecast؛ filter المشروع والعقد وData Date
وحالة الاعتماد؛ مجموع contributions يساوي البطاقة ضمن 0.01؛ عرض سبب الاستبعاد؛ لا
تعاد كتابة معادلات مستقلة داخل modal.

**قبول 8/10:** اختبارات تستدعي دالة الإنتاج المستخدمة فعليًا في البطاقة والنافذة،
وتكشف اختلاف المشروع أو التاريخ أو status أو duplicate.

### C2 — Schedule Versions, Scenarios & Comparison

**الهدف:** مقارنة Baseline/Current/Forecast دون خلط أو مسح التاريخ.

**المطلوب:** كيان SQLite للنسخة metadata + activity snapshot/distribution snapshot؛
حالات Draft/Approved/Superseded؛ revision وowner/data date/reason؛ مقارنة added,
removed, changed dates/duration/logic/float/critical path؛ منع تعديل approved snapshot؛
واجهة مقارنة وdrill-down.

**قبول 8/10:** حفظ نسختين وإعادة فتحهما، مقارنة دقيقة، baseline immutable، ولا تؤثر
المقارنة على current schedule.

### C3 — Delay & Time-Impact Register

**الهدف:** تحويل التأخير من لون إلى سجل قرار قابل للتدقيق.

**المطلوب:** delay event مرتبط بالمشروع/العقد/WBS/activity/variation؛ تاريخ اكتشاف،
سبب، مسؤول، entitlement، أيام مطلوبة/معتمدة، mitigation، status؛ حساب أثر قبل/بعد
على CPM؛ time impact المعتمد فقط يعدل contract forecast/revised finish ولا يغير baseline.

### C4 — Governed Primavera Reconciliation

**الهدف:** استيراد XER/Primavera تحديثًا محكومًا لا نسخ صفوف.

**المطلوب:** اختيار المشروع والعقد؛ parse calendars/WBS/activities/relationships/
resources/cost distributions؛ mapping preview؛ سياسة duplicate (update/skip/conflict)؛
مطابقة activity code؛ مقارنة file/local؛ commit ذري + rollback + audit؛ الحفاظ على
actuals المحلية إلا بسياسة صريحة؛ اختيار sheet عند Excel متعدد الشيتات.

### D1 — Time-phased Cost Plan by Control Account

**الهدف:** توزيع ميزانية تكلفة التنفيذ زمنيًا ومقارنتها بالواقع.

**المطلوب:** approved cost-plan version؛ periods مرتبطة Data Date/calendar؛ طرق توزيع
linear/front/back/bell/manual؛ reconciliation حتى cent؛ roll-up WBS/CBS/BOQ/Control
Account؛ فصل cost plan عن revenue PV وعن cash.

### D2 — Forecast Methods & Estimate Versions

**الهدف:** ETC/FAC محكومان بدل معادلة واحدة مخفية.

**المطلوب:** طرق Bottom-up، Remaining Budget، CPI، CPI×SPI وManual governed؛ version,
owner, data date, assumptions, approval؛ floor لا يقل عن AC + open commitment عند
اللزوم؛ مقارنة forecast revisions وسبب التغيير.

### D3 — Commitment-to-Actual Reconciliation

**الهدف:** PO → GRN → Supplier Invoice → Payment دون مضاعفة التكلفة أو النقدية.

**المطلوب:** state transition ومبلغ open commitment وaccepted actual وAP payable وcash
settlement؛ partial receipt/invoice/payment؛ reversal؛ VAT/retention/advance؛ source
drill-down؛ reconciliation لكل PO/vendor/period.

### D4 — Cost Variance Drill-down

**الهدف:** تحليل الانحراف حسب WBS/CBS/vendor/period وسبب قابل للتصرف.

**المطلوب:** budget/commitment/actual/ETC/FAC variance tree؛ usage/rate/mix/productivity
فقط عندما تتوفر quantities/rates الموثوقة؛ منع تصنيف كل التكلفة كمقاول باطن؛ totals
بين Cost Entries وCost Control متطابقة دون duplicate.

### E1 — Integrated Project Controls Cockpit

**الهدف:** شاشة قرار واحدة حسب Project + Data Date + Control Account.

**المطلوب:** Scope/Quantity/Schedule/Cost/Progress/Cash/Change/Quality؛ تعريف ومصدر
لكل KPI؛ استثناءات مرتبة بالمادية؛ drill-down؛ لا تجمع مقاييس غير متجانسة في total.

### E2 — Persistent Variance Action Register

**الهدف:** ربط الانحراف بإجراء ومالك وموعد وتصعيد.

**المطلوب:** SQLite entity، source KPI/record، severity/materiality، owner، due date,
status، comments/evidence، audit؛ منع الإغلاق دون evidence؛ إشعار وتصعيد محلي.

### E3 — Controlled Report Pack

**الهدف:** تقرير فترة ثابت المصدر قابل للتوقيع وإعادة الإنتاج.

**المطلوب:** report version + project + Data Date + source snapshot/hash؛ Draft/Issued/
Superseded؛ sign-off؛ قالب مرن وشعار/حقول/صفحات؛ PDF/Excel؛ كل رقم reconciled إلى
المصدر؛ التقرير الصادر immutable.

### الحزمة اللاحقة بعد E3

تنفذ بالترتيب نفسه وبميزة واحدة في كل مرة: Labor approval/posting، Equipment meter/
fuel/approval/posting، Claims/PVO workflow، Client/Subcontract invoice reconciliation،
Cash forecast assumptions/version، Health Score weights/version، Resource leveling
decisions، Report Designer persistence، Append-only Audit Explorer، Hybrid sync، ثم
Users/Roles/Portal/Web. الذكاء الصناعي يأتي بعد البيانات المحكومة، ويكون read-only
مع ذكر مصدر كل رقم ولا يعتمد أو يعدل معاملة.

## 8. تحديث الانتقال بين الميزات

بعد إنهاء الميزة الحالية:

1. ضع نتيجتها في `docs/agent-results/`.
2. غيّر سجل الاستمرار إلى `READY FOR CODEX REVIEW`.
3. لا تبدأ التالية في الجلسة نفسها إلا إذا كانت الاختبارات والبناء ناجحة وكل تغييرات
   الحالية committed/pushed، ثم غيّر السجل صراحة إلى الميزة التالية `IN PROGRESS`.
4. عند دخول وكيل جديد، يكمل الحالة المسجلة ولا يعيد تفسير ترتيب الخطة.
