import { assertReportingPeriodDefinition } from './reportingPeriodGovernance.ts';
import { compareBaselineActivities } from './baselineGovernance.ts';
import { calculateCertificateBalances, calculateCertificateValues, calculateSovCostForecast } from '../utils/commercialControl.ts';
import { calculateCpm } from '../utils/cpm.ts';
import { calculatePlannedResourceLoads, calculateResourceLoads } from '../utils/resourceLoading.ts';

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
  scheduleDistributions?: Record<string, any>[];
  workCalendars?: Record<string, any>[];
  wirEntries: Record<string, any>[];
  costEntries: Record<string, any>[];
  reportingPeriods: Record<string, any>[];
  baselines: Record<string, any>[];
  contractSovLines?: Record<string, any>[];
  costChanges?: Record<string, any>[];
  paymentCertificates?: Record<string, any>[];
  variations?: Record<string, any>[];
  variationLines?: Record<string, any>[];
  procurement?: Record<string, any>[];
  procurementReceipts?: Record<string, any>[];
  supplierInvoices?: Record<string, any>[];
  supplierInvoiceLines?: Record<string, any>[];
  supplierInvoicePayments?: Record<string, any>[];
  cashFlow?: Record<string, any>[];
  documents?: Record<string, any>[];
  rfis?: Record<string, any>[];
  submittals?: Record<string, any>[];
  quality?: Record<string, any>[];
  dailyReports?: Record<string, any>[];
  laborDuty?: Record<string, any>[];
  equipment?: Record<string, any>[];
  resourceMasters?: Record<string, any>[];
  scheduleResourceAssignments?: Record<string, any>[];
  wbsNodes?: Record<string, any>[];
}

function pushIf(findings: DataQualityFinding[], condition: boolean, finding: DataQualityFinding): void {
  if (condition) findings.push(finding);
}

function duplicateCount(rows: Record<string, any>[], keyFor: (row: Record<string, any>) => string): number {
  const counts = new Map<string, number>();
  rows.forEach((row) => { const key = keyFor(row); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
  return [...counts.values()].filter((count) => count > 1).length;
}

function predecessorIds(row: Record<string, any>): string[] {
  let links: Record<string, any>[] = [];
  if (Array.isArray(row.predecessor_links)) links = row.predecessor_links;
  else if (typeof row.predecessor_links === 'string' && row.predecessor_links.trim()) {
    try { const parsed = JSON.parse(row.predecessor_links); if (Array.isArray(parsed)) links = parsed; } catch { /* legacy fields below */ }
  }
  if (links.length) return links.map((link) => String(link.predecessor_id || link.id || '').trim()).filter(Boolean);
  const list = Array.isArray(row.predecessor_items) ? row.predecessor_items : String(row.predecessor_items || '').split(',');
  return [...new Set([row.predecessor_item, ...list].map((value) => String(value || '').trim()).filter(Boolean))];
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
  const sovLines = data.contractSovLines || [];
  const costChanges = data.costChanges || [];
  const paymentCertificates = data.paymentCertificates || [];
  const variations = data.variations || [];
  const variationLines = data.variationLines || [];
  const procurement = data.procurement || [];
  const procurementReceipts = data.procurementReceipts || [];
  const supplierInvoices = data.supplierInvoices || [];
  const supplierInvoiceLines = data.supplierInvoiceLines || [];
  const supplierInvoicePayments = data.supplierInvoicePayments || [];
  const cashFlow = data.cashFlow || [];
  const scheduleDistributions = data.scheduleDistributions || [];
  const workCalendars = data.workCalendars || [];
  const laborDuty = data.laborDuty || [];
  const equipment = data.equipment || [];
  const resourceMasters = data.resourceMasters || [];
  const scheduleResourceAssignments = data.scheduleResourceAssignments || [];
  const wbsNodes = data.wbsNodes || [];

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
  const wbsById = new Map(wbsNodes.map((node) => [node.id, node]));
  const invalidScheduleWbs = data.schedules.filter((row) => {
    if (!row.wbs_id) return false;
    const wbs = wbsById.get(row.wbs_id);
    return !wbs || wbs.status === 'Inactive' || wbs.project_id !== row.project_id
      || Boolean(wbs.contract_id && wbs.contract_id !== row.contract_id);
  });
  pushIf(findings, invalidScheduleWbs.length > 0, { severity: 'Error', title: 'Schedule WBS relationship mismatch', detail: `${invalidScheduleWbs.length} activity row(s) reference a missing, inactive, cross-project, or cross-contract WBS node.`, view: 'schedule' });
  const calendarById = new Map(workCalendars.map((calendar) => [calendar.id, calendar]));
  const invalidCalendarMasters = workCalendars.filter((calendar) => !String(calendar.calendar_code || '').trim() || !String(calendar.calendar_name || '').trim() || !['Calendar Days', '5-Day Week', '6-Day Week', '24/7', 'Custom'].includes(String(calendar.working_pattern || '')) || (calendar.working_pattern === 'Custom' && !String(calendar.calendar_working_days || '').trim()) || (calendar.hours_per_day != null && (Number(calendar.hours_per_day) <= 0 || Number(calendar.hours_per_day) > 24)));
  pushIf(findings, invalidCalendarMasters.length > 0, { severity: 'Error', title: 'Work calendar master is incomplete', detail: `${invalidCalendarMasters.length} calendar(s) need a unique code, name and valid working pattern before use.`, view: 'workCalendars' });
  const invalidScheduleCalendars = data.schedules.filter((row) => row.calendar_id && (!calendarById.has(row.calendar_id) || calendarById.get(row.calendar_id)?.status === 'Inactive'));
  pushIf(findings, invalidScheduleCalendars.length > 0, { severity: 'Error', title: 'Activity references an inactive or missing work calendar', detail: `${invalidScheduleCalendars.length} activity row(s) must be reassigned to an active calendar.`, view: 'schedule' });
  const governedPatterns = new Set(['Calendar Days', '5-Day Week', '6-Day Week', '24/7']);
  const unmappedScheduleCalendars = data.schedules.filter((row) => !row.calendar_id && String(row.calendar_name || '').trim() && !governedPatterns.has(String(row.calendar_name).trim()));
  pushIf(findings, unmappedScheduleCalendars.length > 0, { severity: 'Error', title: 'Activity uses an unmapped calendar name', detail: `${unmappedScheduleCalendars.length} activity row(s) use a free-text calendar name without a governed Work Calendar. Map or create the calendar before relying on duration, CPM, or planned value.`, view: 'schedule' });
  const resourceById = new Map(resourceMasters.map((resource) => [resource.id, resource]));
  const invalidResourceMasters = resourceMasters.filter((resource) => !String(resource.resource_code || '').trim() || !String(resource.resource_name || '').trim() || !['Labor', 'Equipment'].includes(String(resource.resource_type || '')) || Number(resource.daily_capacity_hours) < 0 || (resource.availability_start_date && resource.availability_end_date && String(resource.availability_end_date) < String(resource.availability_start_date)));
  pushIf(findings, invalidResourceMasters.length > 0, { severity: 'Error', title: 'Resource master is incomplete', detail: `${invalidResourceMasters.length} resource(s) need a code, name, valid type, and non-negative daily capacity.`, view: 'resourceMaster' });
  const invalidResourceAssignments = [...laborDuty, ...equipment].filter((row) => {
    if (!row.resource_id) return false; // legacy rows remain visible for controlled migration.
    const resource = resourceById.get(row.resource_id);
    return !resource || resource.status === 'Inactive' || (laborDuty.includes(row) ? resource.resource_type !== 'Labor' : resource.resource_type !== 'Equipment');
  });
  pushIf(findings, invalidResourceAssignments.length > 0, { severity: 'Error', title: 'Resource assignment is invalid', detail: `${invalidResourceAssignments.length} labor/equipment record(s) use a missing, inactive, or wrong-type resource.`, view: 'resourceMaster' });
  const overloadedResources = calculateResourceLoads(resourceMasters, laborDuty, equipment).filter((load) => load.capacityHours > 0 && load.overAllocatedHours > 0.000001);
  pushIf(findings, overloadedResources.length > 0, { severity: 'Warning', title: 'Resource is over-allocated', detail: `${overloadedResources.length} resource/day allocation(s) exceed the daily capacity held in Resource Master. Re-level or adjust the affected schedule assignments.`, view: 'resourceMaster' });
  const invalidPlannedResourceAssignments = scheduleResourceAssignments.filter((row) => {
    const activity = scheduleById.get(row.schedule_id);
    const resource = resourceById.get(row.resource_id);
    const start = String(row.assignment_start || '');
    const end = String(row.assignment_end || '');
    return !activity || !resource || resource.status === 'Inactive'
      || activity.project_id !== row.project_id || activity.contract_id !== row.contract_id || activity.boq_item_id !== row.boq_item_id
      || String(resource.resource_type) !== String(row.resource_type)
      || !start || !end || end < start
      || (activity.start_date && start < activity.start_date) || (activity.end_date && end > activity.end_date)
      || (resource.availability_start_date && start < resource.availability_start_date) || (resource.availability_end_date && end > resource.availability_end_date)
      || Number(row.planned_hours) < 0 || Number(row.planned_cost) < 0;
  });
  pushIf(findings, invalidPlannedResourceAssignments.length > 0, { severity: 'Error', title: 'Planned resource assignment is invalid', detail: `${invalidPlannedResourceAssignments.length} planned assignment(s) use an invalid resource, activity scope, date range, type or planned value.`, view: 'resourceAssignments' });
  const plannedOverloads = calculatePlannedResourceLoads(resourceMasters, scheduleResourceAssignments).filter((load) => load.capacityHours > 0 && load.overAllocatedHours > 0.000001);
  pushIf(findings, plannedOverloads.length > 0, { severity: 'Warning', title: 'Planned resource demand exceeds capacity', detail: `${plannedOverloads.length} resource/day planned load(s) exceed Resource Master capacity. Re-level the activity assignments before approving the forecast.`, view: 'resourceAssignments' });
  const invalidScheduleLinks = data.schedules.filter((row) => predecessorIds(row).some((id) => {
    const predecessor = scheduleById.get(id);
    return !predecessor || predecessor.id === row.id || predecessor.project_id !== row.project_id || predecessor.contract_id !== row.contract_id;
  }));
  pushIf(findings, invalidScheduleLinks.length > 0, { severity: 'Error', title: 'Schedule dependency relationship mismatch', detail: `${invalidScheduleLinks.length} activity row(s) have a missing, self-referencing, cross-project or cross-contract predecessor.`, view: 'schedule' });
  const cyclicScheduleContracts = [...new Set(data.schedules.filter((row) => String(row.activity || '').trim()).map((row) => row.contract_id).filter(Boolean))].filter((contractId) => {
    const rows = data.schedules.filter((row) => row.contract_id === contractId && String(row.activity || '').trim());
    return [...calculateCpm(rows as any[]).values()].some((result) => result.cycle);
  });
  pushIf(findings, cyclicScheduleContracts.length > 0, { severity: 'Error', title: 'Schedule network contains a dependency cycle', detail: `${cyclicScheduleContracts.length} contract schedule(s) contain a CPM dependency cycle; correct the links before relying on forecast dates or float.`, view: 'schedule' });
  const invalidScheduleStatus = data.schedules.filter((row) => {
    if (!String(row.activity || '').trim()) return false;
    const status = String(row.activity_status || 'Not Started');
    const actualStart = String(row.actual_start_date || '');
    const actualFinish = String(row.actual_finish_date || '');
    const dataDate = String(row.status_data_date || '');
    const remaining = Number(row.remaining_duration_days);
    return !['Not Started', 'In Progress', 'Completed'].includes(status)
      || (status === 'In Progress' && !actualStart)
      || (status === 'Completed' && (!actualStart || !actualFinish || (Number.isFinite(remaining) && Math.abs(remaining) > 0.000001)))
      || (status !== 'Completed' && Boolean(actualFinish))
      || (actualStart && actualFinish && actualFinish < actualStart)
      || (actualStart && dataDate && dataDate < actualStart)
      || (Number.isFinite(remaining) && remaining < 0);
  });
  pushIf(findings, invalidScheduleStatus.length > 0, { severity: 'Error', title: 'Schedule status update is invalid', detail: `${invalidScheduleStatus.length} activity update(s) have inconsistent actual dates, Data Date, status, or remaining duration.`, view: 'schedule' });
  const invalidScheduleConstraints = data.schedules.filter((row) => {
    const type = String(row.constraint_type || 'None');
    const date = String(row.constraint_date || '');
    return !['None', 'Start No Earlier Than', 'Finish No Later Than', 'Mandatory Start', 'Mandatory Finish'].includes(type)
      || (type !== 'None' && !date)
      || (row.is_milestone === true && Number(row.duration_days || 0) > 0);
  });
  pushIf(findings, invalidScheduleConstraints.length > 0, { severity: 'Error', title: 'Schedule constraint or milestone is invalid', detail: `${invalidScheduleConstraints.length} activity row(s) need a valid constraint date/type, and milestones must have zero duration.`, view: 'schedule' });
  const lateOrEarlyActualActivities = data.schedules.filter((row) => {
    if (!String(row.activity || '').trim()) return false;
    const actualStart = String(row.actual_start_date || '');
    const actualFinish = String(row.actual_finish_date || '');
    return (actualStart && row.start_date && actualStart < String(row.start_date))
      || (actualFinish && row.end_date && actualFinish > String(row.end_date));
  });
  pushIf(findings, lateOrEarlyActualActivities.length > 0, { severity: 'Warning', title: 'Actual activity dates differ from current plan', detail: `${lateOrEarlyActualActivities.length} activity update(s) start earlier or finish later than the controlled current plan. Record and approve the schedule variance; do not overwrite baseline dates.`, view: 'schedule' });
  const excessivePlans = data.boqItems.filter((item) => data.schedules.filter((row) => row.boq_item_id === item.id && String(row.activity || '').trim()).reduce((sum, row) => sum + (Number(row.planned_quantity) || 0), 0) > (Number(item.quantity) || 0) + 0.000001);
  pushIf(findings, excessivePlans.length > 0, { severity: 'Warning', title: 'Planned quantities exceed BOQ', detail: `${excessivePlans.length} BOQ item(s) have activities exceeding their contractual quantity.`, view: 'schedule' });
  const invalidDistributionScope = scheduleDistributions.filter((row) => {
    const activity = scheduleById.get(row.schedule_id);
    return !activity || activity.project_id !== row.project_id || activity.contract_id !== row.contract_id || activity.boq_item_id !== row.boq_item_id;
  });
  pushIf(findings, invalidDistributionScope.length > 0, { severity: 'Error', title: 'Time-phased distribution relationship mismatch', detail: `${invalidDistributionScope.length} distribution row(s) do not match their activity project, contract, or BOQ scope.`, view: 'scheduleDistributions' });
  const invalidDistributionPeriods = scheduleDistributions.filter((row) => {
    const activity = scheduleById.get(row.schedule_id);
    const start = String(row.period_start || '');
    const end = String(row.period_end || '');
    return !start || !end || end < start || Boolean(activity && ((activity.start_date && start < activity.start_date) || (activity.end_date && end > activity.end_date)));
  });
  pushIf(findings, invalidDistributionPeriods.length > 0, { severity: 'Error', title: 'Time-phased distribution period is invalid', detail: `${invalidDistributionPeriods.length} distribution row(s) fall outside their activity dates or have an invalid period.`, view: 'scheduleDistributions' });
  const unreconciledDistributions = data.schedules.filter((activity) => {
    const rows = scheduleDistributions.filter((row) => row.schedule_id === activity.id);
    if (!rows.length) return false;
    const plannedQty = Number(activity.planned_quantity) || 0;
    const plannedValue = Number(activity.budget) > 0 ? Number(activity.budget) : plannedQty * (Number(activity.unit_rate) || 0);
    const qty = rows.reduce((sum, row) => sum + (Number(row.planned_quantity) || 0), 0);
    const value = rows.reduce((sum, row) => sum + (Number(row.planned_value) || ((Number(row.planned_quantity) || 0) * (Number(row.unit_rate) || 0))), 0);
    return qty > plannedQty + 0.000001 || value > plannedValue + 0.01 || Math.abs(qty - plannedQty) > 0.000001 || Math.abs(value - plannedValue) > 0.01;
  });
  pushIf(findings, unreconciledDistributions.length > 0, { severity: 'Warning', title: 'Time-phased plan does not reconcile to activity', detail: `${unreconciledDistributions.length} activity plan(s) have partial or over-allocated time-phased quantities/values; complete or correct the profile before relying on PV/cash forecast.`, view: 'scheduleDistributions' });
  const invalidResourceActivityAllocation = [...laborDuty, ...equipment].filter((row) => {
    if (!row.schedule_id) return false;
    const activity = scheduleById.get(row.schedule_id);
    const date = String(row.date || '');
    return !activity || activity.project_id !== row.project_id || activity.contract_id !== row.contract_id || activity.boq_item_id !== row.boq_item_id
      || Boolean(date && ((activity.start_date && date < activity.start_date) || (activity.end_date && date > activity.end_date)));
  });
  pushIf(findings, invalidResourceActivityAllocation.length > 0, { severity: 'Error', title: 'Resource allocation is outside activity scope', detail: `${invalidResourceActivityAllocation.length} labour/equipment record(s) do not match the linked activity scope or dates.`, view: 'laborDuty' });

  const invalidWirs = data.wirEntries.filter((row) => !contractById.has(row.contract_id) || !itemById.has(row.boq_item_id));
  pushIf(findings, invalidWirs.length > 0, { severity: 'Error', title: 'Inspection request missing scope', detail: `${invalidWirs.length} WIR record(s) are missing a valid contract or BOQ item.`, view: 'wir' });
  const overMeasuredItems = data.boqItems.filter((item) => data.wirEntries.filter((row) => row.boq_item_id === item.id && row.result !== 'Fail').reduce((sum, row) => sum + (Number(row.quantity) || 0), 0) > (Number(item.quantity) || 0) + 0.000001);
  pushIf(findings, overMeasuredItems.length > 0, { severity: 'Error', title: 'Measured quantities exceed BOQ', detail: `${overMeasuredItems.length} BOQ item(s) have accepted inspection quantities above their contractual quantity.`, view: 'wir' });
  const unscopedCosts = data.costEntries.filter((row) => !row.project_id || !row.contract_id || !row.boq_item_id);
  pushIf(findings, unscopedCosts.length > 0, { severity: 'Warning', title: 'Cost entry without full allocation', detail: `${unscopedCosts.length} cost entry(ies) will not be reliably reflected by BOQ control reports.`, view: 'costEntries' });

  // Commercial control requires every main-contract BOQ line to be visible in
  // the SOV.  The check is read-only: it shows an explicit variance rather
  // than inventing budgets or silently changing a contract.
  const mainContractIds = new Set(data.contracts.filter((contract) => !contract.parent_main_contract_id).map((contract) => contract.id));
  const commercialItems = data.boqItems.filter((item) => mainContractIds.has(headerById.get(item.boq_header_id)?.contract_id));
  const uncoveredSovItems = commercialItems.filter((item) => !sovLines.some((line) => line.boq_item_id === item.id));
  pushIf(findings, uncoveredSovItems.length > 0, { severity: 'Warning', title: 'BOQ items missing Contract SOV coverage', detail: `${uncoveredSovItems.length} main-contract BOQ item(s) have no SOV line, so commercial reconciliation is incomplete.`, view: 'contractSov' });
  const invalidSovScope = sovLines.filter((line) => {
    const item = line.boq_item_id ? itemById.get(line.boq_item_id) : undefined;
    const contract = contractById.get(line.contract_id);
    return !contract || contract.project_id !== line.project_id || (item && headerById.get(item.boq_header_id)?.contract_id !== line.contract_id);
  });
  pushIf(findings, invalidSovScope.length > 0, { severity: 'Error', title: 'Contract SOV relationship mismatch', detail: `${invalidSovScope.length} SOV line(s) do not match their project, contract, or BOQ item.`, view: 'contractSov' });
  const mismatchedSovBudgets = sovLines.filter((line) => {
    const item = itemById.get(line.boq_item_id);
    if (!item || line.status === 'Closed') return false;
    const boqValue = Math.round((Number(item.quantity) || 0) * (Number(item.unit_rate) || 0) * 100) / 100;
    return Math.abs((Number(line.original_budget) || 0) - boqValue) > 0.01;
  });
  pushIf(findings, mismatchedSovBudgets.length > 0, { severity: 'Warning', title: 'SOV original budget differs from BOQ', detail: `${mismatchedSovBudgets.length} active SOV line(s) differ from their linked BOQ original value; review allocation or approved baseline.`, view: 'contractSov' });
  const invalidForecastOverrides = sovLines.filter((line) => {
    const approvedVariations = variationLines.filter((variationLine) => {
      const variation = variations.find((candidate) => candidate.id === variationLine.variation_id);
      return variation?.status === 'Approved' && variationLine.contract_id === line.contract_id && variationLine.boq_item_id === line.boq_item_id;
    }).reduce((sum, variationLine) => sum + (Number(variationLine.value_impact) || 0), 0);
    const approvedCostChanges = costChanges.filter((change) => change.status === 'Approved' && change.contract_sov_line_id === line.id)
      .reduce((sum, change) => sum + (Number(change.amount) || 0), 0);
    const scopedPos = procurement.filter((po) => po.contract_id === line.contract_id && po.boq_item_id === line.boq_item_id
      && ['Approved', 'Ordered', 'Partially Delivered', 'Delivered', 'Closed'].includes(String(po.status || '')));
    const procurementCommitment = scopedPos.reduce((sum, po) => sum + (Number(po.total_cost) || ((Number(po.quantity) || 0) * (Number(po.unit_cost) || 0))), 0);
    const scopedCost = data.costEntries.filter((entry) => entry.contract_id === line.contract_id && entry.boq_item_id === line.boq_item_id);
    const procurementActual = scopedCost.filter((entry) => String(entry.source_type || '') === 'procurement_receipt').reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const otherActual = scopedCost.filter((entry) => String(entry.source_type || '') !== 'procurement_receipt').reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    return calculateSovCostForecast({ originalBudget: Number(line.original_budget) || 0, approvedVariations, approvedCostChanges, procurementCommitment, procurementActual, otherActual, manualForecastOverride: Number(line.forecast_override) || 0 }).overrideBelowGovernedFloor;
  });
  pushIf(findings, invalidForecastOverrides.length > 0, { severity: 'Warning', title: 'Manual SOV forecast is below governed cost floor', detail: `${invalidForecastOverrides.length} SOV line(s) have an override below revised budget, actual cost plus open PO commitment; the governed forecast is used instead.`, view: 'contractSov' });
  const invalidCostChanges = costChanges.filter((change) => {
    const sov = sovLines.find((line) => line.id === change.contract_sov_line_id);
    return ['Approved', 'Reversed'].includes(String(change.status || ''))
      && (!sov || sov.project_id !== change.project_id || sov.contract_id !== change.contract_id);
  });
  pushIf(findings, invalidCostChanges.length > 0, { severity: 'Error', title: 'Governed cost change has invalid SOV allocation', detail: `${invalidCostChanges.length} approved/reversed cost change(s) do not resolve to exactly one SOV line in the same project and contract.`, view: 'costChanges' });
  const invalidBudgetTransfers = costChanges.filter((change) => {
    if (change.status !== 'Approved' || change.change_type !== 'Budget Transfer') return false;
    const target = sovLines.find((line) => line.id === change.contract_sov_line_id);
    const source = sovLines.find((line) => line.id === change.transfer_from_sov_line_id);
    return !source || !target || source.id === target.id || source.project_id !== change.project_id || target.project_id !== change.project_id
      || source.contract_id !== change.contract_id || target.contract_id !== change.contract_id || Number(change.amount) <= 0;
  });
  pushIf(findings, invalidBudgetTransfers.length > 0, { severity: 'Error', title: 'Budget transfer has invalid source or target', detail: `${invalidBudgetTransfers.length} approved transfer(s) lack two different SOV lines in the same contract, or have a non-positive amount.`, view: 'costChanges' });
  const invalidCertificates = paymentCertificates.filter((certificate) => {
    const contract = contractById.get(certificate.contract_id);
    const net = Number(certificate.net_certified_value) || 0;
    const calculated = calculateCertificateValues(certificate);
    return ['Approved', 'Paid'].includes(String(certificate.status || ''))
      && (!contract || contract.project_id !== certificate.project_id || !['Client', 'Subcontractor'].includes(String(certificate.certificate_type || '')) || net <= 0
        || Math.abs((Number(certificate.retention_amount) || 0) - calculated.retention_amount) > 0.01
        || Math.abs((Number(certificate.taxable_amount) || 0) - calculated.taxable_amount) > 0.01
        || Math.abs((Number(certificate.tax_amount) || 0) - calculated.tax_amount) > 0.01
        || Math.abs(net - calculated.net_certified_value) > 0.01);
  });
  pushIf(findings, invalidCertificates.length > 0, { severity: 'Error', title: 'Governed payment certificate is incomplete', detail: `${invalidCertificates.length} approved/paid certificate(s) have invalid scope, type or governed net value.`, view: 'paymentCertificates' });
  const invalidCertificateBalances = paymentCertificates.filter((certificate) => {
    if (!['Approved', 'Paid'].includes(String(certificate.status || ''))) return false;
    const contract = contractById.get(certificate.contract_id);
    if (!contract) return true;
    const prior = paymentCertificates.filter((row) => row.id !== certificate.id && row.contract_id === certificate.contract_id
      && row.certificate_type === certificate.certificate_type && ['Approved', 'Paid'].includes(String(row.status || ''))
      && String(row.certificate_date || '') <= String(certificate.certificate_date || ''));
    const balances = calculateCertificateBalances({
      contractAdvanceAmount: Number(contract.advance_amount) || 0,
      retentionCapAmount: Number(contract.retention_cap_amount) || 0,
      priorAdvanceRecovery: prior.reduce((sum, row) => sum + (Number(row.advance_recovery) || 0), 0),
      priorRetention: prior.reduce((sum, row) => sum + (Number(row.retention_amount) || 0), 0),
      certificate,
    });
    return balances.advanceExceeded || balances.retentionCapExceeded
      || Math.abs((Number(certificate.cumulative_retention_amount) || 0) - balances.cumulativeRetentionAmount) > 0.01
      || Math.abs((Number(certificate.remaining_advance_balance) || 0) - balances.remainingAdvanceBalance) > 0.01;
  });
  pushIf(findings, invalidCertificateBalances.length > 0, { severity: 'Error', title: 'Certificate retention or advance balance is invalid', detail: `${invalidCertificateBalances.length} certificate(s) exceed contractual retention/advance terms or do not hold their governed cumulative balance.`, view: 'paymentCertificates' });
  const unappliedApprovedVariationLines = variationLines.filter((line) => {
    const variation = variations.find((candidate) => candidate.id === line.variation_id);
    return variation?.status === 'Approved' && !line.applied_at;
  });
  pushIf(findings, unappliedApprovedVariationLines.length > 0, { severity: 'Error', title: 'Approved variation line not applied', detail: `${unappliedApprovedVariationLines.length} approved variation line(s) have not created or updated their governed BOQ impact.`, view: 'variationLines' });
  const approvedVariationsMissingForecast = variations.filter((variation) => variation.status === 'Approved' && Math.abs(Number(variation.cost_impact) || 0) > 0.000001
    && !cashFlow.some((entry) => entry.source_type === 'variation_cash_forecast' && entry.source_id === variation.id && entry.status === 'Open'));
  pushIf(findings, approvedVariationsMissingForecast.length > 0, { severity: 'Warning', title: 'Approved variation missing commercial cash forecast', detail: `${approvedVariationsMissingForecast.length} approved variation(s) have a financial impact but no governed forecast movement.`, view: 'variations' });
  const approvedNewVariationLinesWithoutSov = variationLines.filter((line) => {
    const variation = variations.find((candidate) => candidate.id === line.variation_id);
    return variation?.status === 'Approved' && line.change_type === 'New Item' && line.boq_item_id
      && !sovLines.some((sov) => sov.contract_id === line.contract_id && sov.boq_item_id === line.boq_item_id);
  });
  pushIf(findings, approvedNewVariationLinesWithoutSov.length > 0, { severity: 'Error', title: 'Approved new variation item missing SOV', detail: `${approvedNewVariationLinesWithoutSov.length} approved new variation item(s) are not represented in Contract SOV.`, view: 'contractSov' });
  const invalidReceipts = procurementReceipts.filter((receipt) => {
    const po = procurement.find((candidate) => candidate.id === receipt.procurement_id);
    return !po || po.project_id !== receipt.project_id || (po.contract_id && po.contract_id !== receipt.contract_id) || (po.boq_item_id && po.boq_item_id !== receipt.boq_item_id);
  });
  pushIf(findings, invalidReceipts.length > 0, { severity: 'Error', title: 'Goods receipt relationship mismatch', detail: `${invalidReceipts.length} receipt(s) do not match their selected purchase order scope.`, view: 'procurementReceipts' });
  const overAcceptedPurchaseOrders = procurement.filter((po) => procurementReceipts
    .filter((receipt) => receipt.procurement_id === po.id && receipt.status === 'Accepted')
    .reduce((sum, receipt) => sum + (Number(receipt.accepted_quantity) || 0), 0) > (Number(po.quantity) || 0) + 0.000001);
  pushIf(findings, overAcceptedPurchaseOrders.length > 0, { severity: 'Error', title: 'Accepted receipts exceed purchase order', detail: `${overAcceptedPurchaseOrders.length} purchase order(s) have accepted quantities above the ordered quantity.`, view: 'procurementReceipts' });
  const invalidSupplierMatches = supplierInvoiceLines.filter((line) => {
    const invoice = supplierInvoices.find((candidate) => candidate.id === line.supplier_invoice_id);
    const receipt = procurementReceipts.find((candidate) => candidate.id === line.procurement_receipt_id);
    const po = procurement.find((candidate) => candidate.id === line.procurement_id || candidate.id === receipt?.procurement_id);
    return !invoice || !receipt || receipt.status !== 'Accepted' || invoice.project_id !== receipt.project_id || String(invoice.contract_id || '') !== String(receipt.contract_id || '') || (invoice.supplier_party_id && po?.supplier_party_id && invoice.supplier_party_id !== po.supplier_party_id);
  });
  pushIf(findings, invalidSupplierMatches.length > 0, { severity: 'Error', title: 'Supplier AP three-way match mismatch', detail: `${invalidSupplierMatches.length} supplier invoice match line(s) do not resolve to an accepted GRN in the same scope.`, view: 'supplierInvoiceLines' });
  const activeSupplierInvoiceIds = new Set(supplierInvoices
    .filter((invoice) => !['Reversed', 'Cancelled', 'Rejected'].includes(String(invoice.status || '')))
    .map((invoice) => invoice.id));
  const overBilledReceipts = procurementReceipts.filter((receipt) => supplierInvoiceLines
    .filter((line) => line.procurement_receipt_id === receipt.id && activeSupplierInvoiceIds.has(line.supplier_invoice_id))
    .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0) > (Number(receipt.accepted_quantity) || 0) + 0.000001);
  pushIf(findings, overBilledReceipts.length > 0, { severity: 'Error', title: 'Supplier invoice quantity exceeds accepted GRN', detail: `${overBilledReceipts.length} accepted receipt(s) are over-invoiced.`, view: 'supplierInvoiceLines' });
  const overPaidSupplierInvoices = supplierInvoices.filter((invoice) => supplierInvoicePayments.filter((payment) => payment.supplier_invoice_id === invoice.id && payment.status === 'Settled')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) > (Number(invoice.net_payable_amount) || 0) + 0.000001);
  pushIf(findings, overPaidSupplierInvoices.length > 0, { severity: 'Error', title: 'Supplier payment exceeds AP', detail: `${overPaidSupplierInvoices.length} supplier invoice(s) have settled payments above their payable amount.`, view: 'supplierInvoicePayments' });
  const multiPoApprovedInvoices = supplierInvoices.filter((invoice) => ['Approved', 'Partially Paid', 'Paid'].includes(String(invoice.status || ''))
    && new Set(supplierInvoiceLines.filter((line) => line.supplier_invoice_id === invoice.id).map((line) => String(line.procurement_id || '')).filter(Boolean)).size !== 1);
  pushIf(findings, multiPoApprovedInvoices.length > 0, { severity: 'Error', title: 'Governed supplier invoice has invalid PO allocation', detail: `${multiPoApprovedInvoices.length} approved supplier invoice(s) do not resolve to exactly one purchase order for the governed AP lifecycle.`, view: 'supplierInvoiceLines' });
  const staleApprovedAp = supplierInvoices.filter((invoice) => ['Approved', 'Partially Paid', 'Paid'].includes(String(invoice.status || ''))
    && !supplierInvoiceLines.some((line) => line.supplier_invoice_id === invoice.id));
  pushIf(findings, staleApprovedAp.length > 0, { severity: 'Error', title: 'Approved supplier invoice has no match lines', detail: `${staleApprovedAp.length} approved supplier invoice(s) have no retained GRN match line and must be reversed or corrected through the governed workflow.`, view: 'supplierInvoices' });
  const duplicatePoForecasts = duplicateCount(cashFlow.filter((row) => row.source_type === 'procurement_forecast'), (row) => String(row.source_id || ''));
  pushIf(findings, duplicatePoForecasts > 0, { severity: 'Error', title: 'Duplicate purchase-order cash forecast', detail: `${duplicatePoForecasts} purchase order(s) have more than one open forecast projection; commercial cash must be reconciled before reporting.`, view: 'procurement' });
  const ungovernedCommittedPos = procurement.filter((po) => ['Ordered', 'Partially Delivered', 'Delivered', 'Closed'].includes(String(po.status || ''))
    && !cashFlow.some((row) => row.source_type === 'procurement_forecast' && row.source_id === po.id));
  pushIf(findings, ungovernedCommittedPos.length > 0, { severity: 'Warning', title: 'Ordered purchase order missing cash forecast', detail: `${ungovernedCommittedPos.length} ordered purchase order(s) are not represented in the governed cash forecast.`, view: 'procurement' });
  const cancelledPoForecasts = procurement.filter((po) => String(po.status || '') === 'Cancelled'
    && cashFlow.some((row) => row.source_type === 'procurement_forecast' && row.source_id === po.id));
  pushIf(findings, cancelledPoForecasts.length > 0, { severity: 'Error', title: 'Cancelled purchase order retains cash forecast', detail: `${cancelledPoForecasts.length} cancelled purchase order(s) still affect the cash forecast and require governed correction.`, view: 'procurement' });

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
  const approvedBaselinesWithoutSnapshots = data.baselines.filter((row) => row.status === 'Approved' && (!Array.isArray(row.activity_snapshot) || row.activity_snapshot.length === 0));
  pushIf(findings, approvedBaselinesWithoutSnapshots.length > 0, { severity: 'Warning', title: 'Approved baseline missing activity snapshot', detail: `${approvedBaselinesWithoutSnapshots.length} approved baseline(s) predate activity-level freezing and cannot provide an auditable schedule comparison. Create a governed revision.`, view: 'baselines' });
  const approvedBaselinesWithoutDistributionSnapshot = data.baselines.filter((baseline) => baseline.status === 'Approved'
    && scheduleDistributions.some((distribution) => distribution.contract_id === baseline.contract_id)
    && (!Array.isArray(baseline.distribution_snapshot)));
  pushIf(findings, approvedBaselinesWithoutDistributionSnapshot.length > 0, { severity: 'Warning', title: 'Approved baseline missing time-phased snapshot', detail: `${approvedBaselinesWithoutDistributionSnapshot.length} approved baseline(s) have live PV distributions but no frozen period profile. Approve a governed baseline revision before relying on historical PV.`, view: 'baselines' });
  const changedApprovedBaselines = data.baselines.filter((baseline) => {
    if (baseline.status !== 'Approved' || !Array.isArray(baseline.activity_snapshot) || baseline.activity_snapshot.length === 0) return false;
    const comparison = compareBaselineActivities(baseline.activity_snapshot, data.schedules.filter((activity) => activity.contract_id === baseline.contract_id));
    return comparison.addedActivityCount > 0 || comparison.removedActivityCount > 0 || comparison.changedActivityCount > 0;
  });
  pushIf(findings, changedApprovedBaselines.length > 0, { severity: 'Warning', title: 'Current schedule differs from approved baseline', detail: `${changedApprovedBaselines.length} approved baseline(s) differ from the current activity plan. Review the variance or create a governed baseline revision.`, view: 'baselines' });

  if (!findings.length) findings.push({ severity: 'Pass', title: 'Acceptance data-quality checks passed', detail: 'All checked project, commercial, BOQ, schedule, field, document, cost, baseline and reporting-period controls are internally consistent.', view: 'dashboard' });
  return findings;
}
