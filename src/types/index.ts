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

export interface CostEntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
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
  cost_code_id?: string | null;
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
  project_code: string;
  boq_code: string;
  boq_item_code: string;
  boq_item_name: string;
  wbs_id?: string | null;
  wbs_code?: string;
  activity_code?: string;
  activity: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  budget: number;
  planned_value: number;
  progress: number;
  earned_work_value?: number;
  actual_cost?: number;
  predecessors: string;
  predecessor_item: string;
  relationship_type?: 'FS' | 'SS' | 'FF' | 'SF' | string;
  lag_days?: number;
  calendar_name?: string;
  critical_path: boolean;
  is_critical_item: boolean;
  responsible: string;
  status: string;
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
  id: string; project_id: string; contract_id: string | null; entity_type: string; entity_id: string;
  request_number: string; title: string; requested_by: string; requested_date: string | null;
  approver: string; decision_date: string | null; status: string; notes: string; created_at: string;
}

export interface AuditLogEntry {
  id: string; project_id: string; contract_id: string | null; entity_type: string; entity_id: string;
  action: string; actor: string; summary: string; before?: Record<string, any> | null; after?: Record<string, any> | null; created_at: string;
}
export interface RFIEntry { id: string; project_id: string; contract_id: string | null; boq_item_id: string | null; rfi_number: string; subject: string; raised_by: string; raised_date: string | null; due_date: string | null; response: string; response_date: string | null; status: string; impact: string; notes: string; created_at: string; }
export interface SubmittalEntry { id: string; project_id: string; contract_id: string | null; boq_item_id: string | null; submittal_number: string; title: string; document_type: string; submitted_by: string; submitted_date: string | null; reviewer: string; response_date: string | null; status: string; revision: string; notes: string; created_at: string; }
export interface QualityEntry { id: string; project_id: string; contract_id: string | null; boq_item_id: string | null; reference_number: string; record_type: string; title: string; location: string; raised_date: string | null; owner: string; due_date: string | null; closed_date: string | null; severity: string; status: string; corrective_action: string; notes: string; created_at: string; }
export interface PMOSnapshot { id: string; project_id: string; contract_id: string | null; snapshot_name: string; data_date: string | null; status: string; planned_value: number; earned_value: number; actual_cost: number; cpi: number | null; spi: number | null; eac: number; notes: string; created_at: string; }
export interface AppUser { id: string; username: string; display_name: string; role: string; status: string; password_hash?: string; password_salt?: string; last_login_at?: string | null; created_at: string; }

export interface WIREntry {
  id: string;
  project_id: string;
  contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  main_contract_id: string | null;
  project_code: string;
  boq_code: string;
  item_code: string;
  item_name: string;
  item_description: string;
  company_name: string;
  wir_number: string;
  area: string;
  work_type: string;
  inspection_date: string | null;
  inspector: string;
  result: string;
  remarks: string;
  status: string;
  unit: string;
  quantity: number;
  unit_price: number;
  item_amount: number;
  completion_pct: number;
  last_modified: string;
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

export type ViewKey =
  | 'dashboard' | 'alerts' | 'dataQuality' | 'insights' | 'workQueue' | 'reportPack' | 'help' | 'preferences' | 'dataEntry' | 'projects' | 'portfolio' | 'baselines' | 'reportingPeriods' | 'snapshots' | 'users' | 'governance' | 'approvals' | 'auditLog' | 'rfi' | 'submittals' | 'quality' | 'scheduleDistributions' | 'tasks' | 'costs' | 'costEntries'
  | 'procurement' | 'safety' | 'progress' | 'schedule' | 'contracts'
  | 'boq' | 'boqItems' | 'cashflow' | 'subinvoices' | 'clientinvoices'
  | 'clientInvoiceTracking' | 'subcontractorInvoiceTracking'
  | 'variations' | 'variationLines' | 'documents' | 'wir' | 'laborDuty' | 'equipment' | 'tracking'
  | 'parties' | 'partyContacts' | 'rateHistory' | 'reportTemplates' | 'costCodes' | 'wbs' | 'contractSov' | 'paymentCertificates';
