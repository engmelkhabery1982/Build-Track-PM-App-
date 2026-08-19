import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, FolderKanban, SquareCheck as CheckSquare, DollarSign, Package, ShieldAlert, TrendingUp, CalendarClock, Signature as FileSignature, ClipboardList, Banknote, Receipt, FileText, GitBranch, FolderOpen, FileCheck as FileCheck2, Building2, Menu, ListOrdered, HardHat, Wrench, ClipboardCheck, Layers, Download, Bell, CircleAlert, BrainCircuit } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { createCodeDraft, dataRepository, prepareCodeControlledInsert } from '@/data';
import { Dashboard } from '@/components/Dashboard';
import { DataTableView, type ColumnDef, type FilterDef, type SelectOption } from '@/components/DataTableView';
import { ReportTemplateDesigner } from '@/components/ReportTemplateDesigner';
import { PmoInsights } from '@/components/PmoInsights';
import { DataEntryWorkspace } from '@/components/DataEntryWorkspace';
import { CommandPalette } from '@/components/CommandPalette';
import { WorkQueue } from '@/components/WorkQueue';
import { AuditTrailExplorer } from '@/components/AuditTrailExplorer';
import type { ViewKey, Project } from '@/types';
import { addCalendarDays, distributedPlannedValueToDate, scheduleBudget, schedulePlannedValueToDate } from '@/utils/schedulePlanning';

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;
const NAV_ITEMS: { key: ViewKey; label: string; icon: IconType; group: string }[] = [
  { key: 'dashboard', label: 'PMO Command Center', icon: LayoutDashboard, group: 'Executive' },
  { key: 'alerts', label: 'PMO Alerts', icon: Bell, group: 'Executive' },
  { key: 'dataQuality', label: 'Data Quality Checks', icon: CircleAlert, group: 'Executive' },
  { key: 'workQueue', label: 'My Work Queue', icon: CheckSquare, group: 'Executive' },
  { key: 'dataEntry', label: 'Guided Data Entry', icon: ClipboardList, group: 'Planning & Controls' },
  { key: 'insights', label: 'PMO Insights', icon: BrainCircuit, group: 'Executive' },
  { key: 'portfolio', label: 'Project Portfolio', icon: Layers, group: 'Executive' },
  { key: 'projects', label: 'Project Workspace', icon: FolderKanban, group: 'Executive' },
  { key: 'baselines', label: 'Baselines', icon: ClipboardList, group: 'Executive' },
  { key: 'reportingPeriods', label: 'Reporting Periods', icon: CalendarClock, group: 'Executive' },
  { key: 'snapshots', label: 'PMO Snapshots', icon: FileCheck2, group: 'Executive' },
  { key: 'users', label: 'Users & Roles', icon: Building2, group: 'Executive' },
  { key: 'boq', label: 'BOQ Headers', icon: ClipboardList, group: 'Planning & Controls' },
  { key: 'boqItems', label: 'BOQ Items', icon: ListOrdered, group: 'Planning & Controls' },
  { key: 'schedule', label: 'Schedule & Activities', icon: CalendarClock, group: 'Planning & Controls' },
  { key: 'scheduleDistributions', label: 'Planned Quantity Distribution', icon: CalendarClock, group: 'Planning & Controls' },
  { key: 'wir', label: 'Inspection Requests', icon: FileCheck2, group: 'Planning & Controls' },
  { key: 'progress', label: 'WIR & Progress', icon: TrendingUp, group: 'Planning & Controls' },
  { key: 'contracts', label: 'Contracts', icon: FileSignature, group: 'Commercial & Cash' },
  { key: 'variations', label: 'Variations', icon: GitBranch, group: 'Commercial & Cash' },
  { key: 'clientinvoices', label: 'Client Invoices', icon: FileText, group: 'Commercial & Cash' },
  { key: 'subinvoices', label: 'Subcontractor Invoices', icon: Receipt, group: 'Commercial & Cash' },
  { key: 'clientInvoiceTracking', label: 'Client Invoice Tracking', icon: ClipboardCheck, group: 'Commercial & Cash' },
  { key: 'subcontractorInvoiceTracking', label: 'Sub Invoice Tracking', icon: ClipboardCheck, group: 'Commercial & Cash' },
  { key: 'cashflow', label: 'Cash Flow', icon: Banknote, group: 'Commercial & Cash' },
  { key: 'parties', label: 'Clients, Vendors & Subcontractors', icon: Building2, group: 'Commercial & Cash' },
  { key: 'partyContacts', label: 'Party Contacts', icon: ClipboardList, group: 'Commercial & Cash' },
  { key: 'rateHistory', label: 'Rate History', icon: DollarSign, group: 'Commercial & Cash' },
  { key: 'reportTemplates', label: 'Report Templates', icon: FileText, group: 'Commercial & Cash' },
  { key: 'costs', label: 'Cost Control', icon: DollarSign, group: 'Cost & Resources' },
  { key: 'costEntries', label: 'Cost Entries', icon: ListOrdered, group: 'Cost & Resources' },
  { key: 'procurement', label: 'Procurement', icon: Package, group: 'Cost & Resources' },
  { key: 'laborDuty', label: 'Labor Duty', icon: HardHat, group: 'Cost & Resources' },
  { key: 'equipment', label: 'Equipment', icon: Wrench, group: 'Cost & Resources' },
  { key: 'tasks', label: 'Tasks & Actions', icon: CheckSquare, group: 'Field & Governance' },
  { key: 'governance', label: 'Risk, Issue & Decision Register', icon: ShieldAlert, group: 'Field & Governance' },
  { key: 'approvals', label: 'Approvals', icon: ClipboardCheck, group: 'Field & Governance' },
  { key: 'auditLog', label: 'Audit Trail', icon: FileCheck2, group: 'Field & Governance' },
  { key: 'rfi', label: 'RFI Register', icon: FileText, group: 'Field & Governance' },
  { key: 'submittals', label: 'Submittals', icon: ClipboardList, group: 'Field & Governance' },
  { key: 'quality', label: 'NCR & Punch Register', icon: ClipboardCheck, group: 'Field & Governance' },
  { key: 'safety', label: 'Safety', icon: ShieldAlert, group: 'Field & Governance' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, group: 'Field & Governance' },
  { key: 'tracking', label: 'Tracking Sheet', icon: ClipboardCheck, group: 'Field & Governance' },
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

const BASELINE_COLUMNS: ColumnDef[] = [
  { key: 'baseline_number', label: 'Baseline #', type: 'text', editable: true },
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'baseline_date', label: 'Approval Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved', 'Superseded'] },
  { key: 'original_contract_value', label: 'Original Contract', type: 'money', editable: true },
  { key: 'approved_variation_value', label: 'Approved Variations', type: 'money', editable: true },
  { key: 'modified_contract_value', label: 'Modified Contract', type: 'money', editable: true },
  { key: 'planned_budget', label: 'Planned Budget', type: 'money', editable: true },
  { key: 'planned_start_date', label: 'Planned Start', type: 'date', editable: true },
  { key: 'planned_end_date', label: 'Planned Finish', type: 'date', editable: true },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const BASELINE_FORM_COLUMNS: ColumnDef[] = [
  { key: 'baseline_number', label: 'Baseline #', type: 'text', editable: true },
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'baseline_date', label: 'Approval Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved'] },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const REPORTING_PERIOD_COLUMNS: ColumnDef[] = [
  { key: 'period_name', label: 'Period Name', type: 'text', editable: true },
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'start_date', label: 'Period Start', type: 'date', editable: true },
  { key: 'end_date', label: 'Period End', type: 'date', editable: true },
  { key: 'data_date', label: 'Data Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Open', 'Locked', 'Closed'] },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const SNAPSHOT_COLUMNS: ColumnDef[] = [
  { key: 'snapshot_name', label: 'Snapshot Name', type: 'text', editable: true }, { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true }, { key: 'data_date', label: 'Data Date', type: 'date', editable: true }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved', 'Archived'] }, { key: 'planned_value', label: 'PV', type: 'money', editable: false }, { key: 'earned_value', label: 'EV', type: 'money', editable: false }, { key: 'actual_cost', label: 'AC', type: 'money', editable: false }, { key: 'cpi', label: 'CPI', type: 'number', editable: false }, { key: 'spi', label: 'SPI', type: 'number', editable: false }, { key: 'eac', label: 'EAC', type: 'money', editable: false }, { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const USER_COLUMNS: ColumnDef[] = [
  { key: 'username', label: 'Username', type: 'text', editable: true }, { key: 'display_name', label: 'Display Name', type: 'text', editable: true }, { key: 'role', label: 'Role', type: 'status', editable: true, options: ['PMO Admin', 'Project Manager', 'Commercial Manager', 'Site Engineer', 'Executive Viewer'] }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Disabled'] }, { key: 'last_login_at', label: 'Last Login', type: 'date', editable: false },
];
const USER_FORM_COLUMNS: ColumnDef[] = [
  { key: 'username', label: 'Username', type: 'text', editable: true },
  { key: 'display_name', label: 'Display Name', type: 'text', editable: true },
  { key: 'role', label: 'Role', type: 'status', editable: true, options: ['PMO Admin', 'Project Manager', 'Commercial Manager', 'Site Engineer', 'Executive Viewer'] },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Disabled'] },
  { key: 'initial_password', label: 'Initial Password (min. 8 characters)', type: 'password', editable: true },
];
const USER_EDIT_COLUMNS: ColumnDef[] = [
  { key: 'username', label: 'Username', type: 'text', editable: true },
  { key: 'display_name', label: 'Display Name', type: 'text', editable: true },
  { key: 'role', label: 'Role', type: 'status', editable: true, options: ['PMO Admin', 'Project Manager', 'Commercial Manager', 'Site Engineer', 'Executive Viewer'] },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Disabled'] },
  { key: 'new_password', label: 'Reset Password (leave blank to keep current)', type: 'password', editable: true },
];

const GOVERNANCE_COLUMNS: ColumnDef[] = [
  { key: 'reference_number', label: 'Reference #', type: 'text', editable: true },
  { key: 'record_type', label: 'Record Type', type: 'status', editable: true, options: ['Risk', 'Issue', 'Decision', 'Opportunity'] },
  { key: 'title', label: 'Title', type: 'text', editable: true },
  { key: 'contract_id', label: 'Contract', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true, options: ['Commercial', 'Cost', 'Schedule', 'Quality', 'Safety', 'Procurement', 'Design', 'Stakeholder', 'Other'] },
  { key: 'probability', label: 'Probability', type: 'status', editable: true, options: ['Low', 'Medium', 'High', 'Critical'] },
  { key: 'impact', label: 'Impact', type: 'status', editable: true, options: ['Low', 'Medium', 'High', 'Critical'] },
  { key: 'exposure_value', label: 'Exposure Value', type: 'money', editable: true },
  { key: 'owner', label: 'Owner', type: 'text', editable: true },
  { key: 'due_date', label: 'Due Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Open', 'Mitigating', 'Escalated', 'Approved', 'Closed'] },
  { key: 'action_plan', label: 'Action / Decision', type: 'text', editable: true },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const APPROVAL_COLUMNS: ColumnDef[] = [
  { key: 'request_number', label: 'Request #', type: 'text', editable: true }, { key: 'entity_type', label: 'Subject Type', type: 'text', editable: true, options: ['Variation', 'Baseline', 'Invoice', 'Risk Decision', 'Document'] }, { key: 'entity_id', label: 'Subject Reference', type: 'text', editable: true }, { key: 'title', label: 'Title', type: 'text', editable: true }, { key: 'contract_id', label: 'Contract', type: 'select', editable: true }, { key: 'requested_by', label: 'Requested By', type: 'text', editable: true }, { key: 'requested_date', label: 'Requested Date', type: 'date', editable: true }, { key: 'approver', label: 'Approver', type: 'text', editable: true }, { key: 'decision_date', label: 'Decision Date', type: 'date', editable: true }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Returned'] }, { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const AUDIT_COLUMNS: ColumnDef[] = [
  { key: 'created_at', label: 'Timestamp', type: 'date', editable: false }, { key: 'action', label: 'Action', type: 'status', editable: false }, { key: 'entity_type', label: 'Entity', type: 'text', editable: false }, { key: 'entity_id', label: 'Record ID', type: 'text', editable: false }, { key: 'actor', label: 'Actor', type: 'text', editable: false }, { key: 'summary', label: 'Summary', type: 'text', editable: false },
];
const RFI_COLUMNS: ColumnDef[] = [
  { key: 'rfi_number', label: 'RFI #', type: 'text', editable: true }, { key: 'subject', label: 'Subject', type: 'text', editable: true }, { key: 'contract_id', label: 'Contract', type: 'select', editable: true }, { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true }, { key: 'raised_by', label: 'Raised By', type: 'text', editable: true }, { key: 'raised_date', label: 'Raised Date', type: 'date', editable: true }, { key: 'due_date', label: 'Due Date', type: 'date', editable: true }, { key: 'response', label: 'Response', type: 'text', editable: true }, { key: 'response_date', label: 'Response Date', type: 'date', editable: true }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Open', 'Answered', 'Closed'] }, { key: 'impact', label: 'Impact', type: 'status', editable: true, options: ['None', 'Cost', 'Time', 'Cost & Time'] }, { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const SUBMITTAL_COLUMNS: ColumnDef[] = [
  { key: 'submittal_number', label: 'Submittal #', type: 'text', editable: true }, { key: 'title', label: 'Title', type: 'text', editable: true }, { key: 'document_type', label: 'Type', type: 'status', editable: true, options: ['Material', 'Shop Drawing', 'Method Statement', 'Sample', 'Calculation', 'Other'] }, { key: 'contract_id', label: 'Contract', type: 'select', editable: true }, { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true }, { key: 'submitted_by', label: 'Submitted By', type: 'text', editable: true }, { key: 'submitted_date', label: 'Submitted Date', type: 'date', editable: true }, { key: 'reviewer', label: 'Reviewer', type: 'text', editable: true }, { key: 'response_date', label: 'Response Date', type: 'date', editable: true }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Submitted', 'Approved', 'Approved as Noted', 'Revise & Resubmit', 'Rejected'] }, { key: 'revision', label: 'Revision', type: 'text', editable: true }, { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const QUALITY_COLUMNS: ColumnDef[] = [
  { key: 'reference_number', label: 'Reference #', type: 'text', editable: true }, { key: 'record_type', label: 'Type', type: 'status', editable: true, options: ['NCR', 'Punch Item', 'Observation'] }, { key: 'title', label: 'Title', type: 'text', editable: true }, { key: 'contract_id', label: 'Contract', type: 'select', editable: true }, { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true }, { key: 'location', label: 'Location', type: 'text', editable: true }, { key: 'raised_date', label: 'Raised Date', type: 'date', editable: true }, { key: 'owner', label: 'Owner', type: 'text', editable: true }, { key: 'due_date', label: 'Due Date', type: 'date', editable: true }, { key: 'closed_date', label: 'Closed Date', type: 'date', editable: true }, { key: 'severity', label: 'Severity', type: 'status', editable: true, options: ['Low', 'Medium', 'High', 'Critical'] }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Open', 'In Progress', 'Verified', 'Closed'] }, { key: 'corrective_action', label: 'Corrective Action', type: 'text', editable: true }, { key: 'notes', label: 'Notes', type: 'text', editable: true },
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
  { key: 'supplier_party_id', label: 'Supplier Master Record', type: 'select', editable: true },
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
  { key: 'variance_reason', label: 'Date Variance Reason', type: 'text', editable: true },
  { key: 'status', label: 'EVM Status', type: 'evm', editable: false },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const SCHEDULE_DISTRIBUTION_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true },
  { key: 'schedule_id', label: 'Activity ID', type: 'text', editable: true },
  { key: 'activity_name', label: 'Activity', type: 'text', editable: true },
  { key: 'period_start', label: 'Period Start', type: 'date', editable: true },
  { key: 'period_end', label: 'Period End', type: 'date', editable: true },
  { key: 'planned_quantity', label: 'Planned Qty', type: 'number', editable: true },
  { key: 'unit', label: 'Unit', type: 'text', editable: true },
  { key: 'unit_rate', label: 'Main Unit Rate', type: 'money', editable: true },
  { key: 'planned_value', label: 'Planned Value', type: 'money', editable: true },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const CONTRACT_COLUMNS: ColumnDef[] = [
  { key: 'contract_role', label: 'Contract Role', type: 'status', editable: true, options: ['Main Contract', 'Subcontract'] },
  { key: 'project_code', label: 'Project Code', type: 'text', editable: true },
  { key: 'contract_number', label: 'Contract Code', type: 'text', editable: true },
  { key: 'parent_main_contract_id', label: 'Parent Main Contract', type: 'select', editable: true },
  { key: 'title', label: 'Title', type: 'text', editable: true },
  { key: 'project_name', label: 'Project Name', type: 'text', editable: true },
  { key: 'client_party_id', label: 'Client Master Record', type: 'select', editable: true },
  { key: 'client', label: 'Client', type: 'text', editable: true },
  { key: 'contractor_party_id', label: 'Contractor Master Record', type: 'select', editable: true },
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
  { key: 'baseline_start_date', label: 'Baseline Start', type: 'date', editable: true },
  { key: 'baseline_end_date', label: 'Baseline Finish', type: 'date', editable: true },
  { key: 'planned_start_date', label: 'Current Plan Start', type: 'date', editable: true },
  { key: 'planned_end_date', label: 'Current Plan Finish', type: 'date', editable: true },
  { key: 'variance_reason', label: 'Schedule Variance Reason', type: 'text', editable: true },
];

const PARTY_COLUMNS: ColumnDef[] = [
  { key: 'party_code', label: 'Party Code', type: 'text', editable: true },
  { key: 'legal_name', label: 'Legal Name', type: 'text', editable: true },
  { key: 'trading_name', label: 'Trading Name', type: 'text', editable: true },
  { key: 'party_type', label: 'Type', type: 'status', editable: true, options: ['Client', 'Supplier', 'Contractor', 'Subcontractor', 'Consultant'] },
  { key: 'tax_number', label: 'Tax Number', type: 'text', editable: true },
  { key: 'registration_number', label: 'Registration #', type: 'text', editable: true },
  { key: 'payment_terms_days', label: 'Payment Terms (days)', type: 'number', editable: true },
  { key: 'phone', label: 'Phone', type: 'text', editable: true },
  { key: 'email', label: 'Email', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Inactive'] },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const PARTY_CONTACT_COLUMNS: ColumnDef[] = [
  { key: 'party_id', label: 'Party', type: 'select', editable: true },
  { key: 'contact_name', label: 'Contact Name', type: 'text', editable: true },
  { key: 'job_title', label: 'Job Title', type: 'text', editable: true },
  { key: 'phone', label: 'Phone', type: 'text', editable: true },
  { key: 'email', label: 'Email', type: 'text', editable: true },
  { key: 'is_primary', label: 'Primary', type: 'boolean', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Inactive'] },
];

const RATE_HISTORY_COLUMNS: ColumnDef[] = [
  { key: 'party_id', label: 'Party', type: 'select', editable: true },
  { key: 'item_code', label: 'Item / BOQ Code', type: 'text', editable: true },
  { key: 'item_description', label: 'Item Description', type: 'text', editable: true },
  { key: 'unit', label: 'Unit', type: 'text', editable: true },
  { key: 'unit_rate', label: 'Unit Rate', type: 'money', editable: true },
  { key: 'currency', label: 'Currency', type: 'text', editable: true, options: ['SAR', 'USD', 'AED', 'EGP', 'EUR'] },
  { key: 'effective_date', label: 'Effective Date', type: 'date', editable: true },
  { key: 'source_reference', label: 'Source Reference', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Active', 'Historical', 'Superseded'] },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];

const CASHFLOW_COLUMNS: ColumnDef[] = [
  { key: 'contract_id', label: 'Contract Code', type: 'select', editable: true },
  { key: 'movement_type', label: 'Movement Type', type: 'status', editable: true, options: ['Forecast', 'Actual', 'Manual'] },
  { key: 'date', label: 'Date', type: 'date', editable: true },
  { key: 'description', label: 'Description', type: 'text', editable: true },
  { key: 'category', label: 'Category', type: 'text', editable: true },
  { key: 'inflow', label: 'Inflow', type: 'money', editable: true },
  { key: 'outflow', label: 'Outflow', type: 'money', editable: true },
  { key: 'net', label: 'Net', type: 'money' },
  { key: 'cumulative_balance', label: 'Cumulative (Type)', type: 'money', editable: false },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Open', 'Settled', 'Cancelled'] },
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
  { key: 'boq_item_id', label: 'BOQ Item', type: 'select', editable: true },
  { key: 'document_name', label: 'Name', type: 'text', editable: true },
  { key: 'document_type', label: 'Type', type: 'status', editable: true, options: DOC_TYPES },
  { key: 'category', label: 'Category', type: 'text', editable: true },
  { key: 'version', label: 'Version', type: 'text', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: DOC_STATUSES },
  { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
  { key: 'upload_date', label: 'Upload Date', type: 'date', editable: true },
  { key: 'related_record_type', label: 'Related Record Type', type: 'status', editable: true, options: ['RFI', 'Submittal', 'NCR', 'Punch Item', 'Variation', 'WIR', 'Other'] },
  { key: 'related_record_reference', label: 'Related Record #', type: 'text', editable: true },
  { key: 'file_reference', label: 'Local File / URL Reference', type: 'text', editable: true },
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
  { key: 'variance_reason', label: 'Date Variance Reason', type: 'text', editable: true },
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
  baselines: { columns: BASELINE_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Approved', 'Superseded'] }], showProjectFilter: true, dateRangeColumn: 'baseline_date' },
  reportingPeriods: { columns: REPORTING_PERIOD_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Open', 'Locked', 'Closed'] }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  snapshots: { columns: SNAPSHOT_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Approved', 'Archived'] }], showProjectFilter: true, dateRangeColumn: 'data_date' },
  users: { columns: USER_COLUMNS, filters: [{ key: 'role', label: 'Role', options: ['PMO Admin', 'Project Manager', 'Commercial Manager', 'Site Engineer', 'Executive Viewer'] }, { key: 'status', label: 'Status', options: ['Active', 'Disabled'] }] },
  governance: { columns: GOVERNANCE_COLUMNS, filters: [{ key: 'record_type', label: 'Type', options: ['Risk', 'Issue', 'Decision', 'Opportunity'] }, { key: 'status', label: 'Status', options: ['Open', 'Mitigating', 'Escalated', 'Approved', 'Closed'] }], showProjectFilter: true, dateRangeColumn: 'due_date' },
  approvals: { columns: APPROVAL_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Returned'] }], showProjectFilter: true, dateRangeColumn: 'requested_date' },
  auditLog: { columns: AUDIT_COLUMNS, filters: [{ key: 'action', label: 'Action', options: ['Insert', 'Update', 'Delete'] }, { key: 'entity_type', label: 'Entity', options: [] }], showProjectFilter: true, dateRangeColumn: 'created_at' },
  rfi: { columns: RFI_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Open', 'Answered', 'Closed'] }, { key: 'impact', label: 'Impact', options: ['None', 'Cost', 'Time', 'Cost & Time'] }], showProjectFilter: true, dateRangeColumn: 'raised_date' },
  submittals: { columns: SUBMITTAL_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Draft', 'Submitted', 'Approved', 'Approved as Noted', 'Revise & Resubmit', 'Rejected'] }], showProjectFilter: true, dateRangeColumn: 'submitted_date' },
  quality: { columns: QUALITY_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Open', 'In Progress', 'Verified', 'Closed'] }, { key: 'severity', label: 'Severity', options: ['Low', 'Medium', 'High', 'Critical'] }], showProjectFilter: true, dateRangeColumn: 'raised_date' },
  tasks: { columns: TASK_COLUMNS, filters: [{ key: 'status', label: 'Status', options: TASK_STATUSES }, { key: 'priority', label: 'Priority', options: PRIORITIES }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  costs: { columns: COST_COLUMNS, filters: [{ key: 'category', label: 'Cost Type', options: COST_TYPES }], showProjectFilter: true },
  costEntries: { columns: COST_ENTRY_COLUMNS, filters: [{ key: 'cost_type', label: 'Cost Type', options: COST_TYPES }], showProjectFilter: true, dateRangeColumn: 'date' },
  procurement: { columns: PROCUREMENT_COLUMNS, filters: [{ key: 'status', label: 'Status', options: PROC_STATUSES }], showProjectFilter: true, dateRangeColumn: 'order_date' },
  safety: { columns: SAFETY_COLUMNS, filters: [{ key: 'status', label: 'Status', options: SAFETY_STATUSES }, { key: 'severity', label: 'Severity', options: SAFETY_SEVERITIES }, { key: 'type', label: 'Type', options: SAFETY_TYPES }], showProjectFilter: true, dateRangeColumn: 'date' },
  progress: { columns: PROGRESS_COLUMNS, filters: [{ key: 'company_name', label: 'Contractor', options: [] }], showProjectFilter: true, dateRangeColumn: 'date' },
  schedule: { columns: SCHEDULE_COLUMNS, filters: [{ key: 'boq_item_name', label: 'BOQ Item', options: [] }, { key: 'is_critical_item', label: 'Critical', options: ['true', 'false'] }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  scheduleDistributions: { columns: SCHEDULE_DISTRIBUTION_COLUMNS, filters: [{ key: 'activity_name', label: 'Activity', options: [] }], showProjectFilter: true, dateRangeColumn: 'period_start' },
  contracts: { columns: CONTRACT_COLUMNS, filters: [{ key: 'contractor', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'status', label: 'Status', options: CONTRACT_STATUSES }], showProjectFilter: true, dateRangeColumn: 'start_date' },
  boq: { columns: BOQ_HEADER_COLUMNS, filters: [{ key: 'company_name', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'classification', label: 'Classification', options: BOQ_CLASSIFICATIONS }], showProjectFilter: true },
  boqItems: { columns: BOQ_ITEM_COLUMNS, filters: [{ key: 'company_name', label: 'Company', options: [] }, { key: 'contract_role', label: 'Contract Role', options: ['Main Contract', 'Subcontract'] }, { key: 'category', label: 'Category', options: ['Earthworks', 'Concrete', 'Steel', 'Masonry', 'Finishes', 'MEP', 'Other'] }], showProjectFilter: true },
  cashflow: { columns: CASHFLOW_COLUMNS, filters: [{ key: 'movement_type', label: 'Movement Type', options: ['Forecast', 'Actual', 'Manual'] }, { key: 'status', label: 'Status', options: ['Open', 'Settled', 'Cancelled'] }], showProjectFilter: true, dateRangeColumn: 'date' },
  parties: { columns: PARTY_COLUMNS, filters: [{ key: 'party_type', label: 'Type', options: ['Client', 'Supplier', 'Contractor', 'Subcontractor', 'Consultant'] }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }] },
  partyContacts: { columns: PARTY_CONTACT_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Active', 'Inactive'] }] },
  rateHistory: { columns: RATE_HISTORY_COLUMNS, filters: [{ key: 'status', label: 'Status', options: ['Active', 'Historical', 'Superseded'] }], dateRangeColumn: 'effective_date' },
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
  projects: 'projects', baselines: 'project_baselines', reportingPeriods: 'reporting_periods', snapshots: 'pmo_snapshots', users: 'app_users', governance: 'governance_register', approvals: 'approval_requests', auditLog: 'audit_log', rfi: 'rfi_register', submittals: 'submittals', quality: 'quality_register', tasks: 'tasks', costs: 'costs', costEntries: 'cost_entries',
  procurement: 'procurement', safety: 'safety', progress: 'progress_entries', scheduleDistributions: 'schedule_distributions',
  schedule: 'schedules', contracts: 'contracts', boq: 'boq_headers', boqItems: 'boq_items',
  cashflow: 'cash_flow', subinvoices: 'subcontractor_invoices', clientinvoices: 'client_invoices',
  clientInvoiceTracking: 'client_invoice_tracking', subcontractorInvoiceTracking: 'subcontractor_invoice_tracking',
  variations: 'variations', documents: 'documents', wir: 'wir_entries',
  laborDuty: 'labor_duty', equipment: 'equipment', tracking: 'tracking_sheet',
  parties: 'parties', partyContacts: 'party_contacts', rateHistory: 'rate_history',
};

const VIEW_TITLES: Record<string, string> = {
  projects: 'Projects', baselines: 'Baselines', reportingPeriods: 'Reporting Periods', snapshots: 'PMO Snapshots', users: 'Users & Roles', governance: 'Risk, Issue & Decision Register', approvals: 'Approvals', auditLog: 'Audit Trail', rfi: 'RFI Register', submittals: 'Submittals', quality: 'NCR & Punch Register', tasks: 'Tasks', costs: 'Cost Control', costEntries: 'Cost Entries',
  procurement: 'Procurement', safety: 'Safety Records', progress: 'Progress Entries', scheduleDistributions: 'Planned Quantity Distribution',
  schedule: 'Schedule', contracts: 'Contracts', boq: 'BOQ Headers', boqItems: 'BOQ Items',
  cashflow: 'Cash Flow', subinvoices: 'Subcontractor Invoices', clientinvoices: 'Client Invoices',
  clientInvoiceTracking: 'Client Invoice Tracking', subcontractorInvoiceTracking: 'Subcontractor Invoice Tracking',
  variations: 'Variations', documents: 'Documents', wir: 'Work Inspection Reports',
  laborDuty: 'Labor Duty', equipment: 'Equipment', tracking: 'Tracking Sheet',
  parties: 'Clients, Vendors & Subcontractors', partyContacts: 'Party Contacts', rateHistory: 'Rate History',
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [recentViews, setRecentViews] = useState<ViewKey[]>(() => {
    try { const stored = JSON.parse(localStorage.getItem('buildtrack:recent-views') || '[]'); return Array.isArray(stored) ? stored.slice(0, 5) : []; } catch { return []; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceProjectId, setWorkspaceProjectId] = useState('');
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('buildtrack:active-role') || 'PMO Admin');
  const [sessionUserId, setSessionUserId] = useState(() => localStorage.getItem('buildtrack:session-user') || '');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const data = useData();
  const synchronizingLiveSubcontractCosts = useRef(false);
  const synchronizingCostControl = useRef(false);
  const synchronizingProjectFinancials = useRef(false);
  const normalizingScheduleActivities = useRef(false);

  useEffect(() => { localStorage.setItem('buildtrack:active-role', activeRole); }, [activeRole]);
  useEffect(() => {
    setRecentViews((previous) => {
      const next = [activeView, ...previous.filter((view) => view !== activeView)].slice(0, 5);
      localStorage.setItem('buildtrack:recent-views', JSON.stringify(next));
      return next;
    });
  }, [activeView]);

  const hashPassword = async (password: string, salt?: string) => {
    const actualSalt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(actualSalt), iterations: 150000, hash: 'SHA-256' }, material, 256);
    return { salt: actualSalt, hash: Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, '0')).join('') };
  };

  const signIn = async () => {
    setLoginError('');
    try {
      if (!loginName.trim() || loginPassword.length < 8) throw new Error('Enter a username and a password of at least 8 characters.');
      if (data.users.length === 0) {
        const secured = await hashPassword(loginPassword);
        const user = await dataRepository.insert<Record<string, any>>('app_users', { username: loginName.trim(), display_name: loginName.trim(), role: 'PMO Admin', status: 'Active', password_hash: secured.hash, password_salt: secured.salt, last_login_at: new Date().toISOString() });
        data.applyLocalMutation('app_users', { type: 'insert', row: user });
        setSessionUserId(user.id); setActiveRole('PMO Admin'); localStorage.setItem('buildtrack:session-user', user.id); return;
      }
      const user = data.users.find((candidate: any) => candidate.username?.toLowerCase() === loginName.trim().toLowerCase() && candidate.status === 'Active') as any;
      if (!user?.password_hash || !user?.password_salt) throw new Error('Invalid username or password.');
      const secured = await hashPassword(loginPassword, user.password_salt);
      if (secured.hash !== user.password_hash) throw new Error('Invalid username or password.');
      const updated = await dataRepository.update<Record<string, any>>('app_users', user.id, { last_login_at: new Date().toISOString() });
      data.applyLocalMutation('app_users', { type: 'update', row: updated });
      setSessionUserId(user.id); setActiveRole(user.role); localStorage.setItem('buildtrack:session-user', user.id);
    } catch (error: any) { setLoginError(error.message || 'Could not sign in.'); }
  };

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

  const groups = ['Executive', 'Planning & Controls', 'Commercial & Cash', 'Cost & Resources', 'Field & Governance'];

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
    const existingForecast = data.cashFlow.find((entry: any) => entry.source_type === `${sourceType}_forecast` && entry.source_id === sourceId) as any;
    if (mutation.type === 'delete') {
      if (existingCost) { await dataRepository.delete('cost_entries', existingCost.id); data.applyLocalMutation('cost_entries', { type: 'delete', id: existingCost.id }); }
      if (existingCash) { await dataRepository.delete('cash_flow', existingCash.id); data.applyLocalMutation('cash_flow', { type: 'delete', id: existingCash.id }); }
      if (existingForecast) { await dataRepository.delete('cash_flow', existingForecast.id); data.applyLocalMutation('cash_flow', { type: 'delete', id: existingForecast.id }); }
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
      const cashRow = { project_id: contract.project_id, contract_id: contract.id, date: costRow.date, description: `${costType}: ${source.item || source.worker_name || source.equipment_name || item.item_name || ''}`, category: costType, inflow: 0, outflow: costRow.amount, net: -costRow.amount, cumulative_balance: 0, movement_type: 'Actual', status: 'Settled', source_type: sourceType, source_id: sourceId };
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
    if (sourceTable === 'procurement') {
      const shouldForecast = !isPaid && ['Ordered', 'Partially Delivered', 'Delivered'].includes(String(source.status || ''));
      if (shouldForecast) {
        const forecastRow = { project_id: contract.project_id, contract_id: contract.id, date: source.delivery_date || source.order_date || null, description: `Supplier payment forecast: ${source.item || item.item_name || ''}`, category: 'Supplier Payable', inflow: 0, outflow: costRow.amount, net: -costRow.amount, cumulative_balance: 0, movement_type: 'Forecast', status: 'Open', source_type: `${sourceType}_forecast`, source_id: sourceId };
        if (existingForecast) {
          const updated = await dataRepository.update<Record<string, any>>('cash_flow', existingForecast.id, forecastRow);
          data.applyLocalMutation('cash_flow', { type: 'update', row: updated });
        } else {
          const inserted = await dataRepository.insert<Record<string, any>>('cash_flow', forecastRow);
          data.applyLocalMutation('cash_flow', { type: 'insert', row: inserted });
        }
      } else if (existingForecast) {
        await dataRepository.delete('cash_flow', existingForecast.id);
        data.applyLocalMutation('cash_flow', { type: 'delete', id: existingForecast.id });
      }
    }
  }

  async function upsertRateHistory(entry: Record<string, any>) {
    const existing = data.rateHistory.find((row: any) => row.source_type === entry.source_type && row.source_id === entry.source_id) as any;
    if (existing) {
      const updated = await dataRepository.update<Record<string, any>>('rate_history', existing.id, entry);
      data.applyLocalMutation('rate_history', { type: 'update', row: updated });
    } else {
      const inserted = await dataRepository.insert<Record<string, any>>('rate_history', entry);
      data.applyLocalMutation('rate_history', { type: 'insert', row: inserted });
    }
  }

  async function syncProcurementRateHistory(procurement: Record<string, any>) {
    if (!procurement.supplier_party_id || !procurement.id) return;
    const item = data.boqItems.find((row: any) => row.id === procurement.boq_item_id) as any;
    const contract = data.contracts.find((row: any) => row.id === procurement.contract_id) as any;
    await upsertRateHistory({
      party_id: procurement.supplier_party_id,
      item_code: item?.item_code || procurement.item || '',
      item_description: item?.item_name || item?.description || procurement.item || '',
      unit: procurement.unit || item?.unit || '',
      unit_rate: Number(procurement.unit_cost) || 0,
      currency: procurement.currency || 'SAR',
      effective_date: procurement.delivery_date || procurement.order_date || null,
      source_project_id: procurement.project_id || contract?.project_id || null,
      source_contract_id: procurement.contract_id || null,
      source_reference: procurement.purchase_order_number || procurement.reference_number || procurement.id,
      source_type: 'procurement', source_id: procurement.id,
      status: 'Historical', notes: 'Generated from procurement.',
    });
  }

  async function syncSubcontractRateHistory(boqItem: Record<string, any>) {
    const header = data.boqHeaders.find((row: any) => row.id === boqItem.boq_header_id) as any;
    const subcontract = data.contracts.find((row: any) => row.id === header?.contract_id) as any;
    if (!subcontract?.parent_main_contract_id || !subcontract.contractor_party_id || !boqItem.id) return;
    await upsertRateHistory({
      party_id: subcontract.contractor_party_id,
      item_code: boqItem.item_code || '', item_description: boqItem.item_name || boqItem.description || '',
      unit: boqItem.unit || '', unit_rate: Number(boqItem.unit_rate) || 0, currency: 'SAR',
      effective_date: subcontract.signed_date || subcontract.start_date || null,
      source_project_id: subcontract.project_id || null, source_contract_id: subcontract.id,
      source_reference: subcontract.contract_number || subcontract.id,
      source_type: 'subcontract_boq', source_id: boqItem.id,
      status: 'Historical', notes: 'Generated from subcontract BOQ rate.',
    });
  }

  async function migrateLegacyParties(): Promise<void> {
    const normalize = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const candidates = new Map<string, { name: string; type: string }>();
    const register = (name: unknown, type: string) => {
      const key = normalize(name);
      if (!key || key === '-' || key === '—') return;
      const existing = candidates.get(key);
      // A client role is retained if the same legal party appears in more
      // than one legacy column; it is the least risky default for reporting.
      if (!existing || (type === 'Client' && existing.type !== 'Client')) candidates.set(key, { name: String(name).trim(), type });
    };
    data.projects.forEach((row: any) => { register(row.client, 'Client'); register(row.contractor, 'Contractor'); });
    data.contracts.forEach((row: any) => { register(row.client, 'Client'); register(row.contractor, row.parent_main_contract_id ? 'Subcontractor' : 'Contractor'); });
    data.procurement.forEach((row: any) => register(row.supplier, 'Supplier'));

    const partyByName = new Map(data.parties.map((party: any) => [normalize(party.legal_name), party]));
    let created = 0;
    for (const candidate of candidates.values()) {
      if (partyByName.has(normalize(candidate.name))) continue;
      const row = prepareCodeControlledInsert('parties', {
        ...createCodeDraft('parties', [...partyByName.values()]),
        legal_name: candidate.name, trading_name: candidate.name, party_type: candidate.type,
        status: 'Active', payment_terms_days: 0, tax_number: '', registration_number: '', phone: '', email: '', address: '', notes: 'Migrated from existing application records.',
      }, [...partyByName.values()]);
      const inserted = await dataRepository.insert<Record<string, any>>('parties', row);
      data.applyLocalMutation('parties', { type: 'insert', row: inserted });
      partyByName.set(normalize(inserted.legal_name), inserted);
      created += 1;
    }

    let linked = 0;
    for (const contract of data.contracts as Record<string, any>[]) {
      const clientParty = partyByName.get(normalize(contract.client));
      const contractorParty = partyByName.get(normalize(contract.contractor));
      const patch: Record<string, any> = {};
      if (clientParty && contract.client_party_id !== clientParty.id) patch.client_party_id = clientParty.id;
      if (contractorParty && contract.contractor_party_id !== contractorParty.id) patch.contractor_party_id = contractorParty.id;
      if (Object.keys(patch).length) {
        const updated = await dataRepository.update<Record<string, any>>('contracts', contract.id, patch);
        data.applyLocalMutation('contracts', { type: 'update', row: updated });
        linked += 1;
      }
    }
    for (const purchase of data.procurement as Record<string, any>[]) {
      const supplierParty = partyByName.get(normalize(purchase.supplier));
      if (supplierParty && purchase.supplier_party_id !== supplierParty.id) {
        const updated = await dataRepository.update<Record<string, any>>('procurement', purchase.id, { supplier_party_id: supplierParty.id });
        data.applyLocalMutation('procurement', { type: 'update', row: updated });
        linked += 1;
      }
    }
    alert(`Master Data migration completed: ${created} party record(s) created and ${linked} legacy record(s) linked. Original names were kept unchanged.`);
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
    if (data.parties.length === 0) return;
    void Promise.all([
      ...data.procurement.map((row: any) => syncProcurementRateHistory(row)),
      ...data.boqItems.map((row: any) => syncSubcontractRateHistory(row)),
    ]).catch((error) => console.error('Could not synchronize master-data rate history.', error));
  }, [data.parties, data.procurement, data.boqItems, data.boqHeaders, data.contracts]);

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
        const activityPlannedValue = distributedPlannedValueToDate(schedule, data.scheduleDistributions as Record<string, any>[]);
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
    const existingInvoices = invoiceTable === 'client_invoices' ? data.clientInvoices : data.subInvoices;
    if (existingInvoices.some((row: any) => row.contract_id === contract.id && row.invoice_number === draft.invoice_number)) {
      throw new Error(`Invoice number ${draft.invoice_number} already exists for this contract. Use a new invoice number.`);
    }

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

  async function updateInvoiceTrackingAndCash(
    trackingTable: 'client_invoice_tracking' | 'subcontractor_invoice_tracking',
    trackingId: string,
    patch: Record<string, any>,
  ): Promise<Record<string, any>> {
    const trackingRows = trackingTable === 'client_invoice_tracking'
      ? data.clientInvoiceTracking as Record<string, any>[]
      : data.subcontractorInvoiceTracking as Record<string, any>[];
    const current = trackingRows.find((row) => row.id === trackingId);
    if (!current) throw new Error('The invoice tracking record no longer exists. Refresh and try again.');
    const updatedTracking = { ...current, ...patch };
    const invoiceTable = trackingTable === 'client_invoice_tracking' ? 'client_invoices' : 'subcontractor_invoices';
    const invoiceRows = (invoiceTable === 'client_invoices' ? data.clientInvoices : data.subInvoices)
      .filter((row: any) => row.invoice_number === updatedTracking.invoice_number) as Record<string, any>[];

    // Invoice tracking is the commercial control point. Keep every generated
    // line for the invoice aligned with the single tracking decision.
    for (const invoiceRow of invoiceRows) {
      const updatedInvoice = await dataRepository.update<Record<string, any>>(invoiceTable, invoiceRow.id, {
        status: updatedTracking.status,
        payment_status: updatedTracking.payment_status,
        payment_date: updatedTracking.payment_date || null,
        due_date: updatedTracking.due_date || null,
      });
      data.applyLocalMutation(invoiceTable, { type: 'update', row: updatedInvoice });
    }

    const sourcePrefix = trackingTable === 'client_invoice_tracking' ? 'client_invoice' : 'subcontractor_invoice';
    const invoiceNumber = String(updatedTracking.invoice_number);
    const amount = Number(updatedTracking.total_work_value) || invoiceRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const isClient = trackingTable === 'client_invoice_tracking';
    const cashRows = (movementType: 'Forecast' | 'Actual', date: string, status: string) => ({
      project_id: updatedTracking.project_id, contract_id: updatedTracking.contract_id, date,
      description: `${movementType === 'Forecast' ? (isClient ? 'Client receipt forecast' : 'Subcontractor payment forecast') : (isClient ? 'Client invoice received' : 'Subcontractor invoice paid')}: ${invoiceNumber}`,
      category: isClient ? (movementType === 'Forecast' ? 'Client Receivable' : 'Client Receipt') : (movementType === 'Forecast' ? 'Subcontractor Payable' : 'Subcontractor Payment'),
      inflow: isClient ? amount : 0, outflow: isClient ? 0 : amount, net: isClient ? amount : -amount,
      cumulative_balance: 0, movement_type: movementType, status,
      source_type: `${sourcePrefix}_${movementType.toLowerCase()}`, source_id: invoiceNumber,
    });
    const upsertCash = async (movementType: 'Forecast' | 'Actual', date: string, status: string) => {
      const sourceType = `${sourcePrefix}_${movementType.toLowerCase()}`;
      const existing = data.cashFlow.find((row: any) => row.source_type === sourceType && String(row.source_id) === invoiceNumber) as any;
      const cashRow = cashRows(movementType, date, status);
      if (existing) {
        const updatedCash = await dataRepository.update<Record<string, any>>('cash_flow', existing.id, cashRow);
        data.applyLocalMutation('cash_flow', { type: 'update', row: updatedCash });
      } else {
        const insertedCash = await dataRepository.insert<Record<string, any>>('cash_flow', cashRow);
        data.applyLocalMutation('cash_flow', { type: 'insert', row: insertedCash });
      }
    };
    const removeCash = async (movementType: 'Forecast' | 'Actual') => {
      const sourceType = `${sourcePrefix}_${movementType.toLowerCase()}`;
      const existing = data.cashFlow.find((row: any) => row.source_type === sourceType && String(row.source_id) === invoiceNumber) as any;
      if (existing) { await dataRepository.delete('cash_flow', existing.id); data.applyLocalMutation('cash_flow', { type: 'delete', id: existing.id }); }
    };
    // Replace the pre-ledger row format from the previous release if it exists.
    const legacy = data.cashFlow.find((row: any) => row.source_type === sourcePrefix && String(row.source_id) === invoiceNumber) as any;
    if (legacy) { await dataRepository.delete('cash_flow', legacy.id); data.applyLocalMutation('cash_flow', { type: 'delete', id: legacy.id }); }
    if (updatedTracking.payment_status === 'Paid') {
      await removeCash('Forecast');
      await upsertCash('Actual', updatedTracking.payment_date, 'Settled');
    } else {
      await removeCash('Actual');
      if (updatedTracking.status === 'Approved') await upsertCash('Forecast', updatedTracking.due_date || updatedTracking.invoice_date, 'Open');
      else await removeCash('Forecast');
    }

    return dataRepository.update<Record<string, any>>(trackingTable, trackingId, patch);
  }

  function previewInvoiceWithTemplate(invoiceTable: 'client_invoices' | 'subcontractor_invoices', invoiceRow: Record<string, any>) {
    const reportType = invoiceTable === 'client_invoices' ? 'Client Invoice' : 'Subcontractor Invoice';
    const templates = data.reportTemplates.filter((template: any) => template.report_type === reportType) as Record<string, any>[];
    if (templates.length === 0) { alert(`Create a ${reportType} template first in Report Templates.`); return; }
    let template = templates[0];
    if (templates.length > 1) {
      const choices = templates.map((item, index) => `${index + 1}. ${item.template_name}`).join('\n');
      const choice = Number(window.prompt(`Choose a template:\n${choices}`, '1'));
      if (!Number.isInteger(choice) || choice < 1 || choice > templates.length) return;
      template = templates[choice - 1];
    }
    const rows = (invoiceTable === 'client_invoices' ? data.clientInvoices : data.subInvoices)
      .filter((row: any) => row.invoice_number === invoiceRow.invoice_number) as Record<string, any>[];
    if (rows.length === 0) { alert('Invoice lines could not be found.'); return; }
    const contract = data.contracts.find((item: any) => item.id === invoiceRow.contract_id) as any;
    const project = data.projects.find((item: any) => item.id === invoiceRow.project_id) as any;
    const fields = new Set<string>(template.selected_fields || []);
    const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
    const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 });
    const headerValues: Record<string, unknown> = {
      'Invoice Number': invoiceRow.invoice_number, Project: `${project?.project_code || ''} ${project?.name || ''}`.trim(), Contract: contract?.contract_number || '',
      Client: contract?.client || invoiceRow.client || '', Subcontractor: contract?.contractor || invoiceRow.subcontractor || '',
      Period: `${invoiceRow.source_from_date || ''} — ${invoiceRow.source_to_date || ''}`, 'Payment Status': invoiceRow.payment_status || 'Unpaid', 'Grand Total': money(total),
    };
    const header = [...fields].filter((field) => headerValues[field] !== undefined).map((field) => `<div class="meta"><span>${esc(field)}</span><strong>${esc(headerValues[field])}</strong></div>`).join('');
    const lineFields = ['BOQ Item Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Amount'].filter((field) => fields.has(field));
    const valueFor = (row: Record<string, any>, field: string) => ({
      'BOQ Item Code': row.boq_item_code || row.boq_item_id, Description: row.item_desc || '', Unit: row.unit || '', Quantity: Number(row.quantity || 0).toLocaleString(), 'Unit Rate': money(row.unit_rate), Amount: money(row.amount),
    }[field] || '');
    const table = lineFields.length ? `<table><thead><tr>${lineFields.map((field) => `<th>${esc(field)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${lineFields.map((field) => `<td>${esc(valueFor(row, field))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
    const signatures = template.show_signatures ? '<div class="signatures"><div>Prepared by</div><div>Reviewed by</div><div>Approved by</div></div>' : '';
    const generated = template.show_generated_at ? `<span>Generated ${new Date().toLocaleString()}</span>` : '';
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) { alert('Allow pop-ups to preview the invoice.'); return; }
    win.document.write(`<!doctype html><html><head><title>${esc(template.template_name)}</title><style>@page{size:${esc(template.page_size || 'A4')} ${esc(template.orientation || 'portrait')};margin:16mm}body{font-family:Arial,sans-serif;margin:38px;color:#1f2937}.head{display:flex;gap:20px;align-items:center;border-bottom:4px solid ${esc(template.accent_color || '#2563eb')};padding-bottom:18px}.logo{max-width:130px;max-height:80px;object-fit:contain}.title{font-size:27px;font-weight:700}.sub{color:#6b7280;margin-top:6px}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.meta{border:1px solid #d1d5db;border-radius:7px;padding:9px}.meta span{display:block;font-size:11px;color:#6b7280}.meta strong{display:block;margin-top:3px;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:${esc(template.accent_color || '#2563eb')};color:white;text-align:left;padding:9px;font-size:12px}td{border:1px solid #d1d5db;padding:9px;font-size:12px}footer{display:flex;justify-content:space-between;margin-top:28px;border-top:1px solid #d1d5db;padding-top:10px;color:#6b7280;font-size:11px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:70px}.signatures div{border-top:1px solid #64748b;padding-top:8px;text-align:center;font-size:12px}@media print{body{margin:0}}</style></head><body><div class="head">${template.logo_data_url ? `<img class="logo" src="${template.logo_data_url}"/>` : ''}<div><div class="title">${esc(template.title || template.template_name)}</div><div class="sub">${esc(template.subtitle)}</div></div></div><div class="meta-grid">${header}</div>${table}${signatures}<footer><span>${esc(template.footer_text || '')}</span>${generated}</footer></body></html>`);
    win.document.close();
  }

  function previewRecordWithTemplate(reportType: 'WIR' | 'Variation Order' | 'Cost Report' | 'Cash Forecast', row: Record<string, any>) {
    const templates = data.reportTemplates.filter((template: any) => template.report_type === reportType) as Record<string, any>[];
    if (templates.length === 0) { alert(`Create a ${reportType} template first in Report Templates.`); return; }
    let template = templates[0];
    if (templates.length > 1) {
      const choices = templates.map((item, index) => `${index + 1}. ${item.template_name}`).join('\n');
      const choice = Number(window.prompt(`Choose a template:\n${choices}`, '1'));
      if (!Number.isInteger(choice) || choice < 1 || choice > templates.length) return;
      template = templates[choice - 1];
    }
    const contract = data.contracts.find((item: any) => item.id === row.contract_id) as any;
    const project = data.projects.find((item: any) => item.id === row.project_id) as any;
    const item = data.boqItems.find((entry: any) => entry.id === row.boq_item_id) as any;
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
    const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 });
    const projectName = `${project?.project_code || row.project_code || ''} ${project?.name || ''}`.trim();
    const common = { Project: projectName, Contract: contract?.contract_number || row.contract_number || '' };
    const values: Record<string, unknown> = reportType === 'WIR' ? {
      ...common, 'WIR Number': row.wir_number || row.request_number || row.id, Contractor: contract?.contractor || row.contractor || '',
      'BOQ Item Code': row.boq_item_code || item?.item_code || '', Description: row.item_description || item?.item_name || item?.description || '', Unit: row.unit || item?.unit || '',
      Quantity: Number(row.quantity || 0).toLocaleString(), 'Unit Price': money(row.unit_price), Amount: money(row.item_amount || (Number(row.quantity) || 0) * (Number(row.unit_price) || 0)),
      'Inspection Date': row.inspection_date || '', Result: row.result || row.status || '', Inspector: row.inspector || '',
    } : reportType === 'Variation Order' ? {
      ...common, 'Variation Number': row.variation_number || row.code || row.id, Title: row.title || '', Description: row.description || '',
      'Cost Impact': money(row.cost_impact), 'Time Impact': `${Number(row.time_impact_days || 0).toLocaleString()} days`, Status: row.status || '', 'Approved By': row.approved_by || '', 'Approved Date': row.approved_date || '',
    } : reportType === 'Cost Report' ? {
      ...common, 'BOQ Item Code': row.boq_item_code || item?.item_code || '', Description: row.description || item?.item_name || item?.description || '',
      Budget: money(row.budget), 'Planned Value': money(row.planned), 'Actual Cost': money(row.actual), 'Earned Value': money(row.committed),
      CPI: Number(row.actual || 0) > 0 ? (Number(row.committed || 0) / Number(row.actual || 0)).toFixed(2) : '—',
      SPI: Number(row.planned || 0) > 0 ? (Number(row.committed || 0) / Number(row.planned || 0)).toFixed(2) : '—',
    } : {
      ...common, Date: row.date || '', Category: row.category || '', 'Movement Type': row.movement_type || '', Inflow: money(row.inflow), Outflow: money(row.outflow),
      Net: money(row.net ?? (Number(row.inflow || 0) - Number(row.outflow || 0))), 'Cumulative Balance': money(row.cumulative_balance), Status: row.status || '',
    };
    const selected = (template.selected_fields || []).filter((field: string) => values[field] !== undefined);
    const detailRows = selected.map((field: string) => `<tr><td>${esc(field)}</td><td>${esc(values[field])}</td></tr>`).join('');
    const win = window.open('', '_blank', 'width=900,height=760');
    if (!win) { alert('Allow pop-ups to preview the report.'); return; }
    const accent = esc(template.accent_color || '#2563eb');
    win.document.write(`<!doctype html><html><head><title>${esc(template.template_name)}</title><style>body{font-family:Arial,sans-serif;margin:38px;color:#1f2937}.head{display:flex;gap:20px;align-items:center;border-bottom:4px solid ${accent};padding-bottom:18px}.logo{max-width:130px;max-height:80px;object-fit:contain}.title{font-size:27px;font-weight:700}.sub{color:#6b7280;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:28px}td{border:1px solid #d1d5db;padding:10px;font-size:13px}td:first-child{width:42%;font-weight:600;background:#f9fafb}footer{margin-top:28px;border-top:1px solid #d1d5db;padding-top:10px;color:#6b7280;font-size:11px}</style></head><body><div class="head">${template.logo_data_url ? `<img class="logo" src="${template.logo_data_url}"/>` : ''}<div><div class="title">${esc(template.title || template.template_name)}</div><div class="sub">${esc(template.subtitle)}</div></div></div><table>${detailRows}</table><footer>${esc(template.footer_text || '')}</footer></body></html>`);
    win.document.close();
  }

  function renderView() {
    if (activeView === 'reportTemplates') {
      return <ReportTemplateDesigner templates={data.reportTemplates} onMutated={(mutation) => data.applyLocalMutation('report_templates', mutation)} />;
    }
    if (activeView === 'dataEntry') {
      return <DataEntryWorkspace projects={data.projects as Record<string, any>[]} contracts={data.contracts as Record<string, any>[]} boqHeaders={data.boqHeaders as Record<string, any>[]} onOpen={setActiveView} />;
    }
    if (activeView === 'insights') {
      return <PmoInsights
        projects={data.projects as Record<string, any>[]}
        contracts={data.contracts as Record<string, any>[]}
        schedules={data.schedules as Record<string, any>[]}
        costs={data.costs as Record<string, any>[]}
        variations={data.variations as Record<string, any>[]}
        clientInvoiceTracking={data.clientInvoiceTracking as Record<string, any>[]}
        subcontractorInvoiceTracking={data.subcontractorInvoiceTracking as Record<string, any>[]}
        rfis={data.rfis as Record<string, any>[]}
        quality={data.quality as Record<string, any>[]}
        onNavigate={setActiveView}
      />;
    }
    if (activeView === 'workQueue') {
      return <WorkQueue approvals={data.approvals as Record<string, any>[]} tasks={data.tasks as Record<string, any>[]} clientInvoices={data.clientInvoiceTracking as Record<string, any>[]} subInvoices={data.subcontractorInvoiceTracking as Record<string, any>[]} rfis={data.rfis as Record<string, any>[]} quality={data.quality as Record<string, any>[]} onNavigate={setActiveView} />;
    }
    if (activeView === 'auditLog') {
      return <AuditTrailExplorer records={data.auditLog as Record<string, any>[]} />;
    }
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
          baselines={data.baselines}
          reportingPeriods={data.reportingPeriods}
          governanceRegister={data.governanceRegister}
          scheduleDistributions={data.scheduleDistributions}
          rfis={data.rfis}
          submittals={data.submittals}
          quality={data.quality}
          onNavigate={setActiveView}
        />
      );
    }

    if (activeView === 'alerts') {
      const today = new Date().toISOString().slice(0, 10);
      const alerts: { severity: 'Critical' | 'Warning' | 'Info'; title: string; detail: string; view: ViewKey }[] = [];
      const delayedActivities = data.schedules.filter((row: any) => row.status === 'Delayed' || (row.end_date && row.end_date < today && row.status !== 'Completed'));
      if (delayedActivities.length) alerts.push({ severity: 'Critical', title: 'Schedule delay requires action', detail: `${delayedActivities.length} activity(s) are delayed or past their finish date.`, view: 'schedule' });
      const overdueTasks = data.tasks.filter((row: any) => row.end_date && row.end_date < today && row.status !== 'Completed');
      if (overdueTasks.length) alerts.push({ severity: 'Critical', title: 'Overdue tasks', detail: `${overdueTasks.length} task(s) have passed their due date.`, view: 'tasks' });
      const overBudget = data.costs.filter((row: any) => (Number(row.actual) || 0) > (Number(row.budget) || Number(row.planned) || 0));
      if (overBudget.length) alerts.push({ severity: 'Critical', title: 'Cost overrun detected', detail: `${overBudget.length} BOQ cost-control line(s) exceed the approved budget.`, view: 'costs' });
      const pendingApprovals = data.approvals.filter((row: any) => ['Submitted', 'Returned'].includes(row.status));
      if (pendingApprovals.length) alerts.push({ severity: 'Warning', title: 'Approval decisions pending', detail: `${pendingApprovals.length} approval request(s) require review or resubmission.`, view: 'approvals' });
      const openRfis = data.rfis.filter((row: any) => row.status !== 'Closed');
      if (openRfis.length) alerts.push({ severity: 'Warning', title: 'Open RFIs', detail: `${openRfis.length} RFI(s) remain open and may affect delivery.`, view: 'rfi' });
      const qualityOpen = data.quality.filter((row: any) => row.status !== 'Closed');
      if (qualityOpen.length) alerts.push({ severity: 'Warning', title: 'Quality items remain open', detail: `${qualityOpen.length} NCR / punch item(s) need closure.`, view: 'quality' });
      const overdueClientInvoices = data.clientInvoices.filter((row: any) => row.due_date && row.due_date < today && !['Paid', 'Closed'].includes(row.payment_status));
      if (overdueClientInvoices.length) alerts.push({ severity: 'Warning', title: 'Client collections overdue', detail: `${overdueClientInvoices.length} client invoice(s) are past their due date.`, view: 'clientinvoices' });
      const unreviewedDocs = data.documents.filter((row: any) => row.status === 'Under Review');
      if (unreviewedDocs.length) alerts.push({ severity: 'Info', title: 'Documents under review', detail: `${unreviewedDocs.length} document(s) are waiting for a review decision.`, view: 'documents' });
      const styles = { Critical: 'border-error-200 bg-error-50 text-error-700', Warning: 'border-warning-200 bg-warning-50 text-warning-700', Info: 'border-primary-200 bg-primary-50 text-primary-700' };
      return <div className="h-full overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-5xl space-y-5"><div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-50 p-3 text-primary-600"><Bell size={22} /></div><div><h2 className="text-2xl font-bold text-neutral-900">PMO Alerts</h2><p className="mt-1 text-sm text-neutral-500">Live exceptions generated from schedule, cost, commercial and field-control records.</p></div><span className="ml-auto rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">{alerts.length} open</span></div></div><div className="space-y-3">{alerts.length ? alerts.map((alert, index) => <button key={`${alert.title}-${index}`} onClick={() => setActiveView(alert.view)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:shadow-sm ${styles[alert.severity]}`}><CircleAlert size={22} className="shrink-0" /><div className="min-w-0 flex-1"><p className="font-semibold">{alert.title}</p><p className="mt-1 text-sm opacity-90">{alert.detail}</p></div><span className="text-xs font-semibold">Open →</span></button>) : <div className="rounded-xl border border-success-200 bg-success-50 p-8 text-center text-success-700"><FileCheck2 className="mx-auto mb-2" size={26} /><p className="font-semibold">No active PMO alerts</p><p className="mt-1 text-sm">All monitored records are currently within their control state.</p></div>}</div></div></div>;
    }

    if (activeView === 'dataQuality') {
      const checks: { severity: 'Error' | 'Warning' | 'Pass'; title: string; detail: string; view: ViewKey }[] = [];
      const projectIds = new Set(data.projects.map((project: any) => project.id));
      const contractById = new Map(data.contracts.map((contract: any) => [contract.id, contract]));
      const headerById = new Map(data.boqHeaders.map((header: any) => [header.id, header]));
      const itemById = new Map(data.boqItems.map((item: any) => [item.id, item]));
      const orphanMainContracts = data.contracts.filter((contract: any) => !contract.parent_main_contract_id && (!contract.project_id || !projectIds.has(contract.project_id)));
      if (orphanMainContracts.length) checks.push({ severity: 'Error', title: 'Main contract without a valid project', detail: `${orphanMainContracts.length} main contract(s) need a generated project relationship.`, view: 'contracts' });
      const projectsWithoutMain = data.projects.filter((project: any) => !data.contracts.some((contract: any) => contract.project_id === project.id && !contract.parent_main_contract_id));
      if (projectsWithoutMain.length) checks.push({ severity: 'Error', title: 'Project without a main contract', detail: `${projectsWithoutMain.length} project(s) do not have the required main-contract source.`, view: 'contracts' });
      const invalidSubcontracts = data.contracts.filter((contract: any) => contract.parent_main_contract_id && (!contractById.has(contract.parent_main_contract_id) || contractById.get(contract.parent_main_contract_id)?.project_id !== contract.project_id));
      if (invalidSubcontracts.length) checks.push({ severity: 'Error', title: 'Invalid subcontract hierarchy', detail: `${invalidSubcontracts.length} subcontract(s) have a missing or cross-project parent contract.`, view: 'contracts' });
      const invalidHeaders = data.boqHeaders.filter((header: any) => { const contract = contractById.get(header.contract_id); return !contract || contract.project_id !== header.project_id; });
      if (invalidHeaders.length) checks.push({ severity: 'Error', title: 'BOQ header scope mismatch', detail: `${invalidHeaders.length} BOQ header(s) are not aligned with their contract and project.`, view: 'boq' });
      const invalidItems = data.boqItems.filter((item: any) => { const header = headerById.get(item.boq_header_id); return !header || header.project_id !== item.project_id; });
      if (invalidItems.length) checks.push({ severity: 'Error', title: 'BOQ item scope mismatch', detail: `${invalidItems.length} BOQ item(s) are missing a valid header or project relation.`, view: 'boqItems' });
      const invalidSchedules = data.schedules.filter((row: any) => { const item = itemById.get(row.boq_item_id); const contract = contractById.get(row.contract_id); return !item || !contract || item.project_id !== row.project_id || contract.project_id !== row.project_id; });
      if (invalidSchedules.length) checks.push({ severity: 'Error', title: 'Schedule relationship mismatch', detail: `${invalidSchedules.length} activity row(s) have invalid project, contract or BOQ references.`, view: 'schedule' });
      const excessivePlans = data.boqItems.filter((item: any) => data.schedules.filter((row: any) => row.boq_item_id === item.id && String(row.activity || '').trim()).reduce((sum: number, row: any) => sum + (Number(row.planned_quantity) || 0), 0) > (Number(item.quantity) || 0) + 0.000001);
      if (excessivePlans.length) checks.push({ severity: 'Warning', title: 'Planned quantities exceed BOQ', detail: `${excessivePlans.length} BOQ item(s) have activities exceeding their contractual quantity.`, view: 'schedule' });
      const invalidWirs = data.wirEntries.filter((row: any) => !contractById.has(row.contract_id) || !itemById.has(row.boq_item_id));
      if (invalidWirs.length) checks.push({ severity: 'Error', title: 'Inspection request missing scope', detail: `${invalidWirs.length} WIR record(s) are missing a valid contract or BOQ item.`, view: 'wir' });
      const unscopedCosts = data.costEntries.filter((row: any) => !row.project_id || !row.contract_id || !row.boq_item_id);
      if (unscopedCosts.length) checks.push({ severity: 'Warning', title: 'Cost entry without full allocation', detail: `${unscopedCosts.length} cost entry(ies) will not be reliably reflected by BOQ control reports.`, view: 'costEntries' });
      if (!checks.length) checks.push({ severity: 'Pass', title: 'Relationship integrity passed', detail: 'All checked project, contract, BOQ, schedule, WIR and cost relationships are internally consistent.', view: 'dashboard' });
      const styles = { Error: 'border-error-200 bg-error-50 text-error-700', Warning: 'border-warning-200 bg-warning-50 text-warning-700', Pass: 'border-success-200 bg-success-50 text-success-700' };
      return <div className="h-full overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-5xl space-y-5"><div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-50 p-3 text-primary-600"><CircleAlert size={22} /></div><div><h2 className="text-2xl font-bold text-neutral-900">Data Quality & Relationship Checks</h2><p className="mt-1 text-sm text-neutral-500">Read-only validation of the local PMO data model. No records are changed by these checks.</p></div><span className="ml-auto rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">{checks.filter((check) => check.severity !== 'Pass').length} finding(s)</span></div></div><div className="space-y-3">{checks.map((check, index) => <button key={`${check.title}-${index}`} onClick={() => setActiveView(check.view)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:shadow-sm ${styles[check.severity]}`}><CircleAlert size={22} className="shrink-0" /><div className="min-w-0 flex-1"><p className="font-semibold">{check.title}</p><p className="mt-1 text-sm opacity-90">{check.detail}</p></div><span className="text-xs font-semibold">Open →</span></button>)}</div></div></div>;
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
        const budgetAtCompletion = costs.reduce((sum: number, cost: any) => sum + (Number(cost.budget) || Number(cost.planned) || 0), 0);
        const cpi = actualCost > 0 ? earnedValue / actualCost : null;
        const estimateAtCompletion = cpi && cpi > 0 ? budgetAtCompletion / cpi : budgetAtCompletion;
        const estimateToComplete = Math.max(0, estimateAtCompletion - actualCost);
        const subcontractCount = Math.max(0, contractIds.size - (mainContract ? 1 : 0));
        const revisedEnd = addCalendarDays(mainContract?.end_date || project.end_date, timeImpact) || mainContract?.end_date || project.end_date;
        const activityEnds = data.schedules.filter((schedule: any) => schedule.project_id === project.id && String(schedule.activity || '').trim() && schedule.end_date).map((schedule: any) => String(schedule.end_date)).sort();
        const forecastFinish = activityEnds[activityEnds.length - 1] || revisedEnd;
        return { project, mainContract, variationValue, originalValue, modifiedValue, actualCost, earnedValue, plannedValue, budgetAtCompletion, estimateAtCompletion, estimateToComplete, subcontractCount, revisedEnd, forecastFinish };
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
            <table className="min-w-[1360px] w-full text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Main contract</th><th className="px-4 py-3">Original</th><th className="px-4 py-3">Variations</th><th className="px-4 py-3">Modified</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">Revised finish</th><th className="px-4 py-3">PV / EV / AC</th><th className="px-4 py-3">Forecast</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Subcontracts</th></tr></thead><tbody>
              {portfolioRows.map((row) => { const progress = row.modifiedValue > 0 ? Math.min(100, row.earnedValue / row.modifiedValue * 100) : 0; const overBudget = row.budgetAtCompletion > 0 && row.estimateAtCompletion > row.budgetAtCompletion; const late = row.forecastFinish && row.revisedEnd && row.forecastFinish > row.revisedEnd; return <tr key={row.project.id} onClick={() => openProject(row.project.id)} className="cursor-pointer border-b border-neutral-100 hover:bg-primary-50"><td className="px-4 py-3"><p className="font-semibold text-neutral-900">{row.project.name}</p><p className="text-xs text-neutral-500">{row.project.project_code}</p></td><td className="px-4 py-3"><p className="font-medium text-neutral-800">{row.mainContract?.contract_number || '—'}</p><p className="max-w-48 truncate text-xs text-neutral-500">{row.mainContract?.title || 'No main contract'}</p></td><td className="px-4 py-3">{money(row.originalValue)}</td><td className="px-4 py-3 text-primary-700">{money(row.variationValue)}</td><td className="px-4 py-3 font-semibold">{money(row.modifiedValue)}</td><td className="px-4 py-3">{row.mainContract?.start_date || row.project.start_date || '—'}</td><td className="px-4 py-3">{row.revisedEnd || '—'}</td><td className="px-4 py-3 text-xs"><p>PV {money(row.plannedValue)}</p><p>EV {money(row.earnedValue)}</p><p>AC {money(row.actualCost)}</p></td><td className="px-4 py-3 text-xs"><p className={overBudget ? 'font-semibold text-error-600' : ''}>EAC {money(row.estimateAtCompletion)}</p><p>ETC {money(row.estimateToComplete)}</p><p className={late ? 'font-semibold text-error-600' : ''}>Finish {row.forecastFinish || '—'}{late ? ' · late' : ''}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-primary-600" style={{ width: `${progress}%` }} /></div><span>{progress.toFixed(1)}%</span></div></td><td className="px-4 py-3">{row.subcontractCount}</td></tr>; })}
              {portfolioRows.length === 0 && <tr><td colSpan={11} className="px-4 py-10 text-center text-neutral-500">No projects have been generated from main contracts yet.</td></tr>}
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
      const projectCash = data.cashFlow.filter((entry: any) => (entry.project_id === selectedProject.id || relatedContractIds.has(entry.contract_id)) && (!entry.movement_type || entry.movement_type === 'Actual' || entry.movement_type === 'Manual'));
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

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-neutral-900">Common project actions</h3><p className="mt-1 text-xs text-neutral-500">Start the operation from this project context; related tables keep the project filter.</p></div><span className="text-xs text-neutral-400">Use Ctrl + K to find any record or work area</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Guided import', note: 'BOQ, schedule and WIR', view: 'dataEntry' as ViewKey, icon: Download }, { label: 'Inspection requests', note: `${relatedWirs.length} request(s)`, view: 'wir' as ViewKey, icon: FileCheck2 }, { label: 'Record cost', note: `${projectCosts.length} cost item(s)`, view: 'costEntries' as ViewKey, icon: DollarSign }, { label: 'Project documents', note: `${data.documents.filter((item: any) => item.project_id === selectedProject.id).length} document(s)`, view: 'documents' as ViewKey, icon: FolderOpen }].map((action) => { const Icon = action.icon; return <button key={action.label} onClick={() => openWorkspaceArea(action.view)} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3 text-left hover:border-primary-300 hover:bg-primary-50"><span className="rounded-lg bg-primary-50 p-2 text-primary-700"><Icon size={17}/></span><span><span className="block text-sm font-semibold text-neutral-800">{action.label}</span><span className="block text-xs text-neutral-500">{action.note}</span></span></button>; })}</div></section>

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
    const roleReadOnly = activeRole === 'Executive Viewer' || (activeRole === 'Site Engineer' && ['contracts', 'variations', 'costs', 'cost_entries', 'cash_flow', 'project_baselines', 'reporting_periods', 'approval_requests'].includes(tableName)) || (tableName === 'app_users' && activeRole !== 'PMO Admin');
    // The navigation key is "boq", while the loaded state is named
    // "boqHeaders". Reading the navigation key made successfully saved BOQs
    // look as if they had disappeared.
    const rawViewData = activeView === 'boq'
      ? data.boqHeaders
      : activeView === 'baselines'
        ? data.baselines
        : activeView === 'reportingPeriods'
          ? data.reportingPeriods
          : activeView === 'snapshots'
            ? data.snapshots
            : activeView === 'users'
              ? data.users
          : activeView === 'governance'
            ? data.governanceRegister
            : activeView === 'approvals'
              ? data.approvals
              : activeView === 'auditLog'
                ? data.auditLog
                : activeView === 'rfi'
                  ? data.rfis
                  : activeView === 'submittals'
                    ? data.submittals
                    : activeView === 'quality'
                      ? data.quality
      : activeView === 'boqItems'
        ? data.boqItems
        : activeView === 'wir'
          ? data.wirEntries
        : activeView === 'schedule'
          ? data.schedules
          : activeView === 'scheduleDistributions'
            ? data.scheduleDistributions
            : activeView === 'parties'
              ? data.parties
              : activeView === 'partyContacts'
                ? data.partyContacts
                : activeView === 'rateHistory'
                  ? data.rateHistory
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
              .reduce((sum: number, activity: any) => sum + distributedPlannedValueToDate(activity, data.scheduleDistributions as Record<string, any>[], reportDate), 0);
            const activityPVToDate = distributedPlannedValueToDate(schedule, data.scheduleDistributions as Record<string, any>[], reportDate);
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
              ? childActivities.reduce((sum: number, activity: any) => sum + distributedPlannedValueToDate(activity, data.scheduleDistributions as Record<string, any>[]), 0)
              : distributedPlannedValueToDate(schedule, data.scheduleDistributions as Record<string, any>[]);
            const summaryQuantity = isSummaryRow && childActivities.length > 0
              ? childActivities.reduce((sum: number, activity: any) => sum + (Number(activity.planned_quantity) || 0), 0)
              : plannedQuantity;
            // The BOQ date is the governed plan. Child activities are execution
            // forecasts and must not silently rewrite the controlled BOQ date.
            const governedStart = mainItem?.planned_start_date || mainItem?.baseline_start_date || schedule.start_date;
            const governedEnd = mainItem?.planned_end_date || mainItem?.baseline_end_date || schedule.end_date;
            const summaryStart = isSummaryRow ? governedStart : schedule.start_date;
            const childEndDates = childActivities.map((activity: any) => String(activity.end_date || '')).filter(Boolean).sort();
            const forecastEnd = childEndDates[childEndDates.length - 1] || '';
            const summaryEnd = isSummaryRow ? governedEnd : schedule.end_date;
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
            const reportedFinish = isSummaryRow ? forecastEnd || governedEnd : schedule.end_date;
            const boqDelay = isSummaryRow && forecastEnd && governedEnd && forecastEnd > governedEnd
              ? `Delayed against BOQ plan: forecast ${forecastEnd}, governed finish ${governedEnd}`
              : '';
            const dateAlert = revisedFinish && reportedFinish && String(reportedFinish) > revisedFinish
              ? `⚠ Delayed: finishes after revised contract end (${revisedFinish})`
              : scheduleContract?.end_date && reportedFinish && String(reportedFinish) > String(scheduleContract.end_date)
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
              status: `${calendarGapDays !== 0 ? `Calendar ${calendarGapDays > 0 ? 'gap' : 'overlap'}: ${Math.abs(calendarGapDays)} day(s) | ` : ''}${boqDelay ? `${boqDelay} | ` : ''}${dateAlert ? `${dateAlert} | ` : ''}${costState} | ${scheduleState} | CPI ${cpi === null ? 'N/A' : cpi.toFixed(2)} | SPI ${spi === null ? 'N/A' : spi.toFixed(2)}`,
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
    relationshipOptions.party_id = data.parties
      .filter((party: any) => party.status !== 'Inactive')
      .map((party: any) => ({
        value: party.id,
        label: `${party.party_code || 'PTY'} - ${party.legal_name || party.trading_name || party.id}`,
        data: { party_code: party.party_code, legal_name: party.legal_name, party_type: party.party_type },
      }));
    relationshipOptions.client_party_id = data.parties
      .filter((party: any) => party.party_type === 'Client' && party.status !== 'Inactive')
      .map((party: any) => ({ value: party.id, label: `${party.party_code || 'PTY'} - ${party.legal_name}`, data: { client: party.legal_name } }));
    relationshipOptions.contractor_party_id = data.parties
      .filter((party: any) => ['Contractor', 'Subcontractor', 'Supplier', 'Consultant'].includes(party.party_type) && party.status !== 'Inactive')
      .map((party: any) => ({ value: party.id, label: `${party.party_code || 'PTY'} - ${party.legal_name}`, data: { contractor: party.legal_name } }));
    relationshipOptions.supplier_party_id = data.parties
      .filter((party: any) => party.party_type === 'Supplier' && party.status !== 'Inactive')
      .map((party: any) => ({ value: party.id, label: `${party.party_code || 'PTY'} - ${party.legal_name}`, data: { supplier: party.legal_name } }));
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
    if (activeView === 'contracts') {
      autoFillOptions.client = data.parties.filter((party: any) => party.party_type === 'Client' && party.status !== 'Inactive').map((party: any) => party.legal_name);
      autoFillOptions.contractor = data.parties.filter((party: any) => party.party_type === 'Subcontractor' && party.status !== 'Inactive').map((party: any) => party.legal_name);
    }
    if (activeView === 'procurement') {
      autoFillOptions.supplier = data.parties.filter((party: any) => party.party_type === 'Supplier' && party.status !== 'Inactive').map((party: any) => party.legal_name);
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
        projectPickerInForm={!['contracts', 'boq_headers', 'boq_items', 'client_invoices', 'subcontractor_invoices', 'parties', 'party_contacts', 'rate_history'].includes(tableName)}
        dateRangeColumn={config.dateRangeColumn}
        boqItems={data.boqItems}
        contracts={data.contracts}
        baselines={data.baselines}
        dateWarning={tableName === 'schedules' ? (activity) => {
          const contract = contractsWithModifiedValue.find((row: any) => row.id === activity.contract_id) as any;
          const revisedEnd = contract?.revised_end_date || contract?.end_date;
          const item = data.boqItems.find((row: any) => row.id === activity.boq_item_id) as any;
          const governedEnd = item?.planned_end_date || item?.baseline_end_date;
          if (governedEnd && activity.end_date && String(activity.end_date) > String(governedEnd)) {
            return `Activity finish ${activity.end_date} is later than the governed BOQ finish ${governedEnd}. The BOQ plan remains unchanged and the activity is reported as delayed.`;
          }
          return revisedEnd && activity.end_date && String(activity.end_date) > String(revisedEnd)
            ? `Activity finish ${activity.end_date} is later than the revised contract finish ${revisedEnd}.`
            : null;
        } : undefined}
        validateRecord={config.dateRangeColumn && !['reporting_periods', 'project_baselines', 'audit_log', 'approval_requests'].includes(tableName) ? (row) => {
          const projectId = row.project_id;
          const recordDate = row[config.dateRangeColumn!];
          if (!projectId || !recordDate) return;
          const lockedPeriod = data.reportingPeriods.find((period: any) =>
            period.project_id === projectId && ['Locked', 'Closed'].includes(period.status) &&
            period.start_date && period.end_date && String(recordDate) >= String(period.start_date) && String(recordDate) <= String(period.end_date),
          );
          if (lockedPeriod) throw new Error(`Reporting period "${lockedPeriod.period_name || lockedPeriod.id}" is ${lockedPeriod.status}. Reopen it before changing a dated record.`);
        } : undefined}
        onMutated={(mutation) => {
          data.applyLocalMutation(tableName, mutation);
          if (tableName === 'approval_requests' && (mutation.type === 'insert' || mutation.type === 'update')) {
            const approval = mutation.row as Record<string, any>;
            const decision = approval.status === 'Approved' ? 'Approved' : approval.status === 'Rejected' ? 'Rejected' : null;
            const target = approval.entity_type === 'Variation' ? 'variations'
              : approval.entity_type === 'Baseline' ? 'project_baselines'
                : approval.entity_type === 'Submittal' ? 'submittals' : null;
            if (decision && target && approval.entity_id) {
              void dataRepository.update<Record<string, any>>(target, approval.entity_id, {
                status: decision,
                ...(target === 'variations' ? { approved_date: approval.decision_date || new Date().toISOString().slice(0, 10), approved_by: approval.approver || 'Approval Workflow' } : {}),
              }).then((updated) => data.applyLocalMutation(target, { type: 'update', row: updated })).catch((error) =>
                alert(`Approval was saved, but the linked ${approval.entity_type} could not be updated: ${error.message || 'Unknown error'}`),
              );
            }
          }
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
        canAdd={!roleReadOnly && tableName !== 'projects' && tableName !== 'progress_entries' && tableName !== 'audit_log'}
        readOnly={roleReadOnly}
        progressWirs={data.wirEntries}
        toolbarAction={tableName === 'parties' ? {
          label: 'Migrate Existing Parties',
          title: 'Create master records and link existing contracts and procurement without deleting legacy names.',
          onClick: migrateLegacyParties,
        } : undefined}
        rowAction={tableName === 'client_invoices' ? {
          label: 'Preview Invoice',
          title: 'Render this complete client invoice using a saved flexible template.',
          onClick: (row) => previewInvoiceWithTemplate('client_invoices', row),
        } : tableName === 'subcontractor_invoices' ? {
          label: 'Preview Invoice',
          title: 'Render this complete subcontractor invoice using a saved flexible template.',
          onClick: (row) => previewInvoiceWithTemplate('subcontractor_invoices', row),
        } : tableName === 'wir_entries' ? {
          label: 'Preview WIR',
          title: 'Render this inspection request using a saved flexible template.',
          onClick: (row) => previewRecordWithTemplate('WIR', row),
        } : tableName === 'variations' ? {
          label: 'Preview VO',
          title: 'Render this variation order using a saved flexible template.',
          onClick: (row) => previewRecordWithTemplate('Variation Order', row),
        } : tableName === 'costs' ? {
          label: 'Preview Cost',
          title: 'Render this cost-control record using a saved flexible template.',
          onClick: (row) => previewRecordWithTemplate('Cost Report', row),
        } : tableName === 'cash_flow' ? {
          label: 'Preview Cash',
          title: 'Render this cash-flow record using a saved flexible template.',
          onClick: (row) => previewRecordWithTemplate('Cash Forecast', row),
        } : undefined}
        formColumns={['client_invoices', 'subcontractor_invoices'].includes(tableName) ? INVOICE_GENERATION_FORM_COLUMNS : tableName === 'app_users' ? USER_FORM_COLUMNS : tableName === 'project_baselines' ? BASELINE_FORM_COLUMNS : undefined}
        editFormColumns={tableName === 'app_users' ? USER_EDIT_COLUMNS : tableName === 'project_baselines' ? BASELINE_FORM_COLUMNS : undefined}
        onInsert={tableName === 'app_users' ? async (userDraft) => {
          const username = String(userDraft.username || '').trim();
          const password = String(userDraft.initial_password || '');
          if (!username) throw new Error('Username is required.');
          if (password.length < 8) throw new Error('Initial password must contain at least 8 characters.');
          if (data.users.some((user: any) => String(user.username || '').toLowerCase() === username.toLowerCase())) {
            throw new Error('This username is already in use.');
          }
          const secured = await hashPassword(password);
          const { initial_password: _password, ...safeUser } = userDraft;
          return dataRepository.insert<Record<string, any>>('app_users', {
            ...safeUser, username, display_name: String(userDraft.display_name || username).trim(),
            role: userDraft.role || 'Project Manager', status: userDraft.status || 'Active',
            password_hash: secured.hash, password_salt: secured.salt, last_login_at: null,
          });
        } : tableName === 'project_baselines' ? async (baselineDraft) => {
          const contract = data.contracts.find((item: any) => item.id === baselineDraft.contract_id) as any;
          if (!contract || contract.parent_main_contract_id) throw new Error('Select a main contract before creating a baseline.');
          const approvedVariations = data.variations.filter((variation: any) => variation.contract_id === contract.id && variation.status === 'Approved');
          const variationValue = approvedVariations.reduce((sum: number, variation: any) => sum + (Number(variation.cost_impact) || 0), 0);
          const activities = data.schedules.filter((schedule: any) => schedule.contract_id === contract.id && String(schedule.activity || '').trim());
          const budget = activities.reduce((sum: number, activity: any) => sum + (Number(activity.budget) || Number(activity.planned_value) || 0), 0);
          const starts = activities.map((activity: any) => String(activity.start_date || '')).filter(Boolean).sort();
          const ends = activities.map((activity: any) => String(activity.end_date || '')).filter(Boolean).sort();
          const original = Number(contract.contract_value) || 0;
          return dataRepository.insert<Record<string, any>>('project_baselines', {
            ...baselineDraft, project_id: contract.project_id, status: baselineDraft.status || 'Draft',
            original_contract_value: original, approved_variation_value: variationValue, modified_contract_value: original + variationValue,
            planned_budget: budget, planned_start_date: starts[0] || contract.start_date || null,
            planned_end_date: ends[ends.length - 1] || contract.end_date || null,
          });
        } : tableName === 'pmo_snapshots' ? async (snapshotDraft) => {
          const projectCosts = data.costs.filter((cost: any) => cost.project_id === snapshotDraft.project_id);
          const planned = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.planned) || 0), 0);
          const earned = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.committed) || 0), 0);
          const actual = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.actual) || 0), 0);
          const bac = projectCosts.reduce((sum: number, cost: any) => sum + (Number(cost.budget) || Number(cost.planned) || 0), 0);
          const cpi = actual > 0 ? earned / actual : null;
          const spi = planned > 0 ? earned / planned : null;
          return dataRepository.insert<Record<string, any>>('pmo_snapshots', {
            ...snapshotDraft, planned_value: planned, earned_value: earned, actual_cost: actual,
            cpi, spi, eac: cpi && cpi > 0 ? bac / cpi : bac,
          });
        } : tableName === 'schedules' ? async (scheduleRow) => {
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
        onUpdate={tableName === 'app_users' ? async (id, userPatch) => {
          const username = String(userPatch.username || '').trim();
          const password = String(userPatch.new_password || '');
          if (!username) throw new Error('Username is required.');
          if (data.users.some((user: any) => user.id !== id && String(user.username || '').toLowerCase() === username.toLowerCase())) {
            throw new Error('This username is already in use.');
          }
          const { new_password: _password, ...safePatch } = userPatch;
          if (!password) return dataRepository.update<Record<string, any>>('app_users', id, safePatch);
          if (password.length < 8) throw new Error('Reset password must contain at least 8 characters.');
          const secured = await hashPassword(password);
          return dataRepository.update<Record<string, any>>('app_users', id, { ...safePatch, password_hash: secured.hash, password_salt: secured.salt });
        } : tableName === 'project_baselines' ? async (id, baselinePatch) => {
          const existing = data.baselines.find((baseline: any) => baseline.id === id) as any;
          if (existing?.status === 'Approved') throw new Error('An approved baseline is frozen. Create a new revision instead of changing it.');
          return dataRepository.update<Record<string, any>>('project_baselines', id, baselinePatch);
        } : tableName === 'client_invoice_tracking' || tableName === 'subcontractor_invoice_tracking'
          ? async (id, trackingPatch) => updateInvoiceTrackingAndCash(tableName, id, trackingPatch)
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

  const sessionUser = data.users.find((user: any) => user.id === sessionUserId && user.status === 'Active');
  if (!data.loading && !sessionUser) {
    const setup = data.users.length === 0;
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
        <form onSubmit={(event) => { event.preventDefault(); void signIn(); }} className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl">
          <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-primary-600 p-3 text-white"><Building2 size={24} /></div><div><h1 className="text-xl font-bold text-neutral-900">BuildTrack</h1><p className="text-sm text-neutral-500">{setup ? 'Create the first local PMO administrator' : 'Sign in to the local workspace'}</p></div></div>
          <label className="mb-4 block text-sm font-medium text-neutral-700">Username<input value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="username" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-primary-500" /></label>
          <label className="block text-sm font-medium text-neutral-700">Password<input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" autoComplete={setup ? 'new-password' : 'current-password'} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-primary-500" /></label>
          {setup && <p className="mt-2 text-xs text-neutral-500">The first account is PMO Admin. Use at least 8 characters.</p>}
          {loginError && <p className="mt-3 rounded-lg bg-error-50 p-2 text-sm text-error-700">{loginError}</p>}
          <button type="submit" className="mt-5 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">{setup ? 'Create administrator' : 'Sign in'}</button>
        </form>
      </div>
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
          {recentViews.length > 1 && <div className="mb-4"><p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-1.5">Recent</p>{recentViews.filter((view) => view !== activeView).slice(0, 4).map((view) => { const item = NAV_ITEMS.find((candidate) => candidate.key === view); if (!item) return null; const Icon = item.icon; return <button key={`recent-${view}`} onClick={() => { setActiveView(view); setSidebarOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white"><Icon size={16} className="text-neutral-400" />{item.label}</button>; })}</div>}
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
          <p className="truncate text-xs font-medium text-neutral-200">{sessionUser?.display_name || sessionUser?.username || 'Local User'}</p>
          <p className="mb-2 text-[10px] text-neutral-500">{activeRole}</p>
          <button onClick={async () => { try { if (!('__TAURI_INTERNALS__' in window)) throw new Error('Local backup is available in the desktop app only.'); const { invoke } = await import('@tauri-apps/api/core'); const path = await invoke<string>('backup_local_database'); alert(`Complete workspace backup saved to:\n${path}\n\nIt includes the SQLite database and local attachments.`); } catch (error: any) { alert(`Could not create backup: ${error.message || 'Unknown error'}`); } }} className="mb-2 flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"><Download size={13} /> Backup local data</button>
          <button onClick={() => { localStorage.removeItem('buildtrack:session-user'); setSessionUserId(''); }} className="mb-2 text-xs text-primary-300 hover:text-primary-200">Sign out</button>
          <p className="text-xs text-neutral-500 text-center">BuildTrack v1.0</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden shrink-0 items-center justify-end border-b border-neutral-200 bg-white px-5 py-2 lg:flex"><CommandPalette destinations={NAV_ITEMS.map(({ key, label, group }) => ({ key, label, group }))} projects={data.projects as Record<string, any>[]} contracts={data.contracts as Record<string, any>[]} onNavigate={setActiveView} onOpenProject={(projectId) => { setWorkspaceProjectId(projectId); setActiveView('projects'); }}/></div>
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
