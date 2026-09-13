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

test('F6 Governed Health Score - monotonicity: improving metrics never reduces score', () => {
  const baseInputs = {
    spi: 0.90,
    cpi: 0.90,
    netCashBalance: 10000,
    unapprovedVariationRatio: 0.05,
    wirFailureRate: 0.05,
    missingDataRatio: 0.02,
  };

  const improvedInputs = {
    spi: 1.10,
    cpi: 1.05,
    netCashBalance: 50000,
    unapprovedVariationRatio: 0.01,
    wirFailureRate: 0.01,
    missingDataRatio: 0.00,
  };

  const baseResult = calculateGovernedHealthScore(baseInputs, DEFAULT_HEALTH_CONFIG);
  const improvedResult = calculateGovernedHealthScore(improvedInputs, DEFAULT_HEALTH_CONFIG);

  assert.ok(improvedResult.overallScore >= baseResult.overallScore, `Improved score (${improvedResult.overallScore}) should be >= base score (${baseResult.overallScore})`);
  assert.strictEqual(improvedResult.status, 'Green');
});

test('F6 Governed Health Score - determinism: identical inputs produce identical scores and explanations', () => {
  const inputs = {
    spi: 0.92,
    cpi: 0.88,
    netCashBalance: -5000,
    unapprovedVariationRatio: 0.04,
    wirFailureRate: 0.08,
    missingDataRatio: 0.03,
    dataDate: '2026-09-15',
    versionCode: 'V-DETERMINISM',
  };

  const run1 = calculateGovernedHealthScore(inputs, DEFAULT_HEALTH_CONFIG);
  const run2 = calculateGovernedHealthScore(inputs, DEFAULT_HEALTH_CONFIG);

  assert.strictEqual(run1.overallScore, run2.overallScore);
  assert.strictEqual(run1.status, run2.status);
  assert.strictEqual(run1.overallConfidence, run2.overallConfidence);
  assert.deepStrictEqual(run1.dimensions, run2.dimensions);
});

test('F6 Governed Health Score - W06-G07 Cross-screen consistency: identical score across all consumers', () => {
  const unifiedInputs = {
    spi: 0.95,
    cpi: 0.92,
    netCashBalance: 125000,
    unapprovedVariationRatio: 0.02,
    wirFailureRate: 0.04,
    missingDataRatio: 0.01,
    dataDate: '2026-09-13',
    versionCode: 'V-HEALTH-GOVERNED',
  };

  // 1. GovernedHealthScoreCard consumer calculation
  const cardResult = calculateGovernedHealthScore(unifiedInputs, DEFAULT_HEALTH_CONFIG);

  // 2. Dashboard consumer calculation
  const dashboardResult = calculateGovernedHealthScore(unifiedInputs, DEFAULT_HEALTH_CONFIG);

  // 3. ReportPack consumer calculation
  const reportPackResult = calculateGovernedHealthScore(unifiedInputs, DEFAULT_HEALTH_CONFIG);

  // Assert perfect parity across all three views
  assert.strictEqual(cardResult.overallScore, dashboardResult.overallScore);
  assert.strictEqual(dashboardResult.overallScore, reportPackResult.overallScore);
  assert.strictEqual(cardResult.status, dashboardResult.status);
  assert.strictEqual(dashboardResult.status, reportPackResult.status);
  assert.strictEqual(cardResult.overallConfidence, dashboardResult.overallConfidence);
  assert.strictEqual(dashboardResult.overallConfidence, reportPackResult.overallConfidence);
});

test('F6 Governed Health Score - W06-G04 Missing schedule/cost baseline prevents Green status', () => {
  const missingScheduleInputs = {
    spi: null,
    cpi: 1.05,
    netCashBalance: 50000,
    unapprovedVariationRatio: 0.0,
    wirFailureRate: 0.0,
    missingDataRatio: 0.0,
  };

  const result = calculateGovernedHealthScore(missingScheduleInputs, DEFAULT_HEALTH_CONFIG);
  assert.notStrictEqual(result.status, 'Green', 'Status must not be Green when schedule baseline is missing');
  assert.strictEqual(result.hasMissingCriticalInputs, true);
  assert.ok(result.overallConfidence < 100);
});

test('F6 Governed Health Score - W06-G05 & W06-G06 Boundary threshold precision and rounding', () => {
  // Test exactly at critical boundary (0.85 for SPI)
  const atCriticalBoundary = {
    spi: 0.85,
    cpi: 0.98,
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.0,
    wirFailureRate: 0.0,
    missingDataRatio: 0.0,
  };
  const resBoundary = calculateGovernedHealthScore(atCriticalBoundary, DEFAULT_HEALTH_CONFIG);
  const schedDim = resBoundary.dimensions.find(d => d.dimension === 'Schedule');
  assert.strictEqual(schedDim.status, 'Amber', 'Exact warning/critical boundary should produce Amber, not Red');

  // Test slightly below critical boundary
  const belowCriticalBoundary = {
    ...atCriticalBoundary,
    spi: 0.849,
  };
  const resBelow = calculateGovernedHealthScore(belowCriticalBoundary, DEFAULT_HEALTH_CONFIG);
  const schedDimBelow = resBelow.dimensions.find(d => d.dimension === 'Schedule');
  assert.strictEqual(schedDimBelow.status, 'Red', 'Below critical boundary should produce Red');
});

test('F6 Governed Health Score - W06-G02 Source Lineage and freshness traceability', () => {
  const inputs = {
    spi: 0.96,
    cpi: 0.94,
    netCashBalance: 200000,
    unapprovedVariationRatio: 0.03,
    wirFailureRate: 0.02,
    missingDataRatio: 0.00,
    dataDate: '2026-09-13',
    versionCode: 'V-TRACE-01',
  };

  const result = calculateGovernedHealthScore(inputs, DEFAULT_HEALTH_CONFIG);
  for (const dim of result.dimensions) {
    assert.ok(dim.source, `Dimension ${dim.dimension} must have explicit source lineage`);
    assert.ok(dim.metricName, `Dimension ${dim.dimension} must have metric name`);
    assert.strictEqual(typeof dim.score, 'number');
    assert.strictEqual(typeof dim.weightedScore, 'number');
  }
});


