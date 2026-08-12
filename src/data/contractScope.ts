export interface ContractScopeRow {
  id: string;
  project_id: string;
  parent_main_contract_id?: string | null;
}

/** Returns the main contract that owns financial and progress totals. */
export function getMainContractId(
  contractId: string | null | undefined,
  contracts: ContractScopeRow[],
): string | null {
  if (!contractId) return null;
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  const seen = new Set<string>();
  let currentId = contractId;
  while (currentId) {
    if (seen.has(currentId)) throw new Error('Contract hierarchy contains a cycle.');
    seen.add(currentId);
    const current = byId.get(currentId);
    if (!current) return contractId;
    if (!current.parent_main_contract_id) return current.id;
    currentId = current.parent_main_contract_id;
  }
  return contractId;
}
