# BuildTrack — سجل الـ37 ميزة وخطة الاستمرار

**الإصدار الرسمي على GitHub عند إعداد التسليم:** آخر `origin/main` الذي يحتوي هذا الملف وأمر العمل.

**HEAD المتزامن المحلي/الرسمي/Agent Cloud عند هذا التحديث:** `9edb10c57cc416fd78d65d0afc01af453fe35461`
**خط الأساس التاريخي الموثوق (ancestor):** `a3149e2227b47d62e992ad0397105d9273a90f45`
**نقطة الرجوع المحلية:** `checkpoint-verified-desktop-2026-09-05`  
**قاعدة الحكم:** وجود ملف أو شاشة لا يعني اكتمال الميزة. الإغلاق يتطلب مصدر SQLite حقيقيًا، تكاملًا تشغيليًا، اختبارًا إيجابيًا وسلبيًا، وبناءً ناجحًا.  
**الهدف:** 8/10 مقارنة بالوظيفة المقابلة في SAP PS داخل نطاق إدارة المشروع، وليس مطابقة SAP ERP كاملًا.

## معاني الحالات

- ✅ **متحققة:** تعمل على بيانات فعلية ولها دليل اختبار مناسب لنطاقها الحالي.
- 🟡 **قوية ولكن غير مغلقة:** منطق أو شاشة حقيقية موجودة، لكن ينقصها persistence أو drill-down أو حوكمة/اختبار نهاية إلى نهاية.
- 🔧 **أعيد دمجها وتحتاج استكمالًا:** استخرج الجزء الصحيح من النسخة التجريبية وربط بالمشروع، لكنها ليست دورة تشغيلية كاملة.
- ❌ **غير منفذة:** النسخة التي ادعت وجودها كانت mock أو غير مربوطة، ولذلك أزيلت بدل إبقائها مضللة.

## السجل الكامل

| # | الميزة | الوضع المثبت الآن | دليل حالي مختصر | المطلوب للإغلاق 8/10 |
|---:|---|---|---|---|
| 1 | Code Locking & Immutability | ✅ | `src/data/codeControls.ts` وربط SQLite/UI | إبقاء اختبارات عدم تغيير الأكواد بعد الاعتماد ضمن regression. |
| 2 | CPM Predecessor Engine (FS/SS/FF/SF) | ✅ | `src/utils/cpm.ts` واختبارات CPM/XER | لا تغيير دون اختبار network متعدد الروابط. |
| 3 | Critical Path Analyzer | ✅ | CPM + حقول float/critical + dashboard | الحفاظ على فصل الخطة عن forecast. |
| 4 | EVM ذو المؤشرات القياسية | ✅ | A2/A3/A4 مغلقة: Data Date موحد، Revenue منفصل عن Delivery Cost، وKPI reconciliation/drill-down مختبر | regression فقط؛ أي KPI جديد يستخدم المحرك المركزي نفسه. |
| 5 | Audit Trail Explorer | 🟡 | audit/approval records موجودة | سجل SQLite append-only موحد، هوية المستخدم، شاشة بحث، اختبار منع العبث. |
| 6 | WIR Register | ✅ | `wir_entries`، UI، repository واختبارات | regression فقط. |
| 7 | WIR Quantity Over-run Protection | ✅ | Quantity Ledger + تحقق الزيادة واختبارات قبول | regression مع Variations/corrections. |
| 8 | Labor Duty & Timesheet | 🟡 | جدول/UI وحساب تكلفة | اعتماد timesheet، ربط resource/control account، posting ذري إلى actual cost. |
| 9 | Heavy Equipment Timesheet | 🟡 | جدول/UI وحساب تكلفة | نفس دورة العمالة مع meter/fuel/approval/actual-cost posting. |
| 10 | Central Tracking Sheet | 🟡 | tracking/dashboard summaries | تعريف موحد للمصادر، drill-down، وعدم تجميع أرقام غير متجانسة. |
| 11 | Back-to-Back Subcontract Invoices | 🟡 | invoices وmain-BOQ mapping | reconciliation كامل بين WIR/certificate/retention/payment/cash دون ازدواج. |
| 12 | Client IPC Governance | ✅ | Payment Certificates، retention/advance والاختبارات الذرية | إضافة تنسيق تقارير معتمد لاحقًا دون تغيير الحساب. |
| 13 | Variations & Claims / PVO | 🟡 | Variation package الحقيقي يعمل؛ mock PVO أزيل | Claim/PVO register حقيقي، workflow وsource documents ثم التحويل إلى Variation معتمد. |
| 14 | Dynamic S-Curve PV/EV/AC/Forecast/Cash | ✅ | Dashboard + EVM/time-phased calculations | بعد A2 يجب أن يستهلك التاريخ العام نفسه. |
| 15 | Cumulative Cash Flow Forecast | 🟡 | Cash ledger/forecast موجود؛ القيم الاصطناعية أزيلت | forecast assumptions محفوظة، version/owner، reconciliation مع invoices/payments. |
| 16 | Project Health Score | 🟡 | Dashboard heuristic حقيقي المصدر | أوزان محكومة قابلة للتفسير، threshold/version، drill-down واختبارات. |
| 17 | Early Warnings & Action Items | 🟡 | warnings موجودة؛ بعض action state جلسة فقط | persistence، owner/due/status/source link، audit/escalation. |
| 18 | Global Project Context Filter | ✅ | Dashboard والجداول تعزل المشروع | توحيده لاحقًا مع Data Date في context واحد. |
| 19 | Report Template Designer | 🟡 | مكونات designer/report موجودة | حفظ القالب، version، logo/sections/fields، preview/export واختبار صحة الأرقام حسب التاريخ. |
| 20 | Executive Report Pack | 🟡 | `ReportPack.tsx` وحسابات مؤرخة | sign-off/freeze/version، مصدر تاريخ عالمي، PDF فعلي واختبار reconciliation. |
| 21 | Resource Capacity Board | 🟡 | resource loading/capacity وPrimavera resources | persistence لقرارات leveling، calendars/shifts كاملة، acceptance UI. |
| 22 | Work Queue Desk | 🟡 | `WorkQueue.tsx` يقرأ سجلات حقيقية | workflow موحد، assignments، due/escalation وdrill-down. |
| 23 | PMO Insights | 🟡 | شاشة/مؤشرات موجودة | توحيد Data Date، تعريف KPI، traceability إلى المصادر. |
| 24 | Preferences Panel | 🟡 | preferences محلية | ربط الإعدادات بالمستخدم/role واختبار أثرها دون تغيير بيانات المشروع. |
| 25 | Command Palette | 🟡 | تنقل/بحث موجود | بحث سجلات محكوم بالصلاحيات، recent actions واختبار keyboard/accessibility. |
| 26 | Governed Excel Import/Export | ✅ | preview، sheet selection، atomic import، tests | توسيع dictionaries عند إضافة أي كيان جديد فقط. |
| 27 | SQLite / Supabase Hybrid | 🟡 | SQLite/Tauri فعلي وSupabase adapter موجود | لا توجد مزامنة موثوقة بعد: sync protocol، conflict resolution، security واختبارات offline/online. |
| 28 | Scope Governance Engine | 🔧 | أعيد دمجه في Data Quality/Dashboard واختبر | block/approval workflow للسجل غير المربوط بدل الاكتشاف فقط. |
| 29 | BOQ Waste & Savings Ledger | 🔧 | accepted GRN + WIR/corrections + main mapping واختبارات | صفحة ledger وتفاصيل source، allowance contract governance، savings treatment. |
| 30 | Earned Schedule Engine | 🔧 | ES/SV(t)/SPI(t) من PV/EV الفعلي واختبارات | calendar-time conversion وEAC(t) موثق، trend/version وdrill-down. |
| 31 | Supplier AP Aging & Reconciliation | ✅ | Supplier AP/PO/GRN/payment migrations واختبارات Rust/JS | إضافة presentation aging buckets فقط إذا لم يغير ledger. |
| 32 | Data Quality & Integrity Rules | ✅ | `src/data/dataQuality.ts` وشاشة رسمية واختبارات | كل ميزة جديدة تضيف rule واختبارًا سلبيًا. |
| 33 | Control Account Summary | ✅ | WBS/BOQ/CBS/SOV/PV/EV/AC/commitment/FAC + tests | يستهلك A2 Data Date العام عند تنفيذه. |
| 34 | Work Calendars & Working Days | ✅ | calendars/exceptions/shifts/import/CPM واختبارات | regression فقط. |
| 35 | Role-Based Workspaces | ❌ | النسخة كانت hardcoded mock وغير mounted؛ أزيلت | تعاد من الصفر بعد users/permissions وببيانات حقيقية، وليس قبل الوظائف التشغيلية. |
| 36 | XER Reconciliation Board | 🔧 | C4 foundation مدمج: scope/diff/duplicates وcommit ذري حقيقي؛ لا نجاح وهمي | إكمال auxiliary WBS/calendars/resources، relationship resolution، rollback/reload وround-trip/desktop acceptance وفق C4 التفصيلية. |
| 37 | Unified Tri-Mode Switcher | ❌ | لم يوجد تنفيذ حقيقي قابل للدمج | مؤجل؛ لا ينفذ قبل اكتمال workspaces الحقيقية وXER workflow. |

## ملخص عددي متحفظ

- ✅ متحققة في نطاقها الحالي: **14**.
- 🔧 أعيد دمج أساسها الصحيح وتحتاج دورة كاملة: **4**.
- ❌ غير منفذة حقيقيًا: **2**.
- 🟡 قوية ولكن تحتاج إغلاقًا تشغيليًا: **17**.
- **المجموع: 37 ميزة** (`14 + 17 + 4 + 2`). السجل المرقم هو المرجع للحكم وليس الادعاء السابق بالاكتمال.

> ملاحظة: عند تحديث هذا الملف يجب حساب الحالات آليًا أو يدويًا من الصفوف؛ لا يجوز تغيير الأرقام دون تغيير حالة الصف ودليله.

## ترتيب التطوير الملزم من هذه النسخة

1. ✅ **A2 — Unified Project Data Date:** مغلق 8/10.
2. ✅ **A3 — Revenue vs Delivery Cost separation:** مغلق 8/10.
3. ✅ **A4 — KPI source drill-down:** مغلق 8/10.
4. ✅ **C2 — Schedule versions and comparison:** مغلق 8/10.
5. ✅ **C3 — Delay & Time-Impact Register:** مغلق 8/10 بعد تصحيح Codex.
6. 🔧 **C4 — Governed XER reconciliation workflow:** الميزة النشطة؛ أكملها أولًا وفق المواصفة التفصيلية في أمر العمل.
7. **D1 ثم D2 ثم D3 ثم D4**؛ لا دمج بين بواباتها.
8. **E1 ثم E2 ثم E3**.
9. **F1–F9** لإغلاق الدورات التشغيلية الجزئية.
10. **G1–G3** للمزامنة والصلاحيات والويب بعد ثبات SQLite والدورات التشغيلية.

## Backlog التنفيذي الدقيق — ما يجب على الوكيل تنفيذه

القواعد المشتركة لكل بند أدناه: `DELETE_ALLOWLIST: []`. يبدأ الوكيل من آخر HEAD،
يفحص الموجود ويكمله ولا يعيده، ويستخدم SQLite كمصدر حقيقة. أي كيان حاكم جديد يحتاج
Data Dictionary + migration جديدة + repository mapping + types + UI إنتاجية + اختبار
إعادة فتح. كل حساب مركزي يعيد الإجمالي وصفوف المساهمة والاستبعادات وأساس الحساب.

### D1 — Time-phased Delivery Cost Plan by Control Account

- **النطاق:** خطة تكلفة التنفيذ فقط، لا Revenue PV ولا Cash. ترتبط كل خطة بـProject،
  Main Contract، Control Account، WBS، CBS/Cost Code، SOV/BOQ عند توفره، وData Date.
- **التخزين:** كيان `cost_plan_versions` بحالات Draft/Approved/Superseded وowner/reason/
  revision/data_date؛ وصفوف `cost_plan_periods` بمبلغ الفترة وتاريخها ومصدر التوزيع.
  النسخة المعتمدة immutable ولا توجد نسختان Approved لنفس النطاق.
- **الحساب:** طرق Manual/Linear/Front-loaded/Back-loaded/Bell؛ مجموع الفترات يساوي
  BAC تكلفة التسليم حتى 0.01 مع penny reconciliation. التقويم والفترات المغلقة محترمة.
- **الواجهة:** إنشاء/معاينة/اعتماد نسخة، grid زمني، roll-up من Control Account إلى
  WBS/CBS/Project، وفروق النسخ. لا تعرض خطة إيراد كتلفة عند غياب Cost BAC.
- **القبول:** توزيع موجب وسالب/rounding، cross-scope، overlap، immutability، reopen،
  roll-up بلا duplicate، وتطابق S-curve cost PV مع النسخة المعتمدة عند Data Date.

### D2 — Governed Estimate / ETC / FAC Versions

- **النطاق:** توقع تكلفة التنفيذ لكل Control Account ثم المشروع؛ AC من القيود المقبولة
  حتى Data Date وOpen Commitment من PO غير الملغى، وليس من قيمة العقد/EV الإيرادي.
- **التخزين:** `estimate_versions` و`estimate_lines` مع method: Bottom-up، Remaining
  Budget، CPI، CPI×SPI، Manual؛ assumptions/owner/reason/data_date/revision/status.
- **الحوكمة:** FAC لا يقل عن AC + open commitment إلا waiver موثق ومعتمد؛ Manual ETC
  لا يكتب فوق actuals؛ النسخة المعتمدة frozen وتصبح السابقة Superseded ذريًا.
- **الواجهة:** مقارنة revisions وFAC/ETC/variance at completion، وdrill-down للمعادلة
  والمساهمات. تعرض Unavailable إذا Cost BAC أو مدخل الطريقة غير كافٍ.
- **القبول:** اختبارات طرق الحساب، zero/negative/reversal، missing cost plan، floor،
  version lifecycle، Data Date، وتجميع الحسابات يساوي Project FAC حتى 0.01.

### D3 — Commitment → Receipt → Supplier AP → Payment Reconciliation

- **النطاق:** PO approved/amended/cancelled، GRN partial، supplier invoice partial،
  VAT/retention/advance/deductions، settlement/reversal، وبائع/فترة/Control Account.
- **المصدر:** Open commitment = PO approved المعدل ناقص accepted receipts الملائمة؛
  AC من accepted receipt أو سياسة posting المحددة مرة واحدة؛ AP من invoice approved؛
  Cash من payment settled فقط. يمنع مضاعفة GRN والفاتورة في AC.
- **الواجهة:** reconciliation ledger لكل PO يظهر ordered/received/invoiced/paid/open
  والاختلافات، مع source links وحالات exception.
- **القبول:** partials متعددة، over-receipt/invoice/payment مرفوضة، cancellation بعد
  receipt مرفوض، reversal يعيد الأرصدة دون حذف history، وفروق totals = صفر.

### D4 — Cost Variance Breakdown & Drill-down

- **النطاق:** Budget/Commitment/AC/ETC/FAC/variance حسب Project→WBS→CBS→Control
  Account→Vendor→Period، بنفس محرك D1–D3.
- **التحليل:** Usage = (Actual Qty−Plan Qty)×Plan Rate؛ Rate = Actual Qty×(Actual
  Rate−Plan Rate). Mix/Productivity/Efficiency لا تظهر إلا بمدخلاتها الموثوقة وإلا
  `Unavailable`. التصنيف من Cost Entry/PO الحقيقي والمقاول من العقد الرئيسي.
- **الواجهة:** tree قابل للتوسيع، فلترة متعددة، بطاقة تطابق drill-down؛ لا جمع لمؤشرات
  نسبية غير متجانسة ولا تصنيف كل البنود Subcontractor.
- **القبول:** إجمالي Cost Control = Cost Entries المقبولة مرة واحدة؛ اختبارات فصل
  usage/rate، missing quantities، vendor/category filters، وreconciliation حتى 0.01.

### E1 — Integrated Project Controls Cockpit

- **النطاق:** Project + Main Contract + Unified Data Date + Control Account.
- **العرض:** Scope/quantity، Baseline/Current/Forecast/critical، Revenue PV/EV، Cost
  BAC/AC/ETC/FAC، commitment، cash، variations/delays، quality وdata-quality blockers.
- **السلوك:** materiality-ranked exceptions، traffic-light له threshold موثق، وكل
  بطاقة تفتح contributions/exclusions/basis. لا معادلات محلية داخل Dashboard.
- **القبول:** مشروع مرجعي كامل يطابق جميع ledgers؛ تبديل المشروع/التاريخ يغيّر كل
  البطاقات معًا؛ لا رقم من تاريخ لاحق؛ unavailable لا يتحول صفرًا.

### E2 — Persistent Variance Action Register

- **التخزين:** Action في SQLite مرتبط بـsource KPI/entity/snapshot، severity/materiality،
  owner، due date، status، comment، evidence/document، timestamps وaudit.
- **الدورة:** Open→Assigned→In Progress→Resolved→Closed؛ يمنع الإغلاق دون evidence
  وresolution، والمتأخر يصعّد محليًا دون إرسال خارجي تلقائي.
- **الواجهة:** queue حسب الدور/المشروع/الاستحقاق، إنشاء action من cockpit warning،
  deep link للمصدر، history غير قابل للمحو.
- **القبول:** restart persistence، invalid transition، overdue escalation، cross-scope،
  close-without-evidence، audit immutability، وعدم إنشاء duplicate من التحذير نفسه.

### E3 — Controlled Reproducible Report Pack

- **التخزين:** report version/project/data date/template/source snapshot/hash/status
  Draft/Issued/Superseded، issuer/sign-off وتاريخ الإصدار. Issued immutable.
- **المحتوى:** كل KPI من reconciliation engine، مع basis وunavailable/exclusions؛
  الشعار والعناوين والصفحات والحقول من template محفوظ versioned.
- **الإخراج:** PDF وExcel يعاد إنتاجهما من نفس snapshot وتطابق totals 0.01؛ لا يعتمد
  التقرير على filters لحظية متروكة في Dashboard.
- **القبول:** تقرير قبل/بعد Data Date، hash/reopen، issue/supersede، template fields،
  PDF/Excel smoke، ومقارنة آلية بين أرقام التقرير ومحرك المصدر.

### F1 — Labor Timesheet Approval & Actual-Cost Posting

- اربط العامل/crew وactivity/control account/cost code/date/hours/rate؛ Draft→Submitted
  →Approved→Posted→Reversed. Posted فقط يولد Cost Entry ذريًا بمعرف مصدر فريد.
- امنع ساعات سالبة/تكرار العامل-اليوم/خارج تقويم أو عقد أو فترة مغلقة؛ overtime له rate
  صريح. القبول يثبت partial crew، reversal، وعدم duplicate posting.

### F2 — Equipment Meter/Fuel Approval & Posting

- اربط equipment/activity/control account والتاريخ وmeter start/end/hours/fuel/rates؛
  تحقق end≥start وعدم overlap والقدرة والتقويم. Posted يولد equipment/fuel actuals مرة
  واحدة، وreversal لا يحذف التاريخ. اختبر meter rollback وduplicate invoice/source.

### F3 — Claims / PVO Workflow

- كيان Claim/PVO حقيقي مرتبط بعقد/Delay/RFI/Document مع notice date، entitlement،
  claimed/assessed/approved cost/time، status وapprovals. فقط approved conversion ينشئ
  Variation package؛ لا تعديل BOQ/Budget/Finish قبل ذلك. اختبر notice期限، رفض،
  partial assessment، duplicate conversion وtraceability.

### F4 — Client/Subcontract Invoice & Certificate Reconciliation

- Client invoice يجمع WIR المقبول بسعر الرئيسي؛ subcontract invoice بكمية الباطن
  وسعر عقده؛ grouping بند واحد لكل الفترة، retention/advance/VAT/deductions، certificate
  وpayment/cash. اختبر 5 WIR لنفس البند، back-to-back cap، partial payment، reversal،
  وعدم احتساب الباطن إيرادًا إضافيًا للمشروع.

### F5 — Versioned Cash Forecast Assumptions

- افصل Actual Cash settled عن Forecast؛ خزّن assumptions للـpayment terms/lag/
  probability/date overrides في version Draft/Approved/Superseded. اربط Client AP/AR،
  Supplier/Subcontract payments وPO forecast. اختبر cash-in/out، overdue، cancellation،
  Data Date وS-curve reconciliation.

### F6 — Governed Project Health Score

- weights/thresholds/version لكل schedule/cost/cash/scope/quality/data quality؛ المجموع
  100%، وكل component يعرض source/score/reason. Missing critical input يخفض confidence
  ولا يصبح green. اختبر threshold boundaries، missing data، version changes وdrilldown.

### F7 — Resource Leveling Decision Register

- توصيات leveling تبقى read-only حتى قرار Planner؛ خزّن proposal/affected activities/
  before-after dates/float/overload/owner/status. Apply ينشئ Forecast version ولا يغير
  Baseline. اختبر calendars/capacity، reject/apply/reverse وCPM comparison.

### F8 — Persistent Report Designer

- قالب SQLite versioned: logo metadata، header/footer، sections، allowed fields، filters،
  grouping، totals وorientation؛ preview من snapshot. امنع formula/field غير مسموح،
  واختر الشعار كمرفق محلي لا base64 ضخم في payload. اختبر save/reopen/clone/version/
  preview/export وحقول يدوية مقابل محسوبة.

### F9 — Append-only Audit Explorer

- وحّد audit للعمليات الحاكمة مع actor/action/entity/before/after/source batch/time؛
  triggers تمنع update/delete، UI بحث وتصفية/export، deep link للمصدر. لا تسجل secrets
  أو binary. اختبر العبث، reversal linkage، filters، وإعادة فتح.

### G1 — Desktop/Web Hybrid Sync Protocol

- لا يبدأ قبل إغلاق F9. صمم API/PostgreSQL mapping، local outbox/inbox، stable IDs،
  cursor/idempotency، conflict policy لكل كيان، encryption/auth/offline retry. لا تضع
  Supabase secrets في client. اختبر offline→online، duplicate delivery، concurrent edit،
  schema version، attachment retry وrecovery؛ SQLite يبقى قابلًا للعمل منفردًا.

### G2 — Users, Roles & Segregation of Duties

- Users/Roles/permissions SQL حقيقية: PMO Admin/Planner/Commercial/Cost/Field/Viewer؛
  enforce في backend لا إخفاء زر فقط. approval limits وmaker-checker ومنع self-approval،
  session/audit. اختبر كل command مسموح/مرفوضًا وmigration لأول administrator.

### G3 — Client/Subcontractor/Supplier Portal & Web

- Portal محدود بالنطاق والصلاحية: submissions/WIR/invoices/documents/status/comments؛
  لا يرى مورد غير بياناته. API validation/audit/attachments/notifications opt-in، وواجهة
  responsive. اختبر tenant isolation، expired session، upload scanning limits، approval
  separation، ومطابقة البيانات مع Desktop sync.

### H1 — Read-only Decision Assistant (بعد G3 فقط)

- الذكاء الصناعي يقرأ snapshots محكومة ويجيب مع source row links وData Date/confidence؛
  لا يكتب أو يعتمد أو يحذف. يدعم تفسير variance/forecast/risks وصياغة ملخص مسودة.
  اختبر prompt injection من المستندات، غياب المصدر، الأرقام، permissions وoffline mode.

## بوابة إغلاق أي ميزة

لا توضع ✅ إلا بعد وجود: معايير قبول مكتوبة، اختبار موجب وسالب، migration test عند تغيير SQLite، `npm test`، `npm run build`، `cargo test` عند مس backend، مراجعة Ollama read-only، commit واحد واضح، ثم مراجعة Codex ودمجها إلى `main`.

## سياسة GitHub للاستمرار بين الوكلاء

- الوكيل السحابي يعمل فقط على `BuildTrack-Agent-Cloud/main` المتسلسل؛ يسحب قبل العمل
  ويدفع بعد كل ميزة/بوابة. المستودع الرسمي لا يلمسه إلا Codex.
- كل commit يحمل ميزة واحدة فقط. بعد test/build/commit/push ينتقل الوكيل للميزة التالية
  وفق السجل دون انتظار رسالة، مع بقاء قرار 8/10 النهائي لـCodex.
- عند عودة Codex: fetch → review كامل الفرق → إصلاح المفيد وعدم رفض الحزمة → tests →
  دمج الرسمي → build installer → مزامنة الرسمي والفرعي.
- لا تستخدم `master` بعد توحيد GitHub، ولا force-push لأي فرع عمل.
- لا تُرفع قواعد SQLite أو النسخ الاحتياطية أو secrets أو `node_modules` أو `target` أو `dist`.
