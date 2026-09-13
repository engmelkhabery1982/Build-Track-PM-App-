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

async function invokeHealthScore<T>(command: string, request: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, { request });
  }
  throw new Error('Governed health score operations are available in the BuildTrack application.');
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
