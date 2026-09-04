export interface BoqWasteLedgerParams {
  boqItemId: string;
  contractualWasteAllowancePercent: number; // e.g. 5% or 8%
  purchasedQty: number; // Total received from GRNs
  certifiedInstalledQty: number; // Total approved/certified from WIRs
  unitRate: number;
}

export interface BoqWasteLedgerResult {
  boqItemId: string;
  purchasedQty: number;
  certifiedInstalledQty: number;
  wasteQty: number;
  wastePercentage: number;
  allowableWasteQty: number;
  excessWasteQty: number;
  excessWasteCost: number;
  isExcessiveWaste: boolean;
}

/**
 * SC-06: As-Built BOQ Reconciliation & Material Waste Ledger
 * Calculates difference between procurement receipts and consultant-certified installation,
 * isolating allowable contract waste from culpable contractor waste cost.
 */
export function calculateBoqWasteLedger(params: BoqWasteLedgerParams): BoqWasteLedgerResult {
  const {
    boqItemId,
    contractualWasteAllowancePercent,
    purchasedQty,
    certifiedInstalledQty,
    unitRate,
  } = params;

  const wasteQty = Math.max(0, purchasedQty - certifiedInstalledQty);
  const wastePercentage =
    certifiedInstalledQty > 0
      ? Number(((wasteQty / certifiedInstalledQty) * 100).toFixed(2))
      : 0;

  const allowableWasteQty = Number(
    ((certifiedInstalledQty * contractualWasteAllowancePercent) / 100).toFixed(2)
  );

  const excessWasteQty = Number(Math.max(0, wasteQty - allowableWasteQty).toFixed(2));
  const excessWasteCost = Number((excessWasteQty * unitRate).toFixed(2));
  const isExcessiveWaste = excessWasteQty > 0.001;

  return {
    boqItemId,
    purchasedQty,
    certifiedInstalledQty,
    wasteQty: Number(wasteQty.toFixed(2)),
    wastePercentage,
    allowableWasteQty,
    excessWasteQty,
    excessWasteCost,
    isExcessiveWaste,
  };
}
