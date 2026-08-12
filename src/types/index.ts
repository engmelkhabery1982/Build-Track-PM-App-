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
  planned: number;
  actual: number;
  committed: number;
  status: string;
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
  activity: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  planned_value: number;
  progress: number;
  predecessors: string;
  predecessor_item: string;
  critical_path: boolean;
  is_critical_item: boolean;
  responsible: string;
  status: string;
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
  item_code_locked: boolean;
  last_modified: string;
  notes: string;
  created_at: string;
}

export interface CashFlowEntry {
  id: string;
  project_id: string;
  date: string | null;
  description: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative_balance: number;
  category: string;
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

export interface LaborDuty {
  id: string;
  project_id: string;
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

export interface DocumentEntry {
  id: string;
  project_id: string;
  document_name: string;
  document_type: string;
  category: string;
  version: string;
  upload_date: string | null;
  status: string;
  responsible: string;
  file_reference: string;
  notes: string;
  created_at: string;
}

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

export type ViewKey =
  | 'dashboard' | 'projects' | 'tasks' | 'costs' | 'costEntries'
  | 'procurement' | 'safety' | 'progress' | 'schedule' | 'contracts'
  | 'boq' | 'boqItems' | 'cashflow' | 'subinvoices' | 'clientinvoices'
  | 'clientInvoiceTracking' | 'subcontractorInvoiceTracking'
  | 'variations' | 'documents' | 'wir' | 'laborDuty' | 'equipment' | 'tracking';
