import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PROJECT_STATE } from '../src/data/initialProjectData.ts';
import { calculateBoqWasteLedger } from '../src/utils/scopeReconciliation.ts';
import { detectScopeCreep } from '../src/utils/scopeGovernance.ts';
import { calculateEarnedSchedule } from '../src/utils/earnedSchedule.ts';

test('Integration SC-06: Live project BOQ waste reconciliation', () => {
  const raftItem = INITIAL_PROJECT_STATE.boqItems.find(b => b.id === 'BOQ-01');
  assert.ok(raftItem, 'Raft BOQ item must exist in project data');

  const wasteResult = calculateBoqWasteLedger({
    boqItemId: raftItem.id,
    contractualWasteAllowancePercent: raftItem.wasteAllowancePercent || 5.0,
    purchasedQty: raftItem.purchasedQty || 3300,
    certifiedInstalledQty: raftItem.executedQty,
    unitRate: raftItem.unitRate,
  });

  assert.equal(wasteResult.boqItemId, 'BOQ-01');
  assert.equal(wasteResult.certifiedInstalledQty, 3150);
  assert.equal(wasteResult.purchasedQty, 3300);
  assert.equal(wasteResult.wasteQty, 150);
  assert.ok(wasteResult.wastePercentage > 0, 'Waste percentage calculated correctly');
  assert.equal(typeof wasteResult.isExcessiveWaste, 'boolean');
});

test('Integration SC-08: Scope creep detection across active project activities', () => {
  const contractBoqIds = INITIAL_PROJECT_STATE.boqItems.map(b => b.id);
  const approvedVoIds = INITIAL_PROJECT_STATE.approvals
    .filter(a => a.type === 'VARIATION_ORDER' && a.status === 'Approved')
    .map(a => a.id);

  const siteTasks = INITIAL_PROJECT_STATE.activities.map(act => ({
    taskId: act.activityId,
    description: act.taskName,
    boqItemId: act.boqItemId,
    variationId: act.variationId,
    qty: act.durationDays,
    estimatedRate: 1500,
  }));

  const creepResult = detectScopeCreep({
    contractBoqItemIds: contractBoqIds,
    approvedVariationIds: approvedVoIds,
    siteTasks,
  });

  // All initial activities are contractually mapped
  assert.equal(creepResult.hasScopeCreep, false);
  assert.equal(creepResult.unmappedTasksCount, 0);
  assert.equal(creepResult.creepCostEstimate, 0);

  // Now inject an unauthorized scope creep activity
  const tasksWithCreep = [
    ...siteTasks,
    {
      taskId: 'TASK-UNAUTHORIZED-EXTRA',
      description: 'Uninstructed extra excavation in Zone C',
      qty: 10,
      estimatedRate: 2000,
    },
  ];

  const creepResultInjected = detectScopeCreep({
    contractBoqItemIds: contractBoqIds,
    approvedVariationIds: approvedVoIds,
    siteTasks: tasksWithCreep,
  });

  assert.equal(creepResultInjected.hasScopeCreep, true);
  assert.equal(creepResultInjected.unmappedTasksCount, 1);
  assert.equal(creepResultInjected.creepCostEstimate, 20000);
  assert.equal(creepResultInjected.unmappedTasks[0].taskId, 'TASK-UNAUTHORIZED-EXTRA');
});

test('Integration SCH-06: Earned schedule calculation with real project EV and cumulative PV curve', () => {
  const cumulativePV = [0, 0.10, 0.25, 0.42, 0.58, 0.76, 1.00];
  const earnedProgressRatio = INITIAL_PROJECT_STATE.activities.reduce(
    (sum, a) => sum + (a.progressPct / 100) * a.weightFactor,
    0
  );

  const actualTimePeriods = 4.0; // Current Month index at data date 2026-05-01
  const esResult = calculateEarnedSchedule({
    actualTime: actualTimePeriods,
    earnedValue: Number(earnedProgressRatio.toFixed(3)),
    cumulativePlannedValues: cumulativePV,
  });

  assert.ok(esResult.earnedSchedule > 0, 'Earned Schedule (ES) must be positive');
  assert.equal(typeof esResult.timeScheduleVariance, 'number');
  assert.equal(typeof esResult.timeSchedulePerformanceIndex, 'number');
  assert.ok(['ahead', 'on_track', 'behind'].includes(esResult.status));
});
