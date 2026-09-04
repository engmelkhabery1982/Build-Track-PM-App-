import React, { createContext, useContext, useState, useMemo } from 'react';
import { ProjectMasterState, WorkInspectionRequest, ProjectActivity, BoqItem, SubcontractPackage, ProjectManagerApproval } from '../types/projectModel';
import { INITIAL_PROJECT_STATE } from '../data/initialProjectData';
import { calculateBoqWasteLedger, BoqWasteLedgerResult } from '../utils/scopeReconciliation';
import { detectScopeCreep, ScopeCreepResult } from '../utils/scopeGovernance';
import { calculateEarnedSchedule, EarnedScheduleResult } from '../utils/earnedSchedule';

interface ProjectContextType {
  state: ProjectMasterState;
  // Methods for cross-feature mutations:
  submitWir: (newWir: Omit<WorkInspectionRequest, 'id' | 'status'>) => void;
  approveWir: (wirId: string) => void;
  rejectWir: (wirId: string, notes?: string) => void;
  submitDailyLog: (signedBy: string) => void;
  approvePmAction: (approvalId: string) => void;
  rejectPmAction: (approvalId: string) => void;
  updateActivityProgress: (activityId: string, newProgress: number) => void;
  reconcileP6Schedule: (importedActivities: Array<{ activityId: string; taskName: string; duration: number; startDate: string; finishDate: string }>) => void;
  // Computed Project KPIs
  spi: number;
  cpi: number;
  totalExecutedContractValue: number;
  totalRetentionHeld: number;
  totalPendingIpc: number;
  // SC-06, SC-08, SCH-06 Integration
  boqWasteReports: BoqWasteLedgerResult[];
  scopeCreepReport: ScopeCreepResult;
  earnedScheduleReport: EarnedScheduleResult;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProjectMasterState>(INITIAL_PROJECT_STATE);

  // 1. Submit New WIR from Field
  const submitWir = (wirData: Omit<WorkInspectionRequest, 'id' | 'status'>) => {
    const newId = `WIR-2026-${String(state.wirs.length + 85).padStart(3, '0')}`;
    const newWir: WorkInspectionRequest = {
      ...wirData,
      id: newId,
      status: 'Consultant_Pending'
    };
    setState((prev) => ({
      ...prev,
      wirs: [newWir, ...prev.wirs]
    }));
  };

  // 2. Approve WIR -> Directly updates Activity Progress and BOQ Executed Qty
  const approveWir = (wirId: string) => {
    setState((prev) => {
      const targetWir = prev.wirs.find((w) => w.id === wirId);
      if (!targetWir) return prev;

      // Update WIR Status
      const updatedWirs = prev.wirs.map((w) =>
        w.id === wirId ? { ...w, status: 'Approved' as const } : w
      );

      // Advance Activity Progress if linked
      const updatedActivities = prev.activities.map((act) => {
        if (act.activityId === targetWir.activityId) {
          const addedProgress = Math.min(100, act.progressPct + 25);
          return { ...act, progressPct: addedProgress };
        }
        return act;
      });

      // Update BOQ Executed Quantities and Value
      const updatedBoq = prev.boqItems.map((boq) => {
        if (boq.id === targetWir.boqItemId) {
          const newQty = Math.min(boq.contractQty, boq.executedQty + targetWir.quantityInspected);
          return {
            ...boq,
            executedQty: newQty,
            executedAmount: newQty * boq.unitRate
          };
        }
        return boq;
      });

      return {
        ...prev,
        wirs: updatedWirs,
        activities: updatedActivities,
        boqItems: updatedBoq
      };
    });
  };

  // 3. Reject WIR
  const rejectWir = (wirId: string, notes?: string) => {
    setState((prev) => ({
      ...prev,
      wirs: prev.wirs.map((w) =>
        w.id === wirId ? { ...w, status: 'Rejected' as const, consultantNotes: notes || w.consultantNotes } : w
      )
    }));
  };

  // 4. Submit & Sign Daily Site Log
  const submitDailyLog = (signedBy: string) => {
    setState((prev) => ({
      ...prev,
      dailyLogs: prev.dailyLogs.map((log) => ({
        ...log,
        submitted: true,
        signedByEngineer: signedBy
      }))
    }));
  };

  // 5. Approve PM Action (e.g. IPC payment, Variation Order)
  const approvePmAction = (approvalId: string) => {
    setState((prev) => {
      const targetAction = prev.approvals.find((a) => a.id === approvalId);
      if (!targetAction) return prev;

      const updatedApprovals = prev.approvals.map((a) =>
        a.id === approvalId ? { ...a, status: 'Approved' as const } : a
      );

      let updatedContracts = prev.contracts;
      let updatedVariationsValue = prev.approvedVariationsValue;

      if (targetAction.type === 'IPC_PAYMENT') {
        // Clearing client IPC unlocks Back-to-Back payment authorization for the package
        updatedContracts = prev.contracts.map((c) =>
          c.packageId === targetAction.packageId
            ? { ...c, clientIpcCleared: true }
            : c
        );
      } else if (targetAction.type === 'VARIATION_ORDER') {
        updatedVariationsValue += targetAction.amount;
      } else if (targetAction.type === 'RETENTION_RELEASE') {
        updatedContracts = prev.contracts.map((c) =>
          c.packageId === targetAction.packageId
            ? {
                ...c,
                retentionHeld: Math.max(0, c.retentionHeld - targetAction.amount),
                paidToDate: c.paidToDate + targetAction.amount
              }
            : c
        );
      }

      return {
        ...prev,
        approvals: updatedApprovals,
        contracts: updatedContracts,
        approvedVariationsValue: updatedVariationsValue
      };
    });
  };

  // 6. Reject PM Action
  const rejectPmAction = (approvalId: string) => {
    setState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a) =>
        a.id === approvalId ? { ...a, status: 'Rejected' as const } : a
      )
    }));
  };

  // 7. Update Activity Progress
  const updateActivityProgress = (activityId: string, newProgress: number) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.activityId === activityId ? { ...a, progressPct: Math.min(100, Math.max(0, newProgress)) } : a
      )
    }));
  };

  // 8. Reconcile P6 Schedule Import with local database
  const reconcileP6Schedule = (
    importedActivities: Array<{ activityId: string; taskName: string; duration: number; startDate: string; finishDate: string }>
  ) => {
    setState((prev) => {
      const mergedActivities: ProjectActivity[] = [...prev.activities];

      importedActivities.forEach((imp) => {
        const existingIdx = mergedActivities.findIndex((a) => a.activityId === imp.activityId);
        if (existingIdx >= 0) {
          mergedActivities[existingIdx] = {
            ...mergedActivities[existingIdx],
            taskName: imp.taskName,
            plannedStartDate: imp.startDate,
            plannedFinishDate: imp.finishDate,
            durationDays: imp.duration
          };
        } else {
          // New activity found in P6
          mergedActivities.push({
            activityId: imp.activityId,
            taskName: imp.taskName,
            wbsCode: 'P6.IMP',
            packageId: 'PKG-CIVIL',
            plannedStartDate: imp.startDate,
            plannedFinishDate: imp.finishDate,
            durationDays: imp.duration,
            progressPct: 0,
            weightFactor: 0.05,
            isCritical: false
          });
        }
      });

      return {
        ...prev,
        activities: mergedActivities
      };
    });
  };

  // Computed Real KPIs and SC-06, SC-08, SCH-06 Governance from Central Data
  const {
    spi,
    cpi,
    totalExecutedContractValue,
    totalRetentionHeld,
    totalPendingIpc,
    boqWasteReports,
    scopeCreepReport,
    earnedScheduleReport
  } = useMemo(() => {
    // 1. Total Executed BOQ
    const executedVal = state.boqItems.reduce((sum, b) => sum + b.executedAmount, 0);

    // 2. Schedule Performance Index (SPI = Earned Value / Planned Value)
    const earnedVal = state.activities.reduce((sum, a) => sum + (a.progressPct / 100) * a.weightFactor, 0);
    const plannedVal = 0.58; // Target baseline progress to data date
    const calculatedSpi = Number((earnedVal / plannedVal).toFixed(2));

    // 3. Cost Performance Index (CPI = Earned Value / Actual Cost)
    const totalPaid = state.contracts.reduce((sum, c) => sum + c.paidToDate, 0);
    const calculatedCpi = totalPaid > 0 ? Number((executedVal / totalPaid).toFixed(2)) : 1.0;

    // 4. Retention and Pending IPC
    const retHeld = state.contracts.reduce((sum, c) => sum + c.retentionHeld, 0);
    const pendIpc = state.contracts.reduce((sum, c) => sum + c.pendingIpcAmount, 0);

    // 5. SC-06: As-Built BOQ Reconciliation & Waste Ledger
    const wasteReports: BoqWasteLedgerResult[] = state.boqItems.map((boq) => {
      const purchased = boq.purchasedQty ?? Number((boq.executedQty * 1.04).toFixed(0));
      const allowance = boq.wasteAllowancePercent ?? 5.0;
      return calculateBoqWasteLedger({
        boqItemId: boq.id,
        contractualWasteAllowancePercent: allowance,
        purchasedQty: purchased,
        certifiedInstalledQty: boq.executedQty,
        unitRate: boq.unitRate
      });
    });

    // 6. SC-08: Contractual Scope Boundary & Creep Detector
    const approvedVoIds = state.approvals
      .filter((a) => a.type === 'VARIATION_ORDER' && a.status === 'Approved')
      .map((a) => a.id);

    const siteTasks = state.activities.map((act) => ({
      taskId: act.activityId,
      description: act.taskName,
      boqItemId: act.boqItemId,
      variationId: act.variationId,
      qty: act.durationDays,
      estimatedRate: 1500 // Daily burn rate equivalent
    }));

    const creepReport = detectScopeCreep({
      contractBoqItemIds: state.boqItems.map((b) => b.id),
      approvedVariationIds: approvedVoIds,
      siteTasks
    });

    // 7. SCH-06: Earned Schedule & Time-Based Performance
    // Monthly S-Curve cumulative planned weights (e.g. Month 0 to Month 6)
    const cumulativePV = [0, 0.10, 0.25, 0.42, 0.58, 0.76, 1.00];
    const actualTimePeriods = 4.0; // Current Month index at data date 2026-05-01
    const esReport = calculateEarnedSchedule({
      actualTime: actualTimePeriods,
      earnedValue: Number(earnedVal.toFixed(3)),
      cumulativePlannedValues: cumulativePV
    });

    return {
      spi: calculatedSpi,
      cpi: calculatedCpi,
      totalExecutedContractValue: executedVal,
      totalRetentionHeld: retHeld,
      totalPendingIpc: pendIpc,
      boqWasteReports: wasteReports,
      scopeCreepReport: creepReport,
      earnedScheduleReport: esReport
    };
  }, [state]);

  return (
    <ProjectContext.Provider
      value={{
        state,
        submitWir,
        approveWir,
        rejectWir,
        submitDailyLog,
        approvePmAction,
        rejectPmAction,
        updateActivityProgress,
        reconcileP6Schedule,
        spi,
        cpi,
        totalExecutedContractValue,
        totalRetentionHeld,
        totalPendingIpc,
        boqWasteReports,
        scopeCreepReport,
        earnedScheduleReport
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
