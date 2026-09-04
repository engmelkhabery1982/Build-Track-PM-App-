import test from 'node:test';
import assert from 'node:assert/strict';
import { detectScopeCreep } from '../src/utils/scopeGovernance.ts';

test('SC-08: Clean project with all tasks mapped', () => {
  const result = detectScopeCreep({
    contractBoqItemIds: ['BOQ-01', 'BOQ-02'],
    approvedVariationIds: ['VO-01'],
    siteTasks: [
      { taskId: 'T-1', description: 'Foundation', boqItemId: 'BOQ-01', qty: 100, estimatedRate: 50 },
      { taskId: 'T-2', description: 'VO Extra work', variationId: 'VO-01', qty: 20, estimatedRate: 80 },
    ],
  });

  assert.equal(result.hasScopeCreep, false);
  assert.equal(result.unmappedTasksCount, 0);
  assert.equal(result.creepCostEstimate, 0);
  assert.equal(result.unmappedTasks.length, 0);
});

test('SC-08: Project with unmapped site tasks flagged properly', () => {
  const result = detectScopeCreep({
    contractBoqItemIds: ['BOQ-01'],
    approvedVariationIds: [],
    siteTasks: [
      { taskId: 'T-1', description: 'Contract Foundation', boqItemId: 'BOQ-01', qty: 100, estimatedRate: 50 },
      { taskId: 'T-2', description: 'Unapproved extra excavation', qty: 10, estimatedRate: 50 },
      { taskId: 'T-3', description: 'Wrong BOQ reference', boqItemId: 'NON-EXISTENT', qty: 5, estimatedRate: 100 },
    ],
  });

  assert.equal(result.hasScopeCreep, true);
  assert.equal(result.unmappedTasksCount, 2);
  assert.equal(result.creepCostEstimate, 10 * 50 + 5 * 100); // 1000
  assert.equal(result.unmappedTasks[0].taskId, 'T-2');
  assert.equal(result.unmappedTasks[1].taskId, 'T-3');
});

test('SC-08: Variation-backed tasks accepted and not flagged as creep', () => {
  const result = detectScopeCreep({
    contractBoqItemIds: ['BOQ-01'],
    approvedVariationIds: ['VO-APPROVED-01'],
    siteTasks: [
      { taskId: 'T-VO', description: 'Client instructed variation', variationId: 'VO-APPROVED-01', qty: 40, estimatedRate: 120 },
    ],
  });

  assert.equal(result.hasScopeCreep, false);
  assert.equal(result.unmappedTasksCount, 0);
  assert.equal(result.creepCostEstimate, 0);
});
