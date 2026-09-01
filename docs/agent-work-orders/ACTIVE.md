# أمر العمل النشط للوكلاء المحليين

## C2 — Schedule versions/scenarios and baseline comparison

**الهدف:** مقارنة النشاط بين Baseline معتمد، الخطة الحالية، وتوقع CPM دون تغيير
أي من النسخ الثلاث أثناء العرض.

## معايير القبول

1. يعرض سجل المقارنة، لكل activity code ثابت: الإضافة/الحذف/التغيير/دون تغيير.
2. يعرض Baseline مقابل الخطة الحالية مقابل Forecast للتواريخ والمدة والمسار الحرج.
3. يكشف التغيير في predecessor logic، calendar، الكمية والميزانية دون كتابة
تلقائية على baseline.
4. يقارن revision معتمد بسابقه ويظهر عدم وجود revision سابق كحالة صريحة.
5. لا يخترع Forecast عند غياب بيانات CPM؛ يعرض `Unavailable` أو fallback معلن.
6. تتضمن الاختبارات حالة إيجابية للتغير وحالة سلبية لغياب snapshot.

## ملفات المراجعة الأولية

- `src/data/baselineGovernance.ts`
- `src/App.tsx`
- `src/types/index.ts`
- `tests/phase0-governance.test.mjs`

## مخرجات مطلوبة من الوكيل المحلي

- مخاطر مثبتة من الملفات فقط.
- حالات قبول إيجابية/سلبية مفقودة.
- نقاط دمج محددة؛ لا patches ولا تعديل ملفات.
