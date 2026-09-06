import type {
  DelayEvent,
  DelayEventCategory,
  DelayEntitlementType,
  DelayEventStatus,
  TimeImpactAnalysis,
  Task,
} from '../types/index.ts';

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
  activities: Task[] = [],
  baselineFinishDate?: string | null
): TimeImpactAnalysis {
  // Find pre-delay finish date from activities or baseline finish
  let preDelayFinish = baselineFinishDate && isValidIsoDate(baselineFinishDate) ? baselineFinishDate : '';
  for (const act of activities) {
    const actEnd = act.end_date ? act.end_date.slice(0, 10) : '';
    if (isValidIsoDate(actEnd) && (!preDelayFinish || actEnd > preDelayFinish)) {
      preDelayFinish = actEnd;
    }
  }
  if (!preDelayFinish) {
    preDelayFinish = new Date().toISOString().slice(0, 10);
  }

  // Affected activity lookup
  const affectedActivity = activities.find(
    (a) => a.id === delayEvent.schedule_activity_id || a.name === delayEvent.schedule_activity_id
  );

  const isCritical = affectedActivity
    ? affectedActivity.priority === 'High' ||
      affectedActivity.category === 'Critical' ||
      (affectedActivity as any).is_critical === true
    : false;
  const reqDays = Math.max(0, Number(delayEvent.requested_extension_days) || 0);
  const appDays = Math.max(0, Number(delayEvent.approved_extension_days) || 0);
  const isApproved = delayEvent.status === 'Approved' || delayEvent.status === 'Closed';

  // Float assumption: non-critical activities have default 10 days total float unless specified
  const totalFloat = isCritical ? 0 : 10;
  const effectiveDelayDays = isApproved ? appDays : reqDays;

  // Net CPM impact: delay minus available float
  const netCpmImpactDays = isCritical
    ? effectiveDelayDays
    : Math.max(0, effectiveDelayDays - totalFloat);

  const postDelayFinish = addDaysToIsoDate(preDelayFinish, netCpmImpactDays);

  // Forecast revised finish uses ONLY approved extension days
  const baseDate = baselineFinishDate && isValidIsoDate(baselineFinishDate) ? baselineFinishDate : preDelayFinish;
  const forecastRevisedFinishDate = addDaysToIsoDate(baseDate, isApproved ? appDays : 0);

  return {
    preDelayFinishDate: preDelayFinish,
    postDelayFinishDate: postDelayFinish,
    netCpmImpactDays,
    criticalPathAffected: isCritical || netCpmImpactDays > 0,
    affectedActivityCode: affectedActivity ? affectedActivity.id : delayEvent.schedule_activity_id || undefined,
    affectedActivityName: affectedActivity ? affectedActivity.name : undefined,
    baselineFinishDate: baseDate,
    forecastRevisedFinishDate,
    analysisDate: new Date().toISOString().slice(0, 10),
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

  const baseDate = baselineFinishDate && isValidIsoDate(baselineFinishDate)
    ? baselineFinishDate
    : new Date().toISOString().slice(0, 10);

  const revisedForecastFinish = addDaysToIsoDate(baseDate, totalApprovedEotDays);

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
