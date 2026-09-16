# BuildTrack — خطة تجميد الميزات والاعتماد التشغيلي

الإصدار: 2026-09-16  
المالك: Codex  
الحالة: `ACTIVE AUTHORITY`  
النطاق: تثبيت وظائف النطاق والبرنامج والتكلفة والتقدم والتقارير الحالية فقط.

## 1. قرار المنتج

تم تجميد W07–W90 وأي شاشة أو تكامل أو ميزة جديدة. لا يعاد فتح التطوير التوسعي قبل
نجاح بوابة الإصدار `ORF14`. وجود شاشة أو نجاح Build لا يساوي قبولًا تشغيليًا.

الهدف هو تحويل التطبيق من قدرات منفردة واسعة إلى نسخة واحدة يمكن الاعتماد عليها في:

- ضبط نطاق العقد والكميات والتغييرات والإنجاز.
- Baseline وCurrent وForecast وData Date والـCPM.
- Budget/Cost Plan وCommitment وActual وEAC/Cash.
- مصالحة PV/EV/AC والكميات والقيم والتواريخ إلى سجلات SQLite المصدرية.
- إصدار تقرير يمكن إعادة إنتاجه لنفس المشروع وتاريخ القطع.

## 2. خط الأساس المثبت عند بدء الخطة

- آخر نسخة سحابية تم التحقق منها: `befdd12c1df56e9e78ded4105fec16a9b4f77127`.
- W05 مقبولة سابقًا؛ W06 لم تغلق 8/10 وتتحول فجواتها إلى `ORF11`.
- النسخة السحابية: Node `291/291` وBuild/Lint ناجحان، لكن Rust الكامل `72/73`.
- الفشل الحرج المثبت: عكس Claim بعد رفضه داخل فترة مقفلة يترك SQLite مقفلة.
- الشجرة المحلية تحتوي سبعة ملفات Rust غير ملتزمة تختلف عن السحابة؛ يمنع إسقاطها أو
  دمجها جماعيًا قبل جرد كل hunk واختباره.
- لا توجد حاليًا بوابة E2E متكررة تثبت UI → SQLite → KPI → Report.

## 3. تعريف القبول 8/10

لا تغلق أي ORF إلا عند تحقق ما يلي معًا:

1. الوظيفة الإيجابية وحالات الرفض والاسترجاع تعمل من نفس مسار الإنتاج.
2. لا توجد mock success أو fallback يخفي غياب مصدر حاكم.
3. كل قيمة لها Project، Main Contract، Data Date، Source IDs وحالة اعتماد.
4. المعاملة الحاكمة ذرية، idempotent، audited وتعمل مع locked period.
5. Node + TypeScript + production build + Cargo + `git diff --check` ناجحة.
6. عند تعلقها بالواجهة، يوجد اختبار E2E أو سجل قبول يدوي مصور من المثبت.
7. لا اختلاف سنت واحد أو كمية غير مفسرة في Golden Scenario.
8. Codex وحده يسجل `CLOSED — 8/10`؛ الوكيل يسلم `READY FOR CODEX REVIEW` فقط.

## 4. قواعد التنفيذ

- مهمة ORF واحدة فقط لكل أمر مستخدم، ثم commit واحد وResult/Evidence واحد والتوقف.
- ممنوع بدء ORF التالية تلقائيًا، وممنوع العودة إلى W07–W90.
- لا حذف أو rename أو reset أو force-push، ولا تعديل بيانات المستخدم.
- لا تعديل package/lock/Cargo/config/env/gates إلا بواسطة Codex وبإعادة توقيع manifest.
- كل وكيل يقرأ حزمة ORF الحالية فقط وفق `OPERATIONAL_RELIABILITY_READ_PACKS_AR.md`.
- أي ملف خارج allowlist يحتاج توقفًا وتسجيل dependency؛ لا يوسع الوكيل النطاق بنفسه.
- لا تقبل نتائج اختبارات source-text وحدها بدل تشغيل SQLite/Rust الحقيقي.
- فشل Cargo في بيئة cloud يسجل `PENDING_LOCAL_CARGO`؛ لا يعد PASS ولا يسمح بإغلاق ORF.

## 5. تسلسل التنفيذ والبوابات

### ORF00 — Release Truth & Version Unification — `CODEX_LOCAL_ONLY`

**الهدف:** تكوين مصدر حقيقة واحد دون فقد العمل المحلي أو السحابي.

التنفيذ:

1. حفظ manifest يتضمن HEAD/branch/hash/status لكل نسخة ونسخة قاعدة البيانات والمثبت.
2. تصدير patch read-only للملفات المحلية السبعة وحساب SHA-256 لها.
3. مقارنة كل hunk مع `agent-cloud/main` وتصنيفه: Keep / Already Upstream / Conflict / Reject.
4. إنشاء فرع `codex/operational-reliability-freeze` من الخط السحابي المحكوم.
5. نقل Keep hunks بوحدات ذرية مع اختبار كل وحدة؛ يمنع copy-all للملفات.
6. إثبات تسجيل كل migration/command في `src-tauri/src/lib.rs`.
7. إنشاء `ORF00_RESULT.md` بمصفوفة القرار لكل ملف.

**القبول:** شجرة نظيفة واحدة؛ لا uncommitted source؛ لا command مفقود؛ جميع الاختبارات
المتاحة ناجحة؛ نقطة رجوع قبل الدمج وبعده؛ بيانات المستخدم لم تُفتح أو تُعدّل.

### ORF01 — SQLite Transaction & Lock Reliability

**الهدف:** منع الأقفال المتبقية والكتابات الجزئية في كل workflow حاكم.

التنفيذ:

- إصلاح rollback الصريح لكل early return في Claims، بدءًا من عكس التحويل المقفول.
- جرد `begin()` في commercial/AP/certificate/cash/cost-plan/import/report/health.
- توحيد busy timeout/WAL/pool lifecycle وفق آلية مشروع واحدة، دون إخفاء contention.
- اختبارات: رفض ثم retry فوري، parallel readers، late-audit rollback، idempotent replay.
- تشغيل Rust كامل بالتوازي، منفردًا، ثم ثلاث مرات متتابعة.

**القبول:** Cargo 100% في الجولات الثلاث، ولا `database is locked` ولا سجل جزئي.

### ORF02 — Schema, Migration & Command Registration Integrity

**الهدف:** قاعدة جديدة وقاعدة مرقاة تنتجان نفس schema والأوامر الفعلية.

- fresh DB + upgrade DB + staged restore.
- مطابقة migrations، tables، typed columns، triggers، indexes وforeign scope.
- مطابقة frontend invokes مع Tauri registrations حرفيًا.
- منع الاعتماد على payload في الحقول المالية/الحالات/العلاقات الحرجة عندما يوجد عمود canonical.

**القبول:** schema diff صفري، invoke/registration diff صفري، upgrade بلا فقد بيانات.

### ORF03 — Contract-First Scope Authority

**الهدف:** عقد رئيسي واحد ينشئ مشروعًا؛ عقود الباطن تتبع ولا تنشئ مشروعًا.

- اختبار creation/import/edit/lock/reopen للعقد الرئيسي والباطن.
- project/main/subcontract/party/code/date scope من UI حتى SQLite.
- رفض cross-project IDs والعقود اليتيمة وتكرار الأكواد ضمن النطاق.

**القبول:** المشروع والعقد الرئيسي 1:1؛ كل subcontract يحمل parent صحيحًا؛ لا orphan.

### ORF04 — BOQ, SOV & Variation Scope Ledger

**الهدف:** أصل النطاق محفوظ وكل تغيير يظهر كسطر أثر مستقل مؤرخ.

- BOQ import ذري ومصالحة row/count/quantity/rate/value.
- Variation: كمية، سعر، كمية+سعر، New Item، حذف/عكس، time-only.
- نفس main BOQ code مع linkage إلى variation، دون overwrite للأصل.
- انعكاس الاعتماد مرة واحدة على revised BOQ/SOV/contract value/cash/baseline-pending.

**القبول:** Original + approved deltas = Revised لكل بند والعقد، وعكس التغيير يعكس أثره مرة.

### ORF05 — WIR, Quantity & Progress Ledger

**الهدف:** الإنجاز المعتمد فقط يحرك الكمية وRevenue EV والفواتير.

- main/subcontract BOQ mapping، أسعار العميل مقابل أسعار الباطن.
- قبول/رفض/Conditional/Correction/Reinstatement وتاريخ فعال.
- منع over-measurement بعد revised quantity ومنع future/undated contribution.
- تجميع عدة WIR للبند دون duplicate في invoice/certificate.

**القبول:** quantity ledger وRevenue EV والشهادات تتصالح إلى WIR IDs عند كل Data Date.

### ORF06 — Primavera/XER Atomic Import & Reconciliation

**الهدف:** استيراد مباشر يحفظ WBS/activities/logic/calendars/resources دون ترحيل أعمدة.

- XER وExcel multi-sheet preview/mapping/validation/commit/reverse.
- duplicate policy، project/contract scope، refresh يحفظ actuals المحلية.
- counts وIDs والعلاقات والتقاويم والقيود والموارد تطابق المصدر.

**القبول:** import/reverse ذري؛ round-trip fixture مطابق؛ الخطأ المتأخر يترك DB دون batch جزئي.

### ORF07 — Baseline, Data Date, Status & CPM Reliability

**الهدف:** Baseline ثابت، Current editable، Forecast مشتق عند Data Date.

- mixed calendars وFS/SS/FF/SF/lag/constraints/milestones/cycles.
- actual start/finish، remaining duration، retained logic وforecast finish.
- مدة summary من network span/critical path، لا مجموع مدد الأنشطة المتوازية.
- Baseline revision للتغيير الزمني دون تعديل snapshot الأصلي.

**القبول:** مقارنة ذات قيم ذهبية عند تاريخين مع Primavera؛ Unavailable لا يتحول إلى صفر.

### ORF08 — Time-Phased Revenue PV & Schedule Progress

**الهدف:** PV من approved frozen distribution وEV من طريقة قياس معتمدة.

- Quantity، 0/100، 50/50، Weighted Milestone وحساب مختلط دون إسقاط نشاط.
- milestone evidence مؤرخ؛ no future rewrite.
- Revenue BAC/PV/EV/SPI وEarned Schedule وS-curve تتطابق عبر الشاشات.

**القبول:** نفس النتائج عند ثلاثة Data Dates مع drill-down لكل مساهمة واستبعاد.

### ORF09 — Delivery Cost Plan & Control Account Authority

**الهدف:** فصل selling/revenue عن delivery cost بصورة غير قابلة للالتباس.

- CBS/Control Account/SOV link، approved Cost Plan versions والفترات.
- Cost BAC/PV/EV من Cost Plan فقط؛ SOV للربط وليس Cost BAC.
- time phasing/overhead/budget transfer/forecast وإعادة الفتح.

**القبول:** غياب Approved Cost Plan = Cost indicators Unavailable؛ totals تتصالح سنتيًا.

### ORF10 — Commitment, Actual Cost, AP & Certificate Chain

**الهدف:** عدم ازدواج التكلفة أو النقد عبر المصادر.

- PO → GRN → Supplier Invoice → Payment/Reversal.
- Labor/Equipment/Subcontract certificate/manual authorized cost attribution.
- accepted GRN لا يحسب مع manual duplicate؛ open commitment ينخفض مرة واحدة.
- client/subcontract certificates، retention/advance/tax/deduction/partial payment.

**القبول:** AC + open commitment + AP + cash تتصالح للمصدر؛ locked period/reversal يعملان.

### ORF11 — Unified EVM & Governed Health Closure

**الهدف:** مصدر واحد لـRevenue SPI وDelivery Cost CPI/EAC وHealth Snapshot.

- استيعاب فجوات W06 Round 10 دون إعادة تصميم عشوائي.
- main-contract scoped schedules، SOV resolution فقط، approved Cost Plan mandatory.
- mixed methods وdated milestones وtwo-account/two-Date Rust/TypeScript parity.
- Dashboard/Card/Cockpit/Report يقرأون snapshot/version واحدة.

**القبول:** parity صفري، no Cost Plan negative، lineage/freshness/exclusions كاملة.

### ORF12 — Dashboard, Reports & Decision Traceability

**الهدف:** كل رقم تنفيذي قابل للحفر حتى سجله، ولا أرقام من fallback/mock.

- project/contract/Data Date موحدة، Unavailable semantics موحدة.
- PV/EV/AC/EAC/CPI/SPI/variations/progress/finish/cash من engines المعتمدة.
- تقرير issued immutable مع snapshot hash؛ الفلاتر لا تغير source facts.
- إخفاء أو وسم أي Portal/Web preview غير تشغيلي.

**القبول:** dashboard = report = reconciliation engine لكل KPI حتى سنت/يوم واحد.

### ORF13 — End-to-End Operational Acceptance

**الهدف:** إثبات دورة المستخدم من واجهة المثبت إلى SQLite ثم القرار.

- تنفيذ `OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md` على DB معزولة.
- UI/import/edit/approve/reject/reopen/reverse/filter/export/report.
- اختبارات automated desktop حيث يمكن، وقائمة قبول يدوية مصورة لما يتطلب WebView.
- اختبار restart للتطبيق بين المراحل لإثبات persistence.

**القبول:** جميع السيناريوهات الإيجابية والسلبية، لا discrepancy غير مفسر، لا console/runtime error.

### ORF14 — Backup, Performance, Installer & Release Gate

**الهدف:** إصدار شخصي يمكن تشغيله واستعادته بثقة.

- backup/verify/staged restore على نسخة اختبار.
- أحجام صغيرة ومتوسطة وكبيرة، import/report/dashboard timing وmemory.
- build installer، install/upgrade/uninstall/reinstall مع حفظ قاعدة المستخدم.
- Release Manifest: commit، hashes، DB schema version، tests، installer SHA-256.

**القبول:** Scope ≥8، Schedule ≥8، Cost ≥8، Integrated Monitoring ≥8، وكل P0 مغلق.

## 6. الترتيب الممنوع تغييره

`ORF00 → ORF01 → ORF02 → ORF03 → ORF04 → ORF05 → ORF06 → ORF07 → ORF08 → ORF09 → ORF10 → ORF11 → ORF12 → ORF13 → ORF14`

لا يسمح بتجاوز بوابة حمراء أو تنفيذ ORF لاحقة لتبدو الواجهة مكتملة. الفجوة المكتشفة تسجل
في Result الحالية، وتصحح في نفس ORF إذا كانت داخل نطاقها؛ وإلا تربط صراحة ببوابتها التالية.

## 7. مخرجات كل ORF

- `docs/agent-results/ORFxx_RESULT.md`
- `docs/agent-results/ORFxx_EVIDENCE.json`
- commit واحد يحمل `[handoff] ORFxx` للوكيل، أو checkpoint Codex موثق.
- أوامر وexit codes وعدد الاختبارات وSTART/END HEAD وSHA-256 للملفات المعدلة.
- قرار Codex: `CLOSED — 8/10` أو `CORRECTION_REQUIRED` مع فجوات قابلة للتنفيذ.
