export interface BoqWasteLedgerParams {
  boqItemId: string;
  contractualWasteAllowancePercent: number;
  purchasedQty: number;
  certifiedInstalledQty: number;
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

/** Calculates physical material reconciliation without manufacturing data. */
export function calculateBoqWasteLedger(params: BoqWasteLedgerParams): BoqWasteLedgerResult {
  const installed = Math.max(0, Number(params.certifiedInstalledQty) || 0);
  const purchased = Math.max(0, Number(params.purchasedQty) || 0);
  const allowancePct = Math.max(0, Number(params.contractualWasteAllowancePercent) || 0);
  const wasteQty = Math.max(0, purchased - installed);
  const allowableWasteQty = installed * allowancePct / 100;
  const excessWasteQty = Math.max(0, wasteQty - allowableWasteQty);
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    boqItemId: params.boqItemId,
    purchasedQty: round(purchased),
    certifiedInstalledQty: round(installed),
    wasteQty: round(wasteQty),
    wastePercentage: installed > 0 ? round(wasteQty / installed * 100) : 0,
    allowableWasteQty: round(allowableWasteQty),
    excessWasteQty: round(excessWasteQty),
    excessWasteCost: round(excessWasteQty * Math.max(0, Number(params.unitRate) || 0)),
    isExcessiveWaste: excessWasteQty > 0.000001,
  };
}
