import { parsePrimaveraXerTasks } from '../data/primaveraImport.ts';

export type DuplicatePolicy = 'update' | 'skip' | 'conflict';

export interface PrimaveraReconciliationParams {
  projectId: string;
  contractId: string;
  fileContent: string;
  fileName: string;
  duplicatePolicy: DuplicatePolicy;
  localActivities: Record<string, any>[];
  localCalendars?: Record<string, any>[];
  localWbs?: Record<string, any>[];
  localResources?: Record<string, any>[];
  localAssignments?: Record<string, any>[];
}

export interface ActivityDiff {
  activityCode: string;
  sourceActivityCode: string;
  activityName: string;
  p6Start: string;
  p6Finish: string;
  p6Duration: number;
  localStart: string;
  localFinish: string;
  localDuration: number;
  localActualStart?: string;
  localActualFinish?: string;
  localActualQuantity?: number;
  localActualCost?: number;
  status: 'synced' | 'date_drift' | 'duration_discrepancy' | 'new_in_p6' | 'missing_in_p6';
  action: 'insert' | 'update_refresh' | 'skip' | 'conflict_flag';
  preservedActuals?: boolean;
}

export interface RelationshipDiff {
  predCode: string;
  succCode: string;
  p6Type: string;
  p6Lag: number;
  localType?: string;
  localLag?: number;
  status: 'matched' | 'mismatched' | 'missing_in_p6' | 'missing_in_local';
}

export interface PrimaveraReconciliationResult {
  projectId: string;
  contractId: string;
  fileName: string;
  duplicatePolicy: DuplicatePolicy;
  parsedCount: number;
  activityDiffs: ActivityDiff[];
  relationshipDiffs: RelationshipDiff[];
  newAuxiliaryRows: Array<{
    table: 'wbs_nodes' | 'work_calendars' | 'resource_masters' | 'schedule_resource_assignments';
    row: Record<string, any>;
  }>;
  preparedInsertRows: Record<string, any>[];
  preparedUpdatePatches: Array<{
    table: 'schedules' | 'schedule_resource_assignments';
    id: string;
    patch: Record<string, any>;
  }>;
  stats: {
    totalP6: number;
    synced: number;
    dateDrift: number;
    durationDiscrepancy: number;
    newInP6: number;
    missingInP6: number;
    relationshipsMatched: number;
    relationshipsMismatched: number;
    actualsPreservedCount: number;
  };
}

export function buildPrimaveraReconciliation(
  params: PrimaveraReconciliationParams
): PrimaveraReconciliationResult {
  const {
    projectId,
    contractId,
    fileContent,
    fileName,
    duplicatePolicy,
    localActivities = [],
    localCalendars = [],
    localWbs = [],
    localResources = [],
    localAssignments = []
  } = params;

  if (!projectId || !contractId) {
    throw new Error('Project ID and Contract ID are required for governed Primavera reconciliation.');
  }

  const parsedTasks = parsePrimaveraXerTasks(fileContent || '');

  // Scope filter local activities by project and contract
  const scopedLocal = localActivities.filter(
    a => (a.project_id ? a.project_id === projectId : true) &&
         (a.contract_id ? a.contract_id === contractId : true)
  );

  const localByCode = new Map<string, Record<string, any>>();
  scopedLocal.forEach(act => {
    const code = String(act.activity_code || act.id || '').trim();
    if (code) localByCode.set(code, act);
  });

  const p6Codes = new Set<string>();
  const activityDiffs: ActivityDiff[] = [];
  const preparedInsertRows: Record<string, any>[] = [];
  const preparedUpdatePatches: Array<{ table: 'schedules' | 'schedule_resource_assignments'; id: string; patch: Record<string, any> }> = [];
  const newAuxiliaryRows: Array<{ table: 'wbs_nodes' | 'work_calendars' | 'resource_masters' | 'schedule_resource_assignments'; row: Record<string, any> }> = [];

  let synced = 0;
  let dateDrift = 0;
  let durationDiscrepancy = 0;
  let newInP6 = 0;
  let missingInP6 = 0;
  let actualsPreservedCount = 0;

  parsedTasks.forEach(p6Task => {
    const code = String(p6Task['Activity ID'] || p6Task['Source Activity ID'] || '').trim();
    if (!code) return;
    p6Codes.add(code);

    const localMatch = localByCode.get(code);
    const p6Start = String(p6Task.Start || '—').slice(0, 10);
    const p6Finish = String(p6Task.Finish || '—').slice(0, 10);
    const p6Duration = Math.max(0, Number(p6Task['Original Duration']) || 0);

    const localStart = localMatch ? String(localMatch.start_date || '—').slice(0, 10) : '—';
    const localFinish = localMatch ? String(localMatch.end_date || '—').slice(0, 10) : '—';
    const localDuration = localMatch ? Math.max(0, Number(localMatch.duration_days ?? localMatch.duration ?? 0)) : 0;

    let status: ActivityDiff['status'] = 'new_in_p6';
    let action: ActivityDiff['action'] = 'insert';
    let preservedActuals = false;

    if (localMatch) {
      const isDateDiff = localStart !== p6Start || localFinish !== p6Finish;
      const isDurDiff = localDuration !== p6Duration;

      if (isDateDiff) {
        status = 'date_drift';
        dateDrift++;
      } else if (isDurDiff) {
        status = 'duration_discrepancy';
        durationDiscrepancy++;
      } else {
        status = 'synced';
        synced++;
      }

      if (duplicatePolicy === 'update') {
        action = 'update_refresh';
        preservedActuals = true;
        actualsPreservedCount++;

        // Prepare refresh patch that ONLY updates planning/schedule fields
        // strictly preserving actual_start_date, actual_end_date, actual_quantity, actual_cost, progress
        preparedUpdatePatches.push({
          table: 'schedules',
          id: String(localMatch.id),
          patch: {
            start_date: p6Start,
            end_date: p6Finish,
            duration_days: p6Duration,
            activity: p6Task['Activity Name'] || localMatch.activity,
            notes: p6Task.Notes || localMatch.notes
          }
        });
      } else if (duplicatePolicy === 'skip') {
        action = 'skip';
      } else {
        action = 'conflict_flag';
      }
    } else {
      newInP6++;
      action = 'insert';

      const newId = `act-${code}-${crypto.randomUUID().slice(0, 8)}`;
      const newActivityRow = {
        id: newId,
        created_at: new Date().toISOString(),
        project_id: projectId,
        contract_id: contractId,
        activity_code: code,
        source_activity_code: String(p6Task['Source Activity ID'] || code),
        activity: p6Task['Activity Name'] || 'P6 Imported Task',
        start_date: p6Start,
        end_date: p6Finish,
        duration_days: p6Duration,
        planned_quantity: Number(p6Task['Planned Qty']) || 1,
        unit: 'LS',
        unit_rate: 0,
        planned_cost: Number(p6Task['Planned Resource Cost']) || 0,
        status: 'Draft',
        notes: p6Task.Notes || ''
      };
      preparedInsertRows.push(newActivityRow);
    }

    activityDiffs.push({
      activityCode: code,
      sourceActivityCode: String(p6Task['Source Activity ID'] || code),
      activityName: String(p6Task['Activity Name'] || ''),
      p6Start,
      p6Finish,
      p6Duration,
      localStart,
      localFinish,
      localDuration,
      localActualStart: localMatch?.actual_start_date,
      localActualFinish: localMatch?.actual_end_date,
      localActualQuantity: localMatch?.actual_quantity,
      localActualCost: localMatch?.actual_cost,
      status,
      action,
      preservedActuals
    });
  });

  // Local activities missing in P6
  scopedLocal.forEach(localAct => {
    const code = String(localAct.activity_code || localAct.id || '').trim();
    if (code && !p6Codes.has(code)) {
      missingInP6++;
      activityDiffs.push({
        activityCode: code,
        sourceActivityCode: String(localAct.source_activity_code || code),
        activityName: String(localAct.activity || code),
        p6Start: '—',
        p6Finish: '—',
        p6Duration: 0,
        localStart: String(localAct.start_date || '—').slice(0, 10),
        localFinish: String(localAct.end_date || '—').slice(0, 10),
        localDuration: Number(localAct.duration_days ?? localAct.duration ?? 0),
        localActualStart: localAct.actual_start_date,
        localActualFinish: localAct.actual_end_date,
        localActualQuantity: localAct.actual_quantity,
        localActualCost: localAct.actual_cost,
        status: 'missing_in_p6',
        action: 'skip'
      });
    }
  });

  // Compare relationships
  const relationshipDiffs: RelationshipDiff[] = [];
  let relationshipsMatched = 0;
  let relationshipsMismatched = 0;

  parsedTasks.forEach(p6Task => {
    const succCode = String(p6Task['Activity ID'] || '').trim();
    if (!succCode) return;

    let links: Array<{ predecessor_code: string; relationship_type: string; lag_days: number }> = [];
    try {
      if (p6Task['Predecessor Links']) {
        links = JSON.parse(p6Task['Predecessor Links']);
      }
    } catch {
      /* ignore parse error */
    }

    links.forEach(link => {
      const predCode = String(link.predecessor_code || '').trim();
      if (!predCode) return;

      const p6Type = String(link.relationship_type || 'FS').toUpperCase();
      const p6Lag = Number(link.lag_days || 0);

      const localSucc = localByCode.get(succCode);
      let localLinkMatch: any = null;

      if (localSucc) {
        let localLinksArr: any[] = [];
        if (Array.isArray(localSucc.predecessor_links)) {
          localLinksArr = localSucc.predecessor_links;
        } else if (typeof localSucc.predecessor_links === 'string') {
          try { localLinksArr = JSON.parse(localSucc.predecessor_links); } catch { /* ignore */ }
        }
        localLinkMatch = localLinksArr.find(
          l => String(l.predecessor_code || l.predecessor_id || '').trim() === predCode
        );
      }

      let relStatus: RelationshipDiff['status'] = 'missing_in_local';
      if (localLinkMatch) {
        const localType = String(localLinkMatch.relationship_type || localLinkMatch.type || 'FS').toUpperCase();
        const localLag = Number(localLinkMatch.lag_days ?? localLinkMatch.lag ?? 0);

        if (localType === p6Type && Math.abs(localLag - p6Lag) < 0.01) {
          relStatus = 'matched';
          relationshipsMatched++;
        } else {
          relStatus = 'mismatched';
          relationshipsMismatched++;
        }

        relationshipDiffs.push({
          predCode,
          succCode,
          p6Type,
          p6Lag,
          localType,
          localLag,
          status: relStatus
        });
      } else {
        relationshipDiffs.push({
          predCode,
          succCode,
          p6Type,
          p6Lag,
          status: 'missing_in_local'
        });
      }
    });
  });

  return {
    projectId,
    contractId,
    fileName,
    duplicatePolicy,
    parsedCount: parsedTasks.length,
    activityDiffs,
    relationshipDiffs,
    newAuxiliaryRows,
    preparedInsertRows,
    preparedUpdatePatches,
    stats: {
      totalP6: parsedTasks.length,
      synced,
      dateDrift,
      durationDiscrepancy,
      newInP6,
      missingInP6,
      relationshipsMatched,
      relationshipsMismatched,
      actualsPreservedCount
    }
  };
}
