export interface BoqItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  contractQty: number;
  unitRate: number;
  totalBudget: number;
  executedQty: number;
  executedAmount: number;
  packageId: string; // e.g. 'PKG-CIVIL', 'PKG-MEP'
  purchasedQty?: number; // Total delivered via GRNs for waste reconciliation
  wasteAllowancePercent?: number; // Contractual allowable waste %
}

export interface SubcontractPackage {
  packageId: string;
  packageName: string;
  subcontractor: string;
  contractValue: number;
  paidToDate: number;
  retentionHeld: number; // typically 5% to 10%
  retentionPct: number;
  pendingIpcAmount: number;
  paymentPolicy: 'Back_to_Back' | 'Direct_30_Days';
  clientIpcCleared: boolean; // if true, safe to release
}

export interface ProjectActivity {
  activityId: string;
  taskName: string;
  wbsCode: string;
  packageId: string;
  boqItemId?: string;
  variationId?: string; // Contractual variation order mapping
  plannedStartDate: string;
  plannedFinishDate: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  durationDays: number;
  progressPct: number;
  weightFactor: number; // for EVM calculation
  isCritical: boolean;
}

export interface WorkInspectionRequest {
  id: string;
  title: string;
  activityId: string;
  boqItemId: string;
  packageId: string;
  location: string;
  inspectionDate: string;
  quantityInspected: number;
  status: 'Draft' | 'Consultant_Pending' | 'Approved' | 'Rejected' | 'Re_Inspection';
  consultantNotes?: string;
  submittedBy: string;
}

export interface DailySiteLog {
  date: string;
  weather: string;
  manpowerTotal: number;
  equipmentActive: number;
  concreteVolumePouredM3: number;
  ongoingActivityIds: string[];
  safetyIncidents: number;
  submitted: boolean;
  signedByEngineer?: string;
}

export interface ProjectManagerApproval {
  id: string;
  type: 'IPC_PAYMENT' | 'VARIATION_ORDER' | 'EOT_CLAIM' | 'RETENTION_RELEASE';
  title: string;
  packageId: string;
  amount: number;
  scheduleImpactDays: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  dateCreated: string;
  rationale: string;
}

export interface ProjectMasterState {
  projectCode: string;
  projectName: string;
  dataDate: string;
  contractOriginalValue: number;
  approvedVariationsValue: number;
  boqItems: BoqItem[];
  contracts: SubcontractPackage[];
  activities: ProjectActivity[];
  wirs: WorkInspectionRequest[];
  dailyLogs: DailySiteLog[];
  approvals: ProjectManagerApproval[];
}
