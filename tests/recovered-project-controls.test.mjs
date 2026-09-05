import test from 'node:test';
import assert from 'node:assert/strict';
import { detectScopeCreep } from '../src/utils/scopeGovernance.ts';
import { calculateBoqWasteLedger } from '../src/utils/scopeReconciliation.ts';
import { calculateEarnedSchedule } from '../src/utils/earnedSchedule.ts';
import { buildBoqWasteLedger, buildOperationalScopeReport, calculateEarnedScheduleFromSeries } from '../src/utils/projectControlAnalytics.ts';

test('scope control reports only operational facts outside BOQ or approved change', () => {
  const result = detectScopeCreep({
    contractBoqItemIds: ['b1'], approvedVariationIds: ['v1'],
    siteTasks: [
      { taskId: 'ok-boq', description: 'authorised', boqItemId: 'b1', qty: 2, estimatedRate: 10 },
      { taskId: 'ok-change', description: 'approved change', variationId: 'v1', qty: 1, estimatedRate: 20 },
      { taskId: 'bad', description: 'unmapped', qty: 3, estimatedRate: 7 },
    ],
  });
  assert.deepEqual(result.unmappedTasks.map((row) => row.taskId), ['bad']);
  assert.equal(result.creepCostEstimate, 21);
});

test('operational scope report ignores legitimate indirect zero-quantity cost', () => {
  const result = buildOperationalScopeReport({
    boqItems: [{ id: 'b1' }], variations: [],
    schedules: [{ id: 's1', activity_code: 'A1', boq_item_id: 'b1', planned_quantity: 4, unit_rate: 5 }],
    wirEntries: [{ id: 'w1', wir_number: 'W1', status: 'Approved', quantity: 2, unit_price: 5 }],
    costEntries: [{ id: 'c1', description: 'site office rent', amount: 1000, quantity: 0 }], procurementReceipts: [],
  });
  assert.equal(result.unmappedTasks.length, 1);
  assert.equal(result.unmappedTasks[0].taskId, 'W1');
});

test('waste ledger uses accepted receipts, governed WIR and posted corrections', () => {
  const rows = buildBoqWasteLedger({
    boqItems: [
      { id: 'main', item_code: 'B-1', item_name: 'Concrete', unit: 'm3', waste_allowance_percent: 5, unit_rate: 100 },
      { id: 'sub', main_boq_item_id: 'main', unit: 'm3' },
    ],
    procurementReceipts: [
      { id: 'r1', boq_item_id: 'main', status: 'Accepted', unit: 'm3', accepted_quantity: 110, unit_cost: 90 },
      { id: 'r2', boq_item_id: 'main', status: 'Draft', unit: 'm3', accepted_quantity: 999, unit_cost: 90 },
      { id: 'r3', boq_item_id: 'main', status: 'Accepted', unit: 'kg', accepted_quantity: 5, unit_cost: 1 },
    ],
    wirEntries: [{ id: 'w1', boq_item_id: 'sub', status: 'Approved', unit: 'm3', quantity: 100 }],
    progressCorrections: [{ id: 'pc1', original_wir_id: 'w1', status: 'Posted', correction_type: 'Reversal', quantity: 2 }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].purchasedQty, 110);
  assert.equal(rows[0].certifiedInstalledQty, 98);
  assert.equal(rows[0].wasteQty, 12);
  assert.equal(rows[0].unitMismatchCount, 1);
  assert.equal(rows[0].isExcessiveWaste, true);
});

test('missing allowance remains unassessed instead of inventing a threshold', () => {
  const [row] = buildBoqWasteLedger({
    boqItems: [{ id: 'b1', unit: 'ea' }],
    procurementReceipts: [{ boq_item_id: 'b1', status: 'Accepted', unit: 'ea', accepted_quantity: 10, unit_cost: 2 }],
    wirEntries: [],
  });
  assert.equal(row.isAssessable, false);
  assert.equal(row.isExcessiveWaste, false);
  assert.equal(row.excessWasteQty, 0);
});

test('earned schedule interpolates the actual time corresponding to earned value', () => {
  const direct = calculateEarnedSchedule({ actualTime: 3, earnedValue: 150, cumulativePlannedValues: [0, 100, 200, 300] });
  assert.equal(direct.earnedSchedule, 1.5);
  assert.equal(direct.timeScheduleVariance, -1.5);
  assert.equal(direct.timeSchedulePerformanceIndex, 0.5);
  const fromSeries = calculateEarnedScheduleFromSeries([
    { date: '2026-01-01', planned: 0, earned: 0 },
    { date: '2026-02-01', planned: 100, earned: 70 },
    { date: '2026-03-01', planned: 200, earned: 150 },
  ], '2026-03-01');
  assert.equal(fromSeries?.earnedSchedule, 1.5);
  assert.equal(fromSeries?.periodCount, 2);
});

test('waste formula separates actual, allowed and excess quantities', () => {
  const result = calculateBoqWasteLedger({ boqItemId: 'b1', contractualWasteAllowancePercent: 5, purchasedQty: 110, certifiedInstalledQty: 100, unitRate: 3 });
  assert.equal(result.wasteQty, 10);
  assert.equal(result.allowableWasteQty, 5);
  assert.equal(result.excessWasteQty, 5);
  assert.equal(result.excessWasteCost, 15);
});
