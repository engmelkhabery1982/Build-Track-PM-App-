import { calculateEvmAtDataDate } from './evm.ts';

/** Rebuilds an auditable PMO position from dated source records. */
export function calculatePmoSnapshot(input: {
  contract: Record<string, any>;
  dataDate: string;
  schedules: Record<string, any>[];
  scheduleDistributions: Record<string, any>[];
  wirEntries: Record<string, any>[];
  boqItems: Record<string, any>[];
  costEntries: Record<string, any>[];
  baselines?: Record<string, any>[];
  /** Executive reporting may require an approved frozen baseline. */
  requireApprovedBaseline?: boolean;
}) {
  const dataDate = String(input.dataDate || '').slice(0, 10);
  if (!dataDate) throw new Error('A PMO Snapshot requires a governed Data Date.');
  const approvedBaseline = (input.baselines || [])
    .filter((row) => row.status === 'Approved' && row.contract_id === input.contract.id)
    .sort((left, right) => Number(right.revision_number || 0) - Number(left.revision_number || 0) || String(right.baseline_date || '').localeCompare(String(left.baseline_date || '')))[0];
  if (input.requireApprovedBaseline && (!approvedBaseline || !Array.isArray(approvedBaseline.activity_snapshot) || !approvedBaseline.activity_snapshot.length || !Array.isArray(approvedBaseline.distribution_snapshot))) {
    throw new Error('A governed PMO Snapshot requires an approved baseline with frozen activities and time-phased distribution.');
  }
  const evm = calculateEvmAtDataDate({
    contractIds: [input.contract.id], dataDate,
    schedules: input.schedules, scheduleDistributions: input.scheduleDistributions,
    baselines: input.baselines || [], wirEntries: input.wirEntries,
    boqItems: input.boqItems, costEntries: input.costEntries,
  });
  return {
    plannedValue: evm.PV,
    earnedValue: evm.EV,
    actualCost: evm.AC,
    budgetAtCompletion: evm.BAC,
    cpi: evm.CPI || null,
    spi: evm.SPI || null,
    estimateAtCompletion: evm.EAC,
    baselineId: approvedBaseline?.id || null,
    baselineRevision: Number(approvedBaseline?.revision_number) || null,
  };
}
