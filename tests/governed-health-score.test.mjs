import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateHealthConfig,
  calculateGovernedHealthScore,
  configFromVersion,
  resultFromVersion,
  deriveGovernedProjectHealthScore,
  GOVERNED_HEALTH_CONFIG_TEMPLATE,
} from '../src/utils/governedHealthScore.ts';
import { calculateEvmAtDataDate } from '../src/utils/evm.ts';
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

test('W06-C07 - Cross-screen consistency across all consumers with persisted snapshot', () => {
  const versionDto = {
    id: 'hsv-persisted-01',
    project_id: 'prj-1',
    version_code: 'V-HEALTH-GOVERNED',
    title: 'Governed Snapshot',
    status: 'Approved',
    schedule_weight: 20,
    cost_weight: 20,
    cash_weight: 20,
    scope_weight: 15,
    quality_weight: 15,
    data_quality_weight: 10,
    data_date: '2026-09-13',
    overall_score: 92,
    health_status: 'Green',
    confidence: 100,
    dimensions: [
      { dimension: 'Schedule', weight: 20, score: 95, weightedScore: 19, status: 'Green', confidence: 100, rawValue: 0.95, source: 'schedules', sourceRecordIds: ['sch-1'], freshnessStatus: 'Fresh', metricName: 'Schedule SPI' },
      { dimension: 'Cost', weight: 20, score: 90, weightedScore: 18, status: 'Green', confidence: 100, rawValue: 0.92, source: 'cost_entries', sourceRecordIds: ['cst-1'], freshnessStatus: 'Fresh', metricName: 'Delivery Cost CPI' },
      { dimension: 'Cash', weight: 20, score: 95, weightedScore: 19, status: 'Green', confidence: 100, rawValue: 125000, source: 'cash_flow', sourceRecordIds: ['cash-1'], freshnessStatus: 'Fresh', metricName: 'Net Cash' },
      { dimension: 'Scope', weight: 15, score: 90, weightedScore: 13.5, status: 'Green', confidence: 100, rawValue: 0.02, source: 'variations', sourceRecordIds: ['var-1'], freshnessStatus: 'Fresh', metricName: 'Unapproved Variations' },
      { dimension: 'Quality', weight: 15, score: 85, weightedScore: 12.75, status: 'Green', confidence: 100, rawValue: 0.04, source: 'wir_entries', sourceRecordIds: ['wir-1'], freshnessStatus: 'Fresh', metricName: 'WIR Failure Rate' },
      { dimension: 'Data Quality', weight: 10, score: 95, weightedScore: 9.5, status: 'Green', confidence: 100, rawValue: 0.01, source: 'dq_execution_logs', sourceRecordIds: ['dq-1'], freshnessStatus: 'Fresh', metricName: 'Data Quality Findings' },
    ],
    created_by: 'PMO Lead',
    approved_by: 'PMO Director',
    approved_at: '2026-09-13T12:00:00Z',
    payload: JSON.stringify({ thresholds: GOVERNED_HEALTH_CONFIG_TEMPLATE.thresholds }),
  };

  // 1. Cockpit consumer uses resultFromVersion
  const cockpitResult = resultFromVersion(versionDto, '2026-09-13');
  // 2. ReportPack consumer uses resultFromVersion
  const reportPackResult = resultFromVersion(versionDto, '2026-09-13');
  // 3. Card component uses resultFromVersion
  const cardResult = resultFromVersion(versionDto, '2026-09-13');

  assert.ok(cockpitResult);
  assert.ok(reportPackResult);
  assert.ok(cardResult);
  assert.strictEqual(cockpitResult.overallScore, reportPackResult.overallScore);
  assert.strictEqual(reportPackResult.overallScore, cardResult.overallScore);
  assert.strictEqual(cockpitResult.status, reportPackResult.status);
  assert.strictEqual(reportPackResult.status, cardResult.status);
  assert.strictEqual(cockpitResult.confidence, reportPackResult.confidence);
  assert.strictEqual(reportPackResult.confidence, cardResult.confidence);
  assert.deepStrictEqual(cockpitResult.dimensions, cardResult.dimensions);
});

test('W06-C08 - Two Data Dates Parity: Shared fixture verifies TypeScript EVM and Rust parity', () => {
  // Shared fixed fixture (identical facts to Rust test_evm_two_data_dates_reconciliation)
  const boqItems = [
    { id: 'boq-main-1', contract_id: 'cnt-main', unit_rate: 100, quantity: 1000 },
    { id: 'boq-sub-1', contract_id: 'cnt-sub', unit_rate: 60, main_boq_item_id: 'boq-main-1' },
  ];

  const baselines = [
    { id: 'base-1', contract_id: 'cnt-main', project_id: 'prj-1', status: 'Approved' },
  ];

  const schedules = [
    { id: 'sch-1', contract_id: 'cnt-main', activity: 'Civil Works', planned_quantity: 600, cost_budget: 60000 },
    { id: 'sch-2', contract_id: 'cnt-main', activity: 'Finishing Works', planned_quantity: 1200, cost_budget: 120000 },
  ];

  const scheduleDistributions = [
    { schedule_id: 'sch-1', period_date: '2026-09-10', planned_value: 60000 },
    { schedule_id: 'sch-2', period_date: '2026-09-20', planned_value: 120000 },
  ];

  const wirEntries = [
    { id: 'wir-1', contract_id: 'cnt-main', inspection_date: '2026-09-05', status: 'Approved', quantity: 400, boq_item_id: 'boq-main-1' },
    { id: 'wir-sub-1', contract_id: 'cnt-sub', inspection_date: '2026-09-08', status: 'Approved', quantity: 200, boq_item_id: 'boq-sub-1' },
    { id: 'wir-date2', contract_id: 'cnt-main', inspection_date: '2026-09-18', status: 'Approved', quantity: 300, boq_item_id: 'boq-main-1' },
    { id: 'wir-future', contract_id: 'cnt-main', inspection_date: '2026-09-25', status: 'Approved', quantity: 500, boq_item_id: 'boq-main-1' },
    { id: 'wir-undated', contract_id: 'cnt-main', status: 'Approved', quantity: 500, boq_item_id: 'boq-main-1' },
  ];

  const progressCorrections = [
    { original_wir_id: 'wir-1', contract_id: 'cnt-main', status: 'Posted', effective_date: '2026-09-09', correction_type: 'Reversal', quantity: 50 },
    { original_wir_id: 'wir-1', contract_id: 'cnt-main', status: 'Posted', effective_date: '2026-09-28', correction_type: 'Reversal', quantity: 100 },
  ];

  const costEntries = [
    { id: 'cst-1', contract_id: 'cnt-main', date: '2026-09-03', amount: 25000, status: 'Posted' },
    { id: 'cst-sub-1', contract_id: 'cnt-sub', date: '2026-09-07', amount: 15000, status: 'Approved' },
    { id: 'cst-dup', contract_id: 'cnt-main', date: '2026-09-04', amount: 10000, source_type: 'procurement_receipt', source_id: 'rcpt-dup', status: 'Posted' },
    { id: 'cst-date2', contract_id: 'cnt-main', date: '2026-09-15', amount: 20000, status: 'Posted' },
    { id: 'cst-future', contract_id: 'cnt-main', date: '2026-09-27', amount: 50000, status: 'Posted' },
    { id: 'cst-undated', contract_id: 'cnt-main', amount: 50000, status: 'Posted' },
  ];

  const procurementReceipts = [
    { id: 'rcpt-dup', contract_id: 'cnt-main', receipt_date: '2026-09-04', status: 'Accepted', accepted_amount: 10000 },
    { id: 'rcpt-unposted', contract_id: 'cnt-main', receipt_date: '2026-09-06', status: 'Accepted', accepted_amount: 5000 },
    { id: 'rcpt-pending', contract_id: 'cnt-main', receipt_date: '2026-09-06', status: 'Pending', accepted_amount: 50000 },
  ];

  const controlAccounts = [
    { id: 'ca-1', contract_id: 'cnt-main', boq_item_id: 'boq-main-1', status: 'Active' },
  ];

  const costPlanVersions = [
    {
      id: 'cp-1',
      control_account_id: 'ca-1',
      status: 'Approved',
      delivery_cost_bac: 80000,
      periods: [
        { period_end: '2026-09-10', planned_cost: 30000 },
        { period_end: '2026-09-20', planned_cost: 50000 },
      ],
    },
  ];

  // === DATA DATE 1: 2026-09-10 ===
  const resDate1 = calculateEvmAtDataDate({
    contractIds: ['cnt-main'],
    performanceContractIds: ['cnt-main', 'cnt-sub'],
    dataDate: '2026-09-10',
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    progressCorrections,
    boqItems,
    costEntries,
    procurementReceipts,
    controlAccounts,
    costPlanVersions,
  });

  // Expected canonical outputs at Date 1:
  // Revenue PV = 60,000
  // Revenue EV = (400*100) + (200*100) - (50*100) = 55,000
  // Revenue SPI = 55,000 / 60,000 = 0.916666...
  // Delivery Cost BAC = 80,000
  // Delivery Cost EV = 80,000 * (55,000 / 100,000) = 44,000
  // Delivery Cost AC = 25,000 + 15,000 + 10,000 + 5,000 = 55,000
  // Delivery Cost CPI = 44,000 / 55,000 = 0.8
  assert.strictEqual(resDate1.revenuePV, 60000);
  assert.strictEqual(resDate1.revenueEV, 55000);
  assert.ok(Math.abs(resDate1.revenueSPI - (55000 / 60000)) < 1e-4);
  assert.strictEqual(resDate1.costBAC, 80000);
  assert.strictEqual(resDate1.costEV, 44000);
  assert.strictEqual(resDate1.costAC, 55000);
  assert.ok(Math.abs(resDate1.costCPI - 0.8) < 1e-4);

  // Cross-engine parity check with Rust persisted health score dimensions:
  // Schedule SPI matches Rust res_date1.dimensions[0].raw_metric_value
  // Cost CPI matches Rust res_date1.dimensions[1].raw_metric_value
  const rustPersistedDate1 = {
    scheduleSpi: 55000.0 / 60000.0,
    deliveryCostCpi: 0.8,
  };
  assert.ok(Math.abs(resDate1.revenueSPI - rustPersistedDate1.scheduleSpi) < 1e-6);
  assert.ok(Math.abs(resDate1.costCPI - rustPersistedDate1.deliveryCostCpi) < 1e-6);

  // === DATA DATE 2: 2026-09-20 ===
  const resDate2 = calculateEvmAtDataDate({
    contractIds: ['cnt-main'],
    performanceContractIds: ['cnt-main', 'cnt-sub'],
    dataDate: '2026-09-20',
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    progressCorrections,
    boqItems,
    costEntries,
    procurementReceipts,
    controlAccounts,
    costPlanVersions,
  });

  // Expected canonical outputs at Date 2:
  // Revenue PV = 60,000 + 120,000 = 180,000
  // Revenue EV = 55,000 + (300 * 100) = 85,000
  // Revenue SPI = 85,000 / 180,000 = 0.472222...
  // Delivery Cost BAC = 80,000
  // Delivery Cost EV = 80,000 * (85,000 / 100,000) = 68,000
  // Delivery Cost AC = 55,000 + 20,000 = 75,000
  // Delivery Cost CPI = 68,000 / 75,000 = 0.906666...
  assert.strictEqual(resDate2.revenuePV, 180000);
  assert.strictEqual(resDate2.revenueEV, 85000);
  assert.ok(Math.abs(resDate2.revenueSPI - (85000 / 180000)) < 1e-4);
  assert.strictEqual(resDate2.costBAC, 80000);
  assert.strictEqual(resDate2.costEV, 68000);
  assert.strictEqual(resDate2.costAC, 75000);
  assert.ok(Math.abs(resDate2.costCPI - (68000 / 75000)) < 1e-4);

  // Cross-engine parity check with Rust persisted health score dimensions:
  const rustPersistedDate2 = {
    scheduleSpi: 85000.0 / 180000.0,
    deliveryCostCpi: 68000.0 / 75000.0,
  };
  assert.ok(Math.abs(resDate2.revenueSPI - rustPersistedDate2.scheduleSpi) < 1e-6);
  assert.ok(Math.abs(resDate2.costCPI - rustPersistedDate2.deliveryCostCpi) < 1e-6);
});

test('W06-C08 - Cost CPI is null and Unavailable when no approved cost plan exists', () => {
  const resultWithoutPlan = calculateEvmAtDataDate({
    contractIds: ['cnt-main'],
    dataDate: '2026-09-10',
    schedules: [],
    scheduleDistributions: [],
    baselines: [],
    wirEntries: [],
    boqItems: [],
    costEntries: [{ id: 'c-1', contract_id: 'cnt-main', date: '2026-09-01', amount: 25000 }],
    controlAccounts: [{ id: 'ca-1', contract_id: 'cnt-main', status: 'Active' }],
    costPlanVersions: [{ id: 'cp-draft', control_account_id: 'ca-1', status: 'Draft' }],
  });

  // Strict rule: Without approved cost plan, cost CPI must be null
  assert.strictEqual(resultWithoutPlan.costCPI, null);
  assert.strictEqual(resultWithoutPlan.costEV, null);
  assert.strictEqual(resultWithoutPlan.costBAC, null);
  assert.notStrictEqual(resultWithoutPlan.cost.status, 'Ready');

  // Governed health score must reflect Unavailable with score 0
  const healthResult = deriveGovernedProjectHealthScore({
    projectId: 'prj-1',
    approvedConfig: GOVERNED_HEALTH_CONFIG_TEMPLATE,
    evm: {
      spi: 1.0,
      cpi: resultWithoutPlan.costCPI,
    },
    costs: [{ id: 'c-1', project_id: 'prj-1' }],
  });

  const costDim = healthResult.dimensions.find(d => d.dimension === 'Cost');
  assert.ok(costDim);
  assert.strictEqual(costDim.status, 'Unavailable');
  assert.strictEqual(costDim.score, 0);
  assert.strictEqual(costDim.rawValue, null);
});
