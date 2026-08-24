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
  'modified_contract_value', 'amount', 'item_amount', 'total_cost', 'inflow', 'outflow',
  'original_budget', 'forecast_at_completion', 'retention_rate', 'tax_rate', 'markup_rate',
  'gross_certified_value', 'advance_recovery', 'deductions',
]);

const DATE_PAIRS: Array<[string, string, string]> = [
  ['start_date', 'end_date', 'End date cannot be earlier than start date.'],
  ['baseline_start_date', 'baseline_end_date', 'Baseline finish cannot be earlier than baseline start.'],
  ['planned_start_date', 'planned_end_date', 'Planned finish cannot be earlier than planned start.'],
  ['period_start', 'period_end', 'Period end cannot be earlier than period start.'],
  ['from_date', 'to_date', 'To date cannot be earlier than from date.'],
  ['invoice_date', 'due_date', 'Due date cannot be earlier than invoice date.'],
  ['invoice_date', 'payment_date', 'Payment date cannot be earlier than invoice date.'],
  ['order_date', 'delivery_date', 'Delivery date cannot be earlier than order date.'],
];

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function assertRecordGovernance(tableName: string, record: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(record)) {
    // Internal budget transfers and client variations may reduce a value;
    // all other governed financial records remain non-negative.
    if (field === 'amount' && ['cost_changes', 'variations'].includes(tableName)) continue;
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
  if (tableName === 'contract_sov_lines' || tableName === 'payment_certificates') {
    for (const field of ['retention_rate', 'tax_rate', 'markup_rate']) {
      if (isPresent(record[field]) && Number(record[field]) > 100) {
        throw new Error(`${field.replace(/_/g, ' ')} cannot exceed 100%.`);
      }
    }
  }
}
