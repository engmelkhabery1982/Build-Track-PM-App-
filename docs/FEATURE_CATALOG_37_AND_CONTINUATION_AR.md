# BuildTrack — سجل الـ37 ميزة وخطة الاستمرار

**الإصدار الرسمي على GitHub عند إعداد التسليم:** آخر `origin/main` الذي يحتوي هذا الملف وأمر العمل.

**خط الأساس البرمجي الموثوق (يجب أن يكون ancestor):** `a3149e2227b47d62e992ad0397105d9273a90f45`
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
| 4 | EVM ذو المؤشرات القياسية | 🟡 | `src/utils/evm.ts` وS-Curve وPMO Snapshot؛ أُغلق A2 بتاريخ قياس موحد | A3 فصل revenue عن delivery cost، ثم A4 drill-down لكل قيمة. |
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
| 36 | XER Reconciliation Board | 🔧 | مقارنة فعلية read-only أمام local schedule؛ mock أزيل | preview mapping شامل، duplicate policy، apply عبر governed import، audit/report tests. |
| 37 | Unified Tri-Mode Switcher | ❌ | لم يوجد تنفيذ حقيقي قابل للدمج | مؤجل؛ لا ينفذ قبل اكتمال workspaces الحقيقية وXER workflow. |

## ملخص عددي متحفظ

- ✅ متحققة في نطاقها الحالي: **13**.
- 🟡 قوية ولكن تحتاج إغلاقًا تشغيليًا: **18**.
- 🔧 أعيد دمج أساسها الصحيح وتحتاج دورة كاملة: **4**.
- ❌ غير منفذة حقيقيًا: **2**.
- **المجموع: 37 ميزة** (`13 + 18 + 4 + 2`). السجل المرقم هو المرجع للحكم وليس الادعاء السابق بالاكتمال.

> ملاحظة: عند تحديث هذا الملف يجب حساب الحالات آليًا أو يدويًا من الصفوف؛ لا يجوز تغيير الأرقام دون تغيير حالة الصف ودليله.

## ترتيب التطوير الملزم من هذه النسخة

1. ✅ **A2 — Unified Project Data Date:** أُغلق عبر A2.1 وA2.2؛ مصدر واحد في مستوى التطبيق تستهلكه Dashboard وReport Pack وPortfolio وPMO وControl Account وS-Curve وScope/Waste/XER.
2. **A3 — Revenue vs Delivery Cost separation:** التالي؛ يلزم أولًا تعريف حقول تكلفة حقيقية في Data Dictionary وSQLite/UI، ثم حسابات وتسميات منفصلة ومنع استعمال EV الإيرادي كتنبؤ تكلفة.
3. **A4 — KPI source drill-down:** بطاقة → صفوف المصدر → reconciliation total.
4. **C2 — Schedule versions and comparison:** persistence للنسخ/scenarios ومقارنة Baseline/Current/Forecast.
5. **C4 — Governed XER reconciliation workflow:** preview ثم commit ذري ثم report فرق قابل للتدقيق.
6. **D1/D2 — Time-phased cost plan and forecast versions.**
7. **D3/D4 — Commitment-to-actual and cost variance drill-down.**
8. **E1/E2/E3 — Integrated cockpit, persistent actions, controlled reports.**
9. بعد ذلك فقط: إغلاق Labor/Equipment/Claims/Reports ثم Role Workspaces وTri-Mode.

## بوابة إغلاق أي ميزة

لا توضع ✅ إلا بعد وجود: معايير قبول مكتوبة، اختبار موجب وسالب، migration test عند تغيير SQLite، `npm test`، `npm run build`، `cargo test` عند مس backend، مراجعة Ollama read-only، commit واحد واضح، ثم مراجعة Codex ودمجها إلى `main`.

## سياسة GitHub للاستمرار بين الوكلاء

- `main` هو الإصدار الرسمي الوحيد، ويجب أن يظل قابلًا للبناء.
- الوكيل يبدأ من آخر `origin/main` وينشئ فرعًا مؤقتًا `agent/<feature-code>`؛ لا يكتب إلى `main`.
- كل فرع يحمل ميزة واحدة فقط، ولا يدمج نفسه ولا ينشئ release/tag.
- عند عودة Codex: fetch → review diff → tests → إصلاح/رفض → merge → build installer → push `main` → حذف فرع الوكيل البعيد.
- لا تستخدم `master` بعد توحيد GitHub، ولا force-push لأي فرع عمل.
- لا تُرفع قواعد SQLite أو النسخ الاحتياطية أو secrets أو `node_modules` أو `target` أو `dist`.
