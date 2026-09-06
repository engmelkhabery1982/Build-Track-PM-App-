import type {
  DelayEvent,
  DelayEventCategory,
  DelayEntitlementType,
  DelayEventStatus,
  TimeImpactAnalysis,
  Schedule,
} from '../types/index.ts';
import { calculateCpm } from './cpm.ts';

export const DELAY_CATEGORIES: DelayEventCategory[] = [
  'Employer Delay',
  'Contractor Delay',
  'Force Majeure',
  'Subcontractor Delay',
  'Third Party',
  'Weather / Site Condition',
];

export const ENTITLEMENT_TYPES: DelayEntitlementType[] = [
  'Compensable & Excusable',
  'Excusable Non-Compensable',
  'Non-Excusable',
  'Under Review',
];

export const DELAY_STATUSES: DelayEventStatus[] = [
  'Identified',
  'Submitted',
  'Approved',
  'Rejected',
  'Closed',
];

/** Validates YYYY-MM-DD ISO date string strictly. */
export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === dateStr;
}

/** Validates a Delay Event before saving or updating. */
export function validateDelayEventInput(input: Partial<DelayEvent>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.delay_code || !input.delay_code.trim()) {
    errors.push('Delay code is required.');
  }

  if (!input.event_name || !input.event_name.trim()) {
    errors.push('Event name is required.');
  }

  if (!input.project_id || !input.project_id.trim()) {
    errors.push('Project ID is required.');
  }
  if (!input.contract_id) errors.push('Main contract is required.');
  if (!input.schedule_activity_id) errors.push('Affected schedule activity is required.');

  if (!input.event_category || !DELAY_CATEGORIES.includes(input.event_category as DelayEventCategory)) {
    errors.push(`Invalid event category. Must be one of: ${DELAY_CATEGORIES.join(', ')}`);
  }

  if (!input.discovery_date || !isValidIsoDate(input.discovery_date)) {
    errors.push('Discovery date must be a valid ISO date string (YYYY-MM-DD).');
  }

  if (!input.entitlement_type || !ENTITLEMENT_TYPES.includes(input.entitlement_type as DelayEntitlementType)) {
    errors.push(`Invalid entitlement type. Must be one of: ${ENTITLEMENT_TYPES.join(', ')}`);
  }

  const reqDays = Number(input.requested_extension_days);
  if (isNaN(reqDays) || reqDays < 0 || !Number.isInteger(reqDays)) {
    errors.push('Requested extension days must be a non-negative integer.');
  }

  const appDays = Number(input.approved_extension_days);
  if (isNaN(appDays) || appDays < 0 || !Number.isInteger(appDays)) {
    errors.push('Approved extension days must be a non-negative integer.');
  }

  if (reqDays >= 0 && appDays > reqDays) {
    errors.push('Approved extension days cannot exceed requested extension days.');
  }

  if (!input.status || !DELAY_STATUSES.includes(input.status as DelayEventStatus)) {
    errors.push(`Invalid status. Must be one of: ${DELAY_STATUSES.join(', ')}`);
  }

  if (input.status !== 'Approved' && input.status !== 'Closed' && appDays > 0) {
    errors.push('Approved extension days must be 0 for events that are not Approved or Closed.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Utility to add calendar days to an ISO date string (YYYY-MM-DD). */
export function addDaysToIsoDate(isoDateStr: string, days: number): string {
  if (!isValidIsoDate(isoDateStr)) return isoDateStr;
  const d = new Date(isoDateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Performs Time Impact Analysis (TIA) for a delay event against schedule activities and baseline finish. */
export function calculateTimeImpactAnalysis(
  delayEvent: Partial<DelayEvent>,
  activities: Schedule[] = [],
  baselineFinishDate?: string | null,
  analysisDate?: string | null,
): TimeImpactAnalysis {
  const scoped = activities.filter((activity) => String(activity.activity || '').trim());
  const finishes = scoped.map((activity) => String(activity.forecast_end_date || activity.end_date || '')).filter(isValidIsoDate).sort();
  const preDelayFinish = finishes[finishes.length - 1] || (baselineFinishDate && isValidIsoDate(baselineFinishDate) ? baselineFinishDate : '');
  const affectedActivity = scoped.find((activity) => activity.id === delayEvent.schedule_activity_id);
  const baseNetwork = calculateCpm(scoped);
  const baseDuration = Math.max(0, ...[...baseNetwork.values()].filter((row) => !row.cycle).map((row) => row.earlyFinish));
  const reqDays = Math.max(0, Number(delayEvent.requested_extension_days) || 0);
  const appDays = Math.max(0, Number(delayEvent.approved_extension_days) || 0);
  const isApproved = delayEvent.status === 'Approved' || delayEvent.status === 'Closed';
  const impactedActivities = scoped.map((activity) => activity.id === affectedActivity?.id
    ? { ...activity, duration_days: Math.max(0, Number(activity.duration_days) || 0) + reqDays }
    : activity);
  const impactedNetwork = calculateCpm(impactedActivities);
  const impactedDuration = Math.max(0, ...[...impactedNetwork.values()].filter((row) => !row.cycle).map((row) => row.earlyFinish));
  const netCpmImpactDays = affectedActivity ? Math.max(0, impactedDuration - baseDuration) : 0;
  const affectedNetwork = affectedActivity ? baseNetwork.get(affectedActivity.id) : undefined;
  const isCritical = Boolean(affectedNetwork?.critical);

  const postDelayFinish = addDaysToIsoDate(preDelayFinish, netCpmImpactDays);

  // Forecast revised finish uses ONLY approved extension days
  const baseDate = baselineFinishDate && isValidIsoDate(baselineFinishDate) ? baselineFinishDate : '';
  const forecastRevisedFinishDate = baseDate ? addDaysToIsoDate(baseDate, isApproved ? appDays : 0) : '';

  return {
    preDelayFinishDate: preDelayFinish,
    postDelayFinishDate: postDelayFinish,
    netCpmImpactDays,
    criticalPathAffected: isCritical || netCpmImpactDays > 0,
    affectedActivityCode: affectedActivity ? affectedActivity.activity_code : delayEvent.schedule_activity_id || undefined,
    affectedActivityName: affectedActivity ? affectedActivity.activity : undefined,
    baselineFinishDate: baseDate,
    forecastRevisedFinishDate,
    analysisDate: analysisDate && isValidIsoDate(analysisDate) ? analysisDate : delayEvent.discovery_date,
  };
}

export interface ProjectDelaySummary {
  totalIdentifiedDelays: number;
  totalRequestedDays: number;
  totalApprovedEotDays: number;
  approvedEmployerDelays: number;
  totalPendingEotDays: number;
  totalCpmImpactDays: number;
  originalBaselineFinish: string;
  revisedForecastFinish: string;
}

/** Summarizes all delay events for a project or contract scope. */
export function calculateProjectDelaySummary(
  delayEvents: DelayEvent[],
  baselineFinishDate?: string | null
): ProjectDelaySummary {
  let totalIdentifiedDelays = 0;
  let totalRequestedDays = 0;
  let totalApprovedEotDays = 0;
  let approvedEmployerDelays = 0;
  let totalPendingEotDays = 0;
  let totalCpmImpactDays = 0;

  for (const event of delayEvents) {
    totalIdentifiedDelays++;
    totalRequestedDays += event.requested_extension_days || 0;

    if (event.status === 'Approved' || event.status === 'Closed') {
      totalApprovedEotDays += event.approved_extension_days || 0;
      if (event.event_category === 'Employer Delay') {
        approvedEmployerDelays += event.approved_extension_days || 0;
      }
      totalCpmImpactDays += event.cpm_impact_days || 0;
    } else if (event.status === 'Identified' || event.status === 'Submitted') {
      totalPendingEotDays += event.requested_extension_days || 0;
    }
  }

  const baseDate = baselineFinishDate && isValidIsoDate(baselineFinishDate) ? baselineFinishDate : '';
  const revisedForecastFinish = baseDate ? addDaysToIsoDate(baseDate, totalApprovedEotDays) : '';

  return {
    totalIdentifiedDelays,
    totalRequestedDays,
    totalApprovedEotDays,
    approvedEmployerDelays,
    totalPendingEotDays,
    totalCpmImpactDays,
    originalBaselineFinish: baseDate,
    revisedForecastFinish,
  };
}
