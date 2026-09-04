import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBoqWasteLedger } from '../src/utils/scopeReconciliation.ts';

test('SC-06: Waste within contract allowance', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'BOQ-01',
    contractualWasteAllowancePercent: 5.0,
    purchasedQty: 1040,
    certifiedInstalledQty: 1000,
    unitRate: 150,
  });

  assert.equal(result.boqItemId, 'BOQ-01');
  assert.equal(result.wasteQty, 40);
  assert.equal(result.wastePercentage, 4.0);
  assert.equal(result.allowableWasteQty, 50);
  assert.equal(result.excessWasteQty, 0);
  assert.equal(result.excessWasteCost, 0);
  assert.equal(result.isExcessiveWaste, false);
});

test('SC-06: Excessive waste exceeds contract allowance', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'BOQ-02',
    contractualWasteAllowancePercent: 5.0,
    purchasedQty: 1100,
    certifiedInstalledQty: 1000,
    unitRate: 200,
  });

  assert.equal(result.wasteQty, 100);
  assert.equal(result.wastePercentage, 10.0);
  assert.equal(result.allowableWasteQty, 50);
  assert.equal(result.excessWasteQty, 50);
  assert.equal(result.excessWasteCost, 10000);
  assert.equal(result.isExcessiveWaste, true);
});

test('SC-06: Zero waste when purchased equals installed', () => {
  const result = calculateBoqWasteLedger({
    boqItemId: 'BOQ-03',
    contractualWasteAllowancePercent: 5.0,
    purchasedQty: 500,
    certifiedInstalledQty: 500,
    unitRate: 100,
  });

  assert.equal(result.wasteQty, 0);
  assert.equal(result.wastePercentage, 0);
  assert.equal(result.excessWasteCost, 0);
  assert.equal(result.isExcessiveWaste, false);
});
