import type {
  ResourceLevelingProposal,
  LevelingAlgorithm,
  LevelingProposalStatus,
  LevelingActivityChange,
  LevelingOverloadedResourceSummary,
  LevelingImpactSummary,
} from '../types/index.ts';
import { calculatePlannedResourceLoads, type ResourceLoad } from './resourceLoading.ts';
import { calculateCpm, type CpmResult, type NetworkActivity } from './cpm.ts';
import { addWorkingDays, workingDatesBetween } from './schedulePlanning.ts';
import type { ScheduleVersionCaptureInput } from './scheduleVersioning.ts';

export interface GenerateLevelingProposalInput {
  projectId: string;
  proposalCode: string;
  title: string;
  owner: string;
  dataDate: string;
  algorithm?: LevelingAlgorithm;
  sourceScheduleVersionId?: string | null;
  schedules: Array<Record<string, any>>;
  resources: Array<Record<string, any>>;
  assignments: Array<Record<string, any>>;
  workCalendars?: Array<Record<string, any>>;
  options?: {
    maxDelayDays?: number;
    protectCriticalPath?: boolean;
    reason?: string;
  };
}

export function generateLevelingProposal(
  input: GenerateLevelingProposalInput
): ResourceLevelingProposal {
  const {
    projectId,
    proposalCode,
    title,
    owner,
    dataDate,
    algorithm = 'CPM_FLOAT_FIRST',
    sourceScheduleVersionId = null,
    schedules = [],
    resources = [],
    assignments = [],
    workCalendars = [],
    options = {},
  } = input;

  const maxDelayDays = options.maxDelayDays ?? 30;
  const protectCriticalPath = options.protectCriticalPath ?? true;

  // 1. Initial CPM calculation before leveling
  const networkActivities: NetworkActivity[] = schedules.map((s) => ({
    id: String(s.id),
    duration_days: Number(s.duration_days) || Number(s.planned_duration_days) || 1,
    predecessor_item: s.predecessor_item,
    predecessor_items: s.predecessor_items,
    predecessor_links: s.predecessor_links,
    relationship_type: s.relationship_type,
    lag_days: s.lag_days,
    calendar_name: s.calendar_name,
    activity_status: s.activity_status || s.status,
    actual_start_date: s.actual_start_date,
    actual_finish_date: s.actual_finish_date,
    remaining_duration_days: s.remaining_duration_days,
    constraint_type: s.constraint_type,
    constraint_date: s.constraint_date,
    is_milestone: s.is_milestone,
  }));

  const initialCpm = calculateCpm(networkActivities);

  // 2. Initial planned resource loads
  const initialLoads = calculatePlannedResourceLoads(resources, assignments, schedules, workCalendars);
  const overloadsBefore = initialLoads.filter((l) => l.overAllocatedHours > 0.001);

  // Summarize overloaded resources
  const resourceById = new Map(resources.map((r) => [String(r.id), r]));
  const scheduleById = new Map(schedules.map((s) => [String(s.id), s]));

  const overloadMap = new Map<string, { code: string; name: string; maxHours: number; days: Set<string> }>();
  for (const load of overloadsBefore) {
    const res = resourceById.get(load.resourceId);
    const code = res?.resource_code || load.resourceId;
    const name = res?.resource_name || 'Unnamed Resource';
    const curr = overloadMap.get(load.resourceId) || { code, name, maxHours: 0, days: new Set() };
    curr.maxHours = Math.max(curr.maxHours, load.overAllocatedHours);
    curr.days.add(load.date);
    overloadMap.set(load.resourceId, curr);
  }

  const overloadedResourcesSummary: LevelingOverloadedResourceSummary[] = [...overloadMap.entries()].map(
    ([resId, info]) => ({
      resourceId: resId,
      resourceCode: info.code,
      resourceName: info.name,
      maxOverloadHours: Math.round(info.maxHours * 100) / 100,
      totalOverloadDays: info.days.size,
    })
  );

  // 3. Identify candidate activities to shift
  // Maps assignment -> schedules
  const changesMap = new Map<string, LevelingActivityChange>();
  const shiftedScheduleMap = new Map<string, Record<string, any>>(schedules.map((s) => [String(s.id), { ...s }]));

  for (const load of overloadsBefore) {
    const { resourceId, date } = load;

    // Find assignments for this resource active on this date
    const matchingAssignments = assignments.filter((a) => {
      if (String(a.resource_id) !== resourceId) return false;
      const start = String(a.assignment_start || '');
      const end = String(a.assignment_end || start);
      return start <= date && date <= end;
    });

    if (!matchingAssignments.length) continue;

    // Gather schedule items for these assignments
    const candidates = matchingAssignments
      .map((a) => {
        const schedId = String(a.schedule_id || '');
        const sched = shiftedScheduleMap.get(schedId);
        const cpm = initialCpm.get(schedId);
        return { assignment: a, schedule: sched, cpm };
      })
      .filter((item): item is { assignment: any; schedule: Record<string, any>; cpm: CpmResult | undefined } => Boolean(item.schedule));

    if (!candidates.length) continue;

    // Sort candidates according to algorithm
    candidates.sort((a, b) => {
      const cpmA = a.cpm;
      const cpmB = b.cpm;
      const isCritA = cpmA?.critical ?? false;
      const isCritB = cpmB?.critical ?? false;

      if (algorithm === 'CPM_FLOAT_FIRST' || algorithm === 'RESOURCE_SMOOTHING') {
        if (protectCriticalPath) {
          if (!isCritA && isCritB) return -1; // non-critical first
          if (isCritA && !isCritB) return 1;
        }
        const floatA = cpmA?.totalFloat ?? 0;
        const floatB = cpmB?.totalFloat ?? 0;
        if (floatA !== floatB) return floatB - floatA; // largest float first
      } else if (algorithm === 'PRIORITY_BASED') {
        const prioA = Number(a.schedule.priority) || 5;
        const prioB = Number(b.schedule.priority) || 5;
        if (prioA !== prioB) return prioB - prioA; // lower priority first
      }
      return String(a.schedule.activity_code || a.schedule.id).localeCompare(String(b.schedule.activity_code || b.schedule.id));
    });

    // Select candidate activity to shift
    const target = candidates[0];
    const sched = target.schedule;
    const schedId = String(sched.id);

    if (protectCriticalPath && target.cpm?.critical && candidates.some((c) => !c.cpm?.critical)) {
      // Avoid shifting critical if non-critical available
      continue;
    }

    // Determine shift
    const existingChange = changesMap.get(schedId);
    const origStart = String(sched.start_date || sched.planned_start_date || dataDate);
    const origFinish = String(sched.end_date || sched.planned_end_date || origStart);

    let currentProposedStart = existingChange ? existingChange.proposedStart : origStart;
    let currentDelay = existingChange ? existingChange.delayDays : 0;

    // Shift by 1 or 2 working days to push beyond current overload day
    const shiftDays = Math.min(2, maxDelayDays - currentDelay);
    if (shiftDays <= 0) continue;

    const calendar = workCalendars.find((c) => String(c.id) === String(sched.calendar_id || ''));
    const newStart = addWorkingDays(currentProposedStart, shiftDays, calendar) || currentProposedStart;

    // Calculate new finish date based on duration
    const durationDays = Math.max(1, Number(sched.duration_days) || Number(sched.planned_duration_days) || 1);
    const newFinish = addWorkingDays(newStart, durationDays - 1, calendar) || newStart;

    const totalDelay = currentDelay + shiftDays;

    // Update shifted schedule map
    const updatedSched = {
      ...sched,
      start_date: newStart,
      end_date: newFinish,
      planned_start_date: newStart,
      planned_end_date: newFinish,
    };
    shiftedScheduleMap.set(schedId, updatedSched);

    changesMap.set(schedId, {
      scheduleId: schedId,
      activityCode: String(sched.activity_code || schedId),
      activityName: String(sched.activity || sched.boq_item_name || 'Unnamed Activity'),
      resourceIds: [resourceId],
      originalStart: origStart,
      originalFinish: origFinish,
      proposedStart: newStart,
      proposedFinish: newFinish,
      originalTotalFloat: target.cpm?.totalFloat ?? 0,
      proposedTotalFloat: (target.cpm?.totalFloat ?? 0) - totalDelay,
      isCriticalBefore: target.cpm?.critical ?? false,
      isCriticalAfter: (target.cpm?.totalFloat ?? 0) - totalDelay <= 0,
      delayDays: totalDelay,
      reason: `Shifted by ${totalDelay} working days to resolve overload on ${date} for ${overloadMap.get(resourceId)?.code || resourceId}`,
    });
  }

  // 4. Re-calculate CPM and loads on shifted schedules
  const shiftedSchedulesArray = [...shiftedScheduleMap.values()];
  const shiftedNetworkActivities: NetworkActivity[] = shiftedSchedulesArray.map((s) => ({
    id: String(s.id),
    duration_days: Number(s.duration_days) || Number(s.planned_duration_days) || 1,
    predecessor_item: s.predecessor_item,
    predecessor_items: s.predecessor_items,
    predecessor_links: s.predecessor_links,
    relationship_type: s.relationship_type,
    lag_days: s.lag_days,
    calendar_name: s.calendar_name,
    activity_status: s.activity_status || s.status,
    actual_start_date: s.actual_start_date,
    actual_finish_date: s.actual_finish_date,
    remaining_duration_days: s.remaining_duration_days,
    constraint_type: s.constraint_type,
    constraint_date: s.constraint_date,
    is_milestone: s.is_milestone,
  }));

  const postCpm = calculateCpm(shiftedNetworkActivities);

  // Update proposed CPM floats in changes
  const changes = [...changesMap.values()].map((change) => {
    const postRes = postCpm.get(change.scheduleId);
    return {
      ...change,
      proposedTotalFloat: postRes?.totalFloat ?? change.proposedTotalFloat,
      isCriticalAfter: postRes?.critical ?? change.isCriticalAfter,
    };
  });

  // Re-calculate loads on shifted assignments
  const shiftedAssignments = assignments.map((a) => {
    const schedChange = changesMap.get(String(a.schedule_id || ''));
    if (!schedChange) return a;
    return {
      ...a,
      assignment_start: schedChange.proposedStart,
      assignment_end: schedChange.proposedFinish,
    };
  });

  const postLoads = calculatePlannedResourceLoads(resources, shiftedAssignments, shiftedSchedulesArray, workCalendars);
  const overloadsAfter = postLoads.filter((l) => l.overAllocatedHours > 0.001);

  // Compute impact summary
  const maxSlippage = changes.reduce((max, c) => Math.max(max, c.delayDays), 0);
  const criticalShifted = changes.some((c) => c.isCriticalBefore || c.isCriticalAfter);

  const impactSummary: LevelingImpactSummary = {
    totalActivitiesShifted: changes.length,
    maxScheduleSlippageDays: maxSlippage,
    criticalPathShifted: criticalShifted,
    beforeOverloadedDays: overloadsBefore.length,
    afterOverloadedDays: overloadsAfter.length,
    clearedOverloadsCount: Math.max(0, overloadsBefore.length - overloadsAfter.length),
    remainingOverloadsCount: overloadsAfter.length,
  };

  const affectedActivities = [...new Set(changes.map((c) => c.scheduleId))];

  return {
    id: `rlp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    project_id: projectId,
    source_schedule_version_id: sourceScheduleVersionId,
    applied_schedule_version_id: null,
    data_date: dataDate,
    proposal_code: proposalCode,
    title,
    status: 'Draft',
    algorithm,
    owner,
    reason: options.reason || `Resource leveling proposal generated via ${algorithm} algorithm.`,
    rejection_reason: null,
    overloaded_resources: overloadedResourcesSummary,
    affected_activities: affectedActivities,
    changes,
    impact_summary: impactSummary,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    applied_at: null,
    reversed_at: null,
  };
}

export function buildForecastScheduleVersionInputFromProposal(
  proposal: ResourceLevelingProposal,
  schedules: Array<Record<string, any>>,
  assignments: Array<Record<string, any>> = []
): {
  updatedSchedules: Array<Record<string, any>>;
  scheduleVersionInput: ScheduleVersionCaptureInput;
} {
  const changeByScheduleId = new Map(proposal.changes.map((c) => [c.scheduleId, c]));

  const updatedSchedules = schedules.map((s) => {
    const change = changeByScheduleId.get(String(s.id));
    if (!change) return { ...s };
    return {
      ...s,
      start_date: change.proposedStart,
      end_date: change.proposedFinish,
      planned_start_date: change.proposedStart,
      planned_end_date: change.proposedFinish,
      notes: (s.notes ? `${s.notes} | ` : '') + `Leveled in proposal ${proposal.proposal_code}`,
    };
  });

  const forecastVersionCode = proposal.proposal_code.replace(/^RLP/i, 'SCH-FCST');

  const scheduleVersionInput: ScheduleVersionCaptureInput = {
    projectId: proposal.project_id,
    versionCode: forecastVersionCode,
    versionName: `${proposal.title} (Leveling Forecast)`,
    versionType: 'Forecast',
    status: 'Approved',
    dataDate: proposal.data_date,
    owner: proposal.owner,
    reason: `Applied Resource Leveling Decision Proposal ${proposal.proposal_code}: ${proposal.title}`,
    activities: updatedSchedules,
    notes: `Generated from Resource Leveling Proposal ${proposal.proposal_code}. Total activities shifted: ${proposal.impact_summary.totalActivitiesShifted}, max slippage: ${proposal.impact_summary.maxScheduleSlippageDays} days.`,
  };

  return {
    updatedSchedules,
    scheduleVersionInput,
  };
}
