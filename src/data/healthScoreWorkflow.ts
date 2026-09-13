import type {
  HealthScoreVersion,
  HealthDimensionContribution,
} from '../types/index.ts';

export interface HealthScoreWorkflowResultDto {
  id: string;
  project_id: string;
  version_code: string;
  title: string;
  status: string;
  schedule_weight: number;
  cost_weight: number;
  cash_weight: number;
  scope_weight: number;
  quality_weight: number;
  data_quality_weight: number;
  data_date?: string | null;
  overall_score: number;
  health_status: string;
  confidence: number;
  dimensions: Array<{
    dimension: string;
    weight: number;
    raw_metric_value?: number | null;
    metric_name: string;
    score: number;
    weighted_score: number;
    status: string;
    confidence: number;
    source: string;
    source_record_ids: string[];
    freshness_status: string;
  }>;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  reopened_from_id?: string | null;
  reopened_by?: string | null;
  reopened_at?: string | null;
  reopened_reason?: string | null;
  notes?: string | null;
  payload: string;
}

export interface SaveHealthScoreVersionRequest extends Record<string, unknown> {
  operation_id: string;
  project_id: string;
  version_code: string;
  title: string;
  data_date?: string | null;
  schedule_weight: number;
  cost_weight: number;
  cash_weight: number;
  scope_weight: number;
  quality_weight: number;
  data_quality_weight: number;
  schedule_warning_threshold: number;
  schedule_critical_threshold: number;
  schedule_direction: string;
  cost_warning_threshold: number;
  cost_critical_threshold: number;
  cost_direction: string;
  cash_warning_threshold: number;
  cash_critical_threshold: number;
  cash_direction: string;
  scope_warning_threshold: number;
  scope_critical_threshold: number;
  scope_direction: string;
  quality_warning_threshold: number;
  quality_critical_threshold: number;
  quality_direction: string;
  data_quality_warning_threshold: number;
  data_quality_critical_threshold: number;
  data_quality_direction: string;
  notes?: string | null;
  actor: string;
}

export interface ApproveHealthScoreVersionRequest extends Record<string, unknown> {
  operation_id: string;
  version_id: string;
  actor: string;
  approved_at: string;
}

export interface ReopenHealthScoreVersionRequest extends Record<string, unknown> {
  operation_id: string;
  version_id: string;
  new_version_code: string;
  actor: string;
  reopened_at: string;
  reason: string;
}

export interface GetHealthScoreVersionRequest extends Record<string, unknown> {
  version_id?: string | null;
  project_id?: string | null;
}

export interface ListHealthScoreVersionsRequest extends Record<string, unknown> {
  project_id: string;
}

const memoryStore: HealthScoreWorkflowResultDto[] = [];
const operationCache: Record<string, any> = {};

function getWebStorage(): HealthScoreWorkflowResultDto[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = localStorage.getItem('bt_health_score_versions');
      if (item) return JSON.parse(item);
    } catch {}
  }
  return memoryStore;
}

function saveWebStorage(items: HealthScoreWorkflowResultDto[]) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('bt_health_score_versions', JSON.stringify(items));
    } catch {}
  }
  memoryStore.length = 0;
  memoryStore.push(...items);
}

async function invokeHealthScore<T>(command: string, request: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, { request });
  }

  const opId = (request.operation_id as string) || '';
  if (opId && operationCache[opId]) {
    return operationCache[opId] as T;
  }

  const items = getWebStorage();

  if (command === 'save_health_score_version') {
    const req = request as unknown as SaveHealthScoreVersionRequest;
    if (!req.operation_id) throw new Error('Operation ID is required for idempotency.');
    if (!req.project_id) throw new Error('Project ID is required.');
    if (!req.version_code) throw new Error('Version code is required.');

    const totalWeight =
      req.schedule_weight +
      req.cost_weight +
      req.cash_weight +
      req.scope_weight +
      req.quality_weight +
      req.data_quality_weight;
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Total dimension weights must equal 100%, got ${totalWeight}%`);
    }

    const versionId = `hsv_${req.operation_id.replace(/-/g, '_')}`;
    const payloadObj = {
      thresholds: {
        schedule: { warning: req.schedule_warning_threshold, critical: req.schedule_critical_threshold, direction: req.schedule_direction },
        cost: { warning: req.cost_warning_threshold, critical: req.cost_critical_threshold, direction: req.cost_direction },
        cash: { warning: req.cash_warning_threshold, critical: req.cash_critical_threshold, direction: req.cash_direction },
        scope: { warning: req.scope_warning_threshold, critical: req.scope_critical_threshold, direction: req.scope_direction },
        quality: { warning: req.quality_warning_threshold, critical: req.quality_critical_threshold, direction: req.quality_direction },
        dataQuality: { warning: req.data_quality_warning_threshold, critical: req.data_quality_critical_threshold, direction: req.data_quality_direction },
      },
    };

    const dto: HealthScoreWorkflowResultDto = {
      id: versionId,
      project_id: req.project_id,
      version_code: req.version_code,
      title: req.title,
      status: 'Draft',
      schedule_weight: req.schedule_weight,
      cost_weight: req.cost_weight,
      cash_weight: req.cash_weight,
      scope_weight: req.scope_weight,
      quality_weight: req.quality_weight,
      data_quality_weight: req.data_quality_weight,
      data_date: req.data_date || null,
      overall_score: 100,
      health_status: 'Green',
      confidence: 100,
      dimensions: [],
      created_by: req.actor || 'PMO Lead',
      approved_by: null,
      approved_at: null,
      reopened_from_id: null,
      reopened_by: null,
      reopened_at: null,
      reopened_reason: null,
      notes: req.notes || null,
      payload: JSON.stringify(payloadObj),
    };

    items.unshift(dto);
    saveWebStorage(items);
    if (opId) operationCache[opId] = dto;
    return dto as unknown as T;
  }

  if (command === 'approve_health_score_version') {
    const req = request as unknown as ApproveHealthScoreVersionRequest;
    if (!req.operation_id) throw new Error('Operation ID is required.');
    if (!req.version_id) throw new Error('Version ID is required.');
    if (!req.actor) throw new Error('Approver actor is required.');

    const targetIndex = items.findIndex((i) => i.id === req.version_id);
    if (targetIndex === -1) throw new Error('Health score version not found.');

    const target = items[targetIndex];
    if (target.status !== 'Draft') {
      throw new Error(`Only Draft versions can be approved. Current status is ${target.status}.`);
    }

    if (target.created_by && target.created_by.trim().toLowerCase() === req.actor.trim().toLowerCase()) {
      throw new Error(`Maker-checker violation: creator (${target.created_by}) cannot approve their own version.`);
    }

    items.forEach((item) => {
      if (item.project_id === target.project_id && item.status === 'Approved' && item.id !== target.id) {
        item.status = 'Superseded';
      }
    });

    target.status = 'Approved';
    target.approved_by = req.actor;
    target.approved_at = req.approved_at || new Date().toISOString();

    saveWebStorage(items);
    if (opId) operationCache[opId] = target;
    return target as unknown as T;
  }

  if (command === 'reopen_health_score_version') {
    const req = request as unknown as ReopenHealthScoreVersionRequest;
    const target = items.find((i) => i.id === req.version_id);
    if (!target) throw new Error('Source health score version not found.');
    if (target.status !== 'Approved' && target.status !== 'Superseded') {
      throw new Error(`Only Approved or Superseded versions can be reopened. Current is ${target.status}.`);
    }

    const newId = `hsv_reopened_${req.operation_id.replace(/-/g, '_')}`;
    const newDto: HealthScoreWorkflowResultDto = {
      ...target,
      id: newId,
      version_code: req.new_version_code,
      title: `${target.title} (Reopened)`,
      status: 'Draft',
      created_by: req.actor,
      approved_by: null,
      approved_at: null,
      reopened_from_id: req.version_id,
      reopened_by: req.actor,
      reopened_at: req.reopened_at || new Date().toISOString(),
      reopened_reason: req.reason,
    };

    items.unshift(newDto);
    saveWebStorage(items);
    if (opId) operationCache[opId] = newDto;
    return newDto as unknown as T;
  }

  if (command === 'get_health_score_version') {
    const req = request as unknown as GetHealthScoreVersionRequest;
    if (req.version_id) {
      const found = items.find((i) => i.id === req.version_id) || null;
      return found as unknown as T;
    }
    if (req.project_id) {
      const found = items.find((i) => i.project_id === req.project_id && i.status === 'Approved') || null;
      return found as unknown as T;
    }
    return null as unknown as T;
  }

  if (command === 'list_health_score_versions') {
    const req = request as unknown as ListHealthScoreVersionsRequest;
    const projectVersions = items.filter((i) => i.project_id === req.project_id);
    return projectVersions as unknown as T;
  }

  throw new Error(`Unknown command ${command}`);
}

export function mapDtoToHealthScoreVersion(dto: HealthScoreWorkflowResultDto): HealthScoreVersion {
  const dimensions: HealthDimensionContribution[] = (dto.dimensions || []).map((d) => ({
    dimension: d.dimension,
    metricName: d.metric_name,
    rawValue: d.raw_metric_value ?? null,
    rawMetricValue: d.raw_metric_value ?? null,
    score: d.score,
    weight: d.weight,
    weightedScore: d.weighted_score,
    status: d.status as any,
    confidence: d.confidence,
    source: d.source,
    sourceRecordIds: d.source_record_ids || [],
    freshnessStatus: (d.freshness_status as any) || 'Fresh',
  }));

  return {
    id: dto.id,
    project_id: dto.project_id,
    version_code: dto.version_code,
    title: dto.title,
    status: dto.status,
    schedule_weight: dto.schedule_weight,
    cost_weight: dto.cost_weight,
    cash_weight: dto.cash_weight,
    scope_weight: dto.scope_weight,
    quality_weight: dto.quality_weight,
    data_quality_weight: dto.data_quality_weight,
    data_date: dto.data_date,
    overall_score: dto.overall_score,
    health_status: dto.health_status,
    confidence: dto.confidence,
    dimensions,
    created_by: dto.created_by,
    approved_by: dto.approved_by,
    approved_at: dto.approved_at,
    reopened_from_id: dto.reopened_from_id,
    reopened_by: dto.reopened_by,
    reopened_at: dto.reopened_at,
    reopened_reason: dto.reopened_reason,
    notes: dto.notes || undefined,
    payload: dto.payload,
  };
}

export const saveHealthScoreVersion = async (request: SaveHealthScoreVersionRequest): Promise<HealthScoreVersion> => {
  const dto = await invokeHealthScore<HealthScoreWorkflowResultDto>('save_health_score_version', request);
  return mapDtoToHealthScoreVersion(dto);
};

export const approveHealthScoreVersion = async (request: ApproveHealthScoreVersionRequest): Promise<HealthScoreVersion> => {
  const dto = await invokeHealthScore<HealthScoreWorkflowResultDto>('approve_health_score_version', request);
  return mapDtoToHealthScoreVersion(dto);
};

export const reopenHealthScoreVersion = async (request: ReopenHealthScoreVersionRequest): Promise<HealthScoreVersion> => {
  const dto = await invokeHealthScore<HealthScoreWorkflowResultDto>('reopen_health_score_version', request);
  return mapDtoToHealthScoreVersion(dto);
};

export const getHealthScoreVersion = async (request: GetHealthScoreVersionRequest): Promise<HealthScoreVersion | null> => {
  const dto = await invokeHealthScore<HealthScoreWorkflowResultDto | null>('get_health_score_version', request);
  return dto ? mapDtoToHealthScoreVersion(dto) : null;
};

export const listHealthScoreVersions = async (projectId: string): Promise<HealthScoreVersion[]> => {
  const dtos = await invokeHealthScore<HealthScoreWorkflowResultDto[]>('list_health_score_versions', { project_id: projectId });
  return (dtos || []).map(mapDtoToHealthScoreVersion);
};
