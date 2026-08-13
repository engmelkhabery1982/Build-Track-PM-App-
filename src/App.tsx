import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, FolderKanban, SquareCheck as CheckSquare, DollarSign, Package, ShieldAlert, TrendingUp, CalendarClock, Signature as FileSignature, ClipboardList, Banknote, Receipt, FileText, GitBranch, FolderOpen, FileCheck as FileCheck2, Building2, Menu, ListOrdered, HardHat, Wrench, ClipboardCheck, Layers } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { createCodeDraft, dataRepository, prepareCodeControlledInsert } from '@/data';
import { Dashboard } from '@/components/Dashboard';
import { DataTableView, type ColumnDef, type FilterDef, type SelectOption } from '@/components/DataTableView';
import type { ViewKey, Project } from '@/types';
import { addCalendarDays, scheduleBudget, schedulePlannedValueToDate } from '@/utils/schedulePlanning';

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;
const NAV_ITEMS: { key: ViewKey; label: string; icon: IconType; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Home' },
  { key: 'projects', label: 'Project Workspace', icon: FolderKanban, group: 'Projects' },
  { key: 'portfolio', label: 'Project Portfolio', icon: Layers, group: 'Projects' },
  { key: 'schedule', label: 'Schedule & Activities', icon: CalendarClock, group: 'Planning & Progress' },
  { key: 'progress', label: 'WIR & Progress', icon: TrendingUp, group: 'Planning & Progress' },
  { key: 'wir', label: 'Inspection Requests', icon: FileCheck2, group: 'Planning & Progress' },
  { key: 'boq', label: 'BOQ Headers', icon: ClipboardList, group: 'Planning & Progress' },
  { key: 'boqItems', label: 'BOQ Items', icon: ListOrdered, group: 'Planning & Progress' },
  { key: 'contracts', label: 'Contracts', icon: FileSignature, group: 'Commercial' },
  { key: 'variations', label: 'Variations', icon: GitBranch, group: 'Commercial' },
  { key: 'clientinvoices', label: 'Client Invoices', icon: FileText, group: 'Commercial' },
  { key: 'subinvoices', label: 'Subcontractor Invoices', icon: Receipt, group: 'Commercial' },
  { key: 'clientInvoiceTracking', label: 'Client Invoice Tracking', icon: ClipboardCheck, group: 'Commercial' },
  { key: 'subcontractorInvoiceTracking', label: 'Sub Invoice Tracking', icon: ClipboardCheck, group: 'Commercial' },
  { key: 'cashflow', label: 'Cash Flow', icon: Banknote, group: 'Commercial' },
  { key: 'costs', label: 'Cost Control', icon: DollarSign, group: 'Cost Control' },
  { key: 'costEntries', label: 'Cost Entries', icon: ListOrdered, group: 'Cost Control' },
  { key: 'procurement', label: 'Procurement', icon: Package, group: 'Operations' },
  { key: 'laborDuty', label: 'Labor Duty', icon: HardHat, group: 'Operations' },
  { key: 'equipment', label: 'Equipment', icon: Wrench, group: 'Operations' },
  { key: 'safety', label: 'Safety', icon: ShieldAlert, group: 'Operations' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, group: 'Operations' },
  { key: 'tracking', label: 'Tracking Sheet', icon: ClipboardCheck, group: 'Operations' },
  { key: 'tasks', label: 'Tasks & Actions', icon: CheckSquare, group: 'Operations' },
];

const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Delayed'];
const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Delayed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const COST_STATUSES = ['Planned', 'Committed', 'Actual', 'Over Budget'];
const COST_TYPES = ['Labor', 'Equipment', 'Materials', 'Subcontractor Cost', 'Multiple Cost Types', 'Miscellaneous', 'Other'];
const PROC_STATUSES = ['Requested', 'Ordered', 'Partially Delivered', 'Delivered'];
const SAFETY_STATUSES = ['Open', 'Investigating', 'Closed'];
const SAFETY_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const SAFETY_TYPES = ['Incident', 'Near Miss', 'Hazard', 'Inspection', 'Violation'];
const SCHEDULE_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Delayed'];
const CONTRACT_STATUSES = ['Draft', 'Active', 'Completed', 'Terminated'];
const CONTRACT_TYPES = ['Lump Sum', 'Unit Price', 'Cost Plus', 'Time & Materials', 'Design-Build', 'GMP', 'Cost Reimbursable'];
const INVOICE_STATUSES = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'];
const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid'];
const VARIATION_STATUSES = ['Draft', 'Submitted', 'Pending', 'Approved', 'Rejected'];
const VARIATION_TYPES = ['Scope Change', 'Design Change', 'Site Condition', 'Client Request', 'Cost Adjustment'];
const DOC_STATUSES = ['Draft', 'Under Review', 'Approved', 'Current', 'Superseded'];
const DOC_TYPES = ['Drawing', 'Specification', 'Report', 'Permit', 'Contract', 'Invoice', 'Plan', 'Other'];
const WIR_STATUSES = ['Pending', 'Approved', 'Rejected'];
const WIR_RESULTS = ['Pass', 'Fail', 'Conditional Pass'];
const BOQ_CLASSIFICATIONS = ['Main', 'Subcontractor'];

const PROJECT_COLUMNS: ColumnDef[] = [
  { key: 'project_code', label: 'Project Code', type: 'text', editable: true },
  { key: 'name', label: 'Project Name', type: 'text', editable: true },
  { key: 'client', label: 'Client', type: 'text', editable: true },
  { key: 'location', label: 'Location', type: 'text', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true, options: ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Renovation'] },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: PROJECT_STATUSES },
  { key: 'budget', label: 'Budget', type: 'money', editable: true },
  { key: 'spent', label: 'Spent', type: 'money' },
  { key: 'total_value', label: 'Total Value', type: 'money' },
  { key: 'progress', label: 'Progress', type: 'progress', editable: true },
  { key: 'project_manager', label: 'Manager', type: 'text', editable: true },
  { key: 'contractor', label: 'Contractor', type: 'text', editable: true },
  { key: 'start_date', label: 'Start Date', type: 'date', editable: true },
  { key: 'end_date', label: 'End Date', type: 'date', editable: true },
];

const TASK_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'name', label: 'Task Name', type: 'text', editable: true },
  { key: 'assignee', label: 'Assignee', type: 'text', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: TASK_STATUSES },
  { key: 'priority', label: 'Priority', type: 'status', editable: true, options: PRIORITIES },
  { key: 'cost', label: 'Cost', type: 'money', editable: true },
  { key: 'progress', label: 'Progress', type: 'progress', editable: true },
  { key: 'start_date', label: 'Start', type: 'date', editable: true },
  { key: 'end_date', label: 'End', type: 'date', editable: true },
  { key: 'revised_end_date', label: 'Revised End', type: 'date', editable: false },
];

const COST_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'company_name', label: 'Contractor', type: 'text', editable: true },
  { key: 'boq_item_name', label: 'BOQ Item Name', type: 'text' },
  { key: 'category', label: 'Category', type: 'text', editable: true, options: ['Labor', 'Materials', 'Equipment', 'Subcontractor', 'Overhead', 'Other'] },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'budget', label: 'Budget', type: 'money', editable: false },
  { key: 'planned', label: 'Planned Value', type: 'money', editable: false },
  { key: 'actual', label: 'Actual', type: 'money', editable: false },
  { key: 'committed', label: 'Committed Work Value', type: 'money', editable: false },
  { key: 'status', label: 'EVM Status', type: 'evm', editable: false },
];

const COST_ENTRY_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'company_name', label: 'Contractor', type: 'text', editable: true },
  { key: 'boq_item_name', label: 'BOQ Item Name', type: 'text' },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'cost_type', label: 'Cost Type', type: 'text', editable: true, options: COST_TYPES },
  { key: 'invoice_number', label: 'Invoice #', type: 'text', editable: true },
  { key: 'payment_order_number', label: 'Payment Order #', type: 'text', editable: true },
  { key: 'amount', label: 'Amount', type: 'money', editable: true },
];

const PROCUREMENT_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'item', label: 'Item', type: 'text', editable: true },
  { key: 'supplier', label: 'Supplier', type: 'text', editable: true },
  { key: 'quantity', label: 'Qty', type: 'number', editable: true },
  { key: 'unit', label: 'Unit', type: 'text', editable: true },
  { key: 'unit_cost', label: 'Unit Cost', type: 'money', editable: true },
  { key: 'total_cost', label: 'Total', type: 'money' },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: PROC_STATUSES },
  { key: 'payment_status', label: 'Payment Status', type: 'status', editable: true, options: PAYMENT_STATUSES },
  { key: 'order_date', label: 'Order Date', type: 'date', editable: true },
  { key: 'delivery_date', label: 'Delivery Date', type: 'date', editable: true },
];

const SAFETY_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'type', label: 'Type', type: 'status', editable: true, options: SAFETY_TYPES },
  { key: 'severity', label: 'Severity', type: 'status', editable: true, options: SAFETY_SEVERITIES },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'location', label: 'Location', type: 'text', editable: true },
  { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: SAFETY_STATUSES },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'action_taken', label: 'Action Taken', type: 'text', editable: true },
];

const PROGRESS_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'company_name', label: 'Contractor', type: 'text', editable: false },
  { key: 'date', label: 'As Of', type: 'date', editable: false },
  { key: 'prev_value', label: 'Previous Value', type: 'money' },
  { key: 'prev_pct', label: 'Previous %', type: 'progress' },
  { key: 'current_value', label: 'Current Value', type: 'money' },
  { key: 'current_pct', label: 'Current %', type: 'progress' },
  { key: 'total_value', label: 'Total Value', type: 'money' },
  { key: 'total_pct', label: 'Total %', type: 'progress' },
  { key: 'percent_complete', label: '% Complete', type: 'progress' },
];

const SCHEDULE_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'boq_item_name', label: 'BOQ Item Name', type: 'text' },
  { key: 'wbs_code', label: 'WBS Code', type: 'text', editable: true },
  { key: 'activity_code', label: 'Activity Code', type: 'text', editable: true },
  { key: 'activity', label: 'Activity', type: 'text', editable: true },
  { key: 'start_date', label: 'Start', type: 'date', editable: true },
  { key: 'end_date', label: 'End', type: 'date', editable: true },
  { key: 'duration_days', label: 'Duration (days)', type: 'number' },
  { key: 'remaining_duration_days', label: 'Remaining Duration', type: 'number', editable: false },
  { key: 'unit_rate', label: 'Main Unit Rate', type: 'money', editable: false },
  { key: 'budget', label: 'Planned Budget', type: 'money', editable: false },
  { key: 'planned_quantity', label: 'Planned Qty', type: 'number', editable: true },
  { key: 'planned_value', label: 'Planned Value to Date', type: 'money', editable: false },
  { key: 'earned_work_value', label: 'Earned Work Value', type: 'money', editable: false },
  { key: 'actual_cost', label: 'Actual Cost', type: 'money', editable: false },
  { key: 'predecessor_item', label: 'Predecessor Activity', type: 'select', editable: true },
  { key: 'relationship_type', label: 'Relationship', type: 'select', editable: true, options: ['FS', 'SS', 'FF', 'SF'] },
  { key: 'lag_days', label: 'Lag (days)', type: 'number', editable: true },
  { key: 'calendar_name', label: 'Calendar', type: 'text', editable: true },
  { key: 'critical_path', label: 'Critical Path', type: 'boolean', editable: true },
  { key: 'is_critical_item', label: 'Critical Item', type: 'boolean', editable: true },
  { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
  { key: 'status', label: 'EVM Status', type: 'evm', editable: false },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const CONTRACT_COLUMNS: ColumnDef[] = [
  { key: 'contract_role', label: 'Contract Role', type: 'status', editable: true, options: ['Main Contract', 'Subcontract'] },
  { key: 'project_code', label: 'Project Code', type: 'text', editable: true },
  { key: 'contract_number', label: 'Contract Code', type: 'text', editable: true },
  { key: 'parent_main_contract_id', label: 'Parent Main Contract', type: 'select', editable: true },
  { key: 'title', label: 'Title', type: 'text', editable: true },
  { key: 'project_name', label: 'Project Name', type: 'text', editable: true },
  { key: 'client', label: 'Client', type: 'text', editable: true },
  { key: 'contractor', label: 'Contractor', type: 'text', editable: true },
  { key: 'contract_type', label: 'Type', type: 'status', editable: true, options: CONTRACT_TYPES },
  { key: 'contract_value', label: 'Original Contract Value', type: 'money', editable: true },
  { key: 'modified_contract_value', label: 'Modified Contract Value', type: 'money', editable: false },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: CONTRACT_STATUSES },
  { key: 'document_reference', label: 'Document Ref', type: 'text', editable: true },
  { key: 'start_date', label: 'Start', type: 'date', editable: true },
  { key: 'end_date', label: 'End', type: 'date', editable: true },
  { key: 'revised_end_date', label: 'Revised End', type: 'date', editable: false },
  { key: 'signed_date', label: 'Signed Date', type: 'date', editable: true },
];

const BOQ_HEADER_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'classification', label: 'Classification', type: 'text', editable: true, options: BOQ_CLASSIFICATIONS },
  { key: 'company_name', label: 'Contractor', type: 'text', editable: true },
  { key: 'contract_type', label: 'Contract Type', type: 'text', editable: true, options: CONTRACT_TYPES },
  { key: 'total_value', label: 'Total Value', type: 'money' },
];

const BOQ_ITEM_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'boq_header_id', label: 'BOQ', type: 'select', editable: true },
  { key: 'main_boq_item_id', label: 'Parent Main BOQ Item', type: 'select', editable: true },
  { key: 'item_code', label: 'BOQ Item Code', type: 'text', editable: true },
  { key: 'item_name', label: 'Item Name', type: 'text', editable: true },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true, options: ['Earthworks', 'Concrete', 'Steel', 'Masonry', 'Finishes', 'MEP', 'Other'] },
  { key: 'unit', label: 'Unit', type: 'text', editable: true },
  { key: 'quantity', label: 'Qty', type: 'number', editable: true },
  { key: 'unit_rate', label: 'Unit Rate', type: 'money', editable: true },
  { key: 'amount', label: 'Amount', type: 'money' },
];

const CASHFLOW_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true },
  { key: 'inflow', label: 'Inflow', type: 'money', editable: true },
  { key: 'outflow', label: 'Outflow', type: 'money', editable: true },
  { key: 'net', label: 'Net', type: 'money' },
  { key: 'cumulative_balance', label: 'Cumulative', type: 'money', editable: true },
];

const SUBINV_COLUMNS: ColumnDef[] = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text', editable: false },
  { key: 'project_code', label: 'Project Code', type: 'text', editable: false },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: false },
  { key: 'item_desc', label: 'Item Description', type: 'text', editable: false },
  { key: 'unit', label: 'Unit', type: 'text', editable: false },
  { key: 'quantity', label: 'Quantity', type: 'number', editable: false },
  { key: 'unit_rate', label: 'Unit Rate', type: 'money', editable: false },
  { key: 'amount', label: 'Amount', type: 'money', editable: false },
];

const CLIENTINV_COLUMNS: ColumnDef[] = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text', editable: false },
  { key: 'project_code', label: 'Project Code', type: 'text', editable: false },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: false },
  { key: 'item_desc', label: 'Item Description', type: 'text', editable: false },
  { key: 'unit', label: 'Unit', type: 'text', editable: false },
  { key: 'quantity', label: 'Quantity', type: 'number', editable: false },
  { key: 'unit_rate', label: 'Unit Rate', type: 'money', editable: false },
  { key: 'amount', label: 'Amount', type: 'money', editable: false },
];

const INVOICE_GENERATION_FORM_COLUMNS: ColumnDef[] = [
  { key: 'project_code', label: 'Project Code', type: 'text', editable: false },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'company_name', label: 'Contractor', type: 'text', editable: false },
  { key: 'from_date', label: 'From Date', type: 'date', editable: true },
  { key: 'to_date', label: 'To Date', type: 'date', editable: true },
  { key: 'result', label: 'WIR Result', type: 'status', editable: true, options: WIR_RESULTS },
  { key: 'invoice_number', label: 'Invoice #', type: 'text', editable: true },
];

const INVOICE_TRACKING_COLUMNS: ColumnDef[] = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text', editable: false },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'total_work_value', label: 'Total Work Value', type: 'money', editable: false },
  { key: 'invoice_date', label: 'Invoice Date', type: 'date', editable: false },
  { key: 'due_date', label: 'Due Date', type: 'date', editable: true },
  { key: 'status', label: 'Invoice Status', type: 'status', editable: true, options: INVOICE_STATUSES },
  { key: 'payment_status', label: 'Payment Status', type: 'status', editable: true, options: PAYMENT_STATUSES },
  { key: 'payment_date', label: 'Payment Date', type: 'date', editable: true },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const VARIATION_COLUMNS: ColumnDef[] = [
  { key: 'variation_number', label: 'Variation #', type: 'text', editable: true },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'type', label: 'Type', type: 'status', editable: true, options: VARIATION_TYPES },
  { key: 'title', label: 'Title', type: 'text', editable: true },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'cost_impact', label: 'Cost Impact', type: 'money', editable: true },
  { key: 'time_impact_days', label: 'Time Impact (days)', type: 'number', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: VARIATION_STATUSES },
  { key: 'approved_by', label: 'Approved By', type: 'text', editable: true },
  { key: 'approved_date', label: 'Approved Date', type: 'date', editable: true },
];

const DOC_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'document_name', label: 'Name', type: 'text', editable: true },
  { key: 'document_type', label: 'Type', type: 'status', editable: true, options: DOC_TYPES },
  { key: 'category', label: 'Category', type: 'text', editable: true },
  { key: 'version', label: 'Version', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: DOC_STATUSES },
  { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
  { key: 'upload_date', label: 'Upload Date', type: 'date', editable: true },
  { key: 'file_reference', label: 'File Ref', type: 'text', editable: true },
];

const WIR_COLUMNS: ColumnDef[] = [
  { key: 'company_name', label: 'Contractor', type: 'select', editable: true },
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: false },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'item_name', label: 'Item Name', type: 'text' },
  { key: 'item_description', label: 'Description', type: 'text' },
  { key: 'wir_number', label: 'WIR #', type: 'text', editable: true },
  { key: 'area', label: 'Area', type: 'text', editable: true },
  { key: 'work_type', label: 'Work Type', type: 'text', editable: true },
  { key: 'inspection_date', label: 'Inspection Date', type: 'date', editable: true },
  { key: 'inspector', label: 'Inspector', type: 'text', editable: true },
  { key: 'result', label: 'Result', type: 'status', editable: true, options: WIR_RESULTS },
  { key: 'unit', label: 'Unit', type: 'text' },
  { key: 'quantity', label: 'Qty', type: 'number', editable: true },
  { key: 'unit_price', label: 'Unit Price', type: 'money' },
  { key: 'item_amount', label: 'Item Amount', type: 'money' },
  { key: 'completion_pct', label: 'Completion %', type: 'progress' },
  { key: 'remarks', label: 'Remarks', type: 'text', editable: true },
];

const LABOR_DUTY_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'worker_name', label: 'Worker Name', type: 'text', editable: true },
  { key: 'role', label: 'Role', type: 'text', editable: true, options: ['Mason', 'Carpenter', 'Steel Fixer', 'Electrician', 'Plumber', 'Painter', 'Laborer', 'Welder', 'Operator', 'Foreman', 'Supervisor'] },
  { key: 'no_of_workers', label: 'No. of Workers', type: 'number', editable: true },
  { key: 'hours_per_day', label: 'Hours/Day', type: 'number', editable: true },
  { key: 'days', label: 'Days', type: 'number', editable: true },
  { key: 'total_hours', label: 'Total Hours', type: 'number' },
  { key: 'rate_per_hour', label: 'Rate/Hour', type: 'money', editable: true },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'payment_status', label: 'Payment Status', type: 'status', editable: true, options: PAYMENT_STATUSES },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const EQUIPMENT_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item Code', type: 'select', editable: true },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'equipment_name', label: 'Equipment Name', type: 'text', editable: true },
  { key: 'equipment_type', label: 'Type', type: 'text', editable: true, options: ['Excavator', 'Crane', 'Bulldozer', 'Concrete Mixer', 'Dump Truck', 'Forklift', 'Generator', 'Welding Machine', 'Air Compressor', 'Scaffolding', 'Other'] },
  { key: 'unit', label: 'Unit', type: 'text', editable: true, options: ['Day', 'Hour', 'Week', 'Month', 'Lump Sum'] },
  { key: 'quantity', label: 'Quantity', type: 'number', editable: true },
  { key: 'unit_rate', label: 'Unit Rate', type: 'money', editable: true },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'payment_status', label: 'Payment Status', type: 'status', editable: true, options: PAYMENT_STATUSES },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const TRACKING_COLUMNS: ColumnDef[] = [
  { key: 'project_id', label: 'Project', type: 'text' },
  { key: 'company_name', label: 'Contractor', type: 'text' },
  { key: 'source_type', label: 'Source', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'created_by', label: 'Created By', type: 'text' },
  { key: 'created_time', label: 'Created Time', type: 'date' },
];

const VIEW_CONFIGS: Record<string, { columns: ColumnDef[]; filters?: FilterDef[]; showProjectFilter?: boolean; dateRangeColumn?: string }> = {
  projects: { columns: PROJECT_COLUMNS, filters: [{ key: 'status', label: 'Status', options: PROJECT_STATUSES }, { key: 'category', label: 'Category', options: ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Renovation'] }], dateRangeColumn: 'start_date' },
  tasks: { columns: TASK_COLUMNS, filters: [{ key: 'status', label: 'Status', options: TASK_STATUSES }, { key: 'priority', label: 'Priority', options: PRIORITIES }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  costs: { columns: COST_COLUMNS, filters: [{ key: 'category', label: 'Cost Type', options: COST_TYPES }], showProjectFilter: true },
  costEntries: { columns: COST_ENTRY_COLUMNS, filters: [{ key: 'cost_type', label: 'Cost Type', options: COST_TYPES }], showProjectFilter: true, dateRangeColumn: 'date' },
  procurement: { columns: PROCUREMENT_COLUMNS, filters: [{ key: 'status', label: 'Status', options: PROC_STATUSES }], showProjectFilter: true, dateRangeColumn: 'order_date' },
  safety: { columns: SAFETY_COLUMNS, filters: [{ key: 'status', label: 'Status', options: SAFETY_STATUSES }, { key: 'severity', label: 'Severity', options: SAFETY_SEVERITIES }, { key: 'type', label: 'Type', options: SAFETY_TYPES }], showProjectFilter: true, dateRangeColumn: 'date' },
  progress: { columns: PROGRESS_COLUMNS, filters: [{ key: 'company_name', label: 'Contractor', options: [] }], showProjectFilter: true, dateRangeColumn: 'date' },
  schedule: { columns: SCHEDULE_COLUMNS, filters: [{ key: 'boq_item_name', label: 'BOQ Item', options: [] }, { key: 'is_critical_item', label: 'Critical', options: ['true', 'false'] }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  contracts: { columns: CONTRACT_COLUMNS, filters: [{ key: 'contractor', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'status', label: 'Status', options: CONTRACT_STATUSES }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  boq: { columns: BOQ_HEADER_COLUMNS, filters: [{ key: 'company_name', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'classification', label: 'Classification', options: BOQ_CLASSIFICATIONS }], showProjectFilter: true },
  boqItems: { columns: BOQ_ITEM_COLUMNS, filters: [{ key: 'company_name', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'category', label: 'Category', options: ['Earthworks', 'Concrete', 'Steel', 'Masonry', 'Finishes', 'MEP', 'Other'] }], showProjectFilter: true },
  cashflow: { columns: CASHFLOW_COLUMNS, showProjectFilter: true, dateRangeColumn: 'date' },
  subinvoices: { columns: SUBINV_COLUMNS, showProjectFilter: true },
  clientinvoices: { columns: CLIENTINV_COLUMNS, showProjectFilter: true },
  clientInvoiceTracking: { columns: INVOICE_TRACKING_COLUMNS, filters: [{ key: 'status', label: 'Invoice Status', options: INVOICE_STATUSES }, { key: 'payment_status', label: 'Payment Status', options: PAYMENT_STATUSES }], showProjectFilter: true, dateRangeColumn: 'invoice_date' },
  subcontractorInvoiceTracking: { columns: INVOICE_TRACKING_COLUMNS, filters: [{ key: 'status', label: 'Invoice Status', options: INVOICE_STATUSES }, { key: 'payment_status', label: 'Payment Status', options: PAYMENT_STATUSES }], showProjectFilter: true, dateRangeColumn: 'invoice_date' },
  variations: { columns: VARIATION_COLUMNS, filters: [{ key: 'contractor', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'status', label: 'Status', options: VARIATION_STATUSES }], showProjectFilter: true, dateRangeColumn: 'approved_date' },
  documents: { columns: DOC_COLUMNS, filters: [{ key: 'status', label: 'Status', options: DOC_STATUSES }, { key: 'document_type', label: 'Type', options: DOC_TYPES }], showProjectFilter: true, dateRangeColumn: 'upload_date' },
  wir: { columns: WIR_COLUMNS, filters: [{ key: 'company_name', label: 'Contractor', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'result', label: 'Result', options: WIR_RESULTS }], showProjectFilter: true, dateRangeColumn: 'inspection_date' },
  laborDuty: { columns: LABOR_DUTY_COLUMNS, filters: [{ key: 'role', label: 'Role', options: ['Mason', 'Carpenter', 'Steel Fixer', 'Electrician', 'Plumber', 'Painter', 'Laborer', 'Welder', 'Operator', 'Foreman', 'Supervisor'] }], showProjectFilter: true, dateRangeColumn: 'date' },
  equipment: { columns: EQUIPMENT_COLUMNS, filters: [{ key: 'equipment_type', label: 'Type', options: ['Excavator', 'Crane', 'Bulldozer', 'Concrete Mixer', 'Dump Truck', 'Forklift', 'Generator', 'Welding Machine', 'Air Compressor', 'Scaffolding', 'Other'] }], showProjectFilter: true, dateRangeColumn: 'date' },
  tracking: { columns: TRACKING_COLUMNS, filters: [{ key: 'status', label: 'Status', options: [] }, { key: 'source_type', label: 'Source', options: [] }], showProjectFilter: true, dateRangeColumn: 'created_time' },
};

const TABLE_NAMES: Record<string, string> = {
  projects: 'projects', tasks: 'tasks', costs: 'costs', costEntries: 'cost_entries',
  procurement: 'procurement', safety: 'safety', progress: 'progress_entries',
  schedule: 'schedules', contracts: 'contracts', boq: 'boq_headers', boqItems: 'boq_items',
  cashflow: 'cash_flow', subinvoices: 'subcontractor_invoices', clientinvoices: 'client_invoices',
  clientInvoiceTracking: 'client_invoice_tracking', subcontractorInvoiceTracking: 'subcontractor_invoice_tracking',
  variations: 'variations', documents: 'documents', wir: 'wir_entries',
  laborDuty: 'labor_duty', equipment: 'equipment', tracking: 'tracking_sheet',
};

const VIEW_TITLES: Record<string, string> = {
  projects: 'Projects', tasks: 'Tasks', costs: 'Cost Control', costEntries: 'Cost Entries',
  procurement: 'Procurement', safety: 'Safety Records', progress: 'Progress Entries',
  schedule: 'Schedule', contracts: 'Contracts', boq: 'BOQ Headers', boqItems: 'BOQ Items',
  cashflow: 'Cash Flow', subinvoices: 'Subcontractor Invoices', clientinvoices: 'Client Invoices',
  clientInvoiceTracking: 'Client Invoice Tracking', subcontractorInvoiceTracking: 'Subcontractor Invoice Tracking',
  variations: 'Variations', documents: 'Documents', wir: 'Work Inspection Reports',
  laborDuty: 'Labor Duty', equipment: 'Equipment', tracking: 'Tracking Sheet',
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceProjectId, setWorkspaceProjectId] = useState('');
  const data = useData();
  const synchronizingLiveSubcontractCosts = useRef(false);
  const synchronizingCostControl = useRef(false);
  const synchronizingProjectFinancials = useRef(false);
  const normalizingScheduleActivities = useRef(false);

  // Repair/synchronize existing records as soon as the local database has
  // loaded. Earlier records may have been saved before the date relationship
  // between the main contract and its generated project was enforced.
  useEffect(() => {
    const synchronizeExistingProjectDates = async () => {
      const mainContracts = data.contracts.filter((contract: any) =>
        !contract.parent_main_contract_id && contract.project_id,
      ) as Record<string, any>[];
      for (const contract of mainContracts) {
        const project = data.projects.find((item: any) => item.id === contract.project_id) as Record<string, any> | undefined;
        if (!project) continue;
        const patch: Record<string, any> = {};
        if ((project.start_date || null) !== (contract.start_date || null)) patch.start_date = contract.start_date || null;
        if ((project.end_date || null) !== (contract.end_date || null)) patch.end_date = contract.end_date || null;
        if (Object.keys(patch).length === 0) continue;
        const updatedProject = await dataRepository.update<Record<string, any>>('projects', project.id, patch);
        data.applyLocalMutation('projects', { type: 'update', row: updatedProject });
      }
    };
    if (data.contracts.length > 0 && data.projects.length > 0) {
      void synchronizeExistingProjectDates().catch((error) =>
        console.error('Could not synchronize existing project dates.', error),
      );
    }
  }, [data.contracts, data.projects, data.applyLocalMutation]);

  // Older planning rows stored Budget and Planned Value independently. An
  // activity now has one financial truth: planned quantity × main BOQ rate.
  // Where an old row has no quantity, preserve its historical Planned Value
  // by deriving the missing quantity from the main BOQ rate.
  useEffect(() => {
    if (normalizingScheduleActivities.current || data.schedules.length === 0 || data.boqItems.length === 0) return;
    const normalizeScheduleActivities = async () => {
      normalizingScheduleActivities.current = true;
      try {
        for (const activity of data.schedules as Record<string, any>[]) {
          const item = data.boqItems.find((candidate: any) => candidate.id === activity.boq_item_id) as Record<string, any> | undefined;
          if (!item) continue;
          const rate = Number(item.unit_rate) || 0;
          if (rate <= 0) continue;
          const storedQuantity = Number(activity.planned_quantity) || 0;
          const storedValue = Number(activity.planned_value) || 0;
          const plannedQuantity = storedQuantity > 0 ? storedQuantity : (storedValue > 0 ? storedValue / rate : 0);
          const plannedValue = Math.round(plannedQuantity * rate * 100) / 100;
          const patch: Record<string, any> = {};
          if (Number(activity.planned_quantity) !== plannedQuantity) patch.planned_quantity = plannedQuantity;
          if (Number(activity.unit_rate) !== rate) patch.unit_rate = rate;
          if (Number(activity.planned_value) !== plannedValue) patch.planned_value = plannedValue;
          if (Number(activity.budget) !== plannedValue) patch.budget = plannedValue;
          if (Object.keys(patch).length === 0) continue;
          const updated = await dataRepository.update<Record<string, any>>('schedules', activity.id, patch);
          data.applyLocalMutation('schedules', { type: 'update', row: updated });
        }
      } finally {
        normalizingScheduleActivities.current = false;
      }
    };
    void normalizeScheduleActivities().catch((error) => console.error('Could not normalize schedule activities.', error));
  }, [data.schedules, data.boqItems, data.applyLocalMutation]);

  const groups = ['Home', 'Projects', 'Planning & Progress', 'Commercial', 'Cost Control', 'Operations'];

  async function syncSubcontractWirCost(mutation: { type: string; row?: Record<string, any>; id?: string }) {
    const sourceId = mutation.row?.id || mutation.id;
    if (!sourceId) return;
    const existing = data.costEntries.find((entry: any) => entry.source_type === 'subcontractor_wir' && entry.source_id === sourceId);
    if (mutation.type === 'delete') {
      if (existing) {
        await dataRepository.delete('cost_entries', existing.id);
        data.applyLocalMutation('cost_entries', { type: 'delete', id: existing.id });
      }
      return;
    }

    const wir = mutation.row;
    if (!wir) return;
    const subcontract = data.contracts.find((contract: any) => contract.id === wir.contract_id) as any;
    // Main-contract WIRs are not a cost. Only subcontractor work is loaded as
    // a live cost against its parent main contract.
    if (!subcontract?.parent_main_contract_id) {
      if (existing) {
        await dataRepository.delete('cost_entries', existing.id);
        data.applyLocalMutation('cost_entries', { type: 'delete', id: existing.id });
      }
      return;
    }
    const subcontractItem = data.boqItems.find((item: any) => item.id === wir.boq_item_id) as any;
    const mainItem = subcontractItem?.main_boq_item_id
      ? data.boqItems.find((item: any) => item.id === subcontractItem.main_boq_item_id) as any
      : null;
    if (!mainItem) {
      if (existing) {
        await dataRepository.delete('cost_entries', existing.id);
        data.applyLocalMutation('cost_entries', { type: 'delete', id: existing.id });
      }
      console.warn(`Subcontract WIR ${sourceId} has no linked main BOQ item; live cost was not created.`);
      return;
    }
    const mainContractId = subcontract.parent_main_contract_id;
    const project = data.projects.find((item) => item.id === subcontract.project_id);
    const mainHeader = data.boqHeaders.find((header: any) => header.id === mainItem.boq_header_id) as any;
    const entry = {
      project_id: subcontract.project_id,
      project_code: project?.project_code || '',
      contract_id: mainContractId,
      main_contract_id: mainContractId,
      boq_header_id: mainItem.boq_header_id || null,
      boq_item_id: mainItem.id,
      boq_code: mainHeader?.boq_code || mainItem.boq_code || '',
      company_name: subcontract.contractor || '',
      boq_item_code: mainItem.item_code || '',
      boq_item_name: mainItem.item_name || mainItem.description || '',
      date: wir.inspection_date || null,
      cost_type: 'Subcontractor Cost',
      invoice_number: wir.wir_number || '',
      payment_order_number: '',
      // Subcontractor cost uses its agreed subcontract rate, while its BOQ
      // code remains the linked main BOQ item code for project reporting.
      amount: Math.round((Number(wir.quantity) || 0) * (Number(subcontractItem.unit_rate) || 0) * 100) / 100,
      source_type: 'subcontractor_wir',
      source_id: sourceId,
    };
    if (existing) {
      const unchanged = Object.entries(entry).every(([key, value]) => {
        const previous = (existing as Record<string, any>)[key];
        return (previous ?? null) === (value ?? null);
      });
      if (unchanged) return;
      const updated = await dataRepository.update<Record<string, any>>('cost_entries', existing.id, entry);
      data.applyLocalMutation('cost_entries', { type: 'update', row: updated });
    } else {
      const inserted = await dataRepository.insert<Record<string, any>>('cost_entries', entry);
      data.applyLocalMutation('cost_entries', { type: 'insert', row: inserted });
    }
  }

  async function syncOperationalCost(sourceTable: 'procurement' | 'labor_duty' | 'equipment', mutation: { type: string; row?: Record<string, any>; id?: string }) {
    const sourceId = mutation.row?.id || mutation.id;
    if (!sourceId) return;
    const sourceType = sourceTable === 'procurement' ? 'procurement' : sourceTable === 'labor_duty' ? 'labor' : 'equipment';
    const existingCost = data.costEntries.find((entry: any) => entry.source_type === sourceType && entry.source_id === sourceId) as any;
    const existingCash = data.cashFlow.find((entry: any) => entry.source_type === sourceType && entry.source_id === sourceId) as any;
    if (mutation.type === 'delete') {
      if (existingCost) { await dataRepository.delete('cost_entries', existingCost.id); data.applyLocalMutation('cost_entries', { type: 'delete', id: existingCost.id }); }
      if (existingCash) { await dataRepository.delete('cash_flow', existingCash.id); data.applyLocalMutation('cash_flow', { type: 'delete', id: existingCash.id }); }
      return;
    }
    const source = mutation.row;
    if (!source) return;
    const contract = data.contracts.find((row: any) => row.id === source.contract_id) as any;
    const item = data.boqItems.find((row: any) => row.id === source.boq_item_id) as any;
    const header = data.boqHeaders.find((row: any) => row.id === item?.boq_header_id) as any;
    if (!contract || contract.parent_main_contract_id || !item || header?.contract_id !== contract.id) {
      // A source without the full main-contract / BOQ relationship remains a
      // draft operational record and is deliberately not posted as a cost.
      if (existingCost) { await dataRepository.delete('cost_entries', existingCost.id); data.applyLocalMutation('cost_entries', { type: 'delete', id: existingCost.id }); }
      return;
    }
    const amount = sourceTable === 'procurement'
      ? (Number(source.total_cost) || (Number(source.quantity) || 0) * (Number(source.unit_cost) || 0))
      : Number(source.amount) || 0;
    const costType = sourceTable === 'procurement' ? 'Materials' : sourceTable === 'labor_duty' ? 'Labor' : 'Equipment';
    const costRow = {
      project_id: contract.project_id, project_code: data.projects.find((project: any) => project.id === contract.project_id)?.project_code || '',
      contract_id: contract.id, main_contract_id: contract.id, boq_header_id: item.boq_header_id || null, boq_item_id: item.id,
      boq_code: header?.boq_code || item.boq_code || '', company_name: contract.contractor || '',
      boq_item_code: item.item_code || '', boq_item_name: item.item_name || item.description || '',
      date: sourceTable === 'procurement' ? (source.delivery_date || source.order_date || null) : (source.date || null),
      cost_type: costType, invoice_number: source.purchase_order_number || source.reference_number || '', payment_order_number: '',
      amount: Math.round(amount * 100) / 100, source_type: sourceType, source_id: sourceId,
    };
    if (existingCost) {
      const updated = await dataRepository.update<Record<string, any>>('cost_entries', existingCost.id, costRow);
      data.applyLocalMutation('cost_entries', { type: 'update', row: updated });
    } else {
      const inserted = await dataRepository.insert<Record<string, any>>('cost_entries', costRow);
      data.applyLocalMutation('cost_entries', { type: 'insert', row: inserted });
    }
    const isPaid = String(source.payment_status || '') === 'Paid';
    if (isPaid) {
      const cashRow = { project_id: contract.project_id, contract_id: contract.id, date: costRow.date, description: `${costType}: ${source.item || source.worker_name || source.equipment_name || item.item_name || ''}`, category: costType, inflow: 0, outflow: costRow.amount, net: -costRow.amount, cumulative_balance: 0, source_type: sourceType, source_id: sourceId };
      if (existingCash) {
        const updated = await dataRepository.update<Record<string, any>>('cash_flow', existingCash.id, cashRow);
        data.applyLocalMutation('cash_flow', { type: 'update', row: updated });
      } else {
        const inserted = await dataRepository.insert<Record<string, any>>('cash_flow', cashRow);
        data.applyLocalMutation('cash_flow', { type: 'insert', row: inserted });
      }
    } else if (existingCash) {
      await dataRepository.delete('cash_flow', existingCash.id);
      data.applyLocalMutation('cash_flow', { type: 'delete', id: existingCash.id });
    }
  }

  useEffect(() => {
    if (synchronizingLiveSubcontractCosts.current || data.wirEntries.length === 0) return;
    const synchronizeLiveSubcontractCosts = async () => {
      synchronizingLiveSubcontractCosts.current = true;
      try {
        // These rows were previously generated from subcontractor invoices.
        // They represent the same WIR work and would double-count the cost,
        // so only generated rows are replaced; manual expense rows are kept.
        for (const entry of data.costEntries.filter((item: any) => item.source_type === 'subcontractor_invoice')) {
          await dataRepository.delete('cost_entries', entry.id);
          data.applyLocalMutation('cost_entries', { type: 'delete', id: entry.id });
        }
        for (const wir of data.wirEntries) await syncSubcontractWirCost({ type: 'update', row: wir });
      } finally {
        synchronizingLiveSubcontractCosts.current = false;
      }
    };
    void synchronizeLiveSubcontractCosts().catch((error) =>
      console.error('Could not synchronize live subcontractor costs.', error),
    );
  }, [data.wirEntries, data.contracts, data.boqItems, data.boqHeaders, data.projects, data.costEntries]);

  useEffect(() => {
    const synchronizeOperationalSources = async () => {
      for (const row of data.procurement as Record<string, any>[]) await syncOperationalCost('procurement', { type: 'update', row });
      for (const row of data.laborDuty as Record<string, any>[]) await syncOperationalCost('labor_duty', { type: 'update', row });
      for (const row of data.equipment as Record<string, any>[]) await syncOperationalCost('equipment', { type: 'update', row });
    };
    if (data.contracts.length > 0 && data.boqItems.length > 0) {
      void synchronizeOperationalSources().catch((error) => console.error('Could not synchronize operational cost sources.', error));
    }
  }, [data.procurement, data.laborDuty, data.equipment, data.contracts, data.boqItems, data.boqHeaders]);

  useEffect(() => {
    if (synchronizingCostControl.current) return;
    const synchronizeCostControl = async () => {
      const entriesByItem = new Map<string, Record<string, any>[]>();
      const committedByItem = new Map<string, number>();
      const scheduleValuesByItem = new Map<string, { budget: number; planned: number }>();
      for (const entry of data.costEntries as Record<string, any>[]) {
        // The Cost Control table is by the main BOQ item. Entries without an
        // item remain valid expenses but cannot be assigned to a BOQ control
        // line until the user selects the relevant main item.
        if (!entry.project_id || !entry.contract_id || !entry.boq_item_id) continue;
        // Cost Control keeps one row per main BOQ item and aggregates every
        // expense type assigned to that item.
        const key = `${entry.project_id}|${entry.contract_id}|${entry.boq_item_id}`;
        entriesByItem.set(key, [...(entriesByItem.get(key) || []), entry]);
      }
      for (const wir of data.wirEntries as Record<string, any>[]) {
        const wirContract = data.contracts.find((contract: any) => contract.id === wir.contract_id) as any;
        if (!wirContract?.project_id) continue;
        const mainContractId = wirContract.parent_main_contract_id || wirContract.id;
        const selectedItem = data.boqItems.find((item: any) => item.id === wir.boq_item_id) as any;
        const mainItem = selectedItem?.main_boq_item_id
          ? data.boqItems.find((item: any) => item.id === selectedItem.main_boq_item_id) as any
          : selectedItem;
        if (!mainItem?.id) continue;
        const key = `${wirContract.project_id}|${mainContractId}|${mainItem.id}`;
        const earnedValue = (Number(wir.quantity) || 0) * (Number(mainItem.unit_rate) || 0);
        committedByItem.set(key, (committedByItem.get(key) || 0) + earnedValue);
      }
      for (const schedule of data.schedules as Record<string, any>[]) {
        const hasChildActivities = !String(schedule.activity || '').trim() && (data.schedules as Record<string, any>[])
          .some((candidate) => candidate.boq_item_id === schedule.boq_item_id && String(candidate.activity || '').trim());
        // A blank-activity row is the BOQ summary. Its figures are derived
        // from children and must never be counted again in Cost Control.
        if (hasChildActivities) continue;
        const scheduleContract = data.contracts.find((contract: any) => contract.id === schedule.contract_id) as any;
        if (!scheduleContract?.project_id) continue;
        const selectedItem = data.boqItems.find((item: any) => item.id === schedule.boq_item_id) as any;
        const mainItemId = selectedItem?.main_boq_item_id || selectedItem?.id;
        if (!mainItemId) continue;
        const key = `${scheduleContract.project_id}|${scheduleContract.parent_main_contract_id || scheduleContract.id}|${mainItemId}`;
        const previous = scheduleValuesByItem.get(key) || { budget: 0, planned: 0 };
        const activityBudget = scheduleBudget(schedule);
        const activityPlannedValue = schedulePlannedValueToDate(schedule);
        scheduleValuesByItem.set(key, {
          budget: previous.budget + activityBudget,
          planned: previous.planned + activityPlannedValue,
        });
      }
      const knownKeys = new Set(entriesByItem.keys());
      committedByItem.forEach((_value, key) => knownKeys.add(key));
      scheduleValuesByItem.forEach((_value, key) => knownKeys.add(key));
      for (const cost of data.costs as Record<string, any>[]) {
        if (cost.project_id && cost.contract_id && cost.boq_item_id) {
          knownKeys.add(`${cost.project_id}|${cost.contract_id}|${cost.boq_item_id}`);
        }
      }
      if (knownKeys.size === 0) return;

      synchronizingCostControl.current = true;
      try {
        for (const key of knownKeys) {
          const entries = entriesByItem.get(key) || [];
          const [projectId, contractId, boqItemId] = key.split('|');
          const matchingControls = (data.costs as Record<string, any>[]).filter((cost) =>
            cost.project_id === projectId && cost.contract_id === contractId && cost.boq_item_id === boqItemId,
          );
          // Historical versions could create more than one control row for
          // the same item. The first is retained; the rest are removed as
          // obsolete generated duplicates during this repair.
          const existing = matchingControls[0];
          const latest = entries[entries.length - 1];
          const categories = [...new Set(entries.map((entry) => entry.cost_type || 'Other'))];
          const costCategory = categories.length > 1 ? 'Multiple Cost Types' : (categories[0] || existing?.category || 'Other');
          const mainItem = data.boqItems.find((item: any) => item.id === boqItemId) as any;
          const mainHeader = data.boqHeaders.find((header: any) => header.id === mainItem?.boq_header_id) as any;
          const mainContract = data.contracts.find((contract: any) => contract.id === contractId) as any;
          const actual = Math.round(entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) * 100) / 100;
          const committed = Math.round((committedByItem.get(key) || 0) * 100) / 100;
          const scheduleValues = scheduleValuesByItem.get(key);
          const budget = Math.round((scheduleValues?.budget ?? (Number(existing?.budget) || 0)) * 100) / 100;
          const planned = Math.round((scheduleValues?.planned ?? (Number(existing?.planned) || 0)) * 100) / 100;
          const cpi = actual > 0 ? committed / actual : null;
          const spi = planned > 0 ? committed / planned : null;
          const costState = actual <= budget ? 'Under Budget' : 'Over Budget';
          const scheduleState = spi === null ? 'No Planned Value' : spi >= 1 ? 'Ahead of Schedule' : 'Behind Schedule';
          const evmStatus = `${costState} | ${scheduleState} | CPI ${cpi === null ? 'N/A' : cpi.toFixed(2)} | SPI ${spi === null ? 'N/A' : spi.toFixed(2)}`;
          const control = {
            project_id: projectId,
            project_code: latest?.project_code || existing?.project_code || '',
            contract_id: contractId,
            main_contract_id: contractId,
            boq_header_id: mainItem?.boq_header_id || latest?.boq_header_id || existing?.boq_header_id || null,
            boq_item_id: boqItemId,
            item_code: mainItem?.item_code || latest?.boq_item_code || existing?.item_code || '',
            boq_item_code: mainItem?.item_code || latest?.boq_item_code || existing?.boq_item_code || '',
            boq_item_name: mainItem?.item_name || mainItem?.description || latest?.boq_item_name || existing?.boq_item_name || '',
            // These describe the controlled main-contract BOQ line, never
            // the latest expense supplier/subcontractor.
            company_name: mainContract?.contractor || mainHeader?.company_name || existing?.company_name || '',
            // Do not let the latest entry overwrite the classification when
            // the same BOQ item has more than one type of expense.
            category: costCategory,
            description: mainItem?.description || mainItem?.item_name || existing?.description || '',
            budget,
            planned,
            // Earned work: all WIR quantities at the main-contract BOQ rate.
            // Subcontract work is therefore loaded at the main rate here.
            committed,
            actual,
            status: evmStatus,
            cost_cpi: cpi,
            schedule_spi: spi,
            notes: existing?.notes || '',
          };
          if (existing) {
            const changed = Object.entries(control).some(([field, value]) => (existing[field] ?? null) !== (value ?? null));
            if (changed) {
              const updated = await dataRepository.update<Record<string, any>>('costs', existing.id, control);
              data.applyLocalMutation('costs', { type: 'update', row: updated });
            }
          } else {
            const inserted = await dataRepository.insert<Record<string, any>>('costs', control);
            data.applyLocalMutation('costs', { type: 'insert', row: inserted });
          }
          for (const duplicate of matchingControls.slice(1)) {
            await dataRepository.delete('costs', duplicate.id);
            data.applyLocalMutation('costs', { type: 'delete', id: duplicate.id });
          }
        }
      } finally {
        synchronizingCostControl.current = false;
      }
    };
    void synchronizeCostControl().catch((error) =>
      console.error('Could not synchronize cost control.', error),
    );
  }, [data.costEntries, data.wirEntries, data.schedules, data.boqItems, data.boqHeaders, data.contracts]);

  useEffect(() => {
    if (synchronizingProjectFinancials.current || data.projects.length === 0) return;
    const synchronizeProjectFinancials = async () => {
      synchronizingProjectFinancials.current = true;
      try {
        for (const project of data.projects as Record<string, any>[]) {
          const budget = Math.round((data.schedules as Record<string, any>[])
            .filter((schedule) => schedule.project_id === project.id)
            .filter((schedule) => !(!String(schedule.activity || '').trim() && (data.schedules as Record<string, any>[])
              .some((candidate) => candidate.boq_item_id === schedule.boq_item_id && String(candidate.activity || '').trim())))
            .reduce((sum, schedule) => sum + scheduleBudget(schedule), 0) * 100) / 100;
          const spent = Math.round((data.costs as Record<string, any>[])
            .filter((cost) => cost.project_id === project.id)
            .reduce((sum, cost) => sum + (Number(cost.actual) || 0), 0) * 100) / 100;
          if ((Number(project.budget) || 0) === budget && (Number(project.spent) || 0) === spent) continue;
          const updated = await dataRepository.update<Record<string, any>>('projects', project.id, { budget, spent });
          data.applyLocalMutation('projects', { type: 'update', row: updated });
        }
      } finally {
        synchronizingProjectFinancials.current = false;
      }
    };
    void synchronizeProjectFinancials().catch((error) =>
      console.error('Could not synchronize project financial values.', error),
    );
  }, [data.projects, data.schedules, data.costs]);

  // A main contract creates and owns its project. Keeping their reporting
  // dates aligned prevents WIRs from being excluded when either record is
  // updated later.
  async function syncMainContractProjectDates(mutation: { type: string; row?: Record<string, any> }) {
    if (mutation.type !== 'update' || !mutation.row) return;
    const contract = mutation.row;
    if (contract.parent_main_contract_id || !contract.project_id) return;
    const project = data.projects.find((item: any) => item.id === contract.project_id) as Record<string, any> | undefined;
    if (!project) return;
    const patch: Record<string, any> = {};
    if ((project.start_date || null) !== (contract.start_date || null)) patch.start_date = contract.start_date || null;
    if ((project.end_date || null) !== (contract.end_date || null)) patch.end_date = contract.end_date || null;
    if (Object.keys(patch).length === 0) return;
    const updatedProject = await dataRepository.update<Record<string, any>>('projects', project.id, patch);
    data.applyLocalMutation('projects', { type: 'update', row: updatedProject });
  }

  async function createInvoiceFromWir(
    invoiceTable: 'client_invoices' | 'subcontractor_invoices',
    draft: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    const contract = data.contracts.find((item: any) => item.id === draft.contract_id) as any;
    if (!contract) throw new Error('Select a contract before creating the invoice.');
    if (!draft.from_date || !draft.to_date || !draft.result) {
      throw new Error('Select From Date, To Date, and WIR Result.');
    }
    if (String(draft.from_date) > String(draft.to_date)) throw new Error('From Date cannot be after To Date.');
    const isSubcontract = Boolean(contract.parent_main_contract_id);
    if (invoiceTable === 'client_invoices' && isSubcontract) throw new Error('Client invoices are created from main-contract WIRs only.');
    if (invoiceTable === 'subcontractor_invoices' && !isSubcontract) throw new Error('Subcontractor invoices are created from subcontract WIRs only.');

    const matchingWirs = data.wirEntries.filter((wir: any) =>
      wir.contract_id === contract.id &&
      wir.result === draft.result &&
      String(wir.inspection_date || '') >= String(draft.from_date) &&
      String(wir.inspection_date || '') <= String(draft.to_date),
    );
    if (matchingWirs.length === 0) throw new Error('No WIR records match the selected contract, date range, and result.');

    const groups = new Map<string, any[]>();
    matchingWirs.forEach((wir: any) => {
      if (!wir.boq_item_id) return;
      groups.set(wir.boq_item_id, [...(groups.get(wir.boq_item_id) || []), wir]);
    });
    if (groups.size === 0) throw new Error('The selected WIR records do not contain BOQ items.');

    const project = data.projects.find((item: any) => item.id === contract.project_id) as any;
    const rows = [...groups.entries()].map(([boqItemId, wirs]) => {
      const item = data.boqItems.find((entry: any) => entry.id === boqItemId) as any;
      if (!item) throw new Error('A WIR references a missing BOQ item.');
      const firstWir = wirs[0];
      const quantity = wirs.reduce((sum: number, wir: any) => sum + (Number(wir.quantity) || 0), 0);
      const unitRate = invoiceTable === 'client_invoices'
        ? (Number(firstWir.unit_price) || 0)
        : (Number(item.unit_rate) || 0);
      return {
        invoice_number: draft.invoice_number,
        project_id: contract.project_id,
        project_code: project?.project_code || draft.project_code || '',
        contract_id: contract.id,
        main_contract_id: isSubcontract ? contract.parent_main_contract_id : contract.id,
        boq_header_id: item.boq_header_id || null,
        boq_item_id: item.id,
        boq_code: item.boq_code || '',
        boq_item_code: item.item_code || '',
        item_desc: item.item_name || item.description || '',
        unit: item.unit || '',
        quantity,
        unit_rate: unitRate,
        amount: Math.round(quantity * unitRate * 100) / 100,
        invoice_date: draft.to_date,
        source_from_date: draft.from_date,
        source_to_date: draft.to_date,
        source_wir_result: draft.result,
        status: 'Generated',
        payment_status: 'Unpaid',
        ...(invoiceTable === 'client_invoices'
          ? { client: contract.client || '' }
          : { subcontractor: contract.contractor || '' }),
      };
    });
    const inserted = await dataRepository.insertMany<Record<string, any>>(invoiceTable, rows);
    await consolidateInvoiceTracking(invoiceTable, inserted);
    return inserted;
  }

  async function consolidateInvoiceTracking(
    invoiceTable: 'client_invoices' | 'subcontractor_invoices',
    invoiceRows: Record<string, any>[],
  ): Promise<void> {
    if (invoiceRows.length === 0) return;
    const trackingTable = invoiceTable === 'client_invoices'
      ? 'client_invoice_tracking'
      : 'subcontractor_invoice_tracking';
    const invoiceNumber = invoiceRows[0].invoice_number;
    const existingTracking = await dataRepository.list<Record<string, any>>(trackingTable);
    for (const trackingRow of existingTracking.filter((row) => row.invoice_number === invoiceNumber)) {
      await dataRepository.delete(trackingTable, trackingRow.id);
    }
    const totalWorkValue = invoiceRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const first = invoiceRows[0];
    await dataRepository.insert<Record<string, any>>(trackingTable, {
      id: crypto.randomUUID(),
      invoice_id: null,
      invoice_number: invoiceNumber,
      project_id: first.project_id,
      project_code: first.project_code || '',
      contract_id: first.contract_id,
      invoice_date: first.invoice_date || null,
      due_date: null,
      status: 'Generated',
      payment_status: 'Unpaid',
      payment_date: null,
      total_work_value: totalWorkValue,
      notes: '',
    });
  }

  async function deleteInvoiceGroup(
    invoiceTable: 'client_invoices' | 'subcontractor_invoices',
    invoiceRow: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    const invoiceRows = (invoiceTable === 'client_invoices' ? data.clientInvoices : data.subInvoices)
      .filter((row: any) => row.invoice_number === invoiceRow.invoice_number) as Record<string, any>[];
    for (const row of invoiceRows) await dataRepository.delete(invoiceTable, row.id);
    const trackingTable = invoiceTable === 'client_invoices'
      ? 'client_invoice_tracking'
      : 'subcontractor_invoice_tracking';
    const trackingRows = await dataRepository.list<Record<string, any>>(trackingTable);
    for (const row of trackingRows.filter((tracking) => tracking.invoice_number === invoiceRow.invoice_number)) {
      await dataRepository.delete(trackingTable, row.id);
    }
    if (invoiceTable === 'client_invoices') await data.reloadInvoiceTracking('client_invoice_tracking');
    else await data.reloadInvoiceTracking('subcontractor_invoice_tracking');
    return invoiceRows;
  }

  function renderView() {
    if (activeView === 'dashboard') {
      return (
        <Dashboard
          projects={data.projects}
          tasks={data.tasks}
          costs={data.costs}
          costEntries={data.costEntries}
          procurement={data.procurement}
          safety={data.safety}
          progress={data.progress}
          schedules={data.schedules}
          contracts={data.contracts}
          boqHeaders={data.boqHeaders}
          boqItems={data.boqItems}
          cashFlow={data.cashFlow}
          subInvoices={data.subInvoices}
          clientInvoices={data.clientInvoices}
          variations={data.variations}
          documents={data.documents}
          wirEntries={data.wirEntries}
          onNavigate={setActiveView}
        />
      );
    }

    if (activeView === 'portfolio') {
      const money = (value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      const portfolioRows = data.projects.map((project: any) => {
        const mainContract = data.contracts.find((contract: any) => contract.project_id === project.id && !contract.parent_main_contract_id) as Record<string, any> | undefined;
        const contractIds = new Set(data.contracts
          .filter((contract: any) => contract.project_id === project.id || contract.parent_main_contract_id === mainContract?.id)
          .map((contract: any) => contract.id));
        const approvedVariations = data.variations.filter((variation: any) => variation.contract_id === mainContract?.id && variation.status === 'Approved');
        const variationValue = approvedVariations.reduce((sum: number, variation: any) => sum + (Number(variation.cost_impact) || 0), 0);
        const timeImpact = approvedVariations.reduce((sum: number, variation: any) => sum + (Number(variation.time_impact_days) || 0), 0);
        const originalValue = Number(mainContract?.contract_value) || 0;
        const modifiedValue = originalValue + variationValue;
        const costs = data.costs.filter((cost: any) => cost.project_id === project.id);
        const actualCost = costs.reduce((sum: number, cost: any) => sum + (Number(cost.actual) || 0), 0);
        const earnedValue = costs.reduce((sum: number, cost: any) => sum + (Number(cost.committed) || 0), 0);
        const plannedValue = costs.reduce((sum: number, cost: any) => sum + (Number(cost.planned) || 0), 0);
        const subcontractCount = Math.max(0, contractIds.size - (mainContract ? 1 : 0));
        const revisedEnd = addCalendarDays(mainContract?.end_date || project.end_date, timeImpact) || mainContract?.end_date || project.end_date;
        return { project, mainContract, variationValue, originalValue, modifiedValue, actualCost, earnedValue, plannedValue, subcontractCount, revisedEnd };
      });
      const totals = portfolioRows.reduce((sum, row) => ({
        originalValue: sum.originalValue + row.originalValue,
        variationValue: sum.variationValue + row.variationValue,
        modifiedValue: sum.modifiedValue + row.modifiedValue,
        plannedValue: sum.plannedValue + row.plannedValue,
        earnedValue: sum.earnedValue + row.earnedValue,
        actualCost: sum.actualCost + row.actualCost,
      }), { originalValue: 0, variationValue: 0, modifiedValue: 0, plannedValue: 0, earnedValue: 0, actualCost: 0 });
      const openProject = (projectId: string) => { setWorkspaceProjectId(projectId); setActiveView('projects'); };
      return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Project Portfolio</p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900">Executive project register</h2>
            <p className="mt-1 text-sm text-neutral-500">One row per main contract/project. Values are calculated from contracts, approved variations, schedule, WIR and cost-control records.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ['Original contracts', totals.originalValue], ['Approved variations', totals.variationValue], ['Modified contracts', totals.modifiedValue],
              ['Planned value to date', totals.plannedValue], ['Earned value', totals.earnedValue], ['Actual cost', totals.actualCost],
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-lg font-bold text-neutral-900">{money(Number(value))}</p></div>)}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <table className="min-w-[1220px] w-full text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Main contract</th><th className="px-4 py-3">Original</th><th className="px-4 py-3">Variations</th><th className="px-4 py-3">Modified</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">Revised finish</th><th className="px-4 py-3">PV / EV / AC</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Subcontracts</th></tr></thead><tbody>
              {portfolioRows.map((row) => { const progress = row.modifiedValue > 0 ? Math.min(100, row.earnedValue / row.modifiedValue * 100) : 0; return <tr key={row.project.id} onClick={() => openProject(row.project.id)} className="cursor-pointer border-b border-neutral-100 hover:bg-primary-50"><td className="px-4 py-3"><p className="font-semibold text-neutral-900">{row.project.name}</p><p className="text-xs text-neutral-500">{row.project.project_code}</p></td><td className="px-4 py-3"><p className="font-medium text-neutral-800">{row.mainContract?.contract_number || '—'}</p><p className="max-w-48 truncate text-xs text-neutral-500">{row.mainContract?.title || 'No main contract'}</p></td><td className="px-4 py-3">{money(row.originalValue)}</td><td className="px-4 py-3 text-primary-700">{money(row.variationValue)}</td><td className="px-4 py-3 font-semibold">{money(row.modifiedValue)}</td><td className="px-4 py-3">{row.mainContract?.start_date || row.project.start_date || '—'}</td><td className="px-4 py-3">{row.revisedEnd || '—'}</td><td className="px-4 py-3 text-xs"><p>PV {money(row.plannedValue)}</p><p>EV {money(row.earnedValue)}</p><p>AC {money(row.actualCost)}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-primary-600" style={{ width: `${progress}%` }} /></div><span>{progress.toFixed(1)}%</span></div></td><td className="px-4 py-3">{row.subcontractCount}</td></tr>; })}
              {portfolioRows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-neutral-500">No projects have been generated from main contracts yet.</td></tr>}
            </tbody></table>
          </div>
        </div>
      );
    }

    if (activeView === 'projects') {
      const selectedProject = data.projects.find((project: any) => project.id === workspaceProjectId) || data.projects[0];
      if (!selectedProject) {
        return (
          <div className="p-6">
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <FolderKanban size={34} className="mx-auto mb-3 text-neutral-400" />
              <h2 className="text-lg font-semibold text-neutral-800">No project workspace yet</h2>
              <p className="mt-1 text-sm text-neutral-500">Create a main contract first. The project workspace is generated from that contract.</p>
              <button onClick={() => setActiveView('contracts')} className="mt-5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Open Contracts</button>
            </div>
          </div>
        );
      }

      const mainContract = data.contracts.find((contract: any) =>
        contract.project_id === selectedProject.id && !contract.parent_main_contract_id,
      ) as Record<string, any> | undefined;
      const relatedContracts = data.contracts.filter((contract: any) =>
        contract.project_id === selectedProject.id || contract.parent_main_contract_id === mainContract?.id,
      ) as Record<string, any>[];
      const relatedContractIds = new Set(relatedContracts.map((contract) => contract.id));
      const approvedVariations = data.variations.filter((variation: any) =>
        variation.contract_id === mainContract?.id && variation.status === 'Approved',
      );
      const approvedVariationValue = approvedVariations.reduce((sum: number, variation: any) => sum + (Number(variation.cost_impact) || 0), 0);
      const originalValue = Number(mainContract?.contract_value) || 0;
      const modifiedValue = originalValue + approvedVariationValue;
      const relatedWirs = data.wirEntries.filter((wir: any) => relatedContractIds.has(wir.contract_id));
      const approvedWirs = relatedWirs.filter((wir: any) => wir.result === 'Pass' || wir.result === 'Conditional Pass' || wir.status === 'Approved');
      const completedValue = approvedWirs.reduce((sum: number, wir: any) => sum + (Number(wir.item_amount) || (Number(wir.quantity) || 0) * (Number(wir.unit_price) || 0)), 0);
      const projectCosts = data.costs.filter((cost: any) => cost.project_id === selectedProject.id);
      const plannedCost = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.planned) || 0), 0);
      const actualCost = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.actual) || 0), 0);
      const committedValue = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.committed) || 0), 0);
      const projectCash = data.cashFlow.filter((entry: any) => entry.project_id === selectedProject.id || relatedContractIds.has(entry.contract_id));
      const cashIn = projectCash.reduce((sum: number, entry: any) => sum + (Number(entry.inflow) || 0), 0);
      const cashOut = projectCash.reduce((sum: number, entry: any) => sum + (Number(entry.outflow) || 0), 0);
      const activityCount = data.schedules.filter((activity: any) => activity.project_id === selectedProject.id && activity.activity).length;
      const boqCount = data.boqItems.filter((item: any) => item.project_id === selectedProject.id).length;
      const money = (value: number) => value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      const progress = modifiedValue > 0 ? Math.min(100, (completedValue / modifiedValue) * 100) : 0;
      const sections: { label: string; value: string; description: string; view: ViewKey; icon: IconType; tone: string }[] = [
        { label: 'Commercial', value: money(modifiedValue), description: `${approvedVariations.length} approved variation(s)`, view: 'contracts', icon: FileSignature, tone: 'text-primary-600 bg-primary-50' },
        { label: 'Progress', value: `${progress.toFixed(1)}%`, description: `${approvedWirs.length} approved inspection request(s)`, view: 'progress', icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-50' },
        { label: 'Cost control', value: money(actualCost), description: `Actual | committed ${money(committedValue)}`, view: 'costs', icon: DollarSign, tone: 'text-amber-600 bg-amber-50' },
        { label: 'Cash position', value: money(cashIn - cashOut), description: `In ${money(cashIn)} | Out ${money(cashOut)}`, view: 'cashflow', icon: Banknote, tone: 'text-violet-600 bg-violet-50' },
      ];
      const workspaceTabs: { label: string; view: ViewKey; icon: IconType }[] = [
        { label: 'Contracts', view: 'contracts', icon: FileSignature },
        { label: 'BOQ', view: 'boqItems', icon: ListOrdered },
        { label: 'Schedule', view: 'schedule', icon: CalendarClock },
        { label: 'Inspection & Progress', view: 'wir', icon: FileCheck2 },
        { label: 'Cost', view: 'costs', icon: DollarSign },
        { label: 'Cash Flow', view: 'cashflow', icon: Banknote },
        { label: 'Operations', view: 'procurement', icon: Package },
      ];
      const openWorkspaceArea = (view: ViewKey) => {
        setWorkspaceProjectId(selectedProject.id);
        setActiveView(view);
      };

      return (
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto h-full">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Project Workspace</p>
              <h2 className="mt-1 text-2xl font-bold text-neutral-900">{selectedProject.name || selectedProject.project_code}</h2>
              <p className="mt-1 text-sm text-neutral-500">One project context for commercial, delivery, cost, cash and field operations.</p>
            </div>
            <label className="block text-sm font-medium text-neutral-700">
              Active project
              <select value={selectedProject.id} onChange={(event) => setWorkspaceProjectId(event.target.value)} className="mt-1 block min-w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                {data.projects.map((project: any) => <option key={project.id} value={project.id}>{project.project_code || project.id} — {project.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return <button key={section.label} onClick={() => openWorkspaceArea(section.view)} className="rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:border-primary-300 hover:shadow-md">
                <div className={`mb-3 inline-flex rounded-lg p-2 ${section.tone}`}><Icon size={19} /></div>
                <p className="text-xs font-medium text-neutral-500">{section.label}</p>
                <p className="mt-1 text-xl font-bold text-neutral-900">{section.value}</p>
                <p className="mt-1 truncate text-xs text-neutral-500">{section.description}</p>
              </button>;
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold text-neutral-900">Project control summary</h3><p className="text-xs text-neutral-500">Calculated from linked local records</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">{selectedProject.status || 'Planning'}</span></div>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><p className="text-neutral-500">Original contract</p><p className="mt-1 font-semibold text-neutral-900">{money(originalValue)}</p></div>
                <div><p className="text-neutral-500">Modified contract</p><p className="mt-1 font-semibold text-neutral-900">{money(modifiedValue)}</p></div>
                <div><p className="text-neutral-500">Planned cost</p><p className="mt-1 font-semibold text-neutral-900">{money(plannedCost)}</p></div>
                <div><p className="text-neutral-500">Completed work</p><p className="mt-1 font-semibold text-neutral-900">{money(completedValue)}</p></div>
                <div><p className="text-neutral-500">BOQ items</p><p className="mt-1 font-semibold text-neutral-900">{boqCount}</p></div>
                <div><p className="text-neutral-500">Activities</p><p className="mt-1 font-semibold text-neutral-900">{activityCount}</p></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-600" style={{ width: `${progress}%` }} /></div>
              <div className="mt-2 flex justify-between text-xs text-neutral-500"><span>Delivery progress</span><span>{progress.toFixed(1)}%</span></div>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-neutral-900">Open a work area</h3><p className="mt-1 text-xs text-neutral-500">All areas preserve the same project relationship.</p><div className="mt-4 grid grid-cols-2 gap-2">{workspaceTabs.map((tab) => { const Icon = tab.icon; return <button key={tab.view} onClick={() => openWorkspaceArea(tab.view)} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-left text-sm text-neutral-700 hover:border-primary-300 hover:bg-primary-50"><Icon size={16} className="text-primary-600" />{tab.label}</button>; })}</div></section>
          </div>
        </div>
      );
    }

    const config = VIEW_CONFIGS[activeView];
    if (!config) return null;
    const tableName = TABLE_NAMES[activeView];
    const title = VIEW_TITLES[activeView];
    // The navigation key is "boq", while the loaded state is named
    // "boqHeaders". Reading the navigation key made successfully saved BOQs
    // look as if they had disappeared.
    const rawViewData = activeView === 'boq'
      ? data.boqHeaders
      : activeView === 'boqItems'
        ? data.boqItems
        : activeView === 'wir'
          ? data.wirEntries
        : activeView === 'schedule'
          ? data.schedules
          : activeView === 'subinvoices'
            ? data.subInvoices
            : activeView === 'clientinvoices'
              ? data.clientInvoices
              : (data as any)[activeView] || [];
    const contractsWithModifiedValue = data.contracts.map((contract: any) => {
        const approvedVariationValue = data.variations
          .filter((variation: any) => variation.contract_id === contract.id && variation.status === 'Approved')
          .reduce((sum: number, variation: any) => sum + (Number(variation.cost_impact) || 0), 0);
        const approvedTimeImpact = data.variations
          .filter((variation: any) => variation.contract_id === contract.id && variation.status === 'Approved')
          .reduce((sum: number, variation: any) => sum + (Number(variation.time_impact_days) || 0), 0);
        return {
          ...contract,
          contract_role: contract.parent_main_contract_id ? 'Subcontract' : 'Main Contract',
          project_code: contract.project_code || data.projects.find((project: any) => project.id === contract.project_id)?.project_code || '',
          modified_contract_value: (Number(contract.contract_value) || 0) + approvedVariationValue,
          revised_end_date: addCalendarDays(contract.end_date, approvedTimeImpact),
          approved_time_impact_days: approvedTimeImpact,
        };
      });
    const contractById = new Map(contractsWithModifiedValue.map((contract: any) => [contract.id, contract]));
    const headersWithContractContext = data.boqHeaders.map((header: any) => {
      const contract = contractById.get(header.contract_id) as any;
      return {
        ...header,
        contract_role: contract?.contract_role || 'Main Contract',
        company_name: header.company_name || contract?.contractor || '',
      };
    });
    const headerById = new Map(headersWithContractContext.map((header: any) => [header.id, header]));
    const mainBoqItemById = new Map(data.boqItems
      .filter((item: any) => !contractById.get((headerById.get(item.boq_header_id) as any)?.contract_id)?.parent_main_contract_id)
      .map((item: any) => [item.id, item]));
    // One live WIR projection is shared by WIR, Progress, and Projects. This
    // prevents a copied historical price from breaking downstream totals when
    // the linked BOQ item or parent-main-item relationship is updated.
    const derivedWirs = data.wirEntries.map((wir: any) => {
      const contract = contractById.get(wir.contract_id) as any;
      const selectedItem = data.boqItems.find((item: any) => item.id === wir.boq_item_id) as any;
      const mainItem = mainBoqItemById.get(selectedItem?.main_boq_item_id) || selectedItem;
      const unitPrice = Number(mainItem?.unit_rate) || Number(wir.unit_price) || 0;
      const itemAmount = Math.round((Number(wir.quantity) || 0) * unitPrice * 100) / 100;
      const mainItemValue = (Number(mainItem?.quantity) || 0) * (Number(mainItem?.unit_rate) || 0);
      return {
        ...wir,
        company_name: contract?.contractor || wir.company_name || '',
        contract_role: contract?.contract_role || 'Main Contract',
        unit_price: unitPrice,
        item_amount: itemAmount,
        completion_pct: mainItemValue > 0 ? Math.round(itemAmount / mainItemValue * 10000) / 100 : 0,
      };
    });
    const viewData = activeView === 'contracts'
      ? contractsWithModifiedValue
      : activeView === 'boq'
        ? headersWithContractContext.map((header: any) => ({
          ...header,
          total_value: data.boqItems
            .filter((item: any) => item.boq_header_id === header.id)
            .reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_rate) || 0)), 0),
          }))
        : activeView === 'boqItems'
          ? rawViewData.map((item: any) => {
            const header = headerById.get(item.boq_header_id) as any;
            return {
              ...item,
              project_id: item.project_id || header?.project_id || null,
              contract_id: item.contract_id || header?.contract_id || null,
              company_name: item.company_name || header?.company_name || '',
              contract_role: header?.contract_role || 'Main Contract',
            };
          })
        : activeView === 'variations'
          ? rawViewData.map((variation: any) => {
            const contract = contractById.get(variation.contract_id) as any;
            return { ...variation, contractor: contract?.contractor || '', contract_role: contract?.contract_role || 'Main Contract' };
          })
        : activeView === 'wir'
          ? derivedWirs
        : activeView === 'schedule'
          ? rawViewData.map((schedule: any) => {
            const scheduleContract = contractById.get(schedule.contract_id) as any;
            const mainContractId = scheduleContract?.parent_main_contract_id || schedule.contract_id;
            const scheduleItem = data.boqItems.find((item: any) => item.id === schedule.boq_item_id) as any;
            const mainItemId = scheduleItem?.main_boq_item_id || scheduleItem?.id;
            const mainItem = mainItemId ? data.boqItems.find((item: any) => item.id === mainItemId) as any : null;
            const plannedQuantity = Number(schedule.planned_quantity) || 0;
            // One BOQ item can be split across many activities. Allocate the
            // item-level EV and actual cost by PV-to-date so activity rows
            // add up to the BOQ/control total without duplication.
            const itemRows = data.schedules
              .filter((activity: any) => activity.project_id === schedule.project_id && activity.boq_item_id === schedule.boq_item_id);
            const childActivities = itemRows.filter((activity: any) => String(activity.activity || '').trim());
            const isSummaryRow = !String(schedule.activity || '').trim();
            const activitiesForItem = childActivities.length > 0 ? childActivities : itemRows;
            const reportDate = new Date().toISOString().slice(0, 10);
            // EV and AC are allocated only among activities which have a PV
            // at the report date. Budget is never used as the allocation key.
            const itemPVToDate = activitiesForItem
              .reduce((sum: number, activity: any) => sum + schedulePlannedValueToDate(activity, reportDate), 0);
            const activityPVToDate = schedulePlannedValueToDate(schedule, reportDate);
            const allocation = isSummaryRow && childActivities.length > 0
              ? 1
              : itemPVToDate > 0 ? activityPVToDate / itemPVToDate : 0;
            const earnedWorkValue = derivedWirs
              .filter((wir: any) => {
                const wirContract = contractById.get(wir.contract_id) as any;
                const wirItem = data.boqItems.find((item: any) => item.id === wir.boq_item_id) as any;
                return (wirContract?.parent_main_contract_id || wir.contract_id) === mainContractId &&
                  (wirItem?.main_boq_item_id || wirItem?.id) === mainItemId;
              })
              .reduce((sum: number, wir: any) => sum + ((Number(wir.quantity) || 0) * (Number(mainItem?.unit_rate) || 0)), 0);
            const costControl = data.costs.find((cost: any) =>
              cost.project_id === schedule.project_id &&
              cost.contract_id === mainContractId &&
              cost.boq_item_id === mainItemId,
            ) as any;
            const earned = Math.round(earnedWorkValue * allocation * 100) / 100;
            const actualCost = Math.round((Number(costControl?.actual) || 0) * allocation * 100) / 100;
            const budget = isSummaryRow && childActivities.length > 0
              ? childActivities.reduce((sum: number, activity: any) => sum + scheduleBudget(activity), 0)
              : scheduleBudget(schedule);
            const plannedValue = isSummaryRow && childActivities.length > 0
              ? childActivities.reduce((sum: number, activity: any) => sum + schedulePlannedValueToDate(activity), 0)
              : schedulePlannedValueToDate(schedule);
            const summaryQuantity = isSummaryRow && childActivities.length > 0
              ? childActivities.reduce((sum: number, activity: any) => sum + (Number(activity.planned_quantity) || 0), 0)
              : plannedQuantity;
            const summaryStart = isSummaryRow && childActivities.length > 0
              ? childActivities.map((activity: any) => String(activity.start_date || '')).filter(Boolean).sort()[0] || schedule.start_date
              : schedule.start_date;
            const childEndDates = childActivities.map((activity: any) => String(activity.end_date || '')).filter(Boolean).sort();
            const summaryEnd = isSummaryRow && childActivities.length > 0
              ? childEndDates[childEndDates.length - 1] || schedule.end_date
              : schedule.end_date;
            const summaryDuration = isSummaryRow && childActivities.length > 0
              ? childActivities.reduce((sum: number, activity: any) => sum + (Number(activity.duration_days) || 0), 0)
              : (Number(schedule.duration_days) || 0);
            const calendarSpan = summaryStart && summaryEnd
              ? Math.max(0, Math.ceil((new Date(`${summaryEnd}T00:00:00`).getTime() - new Date(`${summaryStart}T00:00:00`).getTime()) / 86400000))
              : 0;
            const calendarGapDays = isSummaryRow && childActivities.length > 0
              ? calendarSpan - summaryDuration
              : 0;
            const revisedFinish = scheduleContract?.revised_end_date || scheduleContract?.end_date;
            const dateAlert = revisedFinish && schedule.end_date && String(schedule.end_date) > revisedFinish
              ? `⚠ Delayed: finishes after revised contract end (${revisedFinish})`
              : scheduleContract?.end_date && schedule.end_date && String(schedule.end_date) > String(scheduleContract.end_date)
                ? `ℹ Uses approved time extension to ${revisedFinish || schedule.end_date}`
                : '';
            const cpi = actualCost > 0 ? earned / actualCost : null;
            const spi = plannedValue > 0 ? earned / plannedValue : null;
            const remainingDuration = budget > 0
              ? Math.max(0, Math.round(summaryDuration * (1 - Math.min(1, earned / budget))))
              : summaryDuration;
            const costState = actualCost <= budget ? 'Under Budget' : 'Over Budget';
            const scheduleState = spi === null ? 'No Planned Value' : spi >= 1 ? 'Ahead of Schedule' : 'Behind Schedule';
            return {
              ...schedule,
              is_summary_row: isSummaryRow,
              activity: isSummaryRow ? `BOQ Total — ${schedule.boq_item_name || mainItem?.item_name || ''}` : schedule.activity,
              start_date: summaryStart,
              end_date: summaryEnd,
              duration_days: summaryDuration,
              remaining_duration_days: remainingDuration,
              unit_rate: Number(mainItem?.unit_rate) || Number(schedule.unit_rate) || 0,
              budget,
              planned_quantity: summaryQuantity,
              planned_value: plannedValue,
              // Same rule as Cost Control: main and subcontract WIRs are
              // valued at the linked main-contract BOQ item rate.
              earned_work_value: earned,
              actual_cost: actualCost,
              cost_cpi: cpi,
              schedule_spi: spi,
              status: `${calendarGapDays !== 0 ? `Calendar ${calendarGapDays > 0 ? 'gap' : 'overlap'}: ${Math.abs(calendarGapDays)} day(s) | ` : ''}${dateAlert ? `${dateAlert} | ` : ''}${costState} | ${scheduleState} | CPI ${cpi === null ? 'N/A' : cpi.toFixed(2)} | SPI ${spi === null ? 'N/A' : spi.toFixed(2)}`,
            };
          })
        : activeView === 'progress'
          ? contractsWithModifiedValue.map((contract: any) => ({
            id: `progress-${contract.id}`,
            project_id: contract.project_id,
            contract_id: contract.id,
            company_name: contract.contractor || '',
            // The main contract is the authoritative source of the project
            // reporting period because it creates the project.
            start_date: contract.start_date || null,
            end_date: contract.end_date || null,
            contract_value: contract.modified_contract_value,
            contract_role: contract.contract_role,
          }))
        : rawViewData;
    const navItem = NAV_ITEMS.find((n) => n.key === activeView);
    const projectCodeBackedTables = new Set([
      'costs', 'cost_entries', 'progress_entries', 'schedules', 'boq_headers',
      'boq_items', 'wir_entries', 'labor_duty', 'equipment',
    ]);

    const autoFillOptions: Record<string, string[]> = {};
    const relationshipOptions: Record<string, SelectOption[]> = {};
    const projectById = new Map(data.projects.map((project) => [project.id, project]));

    relationshipOptions.project_id = data.projects.map((project) => ({
      value: project.id,
      label: `${project.project_code || project.id} - ${project.name}`,
      data: {
        project_code: project.project_code,
        client: project.client,
        contractor: project.contractor,
      },
    }));
    relationshipOptions.contract_id = data.contracts.map((contract) => ({
      value: contract.id,
      // Contract Code selectors must show the business code only. Project
      // names remain available in their own column and are never persisted as
      // an identifier.
      label: contract.contract_number || contract.id,
      data: {
        project_id: contract.project_id,
        project_code: projectById.get(contract.project_id)?.project_code,
        client: contract.client,
        company_name: contract.company || contract.contractor,
        contractor: contract.contractor,
        contract_number: contract.contract_number,
        contract_role: contract.parent_main_contract_id ? 'Subcontract' : 'Main Contract',
        variation_number: (() => {
          const prefix = `${contract.contract_number || 'CNT'}-VO-`;
          const existing = data.variations
            .filter((variation: any) => variation.contract_id === contract.id)
            .map((variation: any) => Number(String(variation.variation_number || '').replace(prefix, '')) || 0);
          return `${prefix}${String(Math.max(0, ...existing) + 1).padStart(3, '0')}`;
        })(),
      },
    }));
    if (activeView === 'wir') {
      relationshipOptions.company_name = data.contracts.map((contract: any) => ({
        value: contract.id,
        label: contract.contractor || contract.contract_number || contract.id,
        data: {
          contract_id: contract.id,
          project_id: contract.project_id,
          project_code: projectById.get(contract.project_id)?.project_code,
          contract_role: contract.parent_main_contract_id ? 'Subcontract' : 'Main Contract',
          contract_number: contract.contract_number,
          company_name: contract.contractor || '',
        },
      }));
    }
    if (activeView === 'clientinvoices') {
      relationshipOptions.contract_id = relationshipOptions.contract_id.filter((option) => {
        const contract = data.contracts.find((item) => item.id === option.value);
        return contract && !contract.parent_main_contract_id;
      });
    }
    if (activeView === 'subinvoices') {
      relationshipOptions.contract_id = relationshipOptions.contract_id.filter((option) => {
        const contract = data.contracts.find((item) => item.id === option.value);
        return contract && Boolean(contract.parent_main_contract_id);
      });
    }
    relationshipOptions.boq_header_id = data.boqHeaders.map((header) => ({
      value: header.id,
      label: `${header.classification || 'BOQ'} - ${header.company_name || 'Unassigned contractor'}`,
      data: {
        project_id: header.project_id,
        contract_id: header.contract_id,
        project_code: header.project_code,
        boq_code: header.boq_code,
        company_name: header.company_name,
        contract_role: contractById.get(header.contract_id)?.contract_role || 'Main Contract',
      },
    }));
    relationshipOptions.main_boq_item_id = data.boqItems
      .filter((item: any) => mainBoqItemById.has(item.id))
      .map((item: any) => ({
        value: item.id,
        label: `${item.item_code || item.id} - ${item.item_name || item.description}`,
        data: {
          project_id: item.project_id,
          unit: item.unit,
          main_boq_item_code: item.item_code,
          main_unit_rate: item.unit_rate,
          main_boq_item_value: (Number(item.quantity) || 0) * (Number(item.unit_rate) || 0),
        },
      }));
    relationshipOptions.boq_item_id = data.boqItems.map((item) => ({
      value: item.id,
      label: `${item.item_code || item.id} - ${item.item_name || item.description}`,
      data: {
        project_id: item.project_id,
        boq_header_id: item.boq_header_id,
        contract_id: data.boqHeaders.find((header) => header.id === item.boq_header_id)?.contract_id || null,
        project_code: item.project_code,
        boq_code: item.boq_code,
        item_code: item.item_code,
        boq_item_code: item.item_code,
        item_name: item.item_name,
        boq_item_name: item.item_name,
        item_desc: item.item_name || item.description,
        item_description: item.description,
        unit: item.unit,
        unit_rate: item.unit_rate,
        unit_price: (() => {
          const itemHeader = data.boqHeaders.find((header) => header.id === item.boq_header_id);
          const itemContract = data.contracts.find((contract) => contract.id === itemHeader?.contract_id);
          const mainContract = itemContract?.parent_main_contract_id
            ? data.contracts.find((contract) => contract.id === itemContract.parent_main_contract_id)
            : itemContract;
          const mainHeaderIds = new Set(data.boqHeaders.filter((header) => header.contract_id === mainContract?.id).map((header) => header.id));
          const mainItem = item.main_boq_item_id
            ? mainBoqItemById.get(item.main_boq_item_id)
            : data.boqItems.find((candidate) => Boolean(candidate.boq_header_id) && mainHeaderIds.has(candidate.boq_header_id as string) &&
              (candidate.item_code === item.item_code || candidate.item_name === item.item_name));
          return mainItem?.unit_rate ?? item.unit_rate;
        })(),
        main_boq_item_id: item.main_boq_item_id || null,
        main_boq_item_value: (() => {
          const mainItem = item.main_boq_item_id ? mainBoqItemById.get(item.main_boq_item_id) : item;
          return (Number(mainItem?.quantity) || 0) * (Number(mainItem?.unit_rate) || 0);
        })(),
      },
    }));
    relationshipOptions.predecessor_item = data.schedules.map((activity: any) => ({
      value: activity.id,
      label: `${activity.activity_code || 'ACT'} - ${activity.activity || activity.id}`,
      data: { project_id: activity.project_id, contract_id: activity.contract_id },
    }));
    if (activeView === 'costs' || activeView === 'costEntries' || activeView === 'schedule') {
      const mainContractIds = new Set(data.contracts
        .filter((contract: any) => !contract.parent_main_contract_id)
        .map((contract) => contract.id));
      // Costs are always loaded to the project/main-contract scope. A
      // subcontract is represented through its live WIR-derived cost entry.
      relationshipOptions.contract_id = relationshipOptions.contract_id
        .filter((option) => mainContractIds.has(option.value));
      relationshipOptions.boq_item_id = relationshipOptions.boq_item_id
        .filter((option) => mainContractIds.has(option.data?.contract_id));
    }
    if (activeView === 'schedule') {
      relationshipOptions.project_id = data.projects.map((project) => ({
        value: project.id,
        label: project.project_code || project.id,
        data: { project_code: project.project_code },
      }));
    }
    if (activeView === 'contracts') {
      relationshipOptions.parent_main_contract_id = data.contracts.filter((contract) => !contract.parent_main_contract_id).map((contract) => {
        const prefix = `${contract.contract_number || 'CNT'}-SUB-`;
        const existingSuffixes = data.contracts
          .filter((child) => child.parent_main_contract_id === contract.id)
          .map((child) => Number(String(child.contract_number || '').replace(prefix, '')) || 0);
        const nextChildNumber = Math.max(0, ...existingSuffixes) + 1;
        return {
        value: contract.id,
        label: contract.contract_number || contract.id,
        data: {
          project_id: contract.project_id,
          project_code: projectById.get(contract.project_id)?.project_code,
          client: contract.client,
          contractor: contract.contractor,
          project_name: contract.project_name,
          contract_number: `${prefix}${String(nextChildNumber).padStart(3, '0')}`,
        },
      };
      });
    }
    if (activeView === 'subinvoices') {
      autoFillOptions.subcontractor = [...new Set(data.subInvoices.map((r: any) => r.subcontractor).filter(Boolean))];
    }
    if (activeView === 'clientinvoices') {
      autoFillOptions.client = [...new Set(data.clientInvoices.map((r: any) => r.client).filter(Boolean))];
    }
    if (activeView === 'laborDuty') {
      autoFillOptions.worker_name = [...new Set(data.laborDuty.map((r: any) => r.worker_name).filter(Boolean))];
      autoFillOptions.project_code = [...new Set(data.projects.map((r: any) => r.project_code).filter(Boolean))];
    }
    if (activeView === 'equipment') {
      autoFillOptions.equipment_name = [...new Set(data.equipment.map((r: any) => r.equipment_name).filter(Boolean))];
      autoFillOptions.project_code = [...new Set(data.projects.map((r: any) => r.project_code).filter(Boolean))];
    }

    return (
      <DataTableView
        tableName={tableName}
        title={title}
        icon={navItem?.icon || FolderKanban}
        data={viewData}
        columns={config.columns}
        filters={config.filters}
        projects={data.projects as Project[]}
        showProjectFilter={config.showProjectFilter}
        initialProjectId={workspaceProjectId || undefined}
        showProjectColumn={tableName !== 'contracts'}
        projectPickerInForm={!['contracts', 'boq_headers', 'boq_items', 'client_invoices', 'subcontractor_invoices'].includes(tableName)}
        dateRangeColumn={config.dateRangeColumn}
        boqItems={data.boqItems}
        contracts={data.contracts}
        dateWarning={tableName === 'schedules' ? (activity) => {
          const contract = contractsWithModifiedValue.find((row: any) => row.id === activity.contract_id) as any;
          const revisedEnd = contract?.revised_end_date || contract?.end_date;
          const boqSummary = data.schedules.find((row: any) => row.boq_item_id === activity.boq_item_id && !String(row.activity || '').trim() && row.id !== activity.id) as any;
          if (boqSummary?.end_date && activity.end_date && String(activity.end_date) > String(boqSummary.end_date)) {
            return `Activity finish ${activity.end_date} is later than the current BOQ finish ${boqSummary.end_date}; the BOQ total row will be extended and the item is delayed against its former plan.`;
          }
          return revisedEnd && activity.end_date && String(activity.end_date) > String(revisedEnd)
            ? `Activity finish ${activity.end_date} is later than the revised contract finish ${revisedEnd}.`
            : null;
        } : undefined}
        onMutated={(mutation) => {
          data.applyLocalMutation(tableName, mutation);
          if (tableName === 'contracts') {
            void syncMainContractProjectDates(mutation).catch((error) =>
              alert(`Failed to synchronize project dates: ${error.message || 'Unknown error'}`),
            );
          }
          if (tableName === 'client_invoices') void data.reloadInvoiceTracking('client_invoice_tracking');
          if (tableName === 'subcontractor_invoices') void data.reloadInvoiceTracking('subcontractor_invoice_tracking');
          if (tableName === 'wir_entries') {
            if (mutation.type === 'insertMany') {
              mutation.rows.forEach((row) => void syncSubcontractWirCost({ type: 'insert', row }).catch((error) => alert(`Failed to synchronize subcontractor cost: ${error.message || 'Unknown error'}`)));
            } else {
              void syncSubcontractWirCost(mutation).catch((error) => alert(`Failed to synchronize subcontractor cost: ${error.message || 'Unknown error'}`));
            }
          }
          if (tableName === 'procurement' || tableName === 'labor_duty' || tableName === 'equipment') {
            const sourceTable = tableName as 'procurement' | 'labor_duty' | 'equipment';
            if (mutation.type === 'insertMany') {
              mutation.rows.forEach((row) => void syncOperationalCost(sourceTable, { type: 'insert', row }).catch((error) => alert(`Failed to synchronize ${sourceTable} cost: ${error.message || 'Unknown error'}`)));
            } else {
              void syncOperationalCost(sourceTable, mutation).catch((error) => alert(`Failed to synchronize ${sourceTable} cost: ${error.message || 'Unknown error'}`));
            }
          }
        }}
        autoFillOptions={autoFillOptions}
        relationshipOptions={relationshipOptions}
        relationshipAutoFillFields={projectCodeBackedTables.has(tableName) ? ['project_code'] : undefined}
        canAdd={tableName !== 'projects' && tableName !== 'progress_entries'}
        progressWirs={tableName === 'progress_entries' ? derivedWirs : undefined}
        formColumns={['client_invoices', 'subcontractor_invoices'].includes(tableName) ? INVOICE_GENERATION_FORM_COLUMNS : undefined}
        onInsert={tableName === 'schedules' ? async (scheduleRow) => {
          const contract = data.contracts.find((item: any) => item.id === scheduleRow.contract_id) as any;
          if (!contract || contract.parent_main_contract_id) {
            throw new Error('Select a main contract before saving the schedule activity.');
          }
          const item = data.boqItems.find((candidate: any) => candidate.id === scheduleRow.boq_item_id) as any;
          if (!item) throw new Error('Select a BOQ item for the selected main contract.');
          const header = data.boqHeaders.find((candidate: any) => candidate.id === item.boq_header_id) as any;
          if (header?.contract_id !== contract.id) {
            throw new Error('The selected BOQ item does not belong to the selected main contract.');
          }
          if (!String(scheduleRow.activity || '').trim()) {
            throw new Error('Activity Name is required. A new Schedule row is always an activity under the selected BOQ item.');
          }
          const start = scheduleRow.start_date ? new Date(`${scheduleRow.start_date}T00:00:00`) : null;
          const end = scheduleRow.end_date ? new Date(`${scheduleRow.end_date}T00:00:00`) : null;
          const calculatedDuration = start && end
            ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
            : Number(scheduleRow.duration_days) || 0;
          const plannedQuantity = Number(scheduleRow.planned_quantity) || 0;
          if (plannedQuantity <= 0) throw new Error('Planned quantity must be greater than zero.');
          const alreadyPlanned = data.schedules
            .filter((activity: any) => activity.boq_item_id === item.id && String(activity.activity || '').trim())
            .reduce((sum: number, activity: any) => sum + (Number(activity.planned_quantity) || 0), 0);
          const allowedQuantity = Number(item.quantity) || 0;
          if (alreadyPlanned + plannedQuantity > allowedQuantity + 0.000001) {
            throw new Error(`Planned quantity exceeds BOQ quantity: existing activities ${alreadyPlanned.toLocaleString()} + new ${plannedQuantity.toLocaleString()} = ${(alreadyPlanned + plannedQuantity).toLocaleString()}, while BOQ allows ${allowedQuantity.toLocaleString()}.`);
          }
          const plannedValue = Math.round(plannedQuantity * (Number(item.unit_rate) || 0) * 100) / 100;
          const activityNumber = data.schedules
            .filter((activity: any) => activity.boq_item_id === item.id && String(activity.activity || '').trim())
            .length + 1;
          const generatedActivityCode = `${item.item_code || 'ITEM'}-ACT-${String(activityNumber).padStart(3, '0')}`;
          return dataRepository.insert<Record<string, any>>('schedules', {
            ...scheduleRow,
            project_id: contract.project_id,
            project_code: projectById.get(contract.project_id)?.project_code || scheduleRow.project_code || '',
            boq_header_id: item.boq_header_id || null,
            boq_code: header?.boq_code || item.boq_code || '',
            boq_item_code: item.item_code || '',
            boq_item_name: item.item_name || item.description || '',
            duration_days: calculatedDuration,
            unit_rate: Number(item.unit_rate) || 0,
            planned_quantity: plannedQuantity,
            budget: plannedValue,
            planned_value: plannedValue,
            activity_code: scheduleRow.activity_code || generatedActivityCode,
            schedule_row_type: 'activity',
          });
        } : tableName === 'contracts' ? async (contractRow) => {
          // Project Code is entered with a contract because the main contract
          // creates the project. It belongs to Projects, not Contracts.
          // Modified Contract Value is calculated from variations and is not
          // a stored contract field.
          const { project_code: enteredProjectCode, modified_contract_value: _modifiedValue, ...contractRecord } = contractRow;
          const isSubcontract = contractRow.contract_role === 'Subcontract';
          if (isSubcontract && !contractRow.parent_main_contract_id) {
            throw new Error('Select the main contract for this subcontract.');
          }
          if (!isSubcontract && contractRow.parent_main_contract_id) {
            throw new Error('A main contract cannot have a parent contract. Select Subcontract first.');
          }
          if (isSubcontract) {
            return dataRepository.insert<Record<string, any>>("contracts", contractRecord);
          }
          const projectName = String(contractRow.project_name || '').trim();
          if (!projectName) throw new Error('Project Name is required when creating a main contract.');

          const projectDraft = prepareCodeControlledInsert('projects', {
            name: projectName,
            client: contractRow.client || '',
            contractor: contractRow.contractor || contractRow.company || '',
            status: contractRow.status || 'Planning',
            start_date: contractRow.start_date || null,
            end_date: contractRow.end_date || null,
            project_code: enteredProjectCode || '',
          }, data.projects as Record<string, any>[]);
          const project = await dataRepository.insert<Record<string, any>>('projects', projectDraft);
          try {
            const contract = await dataRepository.insert<Record<string, any>>('contracts', {
              ...contractRecord,
              project_id: project.id,
            });
            data.applyLocalMutation('projects', { type: 'insert', row: project });
            return contract;
          } catch (error) {
            await dataRepository.delete('projects', project.id);
            throw error;
          }
        } : tableName === 'client_invoices' || tableName === 'subcontractor_invoices'
          ? async (invoiceDraft) => createInvoiceFromWir(tableName, invoiceDraft)
          : undefined}
        onDeleteGroup={tableName === 'client_invoices' || tableName === 'subcontractor_invoices'
          ? async (invoiceRow) => deleteInvoiceGroup(tableName, invoiceRow)
          : undefined}
        deleteGroupKey={tableName === 'client_invoices' || tableName === 'subcontractor_invoices' ? 'invoice_number' : undefined}
        addButtonLabel={tableName === 'client_invoices' || tableName === 'subcontractor_invoices' ? 'Create Invoice' : undefined}
        submitLabel={tableName === 'client_invoices' || tableName === 'subcontractor_invoices' ? 'Save Invoice' : undefined}
        createDraft={tableName === 'contracts' ? () => ({
          contract_role: 'Main Contract',
          ...createCodeDraft('contracts', data.contracts as Record<string, any>[]),
          ...createCodeDraft('projects', data.projects as Record<string, any>[]),
        }) : undefined}
      />
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-neutral-800 flex flex-col transition-transform duration-300 no-print`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">BuildTrack</h1>
              <p className="text-xs text-neutral-400">Construction Mgmt</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-1.5">{group}</p>
              {NAV_ITEMS.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { setActiveView(item.key); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-white' : 'text-neutral-400'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-700">
          <p className="text-xs text-neutral-500 text-center">BuildTrack v1.0</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-neutral-100">
            <Menu size={20} className="text-neutral-600" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-primary-600" />
            <span className="text-sm font-bold text-neutral-900">BuildTrack</span>
          </div>
          <div className="w-7" />
        </div>

        {/* Content */}
        {data.loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px' }} />
              <p className="text-sm text-neutral-500">Loading data...</p>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </div>
    </div>
  );
}
