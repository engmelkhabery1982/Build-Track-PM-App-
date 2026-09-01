# خارطة الطريق التشغيلية — المقارنة العملية مع SAP Project System

**الحالة:** المرجع الملزم لترتيب التطوير التشغيلي.  
**المعيار:** لا تُغلق الميزة كـ«مكتملة» إلا بعد تحقق آلي، بناء إنتاج، وفحص قبول يثبت نتيجة قابلة للتتبع. هدف المقارنة في كل ميزة: **8/10 على الأقل من وظيفة SAP المقابلة**، لا مجرد وجود شاشة أو أعمدة.

## 1. منهج القياس

المقارنة هنا مع وظائف SAP Project System / S/4HANA ذات الصلة بالتحكم بالمشروع، لا مع بنية SAP المؤسسية الكاملة أو ERP العام.

المصادر المرجعية الرسمية:

- [WBS كأساس للتخطيط والتحكم](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4dd8cb7b1c484b4b93af84d00f60fdb8/26d4b65334e6b54ce10000000a174cb4.html)
- [الجدولة الشبكية والتواريخ والـfloat](https://help.sap.com/docs/SAP_ERP/5ecdd9085d344e6693e65fc60c3b5b0f/0673b65334e6b54ce10000000a174cb4.html)
- [تحليل التكلفة والخطة والفعلية](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4dd8cb7b1c484b4b93af84d00f60fdb8/1448cfa991784030b1a4a39f425cfd1c.html)
- [تحليل التقدم والقيمة المكتسبة](https://help.sap.com/docs/SAP_ERP_SPV/5ecdd9085d344e6693e65fc60c3b5b0f/4503c453f57eb44ce10000000a174cb4.html)
- [التكلفة الفعلية والالتزام ومراقبة الإتاحة](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4dd8cb7b1c484b4b93af84d00f60fdb8/f711d553088f4308e10000000a174cb4.html)

## 2. الوضع التشغيلي الحالي — أدلة وليس افتراضات

| المجال | المنفذ والمتحقق | التقدير العملي الحالي | الفجوة المؤثرة |
|---|---|---:|---|
| العقد والنطاق وBOQ | عقد رئيسي/باطن، BOQ، Variation، ربط المشروع والعقد، منع تجاوز الكمية واختبارات علاقة النطاق | 6/10 | لا توجد دورة تغيير موحدة تجمع أثر النطاق/الكمية/السعر/الزمن والميزانية والخطة في package واحد قابل للمقارنة قبل/بعد. |
| WBS والبرنامج | WBS، أنشطة، علاقات CPM، lag، critical path، calendars، baseline snapshots، XER import، forecast dates | 6.5/10 | لا توجد دورة تحديث برنامج تشغيلية مكتملة تربط actual/remaining/progress ببيانات التاريخ وتنتج schedule status/version واحدًا قابلاً للتدقيق. |
| الكميات والتقدم | WIR، الكمية المعتمدة، تسعير البند الرئيسي، منع تجاوز BOQ، تحميل باطن على رئيسي، EV موحد حسب التاريخ | 6/10 | لا يوجد Quantity/Progress ledger تراكمي مصحح حسب فترة مع measurement method رسمي على مستوى WBS/Activity/BOQ. |
| التكلفة والالتزامات | CBS/Cost Code، SOV، PO، GRN، actual cost، Cost Change، شهادات، Cash، availability control | 6.5/10 | لا يوجد Control Account موحّد يعرض الخطة والالتزام والفعلية وETC/FAC موزعة زمنيًا حسب WBS/Cost Code وبـData Date واحد. |
| EVM والتنبؤ | PV/EV/AC/CPI/SPI/EAC، Baseline، S-Curve، PMO Snapshot، تجميع عقد الباطن، Portfolio Forecast Finish | 6.5/10 | EVM لا يملك بعد طبقة Control Account وmeasurement rules ونسخ Forecast قابلة للمقارنة؛ يلزم فصل صريح بين قيمة الإنجاز/الإيراد وتكلفة التنفيذ. |
| التقارير واتخاذ القرار | Dashboard، Portfolio، alerts، snapshots، data quality، drill navigation | 5.5/10 | لا يوجد report pack تشغيلي موحد يعرض variance وسببها ومالك الإجراء وموعده مع drill-down كامل إلى المعاملات. |

هذه الدرجات متحفظة: وجود المعادلة أو الجدول لا يعني اكتمال وظيفة SAP؛ المطلوب هو ترابط المصدر، Data Date، النسخة، والقدرة على اتخاذ إجراء.

## 3. تسلسل التنفيذ الإلزامي

### البوابة A — نموذج التحكم الموحّد (الأولوية القصوى)

**الهدف:** جعل WBS/BOQ/Activity/Cost Code/Control Account محورًا واحدًا يقرأ منه المدير النطاق والوقت والتكلفة والكمية.

| # | الميزة | الحالة | قبول 8/10 |
|---:|---|---|---|
| A1 | Control Account master: WBS + BOQ + Cost Code + عقد رئيسي، مع roll-up واضح | ✅ مكتمل — قبول 8/10 | يمكن فتح أي WBS وعرض scope/quantity/PV/EV/AC/commitment/ETC/FAC دون جمع يدوي أو تكرار باطن. |
| A2 | Project Data Date موحّد لكل تقرير/Portfolio/Curve/Snapshot | ⬜ لم تبدأ | تغيير تاريخ واحد يعيد كل المؤشرات من نفس الحقائق المؤرخة ولا يخلط المستقبلي بالحالي. |
| A3 | فصل Revenue/Progress Value عن Delivery Cost في النموذج والتقارير | ⬜ لم تبدأ | لا يحسب EAC تكلفة من BAC أو EV مسعر كإيراد؛ تعرض القيم بعناوين ومصادر مستقلة. |
| A4 | Drill-down من كل KPI إلى WIR/PO/GRN/Cost/Variation/Schedule source | ⬜ لم تبدأ | كل رقم رئيسي قابل للتتبع إلى صفوفه ومجموعه مطابق للبطاقة. |

**مخرج البوابة A:** صفحة Control Account قابلة للاستخدام اليومي للمشروع، ومصدر واحد للأرقام التنفيذية.

#### تنفيذ A1 — Control Account master (الميزة النشطة، لا انتقال قبل قبول 8/10)

| الجزء | المطلوب التفصيلي | حالة القبول |
|---|---|---|
| A1.1 نموذج البيانات | ✅ مكتمل: كيان SQLite حقيقي يحفظ المشروع والعقد الرئيسي وWBS وBOQ وCost Code وSOV line، مع uniqueness يمنع الحساب المكرر داخل العقد. | لا يمكن إنشاء حساب خارج نطاق مشروعه أو بعقد باطن أو بمرجع BOQ/WBS/CBS خاطئ. |
| A1.2 ربط الحقائق | ✅ مكتمل: لكل Cost Entry وPO/GRN/WIR/Schedule حقل SQLite صريح للحساب الرقابي مع منع SQLite لخلط المشروع/العقد الرئيسي أو الباطن/BOQ/WBS/Cost Code. الصفوف غير المعيّنة أو غير المتسقة تظهر كاستثناءات في Data Quality؛ لا يتم توزيع مبلغ أو كمية تلقائيًا. | كل total في الحساب يساوي مجموع صفوف المصدر القابلة للعرض. |
| A1.3 عرض التحكم | ✅ مكتمل: جدول Control Accounts يعرض Scope Qty وBudget وPV وEV وAC وOpen Commitment وETC وFAC وعدد الصفوف ومسار التتبع؛ وتوجد فلترة بالحساب داخل النشاط وWIR والتكلفة وPO وGRN للمراجعة التفصيلية. | لا يوجد roll-up يدوي أو تكرار لقيمة الاستلام كتكلفة. |
| A1.3 حسابات التحكم | ✅ مكتمل: Scope quantity وPV/EV/AC/commitment/ETC/FAC تحسب من مصدر واحد حسب Control Data Date، وتستخدم توزيع النشاط الزمني المعتمد. | عند غياب Data Date أو baseline معتمد تظهر `Data Date Required` أو `Approved Baseline Required` ولا تعرض أرقامًا مضللة. |
| A1.4 تجربة المدير | ✅ مكتمل: جدول قابل للفلترة حسب WBS/CBS/عقد وحالة، مع مسار تتبع وفلتر للحساب في كل مصدر وتنبيه عن records غير المعينة. | مدير المشروع يصل من الحساب إلى كل WIR/PO/GRN/Cost/Activity مؤثر. |
| A1.5 قبول | ✅ مكتمل: سيناريو عقد رئيسي + بند + WBS + Cost Code + باطن + WIR + PO + GRN + Cost، وحالات نطاق خاطئ/تعيين ناقص/تكرار GRN/حقائق مستقبلية. | 95/95 اختبارًا، production build وTauri check ناجحة؛ مراجعة Ollama المحلية بدأت لكن لم تُنتج نتيجة قابلة للحفظ، لذا لم تُعامل كدليل قبول. |

**قاعدة التنفيذ:** أي جزء من A1 لا يجتاز شروطه يظل `⏳ قيد التنفيذ`. لا يبدأ A2 قبل إغلاق A1 كاملًا.

### البوابة B — نطاق وكميات وتقدم قابل للقياس

| # | الميزة | الحالة | قبول 8/10 |
|---:|---|---|---|
| B1 | Quantity ledger: أصل/Variation/مخطط/منفذ/مقبول/متبقٍ لكل BOQ وWBS | ✅ مكتمل — قبول 8/10 | التصحيح أو WIR أو Variation يعيد كل الأرصدة بدون ازدواج أو تجاوز؛ عقد الباطن يحمّل مرة واحدة على البند الرئيسي. |
| B2 | Measurement methods: quantity, weighted milestone, % complete, 0/100, 50/50 | ✅ مكتمل — قبول 8/10 | EV يصدر من rule معلن لكل activity: Quantity أو 0/100 أو 50/50 أو Weighted Milestone؛ WIR المرتبط بنشاط Quantity لا يتكرر. |
| B3 | Progress period and correction workflow | ✅ مكتمل — قبول 8/10 | إقفال الفترة مفروض داخل SQLite على WIR؛ التصحيح سجل مستقل مرجعي بحركة عكسية/إعادة إثبات مؤرخة، مع منع تجاوز الأصل، وانعكاس مؤرخ على Quantity Ledger وEV ولوحة البيانات ولقطات PMO. |
| B4 | Change package موحّد لأثر Variation | ✅ مكتمل — قبول 8/10 | معاينة line-derived قبل الاعتماد؛ New item/qty/rate/time يرحّل ذريًا إلى BOQ/SOV/Cash؛ المعتمد مجمد وقابل للعكس؛ وتبقى مراجعة Baseline Pending حتى تُدرج في revision معتمد. |

### البوابة C — برنامج زمني للتحكم لا للاستعراض

| # | الميزة | الحالة | قبول 8/10 |
|---:|---|---|---|
| C1 | Schedule status update: actual start/finish, remaining duration, physical progress, data date | ⬜ لم تبدأ | التحديث ينتج Forecast dates وfloat وcritical path جديدًا بدون تغيير baseline. |
| C2 | Schedule versions/scenarios and baseline comparison | ⬜ لم تبدأ | مقارنة baseline/current/forecast تظهر تغيّر النشاط والتواريخ والمدة والمسار الحرج. |
| C3 | Delay and time-impact analysis | ⬜ لم تبدأ | يسجل السبب والمالك والأثر، ويربط Variation المعتمد بالنهاية المعدلة. |
| C4 | Primavera import reconciliation workspace | ⬜ لم تبدأ | map/preview/errors/duplicates ثم commit، مع تقرير فرق بين الملف والبرنامج المحلي. |

### البوابة D — Cost control وForecast حقيقي

| # | الميزة | الحالة | قبول 8/10 |
|---:|---|---|---|
| D1 | Time-phased cost plan per Control Account | ⬜ لم تبدأ | Budget وplanned cost موزعان زمنيًا وقابلان للمقارنة بالفعلية والالتزام. |
| D2 | Forecast methods and estimate versions | ⬜ لم تبدأ | ETC/FAC يمكن اختيار منهجها، مع owner/date/assumption ومقارنة revision. |
| D3 | Commitment-to-actual reconciliation | ⬜ لم تبدأ | PO/GRN/vendor invoice/payment تتحول بوضوح ولا تُضاعف AC أو commitment. |
| D4 | Cost variance drill-down by WBS/CBS/vendor/period | ⬜ لم تبدأ | manager يصل من variance إلى البنود والمعاملات والتواريخ. |

### البوابة E — قيادة المشروع والتنفيذ

| # | الميزة | الحالة | قبول 8/10 |
|---:|---|---|---|
| E1 | Integrated project controls cockpit | ⬜ لم تبدأ | Scope/Schedule/Cost/Progress/Cash في صفحة واحدة حسب Data Date وControl Account. |
| E2 | Variance action register | ⬜ لم تبدأ | لكل انحراف material سبب/مالك/إجراء/تاريخ استحقاق/حالة وارتباط بالمصدر. |
| E3 | Controlled report pack | ⬜ لم تبدأ | تقرير فترة ثابت المصدر مع sign-off ونسخة قابلة للتصدير. |

## 4. الميزات المكتملة مسبقًا داخل المسار

| الميزة | الحالة | الدليل |
|---|---|---|
| WBS hierarchy, calendar, CPM basics, baseline snapshot/revision, Primavera parsing | ✅ مكتملة جزئيًا قويًا | اختبارات المرحلة الفنية و`docs/acceptance/phase-b-technical-controls-2026-09-01.md` |
| SOV, PO, receipt, AP, cost change, certificate, availability | ✅ مكتملة جزئيًا قويًا | اختبارات `phase1-commercial.test.mjs` وSQLite migrations |
| EVM موحّد بتاريخ بيانات | ✅ مكتملة | `src/utils/evm.ts` واختبارات `evm.test.mjs`؛ checkpoint `b965e00` |
| تحميل الباطن تحت الرئيسي في EVM | ✅ مكتملة | checkpoint `b82aa10` واختبار subcontract roll-up |
| Portfolio Forecast Finish من CPM وCPI/SPI | ✅ مكتملة | checkpoints `a87ace9`, `b83db0e` |

## 5. قاعدة التنفيذ من الآن

1. لا تُنفذ ميزة خارج ترتيب A → E إلا لإصلاح عيب يمنع الميزة الحالية.
2. كل ميزة تحصل على: **معايير قبول، اختبار إيجابي وسلبي، build، مراجعة محلية، checkpoint، وتحديث علامة الحالة هنا**.
3. عند عدم وجود مصدر بيانات كافٍ، يعرض التطبيق `Unavailable / Requires data` ولا يخترع رقمًا.
4. أي نقطة لا تحقق 8/10 في نطاقها تبقى ⏳ «قيد الإكمال» ولا يعلن عنها مكتملة.
