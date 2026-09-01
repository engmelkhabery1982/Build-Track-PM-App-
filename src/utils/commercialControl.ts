export type PaymentCertificateCashStatus = 'Forecast' | 'Actual' | null;

export function calculateCertificateValues(certificate: Record<string, unknown>) {
  const gross = Number(certificate.gross_certified_value) || 0;
  const retention = Math.round(gross * (Number(certificate.retention_rate) || 0) / 100 * 100) / 100;
  const taxableAmount = Math.round((gross - retention - (Number(certificate.advance_recovery) || 0) - (Number(certificate.deductions) || 0)) * 100) / 100;
  const tax = Math.round(Math.max(0, taxableAmount) * (Number(certificate.tax_rate) || 0) / 100 * 100) / 100;
  return { gross, retention_amount: retention, taxable_amount: taxableAmount, tax_amount: tax, net_certified_value: Math.round((taxableAmount + tax) * 100) / 100 };
}

/** Contract-level retention and advance balances shared by workflow, reports and data quality. */
export function calculateCertificateBalances(input: {
  contractAdvanceAmount?: number;
  retentionCapAmount?: number;
  priorAdvanceRecovery?: number;
  priorRetention?: number;
  certificate: Record<string, unknown>;
}) {
  const advanceLimit = Math.max(0, Number(input.contractAdvanceAmount) || 0);
  const retentionCap = Math.max(0, Number(input.retentionCapAmount) || 0);
  const cumulativeAdvanceRecovery = Math.round(((Number(input.priorAdvanceRecovery) || 0) + (Number(input.certificate.advance_recovery) || 0)) * 100) / 100;
  const values = calculateCertificateValues(input.certificate);
  const cumulativeRetentionAmount = Math.round(((Number(input.priorRetention) || 0) + values.retention_amount) * 100) / 100;
  return {
    ...values, advanceLimit, retentionCap, cumulativeAdvanceRecovery, cumulativeRetentionAmount,
    remainingAdvanceBalance: Math.round(Math.max(0, advanceLimit - cumulativeAdvanceRecovery) * 100) / 100,
    advanceExceeded: cumulativeAdvanceRecovery > advanceLimit + 0.000001,
    retentionCapExceeded: retentionCap > 0 && cumulativeRetentionAmount > retentionCap + 0.000001,
  };
}

/** A Cost Change has exactly one commercial allocation target. This prevents
 * a project-wide change being added once to every SOV line. */
export function costChangeAppliesToSovLine(change: Record<string, unknown>, line: Record<string, unknown>): boolean {
  return String(change.status || '') === 'Approved'
    && Boolean(change.contract_sov_line_id)
    && String(change.contract_sov_line_id) === String(line.id);
}

export function certificateCashStatus(certificate: Record<string, unknown>): PaymentCertificateCashStatus {
  if (String(certificate.status || '') === 'Paid') return 'Actual';
  if (String(certificate.status || '') === 'Approved') return 'Forecast';
  return null;
}

export function certificateCashDirection(certificate: Record<string, unknown>): 'Inflow' | 'Outflow' {
  return String(certificate.certificate_type || '') === 'Client' ? 'Inflow' : 'Outflow';
}

/**
 * A purchase order is a commitment, not proof that a cost was incurred or
 * paid.  Actual cost must come from an accepted receipt/AP fact (or a
 * separately governed cost entry).  This small state rule is shared by the
 * operational sync and the acceptance tests so a Draft/Ordered PO can never
 * silently become actual cost.
 */
export function procurementPostingState(procurement: Record<string, unknown>) {
  const status = String(procurement.status || 'Draft');
  const isCommitment = ['Ordered', 'Partially Delivered', 'Delivered', 'Closed'].includes(status);
  const isForecast = ['Ordered', 'Partially Delivered', 'Delivered'].includes(status);
  return {
    isCommitment,
    isForecast,
    postsActualCost: false,
    postsActualCash: false,
  };
}

export interface SovCostForecastInput {
  originalBudget: number;
  approvedVariations: number;
  approvedCostChanges: number;
  /** Ordered PO value. A PO is a commitment, never an actual cost. */
  procurementCommitment: number;
  /** Accepted-GRN cost only; this is the portion that consumes a PO. */
  procurementActual: number;
  /** Governed non-PO cost facts (labour, equipment, indirect cost, etc.). */
  otherActual: number;
  /** Explicit estimator override. It may increase, but never hide, the governed floor. */
  manualForecastOverride?: number;
}

const money = (value: number) => Math.round(value * 100) / 100;

/**
 * One cost-control formula for a Contract SOV line.
 *
 * The essential protection is that accepted receipt cost consumes the related
 * purchase-order commitment.  Therefore an accepted GRN is never counted once
 * as actual cost and again as open commitment.  Non-procurement actual cost is
 * retained in full because it is not represented by a PO commitment.
 */
export function calculateSovCostForecast(input: SovCostForecastInput) {
  const originalBudget = Math.max(0, Number(input.originalBudget) || 0);
  const approvedVariations = Number(input.approvedVariations) || 0;
  const approvedCostChanges = Number(input.approvedCostChanges) || 0;
  const revisedBudget = money(originalBudget + approvedVariations + approvedCostChanges);
  const procurementCommitment = Math.max(0, Number(input.procurementCommitment) || 0);
  const procurementActual = Math.max(0, Number(input.procurementActual) || 0);
  const otherActual = Math.max(0, Number(input.otherActual) || 0);
  const actualCost = money(procurementActual + otherActual);
  const openCommitment = money(Math.max(0, procurementCommitment - procurementActual));
  const governedForecastFloor = money(Math.max(revisedBudget, actualCost + openCommitment));
  const requestedOverride = Math.max(0, Number(input.manualForecastOverride) || 0);
  const forecastAtCompletion = money(Math.max(governedForecastFloor, requestedOverride));
  return {
    revisedBudget,
    procurementCommitment: money(procurementCommitment),
    procurementActual: money(procurementActual),
    otherActual: money(otherActual),
    actualCost,
    openCommitment,
    governedForecastFloor,
    requestedOverride,
    forecastAtCompletion,
    costToComplete: money(Math.max(0, forecastAtCompletion - actualCost)),
    forecastVariance: money(forecastAtCompletion - revisedBudget),
    overrideBelowGovernedFloor: requestedOverride > 0 && requestedOverride < governedForecastFloor,
  };
}

export interface BudgetAvailabilityInput {
  revisedBudget: number;
  /** Actuals already posted to the controlled SOV line. */
  actualCost: number;
  /** Only unconsumed commitments; accepted receipt cost must not appear here. */
  openCommitment: number;
  /** The proposed new posting or commitment, evaluated before it is saved. */
  proposedAmount?: number;
}

/** SAP-style availability control basis for the local SOV: actual cost plus
 * open commitment consumes budget. A receipt converts commitment to actual;
 * it therefore does not double-consume availability. */
export function calculateBudgetAvailability(input: BudgetAvailabilityInput) {
  const revisedBudget = money(Math.max(0, Number(input.revisedBudget) || 0));
  const actualCost = money(Math.max(0, Number(input.actualCost) || 0));
  const openCommitment = money(Math.max(0, Number(input.openCommitment) || 0));
  const assignedValue = money(actualCost + openCommitment);
  const proposedAmount = money(Math.max(0, Number(input.proposedAmount) || 0));
  const projectedAssignedValue = money(assignedValue + proposedAmount);
  const availableBudget = money(revisedBudget - assignedValue);
  const projectedAvailableBudget = money(revisedBudget - projectedAssignedValue);
  const status = projectedAvailableBudget < -0.01 ? 'Blocked'
    : projectedAvailableBudget <= Math.max(0.01, revisedBudget * 0.1) ? 'At Risk'
      : 'Available';
  return {
    revisedBudget, actualCost, openCommitment, assignedValue, proposedAmount,
    projectedAssignedValue, availableBudget, projectedAvailableBudget, status,
    exceedsBudget: projectedAvailableBudget < -0.01,
  };
}
