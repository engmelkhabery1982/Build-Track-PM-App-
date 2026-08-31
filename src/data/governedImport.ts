export type GovernedImportTable = 'boq_items' | 'schedules' | 'wir_entries';

export interface GovernedImportResult {
  batchId: string;
  status: 'Committed';
  committedCount: number;
  committedAt: string;
}

export interface GovernedImportDerivedPatch {
  table: 'boq_items' | 'contracts';
  id: string;
  patch: Record<string, unknown>;
}

/** Supporting master rows created in the same transaction as the imported
 * target rows. Primavera schedule import may create WBS nodes and safely
 * interpreted Work Calendar masters. */
export interface GovernedImportAuxiliaryRow {
  table: 'wbs_nodes' | 'work_calendars';
  row: Record<string, unknown>;
}

export interface GovernedImportReverseResult {
  batchId: string;
  status: 'Reversed';
  reversedCount: number;
}

/**
 * The desktop backend validates and writes the entire governed import in one
 * SQLite transaction. A rejected batch has no target/audit rows to undo.
 */
export async function commitGovernedImport(request: {
  batchId: string;
  source: string;
  fileName: string;
  targetTable: GovernedImportTable;
  projectId: string;
  contractId: string;
  rows: Record<string, unknown>[];
  derivedPatches?: GovernedImportDerivedPatch[];
  auxiliaryRows?: GovernedImportAuxiliaryRow[];
}): Promise<GovernedImportResult> {
  if (!('__TAURI_INTERNALS__' in window)) {
    throw new Error('Atomic governed imports are available only in the BuildTrack desktop application.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<GovernedImportResult>('commit_governed_import', { request });
}

/** Reverses the complete desktop import batch, including governed parent updates. */
export async function reverseGovernedImport(request: { batchId: string; reason: string }): Promise<GovernedImportReverseResult> {
  if (!('__TAURI_INTERNALS__' in window)) {
    throw new Error('Governed import reversal is available only in the BuildTrack desktop application.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<GovernedImportReverseResult>('reverse_governed_import', { request });
}
