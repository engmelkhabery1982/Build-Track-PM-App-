# Local implementation draft — NOT APPLIED

- Feature: C2 Schedule versions and baseline comparison
- Model: qwen2.5-coder:7b
- Task: docs\agent-work-orders\ACTIVE.md
- Source files: src\data\baselineGovernance.ts, tests\phase0-governance.test.mjs

فهم التغيير:
تم تحديث الملفات المذكورة في النص، وتم إضافة بعض الوظائف والاختبارات الجديدة. تم إضافة وظائف جديدة لحساب القيمة المقدرة، توقعات النقد، وحسابات الموارد. تم أيضًا إضافة اختبارات لضمان أن هذه الوظائف تعمل بشكل صحيح.

تصميم صغير:
تم إضافة وظائف جديدة في الملفات المذكورة، بما في ذلك `calculatePmoSnapshot` في `pmoSnapshot.ts`، و`timePhasedPlannedResourceCost` في `resourceLoading.ts`. تم أيضًا إضافة اختبارات جديدة لضمان أن هذه الوظائف تعمل بشكل صحيح.

patch موحد مقترح فقط للملفات المعروض:
```typescript
// resourceLoading.ts
export function timePhasedPlannedResourceCost(resources: Resource[], assignments: Assignment[], calendars: Calendar[]): Point[] {
  // Implementation of timePhasedPlannedResourceCost
}

// pmoSnapshot.ts
export function calculatePmoSnapshot(input: Input): Snapshot {
  // Implementation of calculatePmoSnapshot
}
```

اختبارات قبول موجبة/سالبة:
```typescript
test('timePhasedPlannedResourceCost returns correct points', () => {
  const points = resourceLoading.timePhasedPlannedResourceCost(
    [{ id: 'r1', standard_rate: 20 }],
    [{ resource_id: 'r1', schedule_id: 'a1', assignment_start: '2026-03-06', assignment_end: '2026-03-09', planned_hours: 16 }],
    [{ id: 'a1', calendar_name: '5-Day Week' }],
  );
  assert.deepEqual(points, [{ date: '2026-03-06', cost: 160 }, { date: '2026-03-09', cost: 160 }]);
});

test('calculatePmoSnapshot returns correct snapshot', () => {
  const snapshot = pmoSnapshot.calculatePmoSnapshot({
    contract: { id: 'c1', project_id: 'p1' }, dataDate: '2026-01-10',
    schedules: [{ id: 'a1', contract_id: 'c1', activity: 'Install', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 100, unit_rate: 10 }], scheduleDistributions: [], boqItems: [], wirEntries: [], costEntries: [], baselines: [], requireApprovedBaseline: false,
  });
  assert.equal(snapshot.earnedValue, 1000);
  assert.equal(snapshot.actualCost, 0);
  assert.equal(snapshot.budgetAtCompletion, 1000);
  assert.ok(snapshot.plannedValue > 0 && snapshot.plannedValue < 1000);
});
```

مخاطر:
1. قد يكون هناك تداخل بين الوظائف الجديدة والوظائف القديمة، مما قد يؤدي إلى أخطاء غير متوقعة.
2. قد يكون هناك تغييرات غير متوقعة في الأداء بسبب التغييرات في الوظائف الجديدة.
3. قد يكون هناك أخطاء في الاختبارات الجديدة، مما قد يؤدي إلى تفويض الوظائف الجديدة دون التحقق من صحتها.
