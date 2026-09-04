import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, FolderKanban, SquareCheck as CheckSquare, DollarSign, Package, ShieldAlert, TrendingUp, CalendarClock, Signature as FileSignature, ClipboardList, Banknote, Receipt, FileText, GitBranch, FolderOpen, FileCheck as FileCheck2, Building2, Menu, ListOrdered, HardHat, Wrench, ClipboardCheck, Layers, Download, Bell, CircleAlert, BrainCircuit, Maximize2, Minimize2, ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { acceptProcurementReceipt, amendPurchaseOrder, approveCostChange, approvePaymentCertificate, approvePurchaseOrder, approveSupplierInvoice, approveVariation, assertBaselineApproval, assertRecordPeriodIsOpen, assertReportingPeriodDefinition, cancelPurchaseOrder, compareBaselineActivities, compareBaselineActivityDetails, compareBaselineRevisions, createBaselineActivitySnapshot, createBaselineDistributionSnapshot, createCodeDraft, dataRepository, prepareCodeControlledInsert, reverseCommercialPosting, reverseSupplierApPosting, reverseVariation, runDataQualityChecks, settlePaymentCertificate, settleSupplierInvoicePayment, STATUS_SETS, summarizeBaselineSchedule } from '@/data';
import { Dashboard } from '@/components/Dashboard';
import { DataTableView, type ColumnDef, type FilterDef, type SelectOption } from '@/components/DataTableView';
import { ReportTemplateDesigner } from '@/components/ReportTemplateDesigner';
import { PmoInsights } from '@/components/PmoInsights';
import { DataEntryWorkspace } from '@/components/DataEntryWorkspace';
import { CommandPalette } from '@/components/CommandPalette';
import { WorkQueue } from '@/components/WorkQueue';
import { AuditTrailExplorer } from '@/components/AuditTrailExplorer';
import { ReportPack } from '@/components/ReportPack';
import { HelpCenter } from '@/components/HelpCenter';
import { PreferencesPanel, type WorkspaceMode } from '@/components/PreferencesPanel';
import { ResourceCapacityBoard } from '@/components/ResourceCapacityBoard';
import type { ViewKey, Project } from '@/types';
import { addCalendarDays, addWorkingDays, calendarShiftHours, distributedPlannedValueToDate, reconcileScheduleDistributions, scheduleBudget, schedulePlannedValueToDate, WORK_CALENDARS, workingDaysBetween } from '@/utils/schedulePlanning';
import { calculatePmoSnapshot } from '@/utils/pmoSnapshot';
import { calculateEvmAtDataDate } from '@/utils/evm';
import { deriveContractForecastFinish } from '@/utils/projectForecast';
import { calculateCpm, calculateCpmStatusForecast } from '@/utils/cpm';
import { calculateProductivityMetrics } from '@/utils/resourceProductivity';
import { calculatePlannedResourceLoads, calculateResourceLoads, suggestResourceLeveling } from '@/utils/resourceLoading';
import { dueDateFromTerms } from '@/utils/paymentTerms';
import { calculateBudgetAvailability, calculateCertificateValues, calculateSovCostForecast, certificateCashDirection, certificateCashStatus, costChangeAppliesToSovLine, procurementPostingState, syncWirApprovalProgress, evaluateBackToBackPaymentAuthorization } from '@/utils/commercialControl';
import { calculateControlAccountSummary } from '@/utils/controlAccountSummary';
import { buildQuantityLedger } from '@/utils/quantityLedger';
import { previewVariationPackage } from '@/utils/variationPackage';

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;
const NAV_ITEMS: { key: ViewKey; label: string; icon: IconType; group: string }[] = [
  { key: 'dashboard', label: 'PMO Command Center', icon: LayoutDashboard, group: 'Executive' },
  { key: 'alerts', label: 'PMO Alerts', icon: Bell, group: 'Executive' },
  { key: 'dataQuality', label: 'Data Quality Checks', icon: CircleAlert, group: 'Executive' },
  { key: 'workQueue', label: 'My Work Queue', icon: CheckSquare, group: 'Executive' },
  { key: 'reportPack', label: 'Executive Report Pack', icon: FileText, group: 'Executive' },
  { key: 'help', label: 'Help & Quick Guide', icon: ClipboardList, group: 'Executive' },
  { key: 'preferences', label: 'My Preferences', icon: Menu, group: 'Executive' },
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
  { key: 'quantityLedger', label: 'Quantity Ledger', icon: ClipboardList, group: 'Planning & Controls' },
  { key: 'progressCorrections', label: 'Progress Corrections', icon: ClipboardList, group: 'Planning & Controls' },
  { key: 'schedule', label: 'Schedule & Activities', icon: CalendarClock, group: 'Planning & Controls' },
  { key: 'workCalendars', label: 'Work Calendar Master', icon: CalendarClock, group: 'Planning & Controls' },
  { key: 'scheduleDistributions', label: 'Planned Quantity Distribution', icon: CalendarClock, group: 'Planning & Controls' },
  { key: 'wir', label: 'Inspection Requests', icon: FileCheck2, group: 'Planning & Controls' },
  { key: 'progress', label: 'WIR & Progress', icon: TrendingUp, group: 'Planning & Controls' },
  { key: 'contracts', label: 'Contracts', icon: FileSignature, group: 'Commercial & Cash' },
  { key: 'variations', label: 'Variations', icon: GitBranch, group: 'Commercial & Cash' },
  { key: 'variationLines', label: 'Variation Lines', icon: ListOrdered, group: 'Commercial & Cash' },
  { key: 'contractSov', label: 'Contract SOV', icon: ClipboardList, group: 'Commercial & Cash' },
  { key: 'controlAccounts', label: 'Control Accounts', icon: Layers, group: 'Planning & Controls' },
  { key: 'costChanges', label: 'Cost Changes', icon: GitBranch, group: 'Commercial & Cash' },
  { key: 'paymentCertificates', label: 'Payment Certificates', icon: ClipboardCheck, group: 'Commercial & Cash' },
  { key: 'supplierInvoices', label: 'Supplier Invoices / AP', icon: Receipt, group: 'Commercial & Cash' },
  { key: 'supplierInvoiceLines', label: 'Supplier Invoice Match Lines', icon: ClipboardList, group: 'Commercial & Cash' },
  { key: 'supplierInvoicePayments', label: 'Supplier Payments', icon: Banknote, group: 'Commercial & Cash' },
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
  { key: 'costCodes', label: 'Cost Code / CBS Master', icon: Layers, group: 'Cost & Resources' },
  { key: 'wbs', label: 'WBS Master', icon: GitBranch, group: 'Planning & Controls' },
  { key: 'costEntries', label: 'Cost Entries', icon: ListOrdered, group: 'Cost & Resources' },
  { key: 'procurement', label: 'Procurement', icon: Package, group: 'Cost & Resources' },
  { key: 'procurementReconciliation', label: 'PO Reconciliation', icon: ClipboardCheck, group: 'Commercial & Cash' },
  { key: 'procurementReceipts', label: 'Goods Receipts', icon: ClipboardCheck, group: 'Cost & Resources' },
  { key: 'resourceMaster', label: 'Resource Master', icon: Users, group: 'Cost & Resources' },
  { key: 'resourceCapacity', label: 'Resource Capacity Board', icon: Users, group: 'Planning & Controls' },
  { key: 'resourceAssignments', label: 'Planned Resource Assignments', icon: Users, group: 'Planning & Controls' },
  { key: 'laborDuty', label: 'Labor Duty', icon: HardHat, group: 'Cost & Resources' },
  { key: 'equipment', label: 'Equipment', icon: Wrench, group: 'Cost & Resources' },
  { key: 'tasks', label: 'Tasks & Actions', icon: CheckSquare, group: 'Field & Governance' },
  { key: 'governance', label: 'Risk, Issue & Decision Register', icon: ShieldAlert, group: 'Field & Governance' },
  { key: 'approvals', label: 'Approvals', icon: ClipboardCheck, group: 'Field & Governance' },
  { key: 'auditLog', label: 'Audit Trail', icon: FileCheck2, group: 'Field & Governance' },
  { key: 'rfi', label: 'RFI Register', icon: FileText, group: 'Field & Governance' },
  { key: 'submittals', label: 'Submittals', icon: ClipboardList, group: 'Field & Governance' },
  { key: 'quality', label: 'NCR & Punch Register', icon: ClipboardCheck, group: 'Field & Governance' },
  { key: 'dailyReports', label: 'Site Daily Reports', icon: ClipboardList, group: 'Field & Governance' },
  { key: 'safety', label: 'Safety', icon: ShieldAlert, group: 'Field & Governance' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, group: 'Field & Governance' },
  { key: 'tracking', label: 'Tracking Sheet', icon: ClipboardCheck, group: 'Field & Governance' },
];

const PROJECT_STATUSES = STATUS_SETS.project;
const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Delayed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const COST_STATUSES = ['Planned', 'Committed', 'Actual', 'Over Budget'];
const COST_TYPES = ['Labor', 'Equipment', 'Materials', 'Subcontractor Cost', 'Multiple Cost Types', 'Miscellaneous', 'Other'];
const PROC_STATUSES = ['Draft', 'Submitted', 'Approved', 'Ordered', 'Partially Delivered', 'Delivered', 'Closed', 'Cancelled'];
const SAFETY_STATUSES = ['Open', 'Investigating', 'Closed'];
const SAFETY_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const SAFETY_TYPES = ['Incident', 'Near Miss', 'Hazard', 'Inspection', 'Violation'];
const SCHEDULE_STATUSES = STATUS_SETS.schedule;
const CONTRACT_STATUSES = STATUS_SETS.contract;
const CONTRACT_TYPES = ['Lump Sum', 'Unit Price', 'Cost Plus', 'Time & Materials', 'Design-Build', 'GMP', 'Cost Reimbursable'];
const INVOICE_STATUSES = STATUS_SETS.invoice;
const PAYMENT_STATUSES = STATUS_SETS.payment;
const VARIATION_STATUSES = STATUS_SETS.variation;
const VARIATION_TYPES = ['Scope Change', 'Design Change', 'Site Condition', 'Client Request', 'Cost Adjustment'];
const DOC_STATUSES = STATUS_SETS.document;
const DOC_TYPES = ['Drawing', 'Specification', 'Report', 'Permit', 'Contract', 'Invoice', 'Plan', 'Other'];
const WIR_STATUSES = STATUS_SETS.wir;
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
  { key: 'revision_number', label: 'Revision', type: 'number', editable: false },
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'baseline_date', label: 'Approval Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved', 'Superseded'] },
  { key: 'original_contract_value', label: 'Original Contract', type: 'money', editable: true },
  { key: 'approved_variation_value', label: 'Approved Variations', type: 'money', editable: true },
  { key: 'modified_contract_value', label: 'Modified Contract', type: 'money', editable: true },
  { key: 'planned_budget', label: 'Planned Budget', type: 'money', editable: true },
  { key: 'planned_start_date', label: 'Planned Start', type: 'date', editable: true },
  { key: 'planned_end_date', label: 'Planned Finish', type: 'date', editable: true },
  { key: 'baseline_activity_count', label: 'Baseline Activities', type: 'number', editable: false },
  { key: 'baseline_critical_activity_count', label: 'Baseline Critical Activities', type: 'number', editable: false },
  { key: 'current_activity_count', label: 'Current Activities', type: 'number', editable: false },
  { key: 'activity_count_variance', label: 'Activity Count Variance', type: 'number', editable: false },
  { key: 'added_activity_count', label: 'Added Activities', type: 'number', editable: false },
  { key: 'removed_activity_count', label: 'Removed Activities', type: 'number', editable: false },
  { key: 'changed_activity_count', label: 'Changed Activities', type: 'number', editable: false },
  { key: 'variance_register_status', label: 'Variance Register', type: 'text', editable: false },
  { key: 'critical_path_variance', label: 'Critical Path Variance', type: 'number', editable: false },
  { key: 'current_schedule_start', label: 'Current Forecast Start', type: 'date', editable: false },
  { key: 'current_schedule_finish', label: 'Current Forecast Finish', type: 'date', editable: false },
  { key: 'start_variance_days', label: 'Start Variance (days)', type: 'number', editable: false },
  { key: 'finish_variance_days', label: 'Finish Variance (days)', type: 'number', editable: false },
  { key: 'current_schedule_budget', label: 'Current Planned Budget', type: 'money', editable: false },
  { key: 'budget_variance', label: 'Budget Variance', type: 'money', editable: false },
  { key: 'revision_reason', label: 'Revision Reason', type: 'text', editable: true },
  { key: 'notes', label: 'Notes', type: 'text', editable: true },
];
const BASELINE_FORM_COLUMNS: ColumnDef[] = [
  { key: 'baseline_number', label: 'Baseline #', type: 'text', editable: true },
  { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true },
  { key: 'baseline_date', label: 'Approval Date', type: 'date', editable: true },
  { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved'] },
  { key: 'revision_reason', label: 'Revision Reason', type: 'text', editable: true },
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
  { key: 'snapshot_name', label: 'Snapshot Name', type: 'text', editable: true }, { key: 'contract_id', label: 'Main Contract', type: 'select', editable: true }, { key: 'data_date', label: 'Data Date', type: 'date', editable: true }, { key: 'status', label: 'Status', type: 'status', editable: true, options: ['Draft', 'Approved', 'Archived'] }, { key: 'planned_value', label: 'PV', type: 'money', editable: false }, { key: 'earned