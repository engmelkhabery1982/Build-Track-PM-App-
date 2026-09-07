import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateHealthConfig,
  calculateGovernedHealthScore,
  DEFAULT_HEALTH_CONFIG,
} from '../src/utils/governedHealthScore.ts';

test('F6 Governed Health Score - validates config weights sum to 100%', () => {
  const valid = validateHealthConfig(DEFAULT_HEALTH_CONFIG);
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.errors.length, 0);

  const invalidConfig = [
    ...DEFAULT_HEALTH_CONFIG.slice(0, 5),
    { ...DEFAULT_HEALTH_CONFIG[5], weight: 20 }, // Total becomes 110%
  ];
  const invalid = validateHealthConfig(invalidConfig);
  assert.strictEqual(invalid.isValid, false);
  assert.ok(invalid.errors[0].includes('must sum to 100%'));
});

test('F6 Governed Health Score - calculates score across 6 dimensions with full data', () => {
  const inputs = {
    spi: 1.05,
    cpi: 0.98,
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.02,
    wirFailureRate: 0.03,
    missingDataRatio: 0.01,
    dataDate: '2026-09-01',
    versionCode: 'V-HEALTH-TEST-1',
  };

  const result = calculateGovernedHealthScore(inputs, DEFAULT_HEALTH_CONFIG);

  assert.strictEqual(result.versionCode, 'V-HEALTH-TEST-1');
  assert.strictEqual(result.dataDate, '2026-09-01');
  assert.strictEqual(result.dimensions.length, 6);
  assert.strictEqual(result.hasMissingCriticalInputs, false);
  assert.strictEqual(result.overallConfidence, 100);
  assert.ok(result.overallScore >= 80);
  assert.strictEqual(result.status, 'Green');
});

test('F6 Governed Health Score - missing critical input lowers confidence and prevents Green status', () => {
  const inputsWithMissing = {
    spi: 1.05,
    cpi: null, // Missing critical input
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.01,
    wirFailureRate: 0.02,
    missingDataRatio: 0.01,
    dataDate: '2026-09-01',
  };

  const result = calculateGovernedHealthScore(inputsWithMissing, DEFAULT_HEALTH_CONFIG);

  assert.strictEqual(result.hasMissingCriticalInputs, true);
  // Status MUST NOT be Green when critical inputs are missing
  assert.notStrictEqual(result.status, 'Green');
  assert.strictEqual(result.status, 'Amber');

  const costDim = result.dimensions.find(d => d.dimension === 'Cost');
  assert.strictEqual(costDim.status, 'Unavailable');
  assert.strictEqual(costDim.confidence, 0);
  assert.strictEqual(costDim.rawMetricValue, null);
});

test('F6 Governed Health Score - critical performance triggers Red status', () => {
  const criticalInputs = {
    spi: 0.75, // Critical < 0.85
    cpi: 0.80, // Critical < 0.85
    netCashBalance: -100000,
    unapprovedVariationRatio: 0.20,
    wirFailureRate: 0.30,
    missingDataRatio: 0.20,
  };

  const result = calculateGovernedHealthScore(criticalInputs, DEFAULT_HEALTH_CONFIG);

  assert.strictEqual(result.status, 'Red');
  const scheduleDim = result.dimensions.find(d => d.dimension === 'Schedule');
  assert.strictEqual(scheduleDim.status, 'Red');
});
