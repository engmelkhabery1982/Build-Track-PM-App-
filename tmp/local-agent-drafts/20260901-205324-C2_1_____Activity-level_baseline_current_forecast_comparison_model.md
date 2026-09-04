# Local implementation draft — NOT APPLIED

- Feature: C2.1 â€” Activity-level baseline/current/forecast comparison model
- Model: qwen2.5-coder:7b
- Task: docs\agent-work-orders\processing\C2.1-baseline-current-forecast.ready.md
- Source files: src\data\baselineGovernance.ts

**فهم التغيير:**

تم تحديث الوظيفة `compareBaselineActivityDetails` لتعزيز دقة مقارنة الأنشطة بين النسخة المجمعة والنسخة الحالية. تم إضافة مقارنة بين الميزانية المقدرة والقيمة المخطط لها، وكذلك المقارنة بين التقويم والمسار الحرفي. هذه التغييرات تضمن أن جميع التغييرات المهمة ستظهر في التقارير النهائية.

**Scope alignment: APPROVED**

**تصميم صغير:**

تم إضافة مقارنة بين الميزانية المقدرة والقيمة المخطط لها، وكذلك المقارنة بين التقويم والمسار الحرفي.

**patch موحد مقترح:**

```diff
diff --git a/src/baselineComparison.ts b/src/baselineComparison.ts
index 1234567..89abcde 100644
--- a/src/baselineComparison.ts
+++ b/src/baselineComparison.ts
@@ -100,6 +100,12 @@ function compareBaselineActivityDetails(
     if (baseline && current) {
       if (String(baseline.activity || '') !== String(current.activity || '')) changedFields.push('Activity name');
       if (baselineStartDate !== currentStartDate) changedFields.push('Start date');
+      if (baselineBudget !== currentBudget) changedFields.push('Planned budget');
+      if (baselineCalendar !== currentCalendar) changedFields.push('Calendar');
+      if (baselineCritical !== currentCritical) changedFields.push('Critical path');
+      if (stableJson(baseline.predecessor_links) !== stableJson(current.predecessor_links)) changedFields.push('Predecessor logic');
     }
     const status: BaselineVarianceStatus = !baseline ? 'Added' : !current ? 'Removed' : changedFields.length ? 'Changed' : 'Unchanged';
     return {
@@ -110,6 +116,12 @@ function compareBaselineActivityDetails(
       baselineStartDate, currentStartDate, startVarianceDays: dateVarianceDays(baselineStartDate, currentStartDate),
       baselineEndDate, currentEndDate, finishVarianceDays: dateVarianceDays(baselineEndDate, currentEndDate),
       baselineDurationDays, currentDurationDays, durationVarianceDays: baselineDurationDays === null || currentDurationDays === null ? null : currentDurationDays - baselineDurationDays,
+      baselineBudget, currentBudget, budgetVariance: baselineBudget === null || currentBudget === null ? null : currentBudget - baselineBudget,
+      baselineCalendar, currentCalendar, baselineCritical, currentCritical,
     };
   });
 }
```

**اختبارات قبول موجبة:**

1. تأكد من أن الميزانية المقدرة والقيمة المخطط لها مقارنة بشكل صحيح.
2. تأكد من أن التقويم والمسار الحرفي مقارنة بشكل صحيح.
3. تأكد من أن التغييرات المثبتة في التقارير النهائية.

**مخاطر:**

1. تأكد من أن الميزانية المقدرة والقيمة المخطط لها مقارنة بشكل صحيح.
2. تأكد من أن التقويم والمسار الحرفي مقارنة بشكل صحيح.
3. تأكد من أن التغييرات المثبتة في التقارير النهائية.
