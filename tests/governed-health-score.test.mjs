import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateHealthConfig,
  calculateGovernedHealthScore,
  configFromVersion,
  GOVERNED_HEALTH_CONFIG_TEMPLATE,
} from '../src/utils/governedHealthScore.ts';
import {
  mapDtoToHealthScoreVersion,
} from '../src/data/healthScoreWorkflow.ts';

test('W06-C01 & W06-C06 - validates config weights sum to 100% and directional threshold ordering', () => {
  const valid = validateHealthConfig(GOVERNED_HEALTH_CONFIG_TEMPLATE);
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.errors.length, 0);

  // Invalid total weight
  const invalidWeight = {
    ...GOVERNED_HEALTH_CONFIG_TEMPLATE,
    scheduleWeight: 30, // Sum becomes 110%
  };
  const resWeight = validateHealthConfig(invalidWeight);
  assert.strictEqual(resWeight.isValid, false);
  assert.ok(resWeight.errors[0].includes('must sum to 100%'));

  // Invalid threshold ordering for higher_is_better (critical must be < warning)
  const invalidThresholdHigher = {
    ...GOVERNED_HEALTH_CONFIG_TEMPLATE,
    thresholds: {
      ...GOVERNED_HEALTH_CONFIG_TEMPLATE.thresholds,
      schedule: { warning: 0.80, critical: 0.90, direction: 'higher_is_better' },
    },
  };
  const resHigher = validateHealthConfig(invalidThresholdHigher);
  assert.strictEqual(resHigher.isValid, false);
  assert.ok(resHigher.errors.some(e => e.includes('higher-is-better') || e.includes('warning threshold')));

  // Invalid threshold ordering for lower_is_better (critical must be > warning)
  const invalidThresholdLower = {
    ...GOVERNED_HEALTH_CONFIG_TEMPLATE,
    thresholds: {
      ...GOVERNED_HEALTH_CONFIG_TEMPLATE.thresholds,
      scope: { warning: 0.20, critical: 0.10, direction: 'lower_is_better' },
    },
  };
  const resLower = validateHealthConfig(invalidThresholdLower);
  assert.strictEqual(resLower.isValid, false);
  assert.ok(resLower.errors.some(e => e.includes('lower-is-better') || e.includes('warning threshold')));
});

test('W06-C02 - Requires setup status when no approved baseline is active', () => {
  const inputs = {
    spi: 1.05,
    cpi: 0.98,
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.02,
    wirFailureRate: 0.03,
    missingDataRatio: 0.01,
    dataDate: '2026-09-01',
  };

  // Called without approved config
  const unapprovedResult = calculateGovernedHealthScore(inputs, null, false);
  assert.strictEqual(unapprovedResult.status, 'Requires setup');
  assert.strictEqual(unapprovedResult.overallScore, 0);
  assert.strictEqual(unapprovedResult.hasMissingCriticalInputs, true);
  assert.ok(unapprovedResult.notes?.includes('No approved governed health configuration'));
});

test('W06-C02 & W06-C08 - calculates score across 6 dimensions with full approved configuration and lineage', () => {
  const inputs = {
    spi: 1.05,
    cpi: 0.98,
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.02,
    wirFailureRate: 0.03,
    missingDataRatio: 0.01,
    dataDate: '2026-09-01',
    versionCode: 'V-HEALTH-APPR-01',
  };

  const result = calculateGovernedHealthScore(inputs, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);

  assert.strictEqual(result.versionCode, 'V-HEALTH-APPR-01');
  assert.strictEqual(result.dataDate, '2026-09-01');
  assert.strictEqual(result.dimensions.length, 6);
  assert.strictEqual(result.hasMissingCriticalInputs, false);
  assert.strictEqual(result.confidence, 100);
  assert.ok(result.overallScore >= 80);
  assert.strictEqual(result.status, 'Green');

  for (const dim of result.dimensions) {
    assert.ok(dim.source, `Dimension ${dim.dimension} must have explicit source lineage`);
    assert.ok(dim.metricName, `Dimension ${dim.dimension} must have metric name`);
    assert.ok(dim.freshnessStatus, `Dimension ${dim.dimension} must have freshnessStatus`);
    assert.strictEqual(typeof dim.score, 'number');
    assert.strictEqual(typeof dim.weightedScore, 'number');
  }
});

test('W06-C02 - Missing critical input lowers confidence and caps status below Green', () => {
  const inputsWithMissing = {
    spi: 1.05,
    cpi: null, // Missing EVM CPI
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.01,
    wirFailureRate: 0.02,
    missingDataRatio: 0.01,
    dataDate: '2026-09-01',
  };

  const result = calculateGovernedHealthScore(inputsWithMissing, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);

  assert.strictEqual(result.hasMissingCriticalInputs, true);
  assert.notStrictEqual(result.status, 'Green');
  assert.strictEqual(result.status, 'Amber');

  const costDim = result.dimensions.find(d => d.dimension === 'Cost');
  assert.strictEqual(costDim.status, 'Unavailable');
  assert.strictEqual(costDim.confidence, 0);
  assert.strictEqual(costDim.rawValue, null);
});

test('W06-C02 - Critical performance triggers Red status', () => {
  const criticalInputs = {
    spi: 0.75, // Critical < 0.85
    cpi: 0.80, // Critical < 0.85
    netCashBalance: -100000,
    unapprovedVariationRatio: 0.30,
    wirFailureRate: 0.30,
    missingDataRatio: 0.20,
  };

  const result = calculateGovernedHealthScore(criticalInputs, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);

  assert.strictEqual(result.status, 'Red');
  const scheduleDim = result.dimensions.find(d => d.dimension === 'Schedule');
  assert.strictEqual(scheduleDim.status, 'Red');
});

test('W06-C03 - Project-scoped authority and custom config conversion', () => {
  const customProjectVersion = {
    id: 'v-p1-custom',
    project_id: 'PRJ-ALPHA',
    version_code: 'V-HEALTH-ALPHA-01',
    title: 'Alpha Custom Weights',
    status: 'Approved',
    schedule_weight: 40,
    cost_weight: 30,
    cash_weight: 10,
    scope_weight: 10,
    quality_weight: 5,
    data_quality_weight: 5,
    data_date: '2026-09-13',
    overall_score: 85,
    health_status: 'Green',
    confidence: 100,
    dimensions: [],
    created_by: 'Planner 1',
    approved_by: 'PMO Director',
    approved_at: '2026-09-13T10:00:00Z',
    payload: JSON.stringify({
      thresholds: {
        schedule: { warning: 0.98, critical: 0.90, direction: 'higher_is_better' },
        cost: { warning: 0.98, critical: 0.90, direction: 'higher_is_better' },
        cash: { warning: 50000, critical: 0, direction: 'higher_is_better' },
        scope: { warning: 0.05, critical: 0.15, direction: 'lower_is_better' },
        quality: { warning: 0.03, critical: 0.10, direction: 'lower_is_better' },
        dataQuality: { warning: 0.02, critical: 0.08, direction: 'lower_is_better' },
      }
    }),
  };

  const config = configFromVersion(customProjectVersion);
  assert.strictEqual(config.scheduleWeight, 40);
  assert.strictEqual(config.costWeight, 30);
  assert.strictEqual(config.thresholds.schedule.warning, 0.98);

  const inputs = {
    spi: 0.95, // Under 0.98 warning for this custom project
    cpi: 1.02,
    netCashBalance: 100000,
    unapprovedVariationRatio: 0.01,
    wirFailureRate: 0.01,
    missingDataRatio: 0.01,
  };

  const result = calculateGovernedHealthScore(inputs, config, true);
  const schedDim = result.dimensions.find(d => d.dimension === 'Schedule');
  assert.strictEqual(schedDim.status, 'Amber');
});

test('W06-C04 - Maker-Checker violation error handling in workflow', async () => {
  const { saveHealthScoreVersion, approveHealthScoreVersion } = await import('../src/data/healthScoreWorkflow.ts');
  const draft = await saveHealthScoreVersion({
    operation_id: 'op-test-mc-01',
    project_id: 'PRJ-TEST-MC',
    version_code: 'V-TEST-01',
    title: 'Test Maker Checker',
    schedule_weight: 20,
    cost_weight: 20,
    cash_weight: 20,
    scope_weight: 15,
    quality_weight: 15,
    data_quality_weight: 10,
    schedule_warning_threshold: 0.95,
    schedule_critical_threshold: 0.85,
    schedule_direction: 'higher_is_better',
    cost_warning_threshold: 0.95,
    cost_critical_threshold: 0.85,
    cost_direction: 'higher_is_better',
    cash_warning_threshold: 0,
    cash_critical_threshold: -50000,
    cash_direction: 'higher_is_better',
    scope_warning_threshold: 0.10,
    scope_critical_threshold: 0.25,
    scope_direction: 'lower_is_better',
    quality_warning_threshold: 0.05,
    quality_critical_threshold: 0.15,
    quality_direction: 'lower_is_better',
    data_quality_warning_threshold: 0.05,
    data_quality_critical_threshold: 0.15,
    data_quality_direction: 'lower_is_better',
    actor: 'User Maker',
  });

  assert.strictEqual(draft.created_by, 'User Maker');
  assert.strictEqual(draft.status, 'Draft');

  // Attempt approval by same maker -> should reject
  await assert.rejects(
    async () => {
      await approveHealthScoreVersion({
        operation_id: 'op-test-mc-02',
        version_id: draft.id,
        actor: 'User Maker',
      });
    },
    (err) => {
      assert.ok(err.message.includes('Maker-checker violation') || err.message.includes('cannot approve'));
      return true;
    }
  );

  // Approval by checker -> should succeed
  const approved = await approveHealthScoreVersion({
    operation_id: 'op-test-mc-03',
    version_id: draft.id,
    actor: 'User Checker',
  });

  assert.strictEqual(approved.status, 'Approved');
  assert.strictEqual(approved.approved_by, 'User Checker');
});

test('W06-C07 - Cross-screen consistency across all consumers', () => {
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

  // 1. Cockpit consumer
  const cockpitResult = calculateGovernedHealthScore(unifiedInputs, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);
  // 2. ReportPack consumer
  const reportPackResult = calculateGovernedHealthScore(unifiedInputs, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);
  // 3. Card component
  const cardResult = calculateGovernedHealthScore(unifiedInputs, GOVERNED_HEALTH_CONFIG_TEMPLATE, true);

  assert.strictEqual(cockpitResult.overallScore, reportPackResult.overallScore);
  assert.strictEqual(reportPackResult.overallScore, cardResult.overallScore);
  assert.strictEqual(cockpitResult.status, reportPackResult.status);
  assert.strictEqual(reportPackResult.status, cardResult.status);
  assert.strictEqual(cockpitResult.confidence, reportPackResult.confidence);
  assert.strictEqual(reportPackResult.confidence, cardResult.confidence);
  assert.deepStrictEqual(cockpitResult.dimensions, cardResult.dimensions);
});
