const PARENT_FIELDS: Record<string, string> = {
  projects: 'parent_main_project_id',
  contracts: 'parent_main_contract_id',
  cost_codes: 'parent_cost_code_id',
  wbs_nodes: 'parent_wbs_id',
};

const LEVEL_FIELDS: Record<string, string> = {
  cost_codes: 'cbs_level',
  wbs_nodes: 'wbs_level',
};

/**
 * CBS and WBS levels are derived from their selected parent.  They are not
 * user-entered attributes: allowing manual values causes broken trees after
 * a node is moved.  A root node is level 1.
 */
export function deriveHierarchyLevel(
  tableName: string,
  rows: Record<string, unknown>[],
  parentId: unknown,
): number {
  const levelField = LEVEL_FIELDS[tableName];
  if (!levelField) return 0;
  const parentKey = parentId ? String(parentId) : '';
  if (!parentKey) return 1;
  const parent = rows.find((row) => String(row.id) === parentKey);
  if (!parent) throw new Error('Select a valid parent node before saving.');
  const parentLevel = Number(parent[levelField]);
  return Math.max(1, Number.isFinite(parentLevel) && parentLevel > 0 ? parentLevel + 1 : 2);
}

/** Applies the controlled CBS/WBS level before any form, inline edit or
 * import record is validated and persisted. */
export function applyDerivedHierarchyLevel(
  tableName: string,
  rows: Record<string, unknown>[],
  record: Record<string, unknown>,
): Record<string, unknown> {
  const parentField = PARENT_FIELDS[tableName];
  const levelField = LEVEL_FIELDS[tableName];
  if (!parentField || !levelField) return record;
  return { ...record, [levelField]: deriveHierarchyLevel(tableName, rows, record[parentField]) };
}

/** Reject self-references and cycles before persisting any governed hierarchy change. */
export function assertValidHierarchyChange(
  tableName: string,
  rows: Record<string, unknown>[],
  id: string,
  patch: Record<string, unknown>,
): void {
  const parentField = PARENT_FIELDS[tableName];
  if (!parentField || !(parentField in patch)) return;

  const parentId = patch[parentField] ? String(patch[parentField]) : '';
  if (!parentId) return;
  if (parentId === id) throw new Error('A record cannot be its own parent.');

  const byId = new Map(rows.map((row) => [String(row.id), row]));
  const seen = new Set<string>([id]);
  let currentId = parentId;
  while (currentId) {
    if (seen.has(currentId)) throw new Error('This parent selection would create a hierarchy cycle.');
    seen.add(currentId);
    const current = byId.get(currentId);
    currentId = current?.[parentField] ? String(current[parentField]) : '';
  }
}
