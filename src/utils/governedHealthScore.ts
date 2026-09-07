import type {
  HealthDimensionKey,
  HealthDimensionThreshold,
  HealthDimensionContribution,
  HealthScoreResult,
} from '../types/index.ts';

export const DEFAULT_HEALTH_CONFIG: HealthDimensionThreshold[] = [
  {
    dimension: 'Schedule',
    weight: 20,
    warningThreshold: 0.95,
    criticalThreshold: 0.85,
    direction: 'higher_is_better',
  },
  {
    dimension: 'Cost',
    weight: 20,
    warningThreshold: 0.95,
    criticalThreshold: 0.85,
    direction: 'higher_is_better',
  },
  {
    dimension: 'Cash',
    weight: 20,
    warningThreshold: 0,
    criticalThreshold: -50000,
    direction: 'higher_is_better',
  },
  {
    dimension: 'Scope',
    weight: 15,
    warningThreshold: 0.05, // 5% unapproved variation ratio
    criticalThreshold: 0.15, // 15% unapproved variation ratio
    direction: 'lower_is_better',
  },
  {
    dimension: 'Quality',
    weight: 15,
    warningThreshold: 0.10, // 10% WIR fail rate
    criticalThreshold: 0.25, // 25% WIR fail rate
    direction: 'lower_is_better',
  },
  {
    dimension: 'Data Quality',
    weight: 10,
    warningThreshold: 0.05, // 5% missing linked controls
    criticalThreshold: 0.15, // 15% missing linked controls
    direction: 'lower_is_better',
  },
];

export function validateHealthConfig(config: HealthDimensionThreshold[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const totalWeight = config.reduce((sum, d) => sum + (d.weight || 0), 0);

  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total weights must sum to 100% (current total: ${totalWeight}%)`);
  }

  const dimensions = new Set<string>();
  for (const d of config) {
    if (dimensions.has(d.dimension)) {
      errors.push(`Duplicate dimension found: ${d.dimension}`);
    }
    dimensions.add(d.dimension);

    if (d.weight < 0 || d.weight > 100) {
      errors.push(`Dimension ${d.dimension} weight must be between 0% and 100%`);
    }

    if (d.direction === 'higher_is_better') {
      if (d.criticalThreshold > d.warningThreshold) {
        errors.push(`Dimension ${d.dimension}: Critical threshold (${d.criticalThreshold}) cannot be greater than warning threshold (${d.warningThreshold}) for higher-is-better metric`);
      }
    } else {
      if (d.criticalThreshold < d.warningThreshold) {
        errors.push(`Dimension ${d.dimension}: Critical threshold (${d.criticalThreshold}) cannot be lower than warning threshold (${d.warningThreshold}) for lower-is-better metric`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
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
}

export function calculateGovernedHealthScore(
  inputs: RawHealthInputs,
  config: HealthDimensionThreshold[] = DEFAULT_HEALTH_CONFIG
): HealthScoreResult {
  const validation = validateHealthConfig(config);
  if (!validation.isValid) {
    // If config invalid, return fallback error state
    return {
      overallScore: 0,
      status: 'Unavailable',
      overallConfidence: 0,
      versionCode: inputs.versionCode || 'DEFAULT-GOVERNED',
      dataDate: inputs.dataDate,
      dimensions: [],
      hasMissingCriticalInputs: true,
    };
  }

  const configMap = new Map(config.map(c => [c.dimension, c]));
  let hasMissingCriticalInputs = false;
  let totalWeightedScore = 0;
  let confidenceSum = 0;

  const dimensions: HealthDimensionContribution[] = (
    ['Schedule', 'Cost', 'Cash', 'Scope', 'Quality', 'Data Quality'] as HealthDimensionKey[]
  ).map((dimension) => {
    const threshold = configMap.get(dimension)!;
    const weight = threshold.weight;

    let rawVal: number | null = null;
    let metricName = '';
    let source = '';

    switch (dimension) {
      case 'Schedule':
        rawVal = inputs.spi ?? null;
        metricName = 'SPI (Schedule Performance Index)';
        source = 'Earned Schedule Engine';
        break;
      case 'Cost':
        rawVal = inputs.cpi ?? null;
        metricName = 'CPI (Cost Performance Index)';
        source = 'EVMS Cost Ledger';
        break;
      case 'Cash':
        rawVal = inputs.netCashBalance ?? null;
        metricName = 'Net Cash Balance';
        source = 'Versioned Cash Forecast Engine';
        break;
      case 'Scope':
        rawVal = inputs.unapprovedVariationRatio ?? null;
        metricName = 'Unapproved Variation Ratio';
        source = 'Operational Scope Creep Detector';
        break;
      case 'Quality':
        rawVal = inputs.wirFailureRate ?? null;
        metricName = 'WIR Rejection Rate';
        source = 'Quality Inspection Register';
        break;
      case 'Data Quality':
        rawVal = inputs.missingDataRatio ?? null;
        metricName = 'Control Account Data Completeness';
        source = 'Data Governance Ledger';
        break;
    }

    if (rawVal === null || rawVal === undefined || !Number.isFinite(rawVal)) {
      hasMissingCriticalInputs = true;
      return {
        dimension,
        weight,
        rawMetricValue: null,
        metricName,
        score: 0,
        weightedScore: 0,
        status: 'Unavailable',
        confidence: 0,
        source,
        exclusions: ['Missing operational fact data for dimension'],
      };
    }

    // Calculate score (0..100) and status
    let score = 100;
    let status: 'Green' | 'Amber' | 'Red' = 'Green';

    if (threshold.direction === 'higher_is_better') {
      if (rawVal < threshold.criticalThreshold) {
        status = 'Red';
        score = Math.max(0, Math.round((rawVal / threshold.criticalThreshold) * 50));
      } else if (rawVal < threshold.warningThreshold) {
        status = 'Amber';
        const range = threshold.warningThreshold - threshold.criticalThreshold;
        const progress = range > 0 ? (rawVal - threshold.criticalThreshold) / range : 0;
        score = Math.round(50 + progress * 35); // 50 to 85
      } else {
        status = 'Green';
        score = Math.min(100, Math.round(85 + Math.min(1, (rawVal - threshold.warningThreshold) / 0.15) * 15));
      }
    } else {
      // lower_is_better
      if (rawVal > threshold.criticalThreshold) {
        status = 'Red';
        score = Math.max(0, Math.round(50 - (rawVal - threshold.criticalThreshold) * 100));
      } else if (rawVal > threshold.warningThreshold) {
        status = 'Amber';
        const range = threshold.criticalThreshold - threshold.warningThreshold;
        const excess = range > 0 ? (rawVal - threshold.warningThreshold) / range : 0;
        score = Math.round(85 - excess * 35); // 85 down to 50
      } else {
        status = 'Green';
        score = Math.min(100, Math.round(100 - (rawVal / Math.max(0.01, threshold.warningThreshold)) * 15));
      }
    }

    const confidence = 100;
    const weightedScore = Math.round((score * (weight / 100)) * 100) / 100;

    totalWeightedScore += weightedScore;
    confidenceSum += confidence * (weight / 100);

    return {
      dimension,
      weight,
      rawMetricValue: rawVal,
      metricName,
      score,
      weightedScore,
      status,
      confidence,
      source,
    };
  });

  const overallScore = Math.round(totalWeightedScore);
  const overallConfidence = Math.round(confidenceSum);

  // Status decision
  let status: 'Green' | 'Amber' | 'Red' | 'Unavailable' = 'Green';

  if (dimensions.some(d => d.status === 'Red')) {
    status = 'Red';
  } else if (dimensions.some(d => d.status === 'Amber')) {
    status = 'Amber';
  } else if (overallScore < 70) {
    status = 'Red';
  } else if (overallScore < 85) {
    status = 'Amber';
  }

  // Missing critical inputs RULE: prevents Green status
  if (hasMissingCriticalInputs && status === 'Green') {
    status = 'Amber';
  }

  if (dimensions.every(d => d.status === 'Unavailable')) {
    status = 'Unavailable';
  }

  return {
    overallScore,
    status,
    overallConfidence,
    versionCode: inputs.versionCode || 'DEFAULT-GOVERNED',
    dataDate: inputs.dataDate,
    dimensions,
    hasMissingCriticalInputs,
  };
}
