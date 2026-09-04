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

export default App;

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
  { key: 'reportingPeriods', label: 'Reporting Periods', icon: CalendarClock, group: 'Executive' }
];
