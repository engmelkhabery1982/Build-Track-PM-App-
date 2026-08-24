export type ReportingPeriodLike = Record<string, any>;
export type ReportingPeriodMutation = 'insert' | 'update' | 'delete';

const OPERATIONAL_DATE_FIELDS = [
  'start_date', 'end_date', 'planned_start_date', 'planned_end_date',
  'baseline_start_date', 'baseline_end_date', 'inspection_date', 'date',
  'invoice_date', 'due_date', 'payment_date', 'order_date', 'delivery_date',
  'baseline_date', 'data_date', 'raised_date', 'submitted_date',
  'requested_date', 'decision_date', 'approved_date', 'upload_date',
  'period_start', 'period_end', 'from_date', 'to_date', 'effective_date',
] as const;

export function isProtectedReportingPeriod(period: ReportingPeriodLike): boolean {
  return period.status === 'Locked' || period.status === 'Closed';
}

export function recordGovernedDates(record: Record<string, any> | undefined): string[] {
  if (!record) return [];
  return [...new Set(OPERATIONAL_DATE_FIELDS
    .map((field) => String(record[field] || '').slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)))];
}

export function lockedPeriodForRecord(
  periods: ReportingPeriodLike[],
  record: Record<string, any> | undefined,
): ReportingPeriodLike | undefined {
  if (!record?.project_id) return undefined;
  const dates = recordGovernedDates(record);
  return periods.find((period) =>
    period.project_id === record.project_id && isProtectedReportingPeriod(period) &&
    period.start_date && period.end_date &&
    dates.some((date) => date >= String(period.start_date) && date <= String(period.end_date)),
  );
}

export function assertRecordPeriodIsOpen(
  periods: ReportingPeriodLike[],
  next: Record<string, any> | undefined,
  before?: Record<string, any>,
): void {
  const locked = lockedPeriodForRecord(periods, before) || lockedPeriodForRecord(periods, next);
  if (locked) {
    throw new Error(`Reporting period "${locked.period_name || locked.id}" is ${locked.status}. Reopen it before changing a dated record.`);
  }
}

export function assertReportingPeriodDefinition(period: ReportingPeriodLike, allPeriods: ReportingPeriodLike[]): void {
  const start = String(period.start_date || '');
  const end = String(period.end_date || '');
  const dataDate = String(period.data_date || '');
  if (!period.project_id) throw new Error('A reporting period must be linked to a project.');
  if (!String(period.period_name || '').trim()) throw new Error('Reporting period name is required.');
  if (!start || !end) throw new Error('Reporting period start and end dates are required.');
  if (end < start) throw new Error('Reporting period end date cannot be earlier than its start date.');
  if (dataDate && (dataDate < start || dataDate > end)) throw new Error('Reporting data date must fall inside the reporting period.');
  if (isProtectedReportingPeriod(period) && !dataDate) throw new Error('A data date is required before a reporting period can be locked or closed.');
  const overlaps = allPeriods.some((other) =>
    other.id !== period.id && other.project_id === period.project_id &&
    other.start_date && other.end_date && start <= String(other.end_date) && end >= String(other.start_date),
  );
  if (overlaps) throw new Error('Reporting periods for the same project cannot overlap.');
}

export function assertReportingPeriodMutation(
  operation: ReportingPeriodMutation,
  next: ReportingPeriodLike | undefined,
  before?: ReportingPeriodLike,
): void {
  if (!before) return;
  if (operation === 'delete' && isProtectedReportingPeriod(before)) {
    throw new Error(`Reporting period "${before.period_name || before.id}" is ${before.status} and cannot be deleted.`);
  }
  if (operation !== 'update' || !isProtectedReportingPeriod(before)) return;
  if (before.status === 'Closed') throw new Error(`Reporting period "${before.period_name || before.id}" is Closed and cannot be changed.`);
  const changedFields = Object.keys(next || {}).filter((key) => key !== 'id' && key !== 'created_at' && next?.[key] !== before[key]);
  if (changedFields.length !== 1 || changedFields[0] !== 'status' || next?.status !== 'Open') {
    throw new Error(`Reporting period "${before.period_name || before.id}" is Locked. Reopen it before changing its definition.`);
  }
}
