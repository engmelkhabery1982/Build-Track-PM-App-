export interface CalculateBoqWasteLedgerParams {
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
  wasteCost: number;
  isExcessiveWaste: boolean;
}

export function calculateBoqWasteLedger(params: CalculateBoqWasteLedgerParams): BoqWasteLedgerResult {
  const {
    boqItemId,
    contractualWasteAllowancePercent,
    purchasedQty,
    certifiedInstalledQty,
    unitRate,
  } = params;

  const wasteQty = purchasedQty - certifiedInstalledQty;
  const wastePercentage = purchasedQty > 0 ? (wasteQty / purchasedQty) * 100 : 0;
  const wasteCost = wasteQty * unitRate;
  const isExcessiveWaste = wastePercentage > contractualWasteAllowancePercent;

  return {
    boqItemId,
    purchasedQty,
    certifiedInstalledQty,
    wasteQty,
    wastePercentage,
    wasteCost,
    isExcessiveWaste,
  };
}
