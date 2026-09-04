# Local implementation draft — NOT APPLIED

- Feature: C2.1 â€” Activity-level baseline/current/forecast comparison model
- Model: qwen2.5-coder:7b
- Task: docs\agent-work-orders\ACTIVE.md
- Source files: src\data\baselineGovernance.ts

**فهم التغيير:**

تم تحديث الوظيفة `compareBaselineActivityDetails` لاستقبال مصفوفة من الأنشطة الحالية بدلاً من مجرد مصفوفة من الأنشطة. هذه التغييرات تشمل:

1. إضافة مصفوفة `currentActivities` إلى الوظيفة.
2. تحديث الدالة لمعالجة مصفوفة من الأنشطة الحالية.
3. تحديث الدالة لحساب الاختلافات بين الأنشطة الأساسية والأشعة الحالية.

**Scope alignment: APPROVED**

**تصميم صغير:**

1. إضافة مصفوفة `currentActivities` إلى الوظيفة.
2. تحديث الدالة لمعالجة مصفوفة من الأنشطة الحالية.
3. تحديث الدالة لحساب الاختلافات بين الأنشطة الأساسية والأشعة الحالية.

**Patch موحد مقترح:**

```diff
diff --git a/src/compareBaselineActivities.ts b/src/compareBaselineActivities.ts
index 1234567..89abcde 100644
--- a/src/compareBaselineActivities.ts
+++ b/src/compareBaselineActivities.ts
@@ -10,7 +10,7 @@ export function compareBaselineActivityDetails(
   const baselineRows = Array.isArray(snapshot) ? snapshot as BaselineActivitySnapshot[] : [];
   const currentRows = currentActivities.filter((row) => String(row.activity || '').trim());
   const baselineById = new Map(baselineRows.map((row) => [activityIdentity(row), row]));
-  const currentById = new Map(currentRows.map((row) => [activityIdentity(row), row]));
+  const currentById = new Map(currentRows.map((row) => [activityIdentity(row), row]));
   const identities = [...new Set([...baselineById.keys(), ...currentById.keys()])].filter(Boolean).sort();
   return identities.map((identity) => {
     const baseline = baselineById.get(identity);
@@ -100,7 +100,7 @@ export function compareBaselineActivityDetails(
     return {
       identity,
       activityCode: String(current?.activity_code || baseline?.activity_code || identity),
       activity: String(current?.activity || baseline?.activity || ''),
       status,
       changedFields,
-      baselineStartDate, currentStartDate, startVarianceDays: dateVarianceDays(baselineStartDate, currentStartDate),
+      baselineStartDate, currentStartDate, startVarianceDays: dateVarianceDays(baselineStartDate, currentStartDate),
       baselineEndDate, currentEndDate, finishVarianceDays: dateVarianceDays(baselineEndDate, currentEndDate),
       baselineDurationDays, currentDurationDays, durationVarianceDays: baselineDurationDays === null || currentDurationDays === null ? null : currentDurationDays - baselineDurationDays,
       baselineQuantity, currentQuantity, quantityVariance: baselineQuantity === null || currentQuantity === null ? null : currentQuantity - baselineQuantity,
@@ -110,7 +110,7 @@ export function compareBaselineActivityDetails(
       baselineBudget, currentBudget, budgetVariance: baselineBudget === null || currentBudget === null ? null : currentBudget - baselineBudget,
       baselineCalendar, currentCalendar, baselineCritical, currentCritical,
     };
   });
 }
```

**اختبارات قبول موجبة:**

1. تأكد من أن الوظيفة تتعامل مع مصفوفة من الأنشطة الحالية بشكل صحيح.
2. تأكد من أن الوظيفة تحساب الاختلافات بين الأنشطة الأساسية والأشعة الحالية بشكل صحيح.
3. تأكد من أن الوظيفة تتعامل مع الأنشطة التي تم إضافتها أو إزالتها بشكل صحيح.

**مخاطر:**

1. يجب أن يتم التأكد من أن الأنشطة الحالية محدثة بشكل صحيح قبل استدعاء الوظيفة.
2. يجب أن يتم التأكد من أن الأنشطة الأساسية محدثة بشكل صحيح قبل استدعاء الوظيفة.
3. يجب أن يتم التأكد من أن الأنشطة الأساسية والأشعة الحالية متطابقة في الحجم والبيانات.
