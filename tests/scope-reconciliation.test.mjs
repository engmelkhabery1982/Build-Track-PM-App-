import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBoqWasteLedger } from '../src/utils/scopeReconciliation.ts';

test('Normal waste within allowance', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'item-1',
    contractualWasteAllowancePercent: 7,
    purchasedQty: 100,
    certifiedInstalledQty: 95,
    unitRate: 50,
  });

  assert.equal(result.boqItemId, 'item-1');
  assert.equal(result.purchasedQty, 100);
  assert.equal(result.certifiedInstalledQty, 95);
  assert.equal(result.wasteQty, 5);
  assert.equal(result.wastePercentage, 5);
  assert.equal(result.wasteCost, 250);
  assert.equal(result.isExcessiveWaste, false);
});

test('Excessive waste exceeding allowance', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'item-2',
    contractualWasteAllowancePercent: 5,
    purchasedQty: 100,
    certifiedInstalledQty: 88,
    unitRate: 10,
  });

  assert.equal(result.boqItemId, 'item-2');
  assert.equal(result.wasteQty, 12);
  assert.equal(result.wastePercentage, 12);
  assert.equal(result.wasteCost, 120);
  assert.equal(result.isExcessiveWaste, true);
});

test('Zero purchased edge-case', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'item-3',
    contractualWasteAllowancePercent: 5,
    purchasedQty: 0,
    certifiedInstalledQty: 0,
    unitRate: 100,
  });

  assert.equal(result.wasteQty, 0);
  assert.equal(result.wastePercentage, 0);
  assert.equal(result.wasteCost, 0);
  assert.equal(result.isExcessiveWaste, false);
});
