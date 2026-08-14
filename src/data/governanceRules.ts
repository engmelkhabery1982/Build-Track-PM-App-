/**
 * Cross-table validation that must apply to forms, inline edits, paste and
 * imports alike. Relationship-specific checks remain near their lookup data,
 * while these basic financial, quantity and date invariants have one source.
 */
const NON_NEGATIVE_FIELDS = new Set([
  'quantity', 'planned_quantity', 'unit_rate', 'unit_price', 'rate_per_hour',
  'unit_cost', 'total_hours', 'no_of_workers', 'hours_per_day', 'days',
  'lag_days', 'duration_days', 'remaining_duration_days', 'budget',
  'planned_value', 'actual_cost', 'earned_work_value', 'contract_value',
  'modified_contract_value', 'amount', 'item_amount', 'total_cost',
]);

const DATE_PAIRS: Array<[string, string, string]> = [
  ['start_date', 'end_date', 'End date cannot be earlier than start date.'],
  ['period_start', 'period_end', 'Period end cannot be earlier than period start.'],
  ['from_date', 'to_date', 'To date cannot be earlier than from date.'],
];

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function assertRecordGovernance(tableName: string, record: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(record)) {
    if (!NON_NEGATIVE_FIELDS.has(field) || !isPresent(value)) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`${field.replace(/_/g, ' ')} must be a valid number.`);
    if (numeric < 0) throw new Error(`${field.replace(/_/g, ' ')} cannot be negative.`);
  }

  for (const [startField, endField, message] of DATE_PAIRS) {
    const start = String(record[startField] || '');
    const end = String(record[endField] || '');
    if (start && end && end < start) throw new Error(message);
  }

  // A financial variation may legitimately be negative, but a payment or
  // invoice line may not. Keep the exception explicit rather than applying a
  // blanket non-negative rule to every amount field.
  if (['client_invoices', 'subcontractor_invoices', 'cost_entries', 'procurement', 'labor_duty', 'equipment'].includes(tableName)
    && isPresent(record.amount) && Number(record.amount) < 0) {
    throw new Error('Financial amount cannot be negative for this record type.');
  }
}
