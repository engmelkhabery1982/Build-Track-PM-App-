import { assertReportingPeriodDefinition } from './reportingPeriodGovernance.ts';

export type DataQualitySeverity = 'Error' | 'Warning' | 'Pass';
export interface DataQualityFinding {
  severity: DataQualitySeverity;
  title: string;
  detail: string;
  view: string;
}

export interface DataQualitySource {
  projects: Record<string, any>[];
  contracts: Record<string, any>[];
  boqHeaders: Record<string, any>[];
  boqItems: Record<string, any>[];
  schedules: Record<string, any>[];
  wirEntries: Record<string, any>[];
  costEntries: Record<string, any>[];
  reportingPeriods: Record<string, any>[];
  baselines: Record<string, any>[];
  documents?: Record<string, any>[];
  rfis?: Record<string, any>[];
  submittals?: Record<string, any>[];
  quality?: Record<string, any>[];
  dailyReports?: Record<string, any>[];
}

function pushIf(findings: DataQualityFinding[], condition: boolean, finding: DataQualityFinding): void {
  if (condition) findings.push(finding);
}

function duplicateCount(rows: Record<string, any>[], keyFor: (row: Record<string, any>) => string): number {
  const counts = new Map<string, number>();
  rows.forEach((row) => { const key = keyFor(row); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
  return [...counts.values()].filter((count) => count > 1).length;
}

/** Read-only acceptance checks. They intentionally never repair data. */
export function runDataQualityChecks(data: DataQualitySource): DataQualityFinding[] {
  const findings: DataQualityFinding[] = [];
  const projectIds = new Set(data.projects.map((row) => row.id));
  const contractById = new Map(data.contracts.map((row) => [row.id, row]));
  const headerById = new Map(data.boqHeaders.map((row) => [row.id, row]));
  const itemById = new Map(data.boqItems.map((row) => [row.id, row]));
  const scheduleById = new Map(data.schedules.map((row) => [row.id, row]));
  const documents = data.documents || [];
  const rfis = data.rfis || [];
  const submittals = data.submittals || [];
  const quality = data.quality || [];
  const dailyReports = data.dailyReports || [];

  const orphanMainContracts = data.contracts.filter((row) => !row.parent_main_contract_id && (!row.project_id || !projectIds.has(row.project_id)));
  pushIf(findings, orphanMainContracts.length > 0, { severity: 'Error', title: 'Main contract without a valid project', detail: `${orphanMainContracts.length} main contract(s) need a generated project relationship.`, view: 'contracts' });
  const projectsWithoutMain = data.projects.filter((project) => !data.contracts.some((contract) => contract.project_id === project.id && !contract.parent_main_contract_id));
  pushIf(findings, projectsWithoutMain.length > 0, { severity: 'Error', title: 'Project without a main contract', detail: `${projectsWithoutMain.length} project(s) do not have the required main-contract source.`, view: 'contracts' });
  const invalidSubcontracts = data.contracts.filter((row) => row.parent_main_contract_id && (!contractById.has(row.parent_main_contract_id) || contractById.get(row.parent_main_contract_id)?.project_id !== row.project_id));
  pushIf(findings, invalidSubcontracts.length > 0, { severity: 'Error', title: 'Invalid subcontract hierarchy', detail: `${invalidSubcontracts.length} subcontract(s) have a missing or cross-project parent contract.`, view: 'contracts' });

  const invalidHeaders = data.boqHeaders.filter((row) => { const contract = contractById.get(row.contract_id); return !contract || contract.project_id !== row.project_id; });
  pushIf(findings, invalidHeaders.length > 0, { severity: 'Error', title: 'BOQ header scope mismatch', detail: `${invalidHeaders.length} BOQ header(s) are not aligned with their contract and project.`, view: 'boq' });
  const invalidItems = data.boqItems.filter((row) => { const header = headerById.get(row.boq_header_id); return !header || header.project_id !== row.project_id; });
  pushIf(findings, invalidItems.length > 0, { severity: 'Error', title: 'BOQ item scope mismatch', detail: `${invalidItems.length} BOQ item(s) are missing a valid header or project relation.`, view: 'boqItems' });
  const duplicateItemCodes = duplicateCount(data.boqItems, (row) => `${row.boq_header_id || ''}:${String(row.item_code || '').trim().toLowerCase()}`);
  pushIf(findings, duplicateItemCodes > 0, { severity: 'Error', title: 'Duplicate BOQ item code', detail: `${duplicateItemCodes} BOQ header scope(s) contain a repeated item code.`, view: 'boqItems' });

  const invalidSchedules = data.schedules.filter((row) => { const item = itemById.get(row.boq_item_id); const contract = contractById.get(row.contract_id); return !item || !contract || item.project_id !== row.project_id || contract.project_id !== row.project_id; });
  pushIf(findings, invalidSchedules.length > 0, { severity: 'Error', title: 'Schedule relationship mismatch', detail: `${invalidSchedules.length} activity row(s) have invalid project, contract or BOQ references.`, view: 'schedule' });
  const excessivePlans = data.boqItems.filter((item) => data.schedules.filter((row) => row.boq_item_id === item.id && String(row.activity || '').trim()).reduce((sum, row) => sum + (Number(row.planned_quantity) || 0), 0) > (Number(item.quantity) || 0) + 0.000001);
  pushIf(findings, excessivePlans.length > 0, { severity: 'Warning', title: 'Planned quantities exceed BOQ', detail: `${excessivePlans.length} BOQ item(s) have activities exceeding their contractual quantity.`, view: 'schedule' });

  const invalidWirs = data.wirEntries.filter((row) => !contractById.has(row.contract_id) || !itemById.has(row.boq_item_id));
  pushIf(findings, invalidWirs.length > 0, { severity: 'Error', title: 'Inspection request missing scope', detail: `${invalidWirs.length} WIR record(s) are missing a valid contract or BOQ item.`, view: 'wir' });
  const overMeasuredItems = data.boqItems.filter((item) => data.wirEntries.filter((row) => row.boq_item_id === item.id && row.result !== 'Fail').reduce((sum, row) => sum + (Number(row.quantity) || 0), 0) > (Number(item.quantity) || 0) + 0.000001);
  pushIf(findings, overMeasuredItems.length > 0, { severity: 'Error', title: 'Measured quantities exceed BOQ', detail: `${overMeasuredItems.length} BOQ item(s) have accepted inspection quantities above their contractual quantity.`, view: 'wir' });
  const unscopedCosts = data.costEntries.filter((row) => !row.project_id || !row.contract_id || !row.boq_item_id);
  pushIf(findings, unscopedCosts.length > 0, { severity: 'Warning', title: 'Cost entry without full allocation', detail: `${unscopedCosts.length} cost entry(ies) will not be reliably reflected by BOQ control reports.`, view: 'costEntries' });

  const fieldRows: Array<Record<string, any> & { view: string }> = [
    ...data.wirEntries.map((row) => ({ ...row, view: 'wir' })),
    ...rfis.map((row) => ({ ...row, view: 'rfi' })),
    ...submittals.map((row) => ({ ...row, view: 'submittals' })),
    ...quality.map((row) => ({ ...row, view: 'quality' })),
    ...dailyReports.map((row) => ({ ...row, view: 'dailyReports' })),
  ];
  const invalidFieldScope = fieldRows.filter((row) => {
    const contract = row.contract_id ? contractById.get(row.contract_id) : undefined;
    const item = row.boq_item_id ? itemById.get(row.boq_item_id) : undefined;
    const schedule = row.schedule_id ? scheduleById.get(row.schedule_id) : undefined;
    return (row.contract_id && (!contract || contract.project_id !== row.project_id))
      || (row.boq_item_id && (!item || item.project_id !== row.project_id || (row.contract_id && item.contract_id !== row.contract_id)))
      || (row.schedule_id && (!schedule || schedule.project_id !== row.project_id || (row.contract_id && schedule.contract_id !== row.contract_id)));
  });
  pushIf(findings, invalidFieldScope.length > 0, { severity: 'Error', title: 'Field register relationship mismatch', detail: `${invalidFieldScope.length} field register row(s) have a project, contract, BOQ item, or activity outside their scope.`, view: invalidFieldScope[0]?.view || 'rfi' });
  const invalidCoordinates = fieldRows.filter((row) => (row.latitude !== '' && row.latitude !== null && row.latitude !== undefined && (!Number.isFinite(Number(row.latitude)) || Number(row.latitude) < -90 || Number(row.latitude) > 90)) || (row.longitude !== '' && row.longitude !== null && row.longitude !== undefined && (!Number.isFinite(Number(row.longitude)) || Number(row.longitude) < -180 || Number(row.longitude) > 180)));
  pushIf(findings, invalidCoordinates.length > 0, { severity: 'Error', title: 'Invalid field coordinates', detail: `${invalidCoordinates.length} field record(s) have latitude or longitude outside valid geographic limits.`, view: invalidCoordinates[0]?.view || 'quality' });
  const invalidDocumentRevisions = documents.filter((row) => row.supersedes_document_id && (row.supersedes_document_id === row.id || !documents.some((candidate) => candidate.id === row.supersedes_document_id)));
  pushIf(findings, invalidDocumentRevisions.length > 0, { severity: 'Error', title: 'Invalid document revision chain', detail: `${invalidDocumentRevisions.length} document(s) supersede a missing document or themselves.`, view: 'documents' });
  const incompleteSubmittalReviews = submittals.filter((row) => ['Approved', 'Approved as Noted', 'Revise & Resubmit', 'Rejected'].includes(String(row.status || '')) && (!String(row.reviewer || '').trim() || !row.response_date));
  pushIf(findings, incompleteSubmittalReviews.length > 0, { severity: 'Error', title: 'Incomplete submittal review', detail: `${incompleteSubmittalReviews.length} reviewed submittal(s) are missing a reviewer or response date.`, view: 'submittals' });
  const incompleteDailyReports = dailyReports.filter((row) => !row.report_date || !String(row.work_summary || '').trim() || Number(row.manpower_count || 0) < 0);
  pushIf(findings, incompleteDailyReports.length > 0, { severity: 'Error', title: 'Incomplete site daily report', detail: `${incompleteDailyReports.length} daily report(s) are missing a date/work summary or have invalid manpower.`, view: 'dailyReports' });

  const periodIssues = data.reportingPeriods.filter((period) => {
    try { assertReportingPeriodDefinition(period, data.reportingPeriods); return false; } catch { return true; }
  });
  pushIf(findings, periodIssues.length > 0, { severity: 'Error', title: 'Reporting-period governance issue', detail: `${periodIssues.length} reporting period(s) have an invalid range, data date, or overlap.`, view: 'reportingPeriods' });
  const duplicateApprovedBaselines = duplicateCount(data.baselines.filter((row) => row.status === 'Approved'), (row) => String(row.contract_id || ''));
  pushIf(findings, duplicateApprovedBaselines > 0, { severity: 'Warning', title: 'Multiple approved baselines', detail: `${duplicateApprovedBaselines} contract(s) have more than one approved baseline; confirm the current baseline.`, view: 'baselines' });

  if (!findings.length) findings.push({ severity: 'Pass', title: 'Acceptance data-quality checks passed', detail: 'All checked project, commercial, BOQ, schedule, field, document, cost, baseline and reporting-period controls are internally consistent.', view: 'dashboard' });
  return findings;
}
