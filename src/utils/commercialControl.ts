export type PaymentCertificateCashStatus = 'Forecast' | 'Actual' | null;

export function calculateCertificateValues(certificate: Record<string, unknown>) {
  const gross = Number(certificate.gross_certified_value) || 0;
  const retention = Math.round(gross * (Number(certificate.retention_rate) || 0) / 100 * 100) / 100;
  const beforeTax = gross - retention - (Number(certificate.advance_recovery) || 0) - (Number(certificate.deductions) || 0);
  const tax = Math.round(Math.max(0, beforeTax) * (Number(certificate.tax_rate) || 0) / 100 * 100) / 100;
  return { gross, retention_amount: retention, tax_amount: tax, net_certified_value: Math.round((beforeTax + tax) * 100) / 100 };
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
