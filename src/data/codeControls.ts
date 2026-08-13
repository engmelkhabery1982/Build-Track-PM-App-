export type CodeControlledTable = 'projects' | 'contracts' | 'boq_headers' | 'boq_items' | 'schedules' | 'variations' | 'wir_entries' | 'client_invoices' | 'subcontractor_invoices';

export interface CodeControl {
  codeField: string;
  lockField: string;
  defaultPrefix: string;
  scopeFields: string[];
}

export const CODE_CONTROLS: Record<CodeControlledTable, CodeControl> = {
  projects: {
    codeField: 'project_code',
    lockField: 'project_code_locked',
    defaultPrefix: 'PRJ',
    scopeFields: [],
  },
  contracts: {
    codeField: 'contract_number',
    lockField: 'contract_number_locked',
    defaultPrefix: 'CNT',
    scopeFields: ['project_id'],
  },
  boq_headers: {
    codeField: 'boq_code',
    lockField: 'boq_code_locked',
    defaultPrefix: 'BOQ',
    scopeFields: ['project_id', 'classification'],
  },
  boq_items: {
    codeField: 'item_code',
    lockField: 'item_code_locked',
    defaultPrefix: 'ITM',
    scopeFields: ['boq_header_id', 'project_id', 'boq_code'],
  },
  schedules: {
    codeField: 'activity_code',
    lockField: 'activity_code_locked',
    defaultPrefix: 'ACT',
    scopeFields: ['boq_item_id'],
  },
  variations: {
    codeField: 'variation_number',
    lockField: 'variation_number_locked',
    defaultPrefix: 'VO',
    scopeFields: ['contract_id'],
  },
  wir_entries: { codeField: 'wir_number', lockField: 'wir_number_locked', defaultPrefix: 'WIR', scopeFields: ['contract_id'] },
  client_invoices: { codeField: 'invoice_number', lockField: 'invoice_number_locked', defaultPrefix: 'INV-CLIENT', scopeFields: ['contract_id'] },
  subcontractor_invoices: { codeField: 'invoice_number', lockField: 'invoice_number_locked', defaultPrefix: 'INV-SUB', scopeFields: ['contract_id'] },
};

function isCodeControlledTable(tableName: string): tableName is CodeControlledTable {
  return tableName in CODE_CONTROLS;
}

export function getCodeControl(tableName: string): CodeControl | undefined {
  return isCodeControlledTable(tableName) ? CODE_CONTROLS[tableName] : undefined;
}

function value(row: Record<string, unknown>, field: string): string {
  const item = row[field];
  return item === null || item === undefined ? '' : String(item).trim();
}

function isSameScope(
  row: Record<string, unknown>,
  draft: Record<string, unknown>,
  scopeFields: string[],
): boolean {
  return scopeFields.every((field) => {
    const expected = value(draft, field);
    return !expected || value(row, field) === expected;
  });
}

function nextCode(prefix: string, existingCodes: string[]): string {
  const matcher = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');
  const greatest = existingCodes.reduce((max, code) => {
    const match = code.match(matcher);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(greatest + 1).padStart(3, '0')}`;
}

function prefixFor(tableName: CodeControlledTable, draft: Record<string, unknown>): string {
  if (tableName === 'boq_headers') {
    return value(draft, 'classification') === 'Subcontractor' ? 'BOQ-SUB' : 'BOQ-MAIN';
  }
  return CODE_CONTROLS[tableName].defaultPrefix;
}

export function createCodeDraft(
  tableName: string,
  existingRows: Record<string, unknown>[],
): Record<string, unknown> {
  const control = getCodeControl(tableName);
  if (!control) return {};

  const draft: Record<string, unknown> = { [control.lockField]: false };
  const controlledTable = tableName as CodeControlledTable;
  const prefix = prefixFor(controlledTable, draft);
  const existingCodes = existingRows
    .filter((row) => isSameScope(row, draft, control.scopeFields))
    .map((row) => value(row, control.codeField))
    .filter(Boolean);

  draft[control.codeField] = nextCode(prefix, existingCodes);
  return draft;
}

export function prepareCodeControlledInsert(
  tableName: string,
  draft: Record<string, unknown>,
  existingRows: Record<string, unknown>[],
): Record<string, unknown> {
  const control = getCodeControl(tableName);
  if (!control) return draft;

  const prepared = { ...draft };
  if (!value(prepared, control.codeField)) {
    const controlledTable = tableName as CodeControlledTable;
    const prefix = prefixFor(controlledTable, prepared);
    const existingCodes = existingRows
      .filter((row) => isSameScope(row, prepared, control.scopeFields))
      .map((row) => value(row, control.codeField))
      .filter(Boolean);
    prepared[control.codeField] = nextCode(prefix, existingCodes);
  }
  prepared[control.lockField] = Boolean(prepared[control.lockField]);
  return prepared;
}

export function assertCodeUpdateAllowed(
  tableName: string,
  existingRow: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): void {
  const control = getCodeControl(tableName);
  if (!control || !existingRow) return;

  const codeChanged = control.codeField in patch && value(patch, control.codeField) !== value(existingRow, control.codeField);
  if (existingRow[control.lockField] === true && codeChanged) {
    throw new Error(`${control.codeField.replace('_', ' ')} is locked. Unlock it before changing the code.`);
  }
}

export function assertCodeCanBeLocked(tableName: string, row: Record<string, unknown>): void {
  const control = getCodeControl(tableName);
  if (control && !value(row, control.codeField)) {
    throw new Error(`A ${control.codeField.replace('_', ' ')} is required before it can be locked.`);
  }
}
