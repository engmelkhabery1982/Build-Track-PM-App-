/** Canonical vocabulary shared by forms, imports, governance and reports. */
export const STATUS_SETS = {
  project: ['Planning', 'In Progress', 'On Hold', 'Completed', 'Delayed'],
  contract: ['Draft', 'Active', 'Completed', 'Terminated'],
  schedule: ['Not Started', 'In Progress', 'Completed', 'Delayed'],
  variation: ['Draft', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Reversed'],
  invoice: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'],
  payment: ['Unpaid', 'Partially Paid', 'Paid'],
  wir: ['Pending', 'Approved', 'Rejected'],
  reportingPeriod: ['Open', 'Locked', 'Closed'],
  baseline: ['Draft', 'Approved', 'Superseded'],
  scheduleVersion: ['Draft', 'Approved', 'Superseded'],
  costPlanVersion: ['Draft', 'Approved', 'Superseded'],
  delayEvent: ['Identified', 'Submitted', 'Approved', 'Rejected', 'Closed'],
  document: ['Draft', 'Under Review', 'Approved', 'Current', 'Superseded'],
  laborTimesheet: ['Draft', 'Submitted', 'Approved', 'Posted', 'Reversed'],
  equipmentLog: ['Draft', 'Submitted', 'Approved', 'Posted', 'Reversed'],
  portalSubmission: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Requires Clarification'],
} as const;

export const CANONICAL_FIELDS = {
  app_users: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'username', label: 'Username', type: 'string', required: true },
    { key: 'password_hash', label: 'Password', type: 'string', required: true },
    { key: 'display_name', label: 'Display Name', type: 'string', required: false },
    { key: 'email', label: 'Email', type: 'string', required: false },
    { key: 'role', label: 'Role', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'approval_limit', label: 'Approval Limit', type: 'number', required: false },
    { key: 'created_at', label: 'Created At', type: 'date', required: true }
  ],
  audit_auth: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'timestamp', label: 'Timestamp', type: 'date', required: true },
    { key: 'user_id', label: 'User ID', type: 'string', required: false },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'details', label: 'Details', type: 'string', required: false },
    { key: 'ip_address', label: 'IP', type: 'string', required: false }
  ],
  sync_outbox: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'operation_id', label: 'Operation ID', type: 'string', required: true },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'payload_json', label: 'Payload', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'retry_count', label: 'Retry Count', type: 'number', required: true },
    { key: 'last_error', label: 'Last Error', type: 'string', required: false },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
    { key: 'synced_at', label: 'Synced At', type: 'date', required: false }
  ],
  sync_inbox: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'operation_id', label: 'Operation ID', type: 'string', required: true },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'payload_json', label: 'Payload', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
    { key: 'applied_at', label: 'Applied At', type: 'date', required: false }
  ],
  sync_metadata: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'last_synced_at', label: 'Last Synced At', type: 'date', required: false },
    { key: 'status', label: 'Status', type: 'string', required: false },
    { key: 'last_error', label: 'Last Error', type: 'string', required: false }
  ],
  audit_log: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'project_id', label: 'Project ID', type: 'string', required: false },
    { key: 'contract_id', label: 'Contract ID', type: 'string', required: false },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'actor', label: 'Actor', type: 'string', required: true },
    { key: 'before', label: 'Before State', type: 'object', required: false },
    { key: 'after', label: 'After State', type: 'object', required: false },
    { key: 'summary', label: 'Summary', type: 'string', required: true },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
  ],
  project: ['project_id', 'project_code', 'project_name'],
  contract: ['contract_id', 'contract_number', 'parent_main_contract_id', 'contract_value'],
  boq: ['boq_header_id', 'boq_code', 'boq_item_id', 'item_code', 'quantity', 'unit_rate', 'amount'],
  schedule: ['activity_code', 'boq_item_id', 'start_date', 'end_date', 'duration_days', 'planned_quantity', 'planned_value'],
  scheduleVersion: ['version_code', 'version_name', 'version_type', 'status', 'revision_number', 'data_date', 'owner', 'reason', 'activity_snapshot', 'distribution_snapshot'],
  costPlanVersion: ['version_code', 'version_name', 'status', 'revision_number', 'data_date', 'delivery_cost_bac', 'curve_type', 'control_account_id', 'owner', 'reason'],
  delayEvent: ['delay_code', 'event_name', 'event_category', 'discovery_date', 'responsible_party', 'entitlement_type', 'requested_extension_days', 'approved_extension_days', 'status', 'cpm_impact_days'],
  progress: ['wir_number', 'inspection_date', 'boq_item_id', 'quantity', 'unit_price', 'item_amount'],
  commercial: ['variation_number', 'variation_id', 'invoice_number', 'approved_date', 'effective_date'],
  financial: ['budget', 'planned_value', 'earned_work_value', 'actual_cost', 'inflow', 'outflow', 'net'],
  laborTimesheet: ['timesheet_number', 'work_date', 'shift', 'crew_name', 'submitter', 'status', 'total_regular_hours', 'total_overtime_hours', 'total_amount'],
  equipmentLog: ['log_number', 'log_date', 'shift', 'resource_id', 'operator_name', 'meter_start', 'meter_end', 'meter_hours', 'operating_hours', 'idle_hours', 'breakdown_hours', 'total_hours', 'hourly_rate', 'equipment_cost', 'fuel_quantity', 'fuel_rate', 'fuel_cost', 'total_cost', 'status'],
} as const;

export const IMPORT_FIELD_ALIASES: Record<string, string> = {
  'project code': 'project_code', 'contract code': 'contract_id',
  'activity id': 'activity_code', 'activity name': 'activity',
  'planned qty': 'planned_quantity', 'planned quantity': 'planned_quantity',
  'unit rate': 'unit_rate', 'unit price': 'unit_price',
  'inspection date': 'inspection_date', 'wir reference no': 'wir_number',
  'invoice #': 'invoice_number', 'variation #': 'variation_number',
};

export type CanonicalStatusSet = keyof typeof STATUS_SETS;
export function isCanonicalStatus(set: CanonicalStatusSet, value: unknown): boolean {
  return (STATUS_SETS[set] as readonly string[]).includes(String(value));
}

export type ReportFieldSource = 'manual' | 'source' | 'calculated';
export interface ReportFieldRegistryEntry {
  field_id: string;
  label: string;
  source: ReportFieldSource;
  allowed_types: string[]; // Report types where this field is allowed
}

export const REPORT_FIELD_REGISTRY: ReportFieldRegistryEntry[] = [
  { field_id: 'invoice_number', label: 'Invoice Number', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice'] },
  { field_id: 'project_name', label: 'Project Name', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR', 'Variation Order', 'Cost Report', 'Cash Forecast'] },
  { field_id: 'contract_number', label: 'Contract Number', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR', 'Variation Order', 'Cost Report', 'Cash Forecast'] },
  { field_id: 'client_name', label: 'Client', source: 'source', allowed_types: ['Client Invoice'] },
  { field_id: 'subcontractor_name', label: 'Subcontractor', source: 'source', allowed_types: ['Subcontractor Invoice', 'WIR'] },
  { field_id: 'period', label: 'Period', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'Cost Report', 'Cash Forecast'] },
  { field_id: 'boq_item_code', label: 'BOQ Item Code', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR', 'Cost Report'] },
  { field_id: 'description', label: 'Description', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR', 'Variation Order', 'Cost Report'] },
  { field_id: 'unit', label: 'Unit', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR'] },
  { field_id: 'quantity', label: 'Quantity', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR'] },
  { field_id: 'unit_rate', label: 'Unit Rate', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR'] },
  { field_id: 'amount', label: 'Amount', source: 'calculated', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR'] },
  { field_id: 'grand_total', label: 'Grand Total', source: 'calculated', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'Cost Report'] },
  { field_id: 'payment_status', label: 'Payment Status', source: 'source', allowed_types: ['Client Invoice', 'Subcontractor Invoice'] },
  { field_id: 'wir_number', label: 'WIR Number', source: 'source', allowed_types: ['WIR'] },
  { field_id: 'inspection_date', label: 'Inspection Date', source: 'source', allowed_types: ['WIR'] },
  { field_id: 'result', label: 'Result', source: 'source', allowed_types: ['WIR'] },
  { field_id: 'inspector', label: 'Inspector', source: 'source', allowed_types: ['WIR'] },
  { field_id: 'variation_number', label: 'Variation Number', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'title', label: 'Title', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'cost_impact', label: 'Cost Impact', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'time_impact', label: 'Time Impact', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'status', label: 'Status', source: 'source', allowed_types: ['Variation Order', 'Cash Forecast'] },
  { field_id: 'approved_by', label: 'Approved By', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'approved_date', label: 'Approved Date', source: 'source', allowed_types: ['Variation Order'] },
  { field_id: 'budget', label: 'Budget', source: 'source', allowed_types: ['Cost Report'] },
  { field_id: 'planned_value', label: 'Planned Value', source: 'source', allowed_types: ['Cost Report'] },
  { field_id: 'actual_cost', label: 'Actual Cost', source: 'source', allowed_types: ['Cost Report'] },
  { field_id: 'earned_value', label: 'Earned Value', source: 'source', allowed_types: ['Cost Report'] },
  { field_id: 'cpi', label: 'CPI', source: 'calculated', allowed_types: ['Cost Report'] },
  { field_id: 'spi', label: 'SPI', source: 'calculated', allowed_types: ['Cost Report'] },
  { field_id: 'date', label: 'Date', source: 'source', allowed_types: ['Cash Forecast'] },
  { field_id: 'category', label: 'Category', source: 'source', allowed_types: ['Cash Forecast'] },
  { field_id: 'movement_type', label: 'Movement Type', source: 'source', allowed_types: ['Cash Forecast'] },
  { field_id: 'inflow', label: 'Inflow', source: 'source', allowed_types: ['Cash Forecast'] },
  { field_id: 'outflow', label: 'Outflow', source: 'source', allowed_types: ['Cash Forecast'] },
  { field_id: 'net', label: 'Net', source: 'calculated', allowed_types: ['Cash Forecast'] },
  { field_id: 'cumulative_balance', label: 'Cumulative Balance', source: 'calculated', allowed_types: ['Cash Forecast'] },
  { field_id: 'custom_notes', label: 'Custom Notes', source: 'manual', allowed_types: ['Client Invoice', 'Subcontractor Invoice', 'WIR', 'Variation Order', 'Cost Report', 'Cash Forecast'] },
];

export function assertReportFieldAllowed(field_id: string, report_type: string) {
  const field = REPORT_FIELD_REGISTRY.find(f => f.field_id === field_id);
  if (!field) throw new Error(`Report field ${field_id} is not defined in the field registry.`);
  if (!field.allowed_types.includes(report_type)) throw new Error(`Report field ${field_id} is not allowed for report type ${report_type}.`);
}
