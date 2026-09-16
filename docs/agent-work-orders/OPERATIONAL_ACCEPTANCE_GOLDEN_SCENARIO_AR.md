# BuildTrack — سيناريو القبول التشغيلي الذهبي

## الغرض

هذا السيناريو هو oracle واحد لاختبار النطاق والبرنامج والتكلفة والتقدم والتقارير. ينفذ
على SQLite معزولة ولا يدخل قاعدة المستخدم. القيم النهائية تحفظ في fixture machine-readable؛
هذه الوثيقة تعرف العلاقات والحالات التي يجب أن يغطيها، ولا يسمح بتغيير المتوقع لإرضاء الكود.

## هيكل البيانات الإلزامي

- مشروعان لمنع تسرب cross-project.
- عقد رئيسي واحد لكل مشروع، وعقدا باطن على الأقل للمشروع الأول.
- BOQ رئيسي لا يقل عن 6 بنود، يتضمن وحدات وأسعار وكميات مختلفة.
- BOQ باطن مربوط بأربعة بنود رئيسية وبأسعار تكلفة مختلفة عن أسعار البيع.
- WBS بثلاثة مستويات و12 نشاطًا على الأقل، منها أنشطة متوازية ومعالم.
- علاقات FS/SS/FF/SF مع lag، وتقويمان مختلفان واستثناء عطلة.
- Baseline معتمدة ومجمدة، Current update، Forecast عند ثلاثة Data Dates.
- طرق قياس Quantity و0/100 و50/50 وWeighted Milestone وحساب مختلط.
- Approved Cost Plan موزع زمنيًا على ثلاثة Control Accounts على الأقل.
- PO جزئي الاستلام، GRN، Supplier Invoice جزئي، payment وreversal.
- Labor وEquipment actuals، subcontract certificate، client certificate.
- ثلاثة أوامر تغيير: تعديل كمية/سعر، New Item، وtime-only.
- WIR رئيسي وباطن، rejected WIR، future WIR، correction وreinstatement.
- فترة مفتوحة وفترة مقفلة لاختبارات الرفض.

## تواريخ القياس

1. `DD1`: قبل أول إنجاز — PV فقط، EV/AC وفق الحقائق حتى التاريخ.
2. `DD2`: أثناء التنفيذ — partial progress/receipts/costs/certificates.
3. `DD3`: بعد تصحيح كمية واعتماد Variation، مع استبعاد السجلات المستقبلية.

لكل تاريخ تحفظ القيم المتوقعة التالية كسنت/كمية/يوم، لا كنسبة تقريبية فقط:

- Original وApproved Variation وModified Contract Value.
- Original/Revised BOQ quantity/value لكل بند.
- Revenue BAC/PV/EV/SPI/SV وEarned Schedule.
- Delivery Cost BAC/PV/EV/AC/CPI/SPI/EAC/ETC/VAC/TCPI.
- Open Commitment وAP Outstanding وCash In/Out/Net وPeak Deficit.
- Actual/Forecast Finish وTotal Float وCritical activities.
- WIR quantities وcertificate gross/net/retention/advance/tax/deductions.
- source IDs وexclusions لكل KPI.

## مسار التنفيذ

1. إنشاء العقد الرئيسي؛ التحقق من إنشاء المشروع مرة واحدة.
2. إنشاء عقود الباطن؛ التحقق من عدم إنشاء مشروعات إضافية.
3. استيراد BOQ من Excel متعدد الشيتات عبر preview/commit.
4. استيراد XER عبر reconciliation ثم commit ذري.
5. ربط BOQ بالأنشطة واعتماد Baseline وCost Plan.
6. إدخال WIR/actuals/procurement/certificates حتى DD1 ثم إصدار snapshot.
7. تحديث الحالة حتى DD2، إغلاق التطبيق وفتحه، ثم مقارنة snapshot.
8. اعتماد Variations/Corrections حتى DD3 وإنشاء baseline revision.
9. إصدار report pack ثم مقارنة dashboard/report/drill-down.
10. تنفيذ حالات الرفض والعكس ثم Backup/Restore على نسخة منفصلة.

## حالات الرفض الحرجة

- كمية نشاط أو WIR فوق Revised BOQ.
- تاريخ خارج العقد/البند أو بعد Data Date ضمن KPI تراكمي.
- cross-project/subcontract/main-contract relation.
- duplicate import/operation/receipt/invoice/payment.
- اعتماد المنشئ نفسه، أو تعديل approved snapshot، أو كتابة داخل locked period.
- Cost CPI دون Approved Cost Plan.
- milestone بلا evidence مؤرخ.
- فشل audit متأخر يجب أن يعيد transaction كاملة.
- رفض داخل transaction يليه retry فوري دون SQLite lock.

## معيار المصالحة

- المال: فرق مسموح `<= 0.01` فقط بسبب rounding الموثق.
- الكمية: فرق مسموح `<= 0.000001`.
- التاريخ: اليوم نفسه حسب calendar engine؛ لا سماح بانحراف يوم غير مفسر.
- العدد/العلاقات: تطابق كامل.
- أي `Unavailable` يجب أن يذكر المصدر الناقص، ولا يستبدل بصفر أو Green.
