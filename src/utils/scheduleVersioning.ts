import type { Schedule, ScheduleDistribution, ScheduleVersion } from '../types';
import {
  createBaselineActivitySnapshot,
  createBaselineDistributionSnapshot,
  compareBaselineActivityDetails,
  type BaselineActivitySnapshot,
  type BaselineDistributionSnapshot,
  type BaselineActivityVariance,
} from '../data/baselineGovernance.ts';

export interface ScheduleVersionCaptureInput {
  projectId: string;
  contractId?: string | null;
  versionCode: string;
  versionName: string;
  versionType: 'Baseline' | 'Current' | 'Forecast' | 'What-If';
  status: 'Draft' | 'Approved' | 'Superseded';
  revisionNumber?: number;
  dataDate: string;
  owner: string;
  reason: string;
  activities: Schedule[] | Record<string, any>[];
  distributions?: ScheduleDistribution[] | Record<string, any>[];
  notes?: string;
}

export interface ScheduleVersionComparisonSummary {
  v1Code: string;
  v2Code: string;
  v1Name: string;
  v2Name: string;
  v1Type: string;
  v2Type: string;
  v1DataDate: string;
  v2DataDate: string;
  totalV1Activities: number;
  totalV2Activities: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  criticalPathV1Count: number;
  criticalPathV2Count: number;
  criticalPathShiftCount: number;
  totalBudgetV1: number;
  totalBudgetV2: number;
  budgetVariance: number;
  v1StartDate: string | null;
  v2StartDate: string | null;
  v1FinishDate: string | null;
  v2FinishDate: string | null;
  finishVarianceDays: number | null;
  activityVariances: BaselineActivityVariance[];
}

export function validateScheduleVersionInput(input: ScheduleVersionCaptureInput): void {
  if (!input.projectId || !input.projectId.trim()) {
    throw new Error('Project ID is required to create a schedule version.');
  }
  if (!input.versionCode || !input.versionCode.trim()) {
    throw new Error('Version code (e.g. BL-01, CUR-01, FCST-01, WHATIF-A) is required.');
  }
  if (!input.owner || !input.owner.trim()) {
    throw new Error('Owner / author name is required for schedule version traceability.');
  }
  if (!input.dataDate || !input.dataDate.trim()) {
    throw new Error('Data date (status date) is required for schedule versioning.');
  }
  const validActivities = (input.activities || []).filter(
    (a) => String(a.activity || a.boq_item_name || '').trim() !== ''
  );
  if (validActivities.length === 0) {
    throw new Error('A schedule version requires at least one active schedule activity snapshot.');
  }
  if ((input.status === 'Approved' || (input.revisionNumber && input.revisionNumber > 1)) && (!input.reason || !input.reason.trim())) {
    throw new Error('A reason is required when approving a schedule version or creating a revision.');
  }
}

export function captureScheduleVersion(input: ScheduleVersionCaptureInput): ScheduleVersion {
  validateScheduleVersionInput(input);

  const rawActivities = (input.activities || []) as Record<string, any>[];
  const rawDistributions = (input.distributions || []) as Record<string, any>[];

  const activitySnapshot = createBaselineActivitySnapshot(rawActivities);
  const distributionSnapshot = createBaselineDistributionSnapshot(rawDistributions, rawActivities);

  const now = new Date().toISOString();
  const revisionNumber = input.revisionNumber ?? 1;

  return {
    id: crypto.randomUUID(),
    project_id: input.projectId,
    contract_id: input.contractId || null,
    version_code: input.versionCode.trim().toUpperCase(),
    version_name: input.versionName.trim() || input.versionCode.trim(),
    version_type: input.versionType,
    status: input.status,
    revision_number: revisionNumber,
    data_date: input.dataDate,
    owner: input.owner.trim(),
    reason: input.reason.trim(),
    activity_snapshot: activitySnapshot,
    distribution_snapshot: distributionSnapshot,
    activity_count: activitySnapshot.length,
    critical_activity_count: activitySnapshot.filter((a) => a.critical_path).length,
    notes: input.notes?.trim() || '',
    created_at: now,
    updated_at: now,
  };
}

export function compareScheduleVersions(
  v1: ScheduleVersion,
  v2: ScheduleVersion | { versionCode?: string; versionName?: string; activities: Record<string, any>[] }
): ScheduleVersionComparisonSummary {
  const v1Snapshot = Array.isArray(v1.activity_snapshot) ? (v1.activity_snapshot as BaselineActivitySnapshot[]) : [];

  let v2Snapshot: BaselineActivitySnapshot[];
  let v2Code = 'LIVE';
  let v2Name = 'Live Executable Schedule';
  let v2Type = 'Current';
  let v2DataDate = new Date().toISOString().slice(0, 10);

  if ('activity_snapshot' in v2) {
    v2Snapshot = Array.isArray(v2.activity_snapshot) ? (v2.activity_snapshot as BaselineActivitySnapshot[]) : [];
    v2Code = v2.version_code || 'V2';
    v2Name = v2.version_name || v2Code;
    v2Type = v2.version_type || 'Snapshot';
    v2DataDate = v2.data_date || v2DataDate;
  } else {
    v2Snapshot = createBaselineActivitySnapshot(v2.activities || []);
    v2Code = v2.versionCode || 'LIVE';
    v2Name = v2.versionName || 'Live Executable Schedule';
  }

  const activityVariances = compareBaselineActivityDetails(v1Snapshot, v2Snapshot as unknown as Record<string, any>[]);

  const addedCount = activityVariances.filter((a) => a.status === 'Added').length;
  const removedCount = activityVariances.filter((a) => a.status === 'Removed').length;
  const changedCount = activityVariances.filter((a) => a.status === 'Changed').length;
  const unchangedCount = activityVariances.filter((a) => a.status === 'Unchanged').length;

  const criticalPathV1Count = v1Snapshot.filter((a) => a.critical_path).length;
  const criticalPathV2Count = v2Snapshot.filter((a) => a.critical_path).length;
  const criticalPathShiftCount = activityVariances.filter(
    (a) => a.baselineCritical !== null && a.currentCritical !== null && a.baselineCritical !== a.currentCritical
  ).length;

  const totalBudgetV1 = Math.round(v1Snapshot.reduce((sum, a) => sum + (Number(a.budget) || 0), 0) * 100) / 100;
  const totalBudgetV2 = Math.round(v2Snapshot.reduce((sum, a) => sum + (Number(a.budget) || 0), 0) * 100) / 100;
  const budgetVariance = Math.round((totalBudgetV2 - totalBudgetV1) * 100) / 100;

  const v1Starts = v1Snapshot.map((a) => a.start_date).filter(Boolean).sort() as string[];
  const v2Starts = v2Snapshot.map((a) => a.start_date).filter(Boolean).sort() as string[];
  const v1Finishes = v1Snapshot.map((a) => a.end_date).filter(Boolean).sort() as string[];
  const v2Finishes = v2Snapshot.map((a) => a.end_date).filter(Boolean).sort() as string[];

  const v1StartDate = v1Starts[0] || null;
  const v2StartDate = v2Starts[0] || null;
  const v1FinishDate = v1Finishes[v1Finishes.length - 1] || null;
  const v2FinishDate = v2Finishes[v2Finishes.length - 1] || null;

  let finishVarianceDays: number | null = null;
  if (v1FinishDate && v2FinishDate) {
    const t1 = new Date(`${v1FinishDate}T00:00:00`).getTime();
    const t2 = new Date(`${v2FinishDate}T00:00:00`).getTime();
    if (Number.isFinite(t1) && Number.isFinite(t2)) {
      finishVarianceDays = Math.round((t2 - t1) / 86400000);
    }
  }

  return {
    v1Code: v1.version_code,
    v2Code,
    v1Name: v1.version_name,
    v2Name,
    v1Type: v1.version_type,
    v2Type,
    v1DataDate: v1.data_date,
    v2DataDate,
    totalV1Activities: v1Snapshot.length,
    totalV2Activities: v2Snapshot.length,
    addedCount,
    removedCount,
    changedCount,
    unchangedCount,
    criticalPathV1Count,
    criticalPathV2Count,
    criticalPathShiftCount,
    totalBudgetV1,
    totalBudgetV2,
    budgetVariance,
    v1StartDate,
    v2StartDate,
    v1FinishDate,
    v2FinishDate,
    finishVarianceDays,
    activityVariances,
  };
}
