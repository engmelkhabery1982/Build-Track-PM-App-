import type {
  GovernedHealthScoreConfig,
  HealthDimensionContribution,
  HealthScoreResult,
  HealthScoreVersion,
  HealthScoreStatus,
} from '../types/index.ts';

export const GOVERNED_HEALTH_CONFIG_TEMPLATE: GovernedHealthScoreConfig = {
  scheduleWeight: 20,
  costWeight: 20,
  cashWeight: 20,
  scopeWeight: 15,
  qualityWeight: 15,
  dataQualityWeight: 10,
  thresholds: {
    schedule: {
      warning: 0.95,
      critical: 0.85,
      direction: 'higher_is_better',
    },
    cost: {
      warning: 0.95,
      critical: 0.85,
      direction: 'higher_is_better',
    },
    cash: {
      warning: 0,
      critical: -50000,
      direction: 'higher_is_better',
    },
    scope: {
      warning: 0.10, // 10% unapproved variation ratio
      critical: 0.25, // 25% unapproved variation ratio
      direction: 'lower_is_better',
    },
    quality: {
      warning: 0.05, // 5% WIR fail rate
      critical: 0.15, // 15% WIR fail rate
      direction: 'lower_is_better',
    },
    dataQuality: {
      warning: 0.05, // 5% missing linked controls
      critical: 0.15, // 15% missing linked controls
      direction: 'lower_is_better',
    },
  },
};

export const DEFAULT_HEALTH_CONFIG = GOVERNED_HEALTH_CONFIG_TEMPLATE;

export function validateHealthConfig(config: GovernedHealthScoreConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const totalWeight =
    (config.scheduleWeight || 0) +
    (config.costWeight || 0) +
    (config.cashWeight || 0) +
    (config.scopeWeight || 0) +
    (config.qualityWeight || 0) +
    (config.dataQualityWeight || 0);

  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total weights must sum to 100% (current total: ${totalWeight}%)`);
  }

  const dims: Array<{ name: string; weight: number; warning: number; critical: number; direction: string }> = [
    { name: 'Schedule', weight: config.scheduleWeight, warning: config.thresholds.schedule.warning, critical: config.thresholds.schedule.critical, direction: config.thresholds.schedule.direction },
    { name: 'Cost', weight: config.costWeight, warning: config.thresholds.cost.warning, critical: config.thresholds.cost.critical, direction: config.thresholds.cost.direction },
    { name: 'Cash', weight: config.cashWeight, warning: config.thresholds.cash.warning, critical: config.thresholds.cash.critical, direction: config.thresholds.cash.direction },
    { name: 'Scope', weight: config.scopeWeight, warning: config.thresholds.scope.warning, critical: config.thresholds.scope.critical, direction: config.thresholds.scope.direction },
    { name: 'Quality', weight: config.qualityWeight, warning: config.thresholds.quality.warning, critical: config.thresholds.quality.critical, direction: config.thresholds.quality.direction },
    { name: 'Data Quality', weight: config.dataQualityWeight, warning: config.thresholds.dataQuality.warning, critical: config.thresholds.dataQuality.critical, direction: config.thresholds.dataQuality.direction },
  ];

  for (const d of dims) {
    if (d.weight < 0 || d.weight > 100) {
      errors.push(`Dimension ${d.name} weight must be between 0% and 100%`);
    }

    if (d.direction === 'higher_is_better') {
      if (d.critical >= d.warning) {
        errors.push(`Dimension ${d.name}: Critical threshold (${d.critical}) must be strictly less than warning threshold (${d.warning}) for higher-is-better metric`);
      }
    } else {
      if (d.critical <= d.warning) {
        errors.push(`Dimension ${d.name}: Critical threshold (${d.critical}) must be strictly greater than warning threshold (${d.warning}) for lower-is-better metric`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function configFromVersion(version: HealthScoreVersion): GovernedHealthScoreConfig {
  let customThresholds: any = null;
  if (version.payload) {
    try {
      const parsed = JSON.parse(version.payload);
      if (parsed.thresholds) customThresholds = parsed.thresholds;
    } catch {}
  }

  return {
    scheduleWeight: version.schedule_weight,
    costWeight: version.cost_weight,
    cashWeight: version.cash_weight,
    scopeWeight: version.scope_weight,
    qualityWeight: version.quality_weight,
    dataQualityWeight: version.data_quality_weight,
    thresholds: customThresholds || {
      schedule: { warning: 0.95, critical: 0.85, direction: 'higher_is_better' },
      cost: { warning: 0.95, critical: 0.85, direction: 'higher_is_better' },
      cash: { warning: 0, critical: -50000, direction: 'higher_is_better' },
      scope: { warning: 0.10, critical: 0.25, direction: 'lower_is_better' },
      quality: { warning: 0.05, critical: 0.15, direction: 'lower_is_better' },
      dataQuality: { warning: 0.05, critical: 0.15, direction: 'lower_is_better' },
    },
  };
}

export interface RawHealthInputs {
  spi?: number | null;
  cpi?: number | null;
  netCashBalance?: number | null;
  unapprovedVariationRatio?: number | null;
  wirFailureRate?: number | null;
  missingDataRatio?: number | null;
  dataDate?: string;
  versionCode?: string;
  scheduleIds?: string[];
  costIds?: string[];
  cashIds?: string[];
  variationIds?: string[];
  wirIds?: string[];
  dataQualityIds?: string[];
}

export function calculateGovernedHealthScore(
  inputs: RawHealthInputs,
  config?: GovernedHealthScoreConfig | null,
  isApprovedConfig: boolean = true
): HealthScoreResult {
  // If no approved config is supplied, return Requires setup with confidence 0
  if (!config || !isApprovedConfig) {
    return {
      overallScore: 0,
      status: 'Requires setup',
      confidence: 0,
      overallConfidence: 0,
      hasMissingCriticalInputs: true,
      dimensions: [],
      dataDate: inputs.dataDate,
      versionCode: inputs.versionCode,
      isGovernedApproved: false,
      notes: 'No approved governed health configuration',
    };
  }

  const validation = validateHealthConfig(config);
  if (!validation.isValid) {
    return {
      overallScore: 0,
      status: 'Unavailable',
      confidence: 0,
      overallConfidence: 0,
      hasMissingCriticalInputs: true,
      dimensions: [],
      dataDate: inputs.dataDate,
      versionCode: inputs.versionCode,
      isGovernedApproved: false,
      notes: validation.errors.join('; '),
    };
  }

  const roundTwo = (num: number) => Math.round(num * 100) / 100;

  const calculateDim = (
    dimension: string,
    metricName: string,
    weight: number,
    rawValue: number | null | undefined,
    warning: number,
    critical: number,
    direction: 'higher_is_better' | 'lower_is_better',
    source: string,
    sourceRecordIds: string[] = []
  ): HealthDimensionContribution => {
    if (rawValue === null || rawValue === undefined || !Number.isFinite(rawValue)) {
      return {
        dimension,
        metricName,
        rawValue: null,
        score: 0,
        weight,
        weightedScore: 0,
        status: 'Unavailable',
        confidence: 0,
        source,
        sourceRecordIds,
        freshnessStatus: 'Missing',
      };
    }

    let score = 0;
    let status: 'Green' | 'Amber' | 'Red' = 'Green';

    if (direction === 'higher_is_better') {
      if (rawValue >= warning) {
        status = 'Green';
        const range = warning * 0.2 + 0.001;
        const progress = Math.min(1.0, (rawValue - warning) / range);
        score = 80.0 + progress * 20.0;
      } else if (rawValue >= critical) {
        status = 'Amber';
        const range = warning - critical + 0.0001;
        const progress = (rawValue - critical) / range;
        score = 50.0 + progress * 29.0;
      } else {
        status = 'Red';
        const progress = Math.max(0, rawValue / (critical === 0 ? 1 : Math.abs(critical)));
        score = Math.min(49.0, progress * 49.0);
      }
    } else {
      // lower_is_better
      if (rawValue <= warning) {
        status = 'Green';
        const progress = Math.min(1.0, (warning - rawValue) / (warning + 0.001));
        score = 80.0 + progress * 20.0;
      } else if (rawValue <= critical) {
        status = 'Amber';
        const range = critical - warning + 0.0001;
        const progress = (critical - rawValue) / range;
        score = 50.0 + progress * 29.0;
      } else {
        status = 'Red';
        const excess = Math.max(0, (critical * 2.0 - rawValue) / (critical === 0 ? 1 : critical));
        score = Math.min(49.0, excess * 49.0);
      }
    }

    score = roundTwo(Math.max(0, Math.min(100, score)));
    const weightedScore = roundTwo((score * weight) / 100.0);

    return {
      dimension,
      metricName,
      rawValue,
      score,
      weight,
      weightedScore,
      status,
      confidence: 100,
      source,
      sourceRecordIds,
      freshnessStatus: 'Fresh',
    };
  };

  const dimSched = calculateDim(
    'Schedule',
    'Schedule Performance Index (SPI)',
    config.scheduleWeight,
    inputs.spi,
    config.thresholds.schedule.warning,
    config.thresholds.schedule.critical,
    config.thresholds.schedule.direction,
    'Governed Schedules & EVM Baseline Progress',
    inputs.scheduleIds || []
  );

  const dimCost = calculateDim(
    'Cost',
    'Cost Performance Index (CPI)',
    config.costWeight,
    inputs.cpi,
    config.thresholds.cost.warning,
    config.thresholds.cost.critical,
    config.thresholds.cost.direction,
    'Governed Cost Control Accounts & AC Entries',
    inputs.costIds || []
  );

  const dimCash = calculateDim(
    'Cash',
    'Net Governed Cash Balance ($)',
    config.cashWeight,
    inputs.netCashBalance,
    config.thresholds.cash.warning,
    config.thresholds.cash.critical,
    config.thresholds.cash.direction,
    'Payment Certificates & Settle Cash Flow Ledger',
    inputs.cashIds || []
  );

  const dimScope = calculateDim(
    'Scope',
    'Unapproved Variation Ratio (%)',
    config.scopeWeight,
    inputs.unapprovedVariationRatio,
    config.thresholds.scope.warning,
    config.thresholds.scope.critical,
    config.thresholds.scope.direction,
    'Governed Variations & Commercial Change Register',
    inputs.variationIds || []
  );

  const dimQual = calculateDim(
    'Quality',
    'WIR Failure & Non-Conformance Rate (%)',
    config.qualityWeight,
    inputs.wirFailureRate,
    config.thresholds.quality.warning,
    config.thresholds.quality.critical,
    config.thresholds.quality.direction,
    'Site Inspection Logs (WIR) & NCR Ledger',
    inputs.wirIds || []
  );

  const dimDq = calculateDim(
    'Data Quality',
    'Missing Baseline & Period Linkages (%)',
    config.dataQualityWeight,
    inputs.missingDataRatio,
    config.thresholds.dataQuality.warning,
    config.thresholds.dataQuality.critical,
    config.thresholds.dataQuality.direction,
    'Data Governance & Period Reconciliation Checks',
    inputs.dataQualityIds || []
  );

  const dimensions = [dimSched, dimCost, dimCash, dimScope, dimQual, dimDq];

  const overallScore = roundTwo(dimensions.reduce((sum, d) => sum + d.weightedScore, 0));
  const confidence = roundTwo(dimensions.reduce((sum, d) => sum + (d.confidence * (d.weight / 100)), 0));

  const hasMissingCritical = dimensions.some(
    (d) => d.status === 'Unavailable' && (d.dimension === 'Schedule' || d.dimension === 'Cost')
  );

  let status: HealthScoreStatus = 'Green';
  if (dimensions.every((d) => d.status === 'Unavailable')) {
    status = 'Unavailable';
  } else if (dimensions.some((d) => d.status === 'Red') || overallScore < 50) {
    status = 'Red';
  } else if (hasMissingCritical || dimensions.some((d) => d.status === 'Amber') || overallScore < 80) {
    status = 'Amber';
  } else {
    status = 'Green';
  }

  return {
    overallScore,
    status,
    confidence,
    overallConfidence: confidence,
    hasMissingCriticalInputs: hasMissingCritical,
    dimensions,
    dataDate: inputs.dataDate,
    versionCode: inputs.versionCode,
    isGovernedApproved: true,
  };
}

export function resultFromVersion(
  version: HealthScoreVersion | null | undefined,
  defaultDataDate?: string
): HealthScoreResult | null {
  if (!version || version.status !== 'Approved' || !version.dimensions || !version.dimensions.length) {
    return null;
  }
  return {
    overallScore: version.overall_score ?? 0,
    status: (version.health_status as any) || 'Unavailable',
    confidence: version.confidence ?? 100,
    overallConfidence: version.confidence ?? 100,
    hasMissingCriticalInputs: (version.dimensions || []).some(
      (d) => d.status === 'Unavailable' && (d.dimension === 'Schedule' || d.dimension === 'Cost')
    ),
    dimensions: version.dimensions.map((d) => ({
      dimension: d.dimension,
      metricName: d.metricName || d.dimension,
      rawValue: d.rawValue ?? null,
      score: d.score,
      weight: d.weight,
      weightedScore: d.weightedScore ?? 0,
      status: d.status as any,
      confidence: d.confidence ?? 100,
      source: d.source || '',
      sourceRecordIds: d.sourceRecordIds || [],
      freshnessStatus: d.freshnessStatus || 'Fresh',
    })),
    dataDate: version.data_date || defaultDataDate,
    versionCode: version.version_code,
    isGovernedApproved: true,
    notes: version.notes || undefined,
  };
}

export interface ProjectHealthDerivationParams {
  projectId: string;
  approvedConfig?: GovernedHealthScoreConfig | null;
  versionCode?: string;
  dataDate?: string;
  evm?: {
    spi?: number | null;
    cpi?: number | null;
  };
  schedules?: Array<{ id: string; project_id?: string }>;
  costs?: Array<{ id: string; project_id?: string }>;
  cashFlow?: Array<{ id: string; project_id?: string; inflow?: number; outflow?: number }>;
  variations?: Array<{ id: string; project_id?: string; status?: string }>;
  wirEntries?: Array<{ id: string; project_id?: string; status?: string }>;
  missingDataCount?: number;
  totalDataCount?: number;
}

/**
 * Single canonical derivation helper for project health scores across all consumers
 * Dashboard, Integrated Cockpit, and Report Pack must call this to ensure 100% parity.
 */
export function deriveGovernedProjectHealthScore(params: ProjectHealthDerivationParams): HealthScoreResult {
  const {
    projectId,
    approvedConfig,
    versionCode = 'V-HEALTH-GOVERNED',
    dataDate,
    evm,
    schedules = [],
    costs = [],
    cashFlow = [],
    variations = [],
    wirEntries = [],
    missingDataCount = 0,
    totalDataCount = 0,
  } = params;

  if (!approvedConfig) {
    return {
      overallScore: 0,
      status: 'Requires setup',
      confidence: 0,
      dimensions: [],
      dataDate,
      versionCode,
      isGovernedApproved: false,
    };
  }

  const projSchedules = schedules.filter((s) => !s.project_id || s.project_id === projectId);
  const projCosts = costs.filter((c) => !c.project_id || c.project_id === projectId);
  const projCash = cashFlow.filter((cf) => !cf.project_id || cf.project_id === projectId);
  const projVariations = variations.filter((v) => !v.project_id || v.project_id === projectId);
  const projWirs = wirEntries.filter((w) => !w.project_id || w.project_id === projectId);

  // 1. SPI
  const spi = projSchedules.length > 0 && evm?.spi !== undefined ? evm.spi : null;

  // 2. CPI
  const cpi = projCosts.length > 0 && evm?.cpi !== undefined ? evm.cpi : null;

  // 3. Cash
  const netCash = projCash.length > 0
    ? projCash.reduce((sum, item) => sum + (Number(item.inflow) || 0) - (Number(item.outflow) || 0), 0)
    : null;

  // 4. Variations ratio
  const totalVars = projVariations.length;
  const pendingVars = projVariations.filter((v) => v.status === 'Pending' || v.status === 'Submitted').length;
  const unapprovedVariationRatio = totalVars > 0 ? pendingVars / totalVars : 0.0;

  // 5. WIR failure rate - Authentic: if 0 WIRs, null (Unavailable)
  const wirFailureRate = projWirs.length > 0
    ? projWirs.filter((w) => w.status === 'Rejected' || w.status === 'Failed').length / projWirs.length
    : null;

  // 6. Data quality ratio
  const missingDataRatio = totalDataCount > 0 ? missingDataCount / totalDataCount : 0.0;

  const rawInputs: RawHealthInputs = {
    spi,
    cpi,
    netCashBalance: netCash,
    unapprovedVariationRatio,
    wirFailureRate,
    missingDataRatio,
    dataDate,
    versionCode,
    scheduleIds: projSchedules.map((s) => s.id),
    costIds: projCosts.map((c) => c.id),
    cashIds: projCash.map((cf) => cf.id),
    variationIds: projVariations.map((v) => v.id),
    wirIds: projWirs.map((w) => w.id),
    dataQualityIds: [],
  };

  return calculateGovernedHealthScore(rawInputs, approvedConfig, true);
}
