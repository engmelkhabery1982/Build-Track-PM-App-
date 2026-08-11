export interface ContractHierarchyRow {
  parent_main_contract_id?: string | null;
}

/**
 * Client-side financial aggregates include main contracts only. Subcontracts
 * remain available to operational and cost-control views but must not be
 * counted a second time in the primary contract total.
 */
export function selectPrimaryContracts<T extends ContractHierarchyRow>(contracts: T[]): T[] {
  return contracts.filter((contract) => !contract.parent_main_contract_id);
}
