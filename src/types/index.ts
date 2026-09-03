export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  spent: number;
  status: string;
  progress: number;
  project_manager: string;
  contractor: string;
  project_code: string;
  boq_code: string;
  client_contract_type: string;
  company_contract_type: string;
  parent_main_project_id: string | null;
  project_code_locked: boolean;
  last_modified: string;
  notes: string;
  created_at: string;
}

export interface ProjectWithStats extends Project {
  task_count: number;
  completed_tasks: number;
}

export interface Task {
  id: string;
  project_id: string;
  contract_id: string | null;
  name: string;
  assignee: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  cost: number;
  status: string;
  progress: number;
  predecessors: string;
  priority: string;
  created_at: string;
}

export interface Cost {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  schedule_id?: string | null;
  main_contract_id: string | null;
  project_code: string;
  item_code: string;
  company_name: string;
  boq_item_code: string;
  boq_item_name: string;
  category: string;
  description: string;
  budget: number;
  planned: number;
  actual: number;
  committed: number;
  status: string;
  notes: string;
  created_at: string;
}

/** Controlled CBS master used consistently by BOQ, commitments and actual cost. */
export interface CostCode {
  id: string;
  project_id: string | null;
  cost_code: string;
  cost_code_locked: boolean;
  name: string;
  description: string;
  classification: 'Labor' | 'Material' | 'Equipment' | 'Subcontract' | 'Indirect' | 'Other' | string;
  parent_cost_code_id: string | null;
  cbs_level: number;
  status: 'Active' | 'Inactive' | string;
  notes: string;
  created_at: string;
}

/** Project WBS hierarchy; schedule activities reference this master node. */
export interface WBSNode {
  id: string;
  project_id: string;
  contract_id: string | null;
  wbs_code: string;
  wbs_code_locked: boolean;
  name: string;
  description: string;
  parent_wbs_id: string | null;
  wbs_level: number;
  status: 'Active' | 'Inactive' | string;
  notes: string;
  created_at: string;
}

/** Contract Schedule of Values. Original value is controlled here; approved
 * variations, commitments and actual cost remain derived from source records. */
export interface ContractSOVLine {
  id: string;
  project_id: string;
  contract_id: string;
  boq_header_id: string | null;
  boq_item_id: string | null;
  cost_code_id: string | null;
  sov_line_code: string;
  sov_line_code_locked: boolean;
  description: string;
  original_budget: number;
  forecast_at_completion: number | null;
  retention_rate: number;
  tax_rate: number;
  markup_rate: number;
  status: 'Draft' | 'Active' | 'Closed' | string;
  notes: string;
  created_at: string;
}

/** SAP-style control account: the explicit point where scope, schedule and
 * cost are controlled together. Source postings will be assigned here in A1.2. */
export interface ControlAccount {
  id: string;
  project_id: string;
  contract_id: string;
  wbs_id: string;
  boq_item_id: string;
  cost_code_id: string;
  contract_sov_line_id: string;
  control_account_code: string;
  control_account_code_locked: boolean;
  description: string;
  /** Report cut-off used for this account's PV/EV/AC/forecast view. */
  data_date?: string | null;
  status: 'Active' | 'Inactive' | 'Closed' | string;
  notes: string;
  created_at: string;
}

/** Approved internal budget movement.  It is separate from a client Variation
 * so commercial revenue and delivery-cost forecast remain independently governed. */
export interface CostChange {
  id: string;
  project_id: string;
  contract_id: string;
  contract_sov_line_id: string | null;
  boq_item_id: string | null;
  cost_code_id: string | null;
  cost_change_number: string;
  cost_change_number_locked: boolean;
  title: string;
  description: string;
  change_type: 'Budget Transfer' | 'Scope Cost' | 'Forecast Adjustment' | 'Procurement Change' | string;
  amount: number;
  effective_date: string | null;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | string;
  approved_by: string;
  approved_date: string | null;
  notes: string;
  created_at: string;
}

export interface CostEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  /** Explicit governed link to the main-contract Control Account. */
  control_account_id?: string | null;
  cost_code_id?: string | null;
  main_contract_id: string | null;
  project_code: string;
  boq_code: string;
  company_name: string;
  boq_item_code: string;
  boq_item_name: string;
  date: string | null;
  cost_type: string;
  invoice_number: string;
  payment_order_number: string;
  amount: number;
  source_type: string | null;
  source_id: string | null;
  last_modified: string;
  created_at: string;
}

export interface Procurement {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  /** Explicit governed link to the main-contract Control Account. */
  control_account_id?: string | null;
  cost_code_id?: string | null;
  supplier_party_id?: string | null;
  purchase_order_number?: string;
  purchase_order_number_locked?: boolean;
  item: string;
  supplier: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  status: string;
  order_date: string | null;
  delivery_date: string | null;
  notes: string;
  created_at: string;
}

/** Accepted receipt is the controlled source for PO actual cost. */
export interface ProcurementReceipt {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  /** Explicit governed link to the main-contract Control Account. */
  control_account_id?: string | null;
  procurement_id: string;
  receipt_number: string;
  receipt_number_locked: boolean;
  supplier: string;
  item: string;
  unit: string;
  received_quantity: number;
  accepted_quantity: number;
  unit_cost: number;
  accepted_amount: number;
  receipt_date: string | null;
  status: 'Draft' | 'Received' | 'Accepted' | 'Rejected' | string;
  notes: string;
  created_at: string;
}

/** Supplier AP is separate from client/subcontractor progress invoices. */
export interface SupplierInvoice {
  id: string;
  project_id: string;
  contract_id: string | null;
  supplier_party_id: string | null;
  supplier: string;
  invoice_number: string;
  invoice_number_locked: boolean;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  goods_amount: number;
  tax_amount: number;
  deductions_amount: number;
  net_payable_amount: number;
  status: 'Draft' | 'Submitted' | 'Matched' | 'Exception' | 'Approved' | 'Partially Paid' | 'Paid' | 'Rejected' | 'Cancelled' | string;
  approved_by: string;
  approved_date: string | null;
  variance_reason: string;
  notes: string;
  created_at: string;
}

export interface SupplierInvoiceLine {
  id: string;
  supplier_invoice_id: string;
  procurement_receipt_id: string;
  procurement_id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  quantity: number;
  unit_cost: number;
  goods_amount: number;
  tax_amount: number;
  line_total: number;
  variance_reason: string;
  created_at: string;
}

export interface SupplierInvoicePayment {
  id: string;
  supplier_invoice_id: string;
  project_id: string;
  contract_id: string | null;
  payment_number: string;
  payment_number_locked: boolean;
  payment_date: string | null;
  amount: number;
  status: 'Draft' | 'Settled' | 'Cancelled' | string;
  payment_reference: string;
  notes: string;
  created_at: string;
}

export interface Safety {
  id: string;
  project_id: string;
  contract_id: string | null;
  type: string;
  severity: string;
  date: string | null;
  description: string;
  location: string;
  responsible: string;
  status: string;
  action_taken: string;
  created_at: string;
}

export interface ProgressEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  main_contract_id: string | null;
  project_code: string;
  company_name: string;
  date: string | null;
  area: string;
  percent_complete: number;
  prev_value: number;
  prev_pct: number;
  current_value: number;
  current_pct: number;
  total_value: number;
  total_pct: number;
  weather: string;
  workers: number;
  notes: string;
  created_at: string;
}

export interface Schedule {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  /** Explicit governed link to the main-contract Control Account. */
  control_account_id?: string | null;
  project_code: string;
  boq_code: string;
  boq_item_code: string;
  boq_item_name: string;
  wbs_id?: string | null;
  wbs_code?: string;
  activity_code?: string;
  activity: string;
  /** Declared earned-value rule; never infer progress from a visual percentage. */
  measurement_method?: 'Quantity' | '0/100' | '50/50' | 'Weighted Milestone' | string;
  measurement_weight_pct?: number;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  /** Controlled status-update fields. They must never overwrite plan/baseline dates. */
  activity_status?: 'Not Started' | 'In Progress' | 'Completed' | string;
  actual_start_date?: string | null;
  actual_finish_date?: string | null;
  remaining_duration_days?: number;
  status_data_date?: string | null;
  /** Calculated CPM status forecast. These never replace approved plan dates. */
  forecast_start_date?: string | null;
  forecast_end_date?: string | null;
  forecast_data_date?: string | null;
  constraint_type?: 'None' | 'Start No Earlier Than' | 'Finish No Later Than' | 'Mandatory Start' | 'Mandatory Finish' | string;
  constraint_date?: string | null;
  is_milestone?: boolean;
  planned_labor_hours?: number;
  planned_equipment_hours?: number;
  budget: number;
  planned_value: number;
  progress: number;
  earned_work_value?: number;
  actual_cost?: number;
  predecessors: string;
  predecessor_item: string;
  predecessor_items?: string[] | string;
  predecessor_links?: Array<{ predecessor_id?: string; relationship_type?: 'FS' | 'SS' | 'FF' | 'SF' | string; lag_days?: number }> | string;
  calendar_id?: string | null;
  relationship_type?: 'FS' | 'SS' | 'FF' | 'SF' | string;
  lag_days?: number;
  calendar_name?: string;
  /** Comma-separated or JSON array of explicitly approved non-working ISO dates. */
  calendar_exceptions?: string[] | string | null;
  /** JS weekday values (0 Sunday through 6 Saturday) for a Custom calendar. */
  calendar_working_days?: number[] | string | null;
  calendar_hours_per_day?: number | null;
  critical_path: boolean;
  is_critical_item: boolean;
  responsible: string;
  status: string;
  notes: string;
  created_at: string;
}

/** Reusable working-time definition for activities. */
export interface WorkCalendar {
  id: string;
  calendar_code: string;
  calendar_name: string;
  working_pattern: 'Calendar Days' | '5-Day Week' | '6-Day Week' | '24/7' | 'Custom' | string;
  calendar_exceptions?: string[] | string | null;
  calendar_working_days?: number[] | string | null;
  hours_per_day?: number | null;
  shift_definitions?: Array<{ start?: string; end?: string }> | string | null;
  status: 'Active' | 'Inactive' | string;
  notes: string;
  created_at: string;
}

/** Time-phased planned quantity for one schedule activity. */
export interface ScheduleDistribution {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  schedule_id: string;
  project_code: string;
  activity_name: string;
  period_start: string | null;
  period_end: string | null;
  planned_quantity: number;
  unit: string;
  unit_rate: number;
  planned_value: number;
  notes: string;
  created_at: string;
}

export interface Contract {
  id: string;
  project_id: string;
  contract_number: string;
  contract_number_locked: boolean;
  title: string;
  project_name: string;
  contractor: string;
  contract_type: string;
  contract_value: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  signed_date: string | null;
  client: string;
  company: string;
  client_contract_type: string;
  company_contract_type: string;
  parent_main_contract_id: string | null;
  document_reference: string;
  last_modified: string;
  notes: string;
  created_at: string;
}

export interface BOQHeader {
  id: string;
  project_id: string;
  project_code: string;
  boq_code: string;
  classification: string;
  company_name: string;
  contract_type: string;
  total_value: number;
  contract_id: string | null;
  boq_code_locked: boolean;
  last_modified: string;
  created_at: string;
}

export interface BOQItem {
  id: string;
  project_id: string;
  project_code: string;
  boq_code: string;
  item_code: string;
  item_name: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  boq_header_id: string | null;
  /** Required for subcontractor items; links to the priced main BOQ item. */
  main_boq_item_id?: string | null;
  /** Frozen schedule dates captured from the approved project baseline. */
  baseline_start_date?: string | null;
  baseline_end_date?: string | null;
  /** Current approved planning window; activities and inspections are governed against it. */
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  variance_reason?: string | null;
  item_code_locked: boolean;
  last_modified: string;
  notes: string;
  created_at: string;
}

export interface CashFlowEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  date: string | null;
  description: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative_balance: number;
  category: string;
  movement_type?: 'Forecast' | 'Actual' | 'Manual' | string;
  status?: 'Open' | 'Settled' | 'Cancelled' | string;
  source_type?: string | null;
  source_id?: string | null;
  notes: string;
  created_at: string;
}

export interface SubcontractorInvoice {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  main_contract_id: string | null;
  invoice_number: string;
  subcontractor: string;
  boq_reference: string;
  boq_code: string;
  boq_item_code: string;
  item_desc: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  invoice_date: string | null;
  amount: number;
  status: string;
  payment_status: string;
  payment_date: string | null;
  paid_amount: number;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface ClientInvoice {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  invoice_number: string;
  client: string;
  boq_code: string;
  boq_item_code: string;
  item_desc: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  invoice_date: string | null;
  due_date: string | null;
  amount: number;
  status: string;
  payment_status: string;
  payment_date: string | null;
  paid_amount: number;
  notes: string;
  created_by: string;
  created_at: string;
}

/** Approved commercial certificate: the controlled payment summary for one contract. */
export interface PaymentCertificate {
  id: string;
  project_id: string;
  contract_id: string;
  certificate_number: string;
  certificate_number_locked: boolean;
  certificate_type: 'Client' | 'Subcontractor' | string;
  invoice_tracking_id: string | null;
  payment_date: string | null;
  period_start: string | null;
  period_end: string | null;
  certificate_date: string | null;
  gross_certified_value: number;
  retention_rate: number;
  advance_recovery: number;
  deductions: number;
  tax_rate: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid' | string;
  approved_by: string;
  approved_date: string | null;
  notes: string;
  created_at: string;
}

export interface LaborDuty {
  id: string;
  project_id: string;
  contract_id: string | null;
  schedule_id?: string | null;
  resource_id?: string | null;
  project_code: string;
  date: string | null;
  worker_name: string;
  role: string;
  no_of_workers: number;
  hours_per_day: number;
  days: number;
  total_hours: number;
  rate_per_hour: number;
  amount: number;
  notes: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  project_id: string;
  contract_id: string | null;
  schedule_id?: string | null;
  resource_id?: string | null;
  project_code: string;
  date: string | null;
  equipment_name: string;
  equipment_type: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  notes: string;
  created_at: string;
}

/** Reusable workforce/equipment catalogue. Assignments remain project records. */
export interface ResourceMaster {
  id: string;
  resource_code: string;
  resource_name: string;
  resource_type: 'Labor' | 'Equipment' | string;
  role_or_type: string;
  unit: string;
  standard_rate: number;
  daily_capacity_hours: number;
  availability_start_date?: string | null;
  availability_end_date?: string | null;
  calendar_id?: string | null;
  status: 'Active' | 'Inactive' | string;
  notes: string;
  created_at: string;
}

/** Planned demand assigned to one executable schedule activity. Actual site
 * records remain in Labor Duty / Equipment and are intentionally separate. */
export interface ScheduleResourceAssignment {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  schedule_id: string;
  resource_id: string;
  resource_type: 'Labor' | 'Equipment' | string;
  assignment_start: string | null;
  assignment_end: string | null;
  planned_hours: number;
  planned_quantity: number;
  planned_cost: number;
  notes: string;
  created_at: string;
}

export interface TrackingSheet {
  id: string;
  project_id: string;
  company_name: string;
  source_type: string;
  source_id: string;
  amount: number;
  status: string;
  created_by: string;
  created_time: string;
  created_at: string;
}

export interface InvoiceTracking {
  id: string;
  invoice_id: string | null;
  project_id: string | null;
  contract_id: string | null;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  payment_status: string;
  payment_date: string | null;
  notes: string;
  created_at: string;
}

export interface Variation {
  id: string;
  project_id: string;
  contract_id: string | null;
  variation_number: string;
  type: string;
  title: string;
  description: string;
  cost_impact: number;
  time_impact_days: number;
  status: string;
  approved_by: string;
  approved_date: string | null;
  notes: string;
  created_at: string;
}

/** A controlled financial/quantity change within one variation order. */
export interface VariationLine {
  id: string;
  variation_id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  change_type: 'New Item' | 'Quantity Change' | 'Rate Change' | 'Quantity & Rate Change';
  /** Whether the revised rate reprices all quantity or only the changed quantity. */
  pricing_scope?: 'Entire Revised Quantity' | 'Changed Quantity Only';
  item_code: string;
  description: string;
  unit: string;
  original_quantity: number;
  quantity_change: number;
  revised_quantity: number;
  original_rate: number;
  revised_rate: number;
  value_impact: number;
  effective_date: string | null;
  notes: string;
  created_at: string;
}

export interface DocumentEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  document_number?: string;
  document_number_locked?: boolean;
  revision?: string;
  supersedes_document_id?: string | null;
  is_current?: boolean;
  document_name: string;
  document_type: string;
  category: string;
  version: string;
  upload_date: string | null;
  status: string;
  responsible: string;
  file_reference: string;
  related_record_type?: string;
  related_record_reference?: string;
  notes: string;
  created_at: string;
}

/** Frozen, approved control point. It is never recalculated after approval. */
export interface ProjectBaseline {
  id: string;
  project_id: string;
  contract_id: string | null;
  baseline_number: string;
  revision_number?: number;
  revision_reason?: string;
  baseline_date: string | null;
  status: 'Draft' | 'Approved' | 'Superseded' | string;
  original_contract_value: number;
  approved_variation_value: number;
  modified_contract_value: number;
  planned_budget: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  /** Frozen activity-level schedule captured exactly when this baseline is approved. */
  activity_snapshot?: Array<Record<string, unknown>>;
  /** Frozen period profile used to calculate baseline PV after approval. */
  distribution_snapshot?: Array<Record<string, unknown>>;
  baseline_activity_count?: number;
  baseline_critical_activity_count?: number;
  notes: string;
  created_at: string;
}

export interface ReportingPeriod {
  id: string;
  project_id: string;
  contract_id: string | null;
  period_name: string;
  start_date: string | null;
  end_date: string | null;
  data_date: string | null;
  status: 'Open' | 'Locked' | 'Closed' | string;
  notes: string;
  created_at: string;
}

/** One action-oriented register for risks, issues, decisions and opportunities. */
export interface GovernanceRegisterEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  reference_number: string;
  record_type: 'Risk' | 'Issue' | 'Decision' | 'Opportunity' | string;
  title: string;
  category: string;
  probability: string;
  impact: string;
  exposure_value: number;
  owner: string;
  due_date: string | null;
  status: string;
  action_plan: string;
  notes: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  project_id: string;
  contract_id: string | null;
  entity_type: string;
  entity_id: string;
  request_number: string;
  title: string;
  requested_by: string;
  requested_date: string | null;
  approver: string;
  decision_date: string | null;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Returned' | string;
  notes: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  project_id: string | null;
  contract_id: string | null;
  entity_type: string;
  entity_id: string;
  action: 'Insert' | 'Update' | 'Delete' | string;
  actor: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  summary: string;
  created_at: string;
}

export interface RFIEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  schedule_id: string | null;
  rfi_number: string;
  rfi_number_locked?: boolean;
  subject: string;
  raised_by: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  raised_date: string | null;
  due_date: string | null;
  response: string;
  response_date: string | null;
  status: 'Draft' | 'Open' | 'Answered' | 'Closed' | string;
  impact: 'None' | 'Cost' | 'Time' | 'Cost & Time' | string;
  file_reference: string;
  notes: string;
  created_at: string;
}

export interface SubmittalEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  schedule_id: string | null;
  submittal_number: string;
  submittal_number_locked?: boolean;
  title: string;
  document_type: 'Material' | 'Shop Drawing' | 'Method Statement' | 'Sample' | 'Calculation' | 'Other' | string;
  submitted_by: string;
  submitted_date: string | null;
  reviewer: string;
  response_date: string | null;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Approved as Noted' | 'Revise & Resubmit' | 'Rejected' | string;
  revision: string;
  file_reference: string;
  notes: string;
  created_at: string;
}

export interface QualityEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  schedule_id: string | null;
  reference_number: string;
  reference_number_locked?: boolean;
  record_type: 'NCR' | 'Punch Item' | 'Observation' | string;
  title: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  raised_date: string | null;
  owner: string;
  due_date: string | null;
  closed_date: string | null;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  status: 'Open' | 'In Progress' | 'Verified' | 'Closed' | string;
  corrective_action: string;
  file_reference: string;
  notes: string;
  created_at: string;
}

export interface SiteDailyReport {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_item_id: string | null;
  schedule_id: string | null;
  report_number: string;
  report_number_locked?: boolean;
  report_date: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  weather: string;
  work_summary: string;
  manpower_count: number;
  equipment_summary: string;
  issues: string;
  next_day_plan: string;
  photo_reference: string;
  status: 'Draft' | 'Submitted' | 'Reviewed' | string;
  notes: string;
  created_at: string;
}

export interface WIREntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  schedule_id?: string | null;
  /** Explicit governed link to the main-contract Control Account. */
  control_account_id?: string | null;
  company_name: string;
  wir_number: string;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
  work_type: string;
  inspection_date: string | null;
  inspector: string;
  result: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  item_amount: number;
  completion_pct?: number;
  status?: string;
  remarks: string;
  variance_reason?: string;
  file_reference?: string;
  created_at: string;
}

export interface ProgressCorrection {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  original_wir_id: string;
  correction_number: string;
  correction_number_locked?: boolean;
  correction_type: 'Reversal' | 'Reinstatement' | string;
  effective_date: string | null;
  quantity: number;
  reason: string;
  status: 'Draft' | 'Posted' | 'Cancelled' | string;
  created_at: string;
}

export interface PMOSnapshot {
  id: string;
  project_id: string;
  contract_id: string | null;
  snapshot_name: string;
  snapshot_name_locked?: boolean;
  data_date: string | null;
  status: 'Draft' | 'Approved' | 'Archived' | string;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  baseline_id?: string | null;
  baseline_revision?: number | null;
  reporting_period_id?: string | null;
  notes: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: 'PMO Admin' | 'Project Manager' | 'Commercial Manager' | 'Site Engineer' | 'Executive Viewer' | string;
  status: 'Active' | 'Disabled' | string;
  password_hash?: string;
  password_salt?: string;
  last_login_at?: string | null;
  created_at: string;
}

export interface Party {
  id: string;
  party_code: string;
  legal_name: string;
  trading_name: string;
  party_type: 'Client' | 'Supplier' | 'Subcontractor' | 'Consultant' | string;
  tax_number: string;
  registration_number: string;
  payment_terms_days: number;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive' | string;
  notes: string;
  created_at: string;
}

export interface PartyContact {
  id: string;
  party_id: string;
  contact_name: string;
  job_title: string;
  phone: string;
  email: string;
  is_primary: boolean;
  status: string;
  created_at: string;
}

export interface RateHistory {
  id: string;
  party_id: string;
  item_code: string;
  item_description: string;
  unit: string;
  unit_rate: number;
  currency: string;
  effective_date: string | null;
  source_project_id: string | null;
  source_contract_id: string | null;
  source_reference: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  template_name: string;
  report_type: 'Client Invoice' | 'Subcontractor Invoice' | 'WIR' | 'Variation Order' | 'Cost Report' | 'Cash Forecast' | string;
  title: string;
  subtitle: string;
  logo_data_url: string;
  selected_fields: string[];
  footer_text: string;
  accent_color: string;
  page_size?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  show_generated_at?: boolean;
  show_signatures?: boolean;
  created_at: string;
}
export interface BOQItemActivity {
  id: string;
  project_id: string;
  boq_item_id: string;
  activity_id: string;
  allocated_quantity: number;
  allocation_pct: number;
  allocated_cost: number;
  method: 'percentage' | 'quantity' | 'fixed_cost';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BOQActivitySummary {
  boq_item_id: string;
  total_allocated_quantity: number;
  total_allocated_cost: number;
  total_allocation_pct: number;
  remaining_quantity: number;
  remaining_cost: number;
  is_over_allocated: boolean;
  boq_item_quantity: number;
  boq_item_amount: number;
}

export interface MilestoneLadderTemplate {
  id: string;
  project_id: string;
  name: string;
  code: string;
  discipline?: 'CIVIL' | 'MEP' | 'STRUCTURE' | 'ARCH' | 'PROCUREMENT' | 'GENERAL' | string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MilestoneLadderStep {
  id: string;
  template_id: string;
  step_order: number;
  step_name: string;
  weight_pct: number;
  requires_wir: boolean;
  requires_qa_signoff: boolean;
  created_at?: string;
}

export interface ActivityMilestoneProgress {
  id: string;
  activity_id: string;
  step_id: string;
  is_completed: boolean;
  completed_date?: string;
  verified_by?: string;
  wir_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MilestoneProgressResult {
  earnedProgressPct: number;
  totalWeightPct: number;
  completedStepsCount: number;
  totalStepsCount: number;
  isFullyCompleted: boolean;
  currentPendingStep?: MilestoneLadderStep;
}

export type EACMethod = 'budget_rate' | 'cpi_extrapolated' | 'composite_cpi_spi' | 'bottom_up';

export interface EACMethodResult {
  method: EACMethod;
  name: string;
  description: string;
  etc: number;
  eac: number;
  vac: number;
  vacPct: number;
}

export type CostCurveType = 'linear' | 'bell_curve' | 'front_loaded' | 'back_loaded' | 's_curve' | 'custom';

export interface TimePhasedCostBucket {
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  weightPct: number;
  plannedCost: number;
  cumulativePlannedCost: number;
  actualCost?: number;
  cumulativeActualCost?: number;
}

export interface CostPhasingResult {
  totalCost: number;
  curveType: CostCurveType;
  buckets: TimePhasedCostBucket[];
  checksumValid: boolean;
}

export interface MultiMethodEACSummary {
  bac: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  methods: Record<EACMethod, EACMethodResult>;
  tcpiBac: number;
  tcpiEac: number;
  recommendedMethod: EACMethod;
  recommendedEAC: number;
}

export type ViewKey =
  | 'dashboard'
  | 'alerts'
  | 'dataQuality'
  | 'workQueue'
  | 'reportPack'
  | 'help'
  | 'preferences'
  | 'dataEntry'
  | 'insights'
  | 'portfolio'
  | 'projects'
  | 'baselines'
  | 'reportingPeriods'
  | 'snapshots'
  | 'users'
  | 'boq'
  | 'boqItems'
  | 'quantityLedger'
  | 'progressCorrections'
  | 'schedule'
  | 'workCalendars'
  | 'scheduleDistributions'
  | 'wir'
  | 'progress'
  | 'contracts'
  | 'variations'
  | 'variationLines'
  | 'contractSov'
  | 'controlAccounts'
  | 'costChanges'
  | 'paymentCertificates'
  | 'supplierInvoices'
  | 'supplierInvoiceLines'
  | 'supplierInvoicePayments'
  | 'clientinvoices'
  | 'subinvoices'
  | 'clientInvoiceTracking'
  | 'subcontractorInvoiceTracking'
  | 'cashflow'
  | 'parties'
  | 'partyContacts'
  | 'rateHistory'
  | 'reportTemplates'
  | 'costs'
  | 'costCodes'
  | 'wbs'
  | 'costEntries'
  | 'procurement'
  | 'procurementReconciliation'
  | 'procurementReceipts'
  | 'resourceMaster'
  | 'resourceCapacity'
  | 'resourceAssignments'
  | 'laborDuty'
  | 'equipment'
  | 'tasks'
  | 'governance'
  | 'approvals'
  | 'auditLog'
  | 'rfi'
  | 'submittals'
  | 'quality'
  | 'dailyReports'
  | 'safety'
  | 'documents'
  | 'tracking';

export interface DelayEvent {
  id: string;
  project_id: string;
  schedule_id?: string;
  variation_id?: string;
  title: string;
  event_code: string;
  event_type: 'EMPLOYER_DELAY' | 'CONTRACTOR_DELAY' | 'FORCE_MAJEURE' | 'VARIATION_ADDITION';
  responsibility: 'OWNER' | 'CONTRACTOR' | 'SHARED' | 'NEUTRAL';
  impact_date: string;
  delay_days: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export interface FragnetActivity {
  id: string;
  event_id: string;
  activity_code: string;
  name: string;
  duration_days: number;
  predecessor_id: string;
  successor_id: string;
  link_type?: string;
  lag_days?: number;
}

export interface TIACalculationResult {
  isCritical: boolean;
  delayDays: number;
  availableFloatDays: number;
  consumedFloatDays: number;
  projectDelayDays: number;
  excusableEotDays: number;
  nonExcusableDays: number;
  isCompensable: boolean;
  impactedFinishDate: string;
  requiresLiquidatedDamagesReview: boolean;
}

export interface VarianceActionItem {
  id: string;
  warningMessage: string;
  category: string;
  assignedTo: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Closed';
  createdDate: string;
}

export type ActivityScheduleStatus = 'ON_TRACK' | 'DELAYED_CRITICAL' | 'DELAYED_NON_CRITICAL' | 'AHEAD' | 'COMPLETED';

export interface GanttOverlayActivity {
  id: string;
  name: string;
  baselineStart: string;
  baselineFinish: string;
  actualStart?: string;
  actualFinish?: string;
  forecastFinish: string;
  totalFloat: number;
  isCritical: boolean;
  progressPct: number;
  finishSlippageDays: number;
  status: ActivityScheduleStatus;
}

export interface GanttOverlaySummary {
  totalActivities: number;
  completedCount: number;
  onTrackCount: number;
  criticalDelayedCount: number;
  nonCriticalDelayedCount: number;
  aheadCount: number;
  maxSlippageDays: number;
  activities: GanttOverlayActivity[];
}
