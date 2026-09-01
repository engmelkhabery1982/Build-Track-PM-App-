# بطاقة عمل محكومة للوكلاء المحليين — انسخها إلى `inbox/<feature>.ready.md`

> لا يلتقط المشغّل إلا الملفات التي ينتهي اسمها بـ`.ready.md`. اكتب الملف أولًا
> باسم مؤقت ثم أعد تسميته عند اكتماله، حتى لا يبدأ الوكيل ببطاقة ناقصة.

## <الرمز> — <اسم ميزة واحد واضح>

## الهدف التشغيلي

<ما القرار أو الرقابة التشغيلية التي تتحسن؟ وكيف تقارب وظيفة SAP PS محددة بدرجة 8/10؟>

## مصدر الحقيقة والحدود غير القابلة للتعديل

- <مصدر الرقم أو التاريخ أو العلاقة>
- <ما يجب ألا يكتبه هذا التغيير: baseline / planned dates / approved records / etc.>

## معايير القبول

1. <حالة إيجابية قابلة للاختبار>.
2. <حالة سلبية أو فشل يجب منعه>.
3. <تأثير تكامل محدد على جدول/تقرير/داشبورد إن وجد>.

## Target Files

- `src/path/to/target.ts`
- `tests/path/to/relevant.test.mjs`

## Source anchors

- `src/path/to/target.ts::functionNameOrExactType`
- `tests/path/to/relevant.test.mjs::relevant test name`

> يرسل المشغّل فقط المقاطع المحيطة بهذه الرموز من الملفات المستهدفة؛ لا يرسل
> المشروع أو الملف كاملاً. اكتب المسار النسبي ثم `::` ثم الرمز القابل للبحث حرفيًا.

## Acceptance test commands

- `node --experimental-strip-types --test tests/path/to/relevant.test.mjs`

## Required scope terms

- `Term that must appear in the draft`

## Forbidden off-scope terms

- `UnrelatedFeature`

## Constraints

- Patch صغير في الملفات المعروضة فقط.
- لا تعديل قاعدة بيانات أو migrations أو بيانات اختبار إلا إذا نصت البطاقة صراحة.
- لا اعتماد أو دمج أو ادعاء نجاح الاختبارات من الوكيل المحلي.
- أي مسودة لا تحتوي على patch موحّد قابل للتطبيق ترفض تلقائيًا.
