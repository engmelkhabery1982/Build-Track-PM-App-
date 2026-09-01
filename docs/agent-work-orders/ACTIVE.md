# أمر العمل النشط للوكلاء المحليين

## C2.1 — Activity-level baseline/current/forecast comparison model

**الهدف:** توسيع نموذج مقارنة نشاط واحد بحيث يعرض Baseline المعتمد والخطة الحالية
وتوقع CPM كقيم منفصلة، دون تغيير أي من النسخ الثلاث أثناء العرض.

## معايير القبول

1. يعرض سجل المقارنة، لكل activity code ثابت: الإضافة/الحذف/التغيير/دون تغيير.
2. يعرض Baseline مقابل Current Plan مقابل CPM Forecast للتواريخ والمدة والمسار الحرج.
3. يبقي الحقول الحالية متوافقة ولا يكتب على Baseline أو planned dates.
4. لا يخترع Forecast عند غياب بيانات CPM؛ يعرض `Unavailable` أو fallback معلن.
5. تتضمن الاختبارات حالة Forecast متغير وحالة غياب snapshot/Forecast.

## ملفات المراجعة الأولية

- `src/data/baselineGovernance.ts`

## مخرجات مطلوبة من الوكيل المحلي

- فهم صريح للمصادر الثلاثة قبل أي patch.
- patch صغير لمسودة `baselineGovernance.ts` فقط.
- اختبار قبول مقترح؛ لا تعديل ملفات.

## Required scope terms

- `Baseline`
- `Current`
- `Forecast`
- `Critical`
- `predecessor`

## Forbidden off-scope terms

- `resourceLoading`
- `timePhasedPlannedResourceCost`
- `pmoSnapshot`
- `calculatePmoSnapshot`
