# قبول المرحلة الثانية — الجدولة وEVM الاحترافي

التاريخ: 2026-09-01  
النطاق: WBS والأنشطة، CPM، التقويمات، Baseline، الموارد، التوزيع الزمني، PV/EV/AC والتوقعات.  
القرار: **مقبول مبدئيًا 86/100 (8.6/10)** للمرحلة الفنية، مع بقاء الاختبار اليدوي لملفات العميل الحقيقية قبل الانتقال إلى إصدار تشغيلي.

## دليل المتطلبات

| المطلب | الدليل المنفذ | دليل الاختبار |
|---|---|---|
| WBS وأنشطة ومستويات | WBS Master، علاقات parent، ومستوى مشتق وحوكمة منع الدورات | `CBS and WBS reject parent cycles` و`CBS and WBS hierarchy levels are derived` |
| CPM وNetwork logic | FS/SS/FF/SF والـlag، float، critical path، وكشف cycle | اختبارات CPM والـPrimavera predecessor imports |
| Calendar engine | Calendar Master، أيام عمل واستثناءات وساعات ورديات؛ تقويم مورد اختياري | اختبارات P6 calendar، working days، shifts وresource availability |
| Baseline ومراجعاته | Snapshot للأنشطة والتوزيع، منع تعديل baseline المعتمد، ومقارنة Revision مع Revision والخطة الحية | `approved baselines freeze...` و`compareBaselineRevisions` |
| موارد وman-hours | Resource Master، planned assignments، معدل/تكلفة، board للسعة، وحمل فعلي لا يختفي في يوم غير عامل | اختبارات resource assignment، load، calendar وCPM-aware leveling |
| Time-phased budget/PV | توزيع كمية/قيمة مقنن ومصالحة مع النشاط؛ زر `Reconcile Profiles` للعرض دون تعديل | `planned value uses approved distribution...` والتحقق من reconciliation |
| EVM وS-curves | PV/EV/AC/EAC وCash/Resource forecast، وأفق الرسم يشمل CPM والنقدية والموارد | `executive forecast horizon includes CPM, cash and resource dates...` |
| استيراد Primavera | XER/Excel مع معاينة قبل الالتزام، WBS وCalendar وLogic وResources وقيود | اختبارات Primavera XER المتعددة في حزمة القبول |

## نتيجة الأبعاد

| البعد | النتيجة | السبب المختصر |
|---|---:|---|
| الاكتمال الوظيفي | 9/10 | جميع مكونات المرحلة موجودة ومتصلة؛ لا يوجد Gantt مرئي ضمن هذه البوابة. |
| التكامل والعلاقات | 9/10 | العقد/BOQ/WBS/Activity/WIR/Resource/Calendar/Baseline مقيدة بالنطاق. |
| الحوكمة والتدقيق | 9/10 | منع الدورات، النطاق الخطأ، تجاوز الكميات، التقويم غير النشط، وتعديل baseline المعتمد. |
| مصالحة الأرقام | 9/10 | PV/EV/AC، توزيع زمني، Baseline snapshot، وأفق forecast محكوم. |
| UX والاستيراد | 8/10 | معاينة ورفض ذرّي وسياق محدد؛ يلزم قبول يدوي على ملف تشغيل فعلي. |
| الاختبارات | 8/10 | 82 اختبار قبول آلي ناجح؛ مراجعة Ollama بدأت لكن بيئة Ollama لم تُرجع تقريرًا. |

## تشغيل التحقق

```powershell
npm test
npm run build
cargo check --manifest-path src-tauri\Cargo.toml
```

آخر نتيجة مثبتة: **82/82** اختبار قبول ناجح، Production build ناجح، وTauri check ناجح.

## نقاط الرجوع ذات الصلة

- `checkpoint-phase2-resource-calendar-shifts-2026-08-31`
- `checkpoint-phase2-actual-resource-calendar-2026-08-31`
- `checkpoint-phase2-baseline-revision-comparison-2026-08-31`
- `checkpoint-phase2-governed-forecast-horizon-2026-09-01`
- `checkpoint-phase2-profile-reconciliation-2026-09-01`

## شرط الاستخدام التشغيلي

قبل الاعتماد في مشروع حي: استورد نسخة غير تشغيلية من BOQ وXER وWIR للمشروع نفسه، راجع التوزيع وBaseline وData Quality، ثم اعتمد الـBaseline بعد تحقق المسؤول. لا تُستخدم بيانات قبول تجريبية داخل قاعدة بيانات المشروع التشغيلية.
