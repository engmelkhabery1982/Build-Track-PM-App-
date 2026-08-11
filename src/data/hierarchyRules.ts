const PARENT_FIELDS: Record<string, string> = {
  projects: 'parent_main_project_id',
  contracts: 'parent_main_contract_id',
};

/** Reject self-references and cycles before persisting a project or contract hierarchy change. */
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
