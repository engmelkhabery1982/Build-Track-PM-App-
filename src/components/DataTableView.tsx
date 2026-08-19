import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { Plus, Search, Download, Loader as Loader2, X, ChevronDown, ChevronRight, Calendar, Upload, Printer, FileText, CircleAlert, CircleCheck, CircleMinus, BadgeDollarSign, SlidersHorizontal, Copy, ClipboardPaste, ArrowDownToLine, Bookmark, Undo2 } from 'lucide-react';
import type * as XLSX from 'xlsx';
import {
  assertCodeCanBeLocked,
  assertCodeIsUnique,
  assertCodeUpdateAllowed,
  assertValidHierarchyChange,
  assertRecordGovernance,
  createCodeDraft,
  dataRepository,
  getCodeControl,
  prepareCodeControlledInsert,
  getMainContractId,
} from '@/data';
import type { Project, BOQItem } from '@/types';
import type { LocalDataMutation } from '@/hooks/useData';

// XLSX is sizeable. It is used only for the explicit template/import/export
// actions, so loading it on demand keeps the desktop app responsive at start.
let xlsxModule: Promise<typeof import('xlsx')> | undefined;
const getXlsx = () => xlsxModule ||= import('xlsx');

function parsePrimaveraXerTasks(content: string): Record<string, any>[] {
  const lines = content.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const rows: Record<string, any>[] = [];
  let inTaskTable = false;
  let fields: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split('\t');
    if (cells[0] === '%T') { inTaskTable = cells[1] === 'TASK'; fields = []; continue; }
    if (!inTaskTable) continue;
    if (cells[0] === '%F') { fields = cells.slice(1); continue; }
    if (cells[0] !== '%R' || !fields.length) continue;
    const source = Object.fromEntries(fields.map((field, index) => [field, cells[index + 1] ?? '']));
    const activityCode = source.task_code || '';
    const activity = source.task_name || '';
    if (!activityCode || !activity) continue;
    rows.push({
      'Activity ID': activityCode,
      'Activity Name': activity,
      Start: String(source.act_start_date || source.target_start_date || source.early_start_date || '').slice(0, 10),
      Finish: String(source.act_end_date || source.target_end_date || source.early_end_date || '').slice(0, 10),
      'Original Duration': source.target_drtn || source.remain_drtn || '',
      'Planned Qty': source.target_work_qty || source.target_equip_qty || '',
      Calendar: source.clndr_id || '',
      Notes: source.task_descr || '',
    });
  }
  return rows;
}

export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'money' | 'date' | 'status' | 'progress' | 'boolean' | 'select' | 'evm';
  width?: string;
  editable?: boolean;
  options?: string[];
  autoFillFrom?: string;
  autoFillKey?: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: string[];
}

export interface SelectOption {
  value: string;
  label: string;
  data?: Record<string, any>;
}

interface DataTableViewProps {
  tableName: string;
  title: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  data: Record<string, any>[];
  columns: ColumnDef[];
  filters?: FilterDef[];
  projects: Project[];
  showProjectFilter?: boolean;
  /** Project selected from Project Workspace. It initializes the table context without preventing a user from changing the filter. */
  initialProjectId?: string;
  showProjectColumn?: boolean;
  projectPickerInForm?: boolean;
  dateRangeColumn?: string;
  boqItems?: BOQItem[];
  onMutated: (mutation: LocalDataMutation) => void;
  autoFillOptions?: Record<string, string[]>;
  relationshipOptions?: Record<string, SelectOption[]>;
  relationshipAutoFillFields?: string[];
  contracts?: { id: string; project_id: string; parent_main_contract_id?: string | null; start_date?: string | null; end_date?: string | null }[];
  baselines?: Record<string, any>[];
  onInsert?: (row: Record<string, any>) => Promise<Record<string, any> | Record<string, any>[]>;
  onUpdate?: (id: string, row: Record<string, any>) => Promise<Record<string, any>>;
  dateWarning?: (row: Record<string, any>) => string | null;
  validateRecord?: (row: Record<string, any>) => void;
  onDeleteGroup?: (row: Record<string, any>) => Promise<Record<string, any>[]>;
  deleteGroupKey?: string;
  canAdd?: boolean;
  readOnly?: boolean;
  createDraft?: () => Record<string, any>;
  formColumns?: ColumnDef[];
  editFormColumns?: ColumnDef[];
  addButtonLabel?: string;
  submitLabel?: string;
  toolbarAction?: { label: string; title?: string; onClick: () => void | Promise<void> };
  rowAction?: { label: string; title?: string; onClick: (row: Record<string, any>) => void | Promise<void> };
  progressWirs?: Record<string, any>[];
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (['completed', 'delivered', 'approved', 'closed', 'current', 'paid', 'pass'].includes(s))
    return 'bg-success-100 text-success-700 border-success-200';
  if (['in progress', 'active', 'ordered', 'under review', 'partially delivered', 'investigating', 'submitted', 'conditional pass'].includes(s))
    return 'bg-primary-100 text-primary-700 border-primary-200';
  if (['planning', 'requested', 'pending', 'draft', 'not started'].includes(s))
    return 'bg-secondary-100 text-secondary-700 border-secondary-200';
  if (['on hold', 'delayed', 'open', 'overdue', 'rejected', 'fail'].includes(s))
    return 'bg-warning-100 text-warning-700 border-warning-200';
  if (['cancelled', 'critical', 'high', 'terminated', 'over budget'].includes(s))
    return 'bg-error-100 text-error-700 border-error-200';
  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

function fmtMoney(n: number): string {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000) return `${n < 0 ? '-' : ''}$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${n < 0 ? '-' : ''}$${(v / 1_000).toFixed(1)}K`;
  return `${n < 0 ? '-' : ''}$${v.toFixed(0)}`;
}

/** Evaluates numeric arithmetic only; it never executes JavaScript. */
function evaluateArithmetic(expression: string): number | null {
  const source = expression.replace(/\s+/g, '');
  if (!source || !/^[0-9.+\-*/()]+$/.test(source)) return null;
  let position = 0;
  const factor = (): number | null => {
    if (source[position] === '+') { position += 1; return factor(); }
    if (source[position] === '-') { position += 1; const value = factor(); return value === null ? null : -value; }
    if (source[position] === '(') { position += 1; const value = sum(); if (source[position] !== ')') return null; position += 1; return value; }
    const match = source.slice(position).match(/^(?:\d+\.?\d*|\.\d+)/);
    if (!match) return null;
    position += match[0].length;
    return Number(match[0]);
  };
  const product = (): number | null => {
    let value = factor();
    while (value !== null && (source[position] === '*' || source[position] === '/')) {
      const operation = source[position++]; const next = factor();
      if (next === null || (operation === '/' && next === 0)) return null;
      value = operation === '*' ? value * next : value / next;
    }
    return value;
  };
  const sum = (): number | null => {
    let value = product();
    while (value !== null && (source[position] === '+' || source[position] === '-')) {
      const operation = source[position++]; const next = product();
      if (next === null) return null;
      value = operation === '+' ? value + next : value - next;
    }
    return value;
  };
  const result = sum();
  return result !== null && position === source.length && Number.isFinite(result) ? result : null;
}

function describeOperationError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const detail = error as Record<string, unknown>;
    for (const key of ['message', 'error', 'reason', 'details']) {
      const value = detail[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Fall through to the friendly message below.
    }
  }
  return fallback;
}

function renderCell(value: any, col: ColumnDef, relationshipOptions?: SelectOption[], row?: Record<string, any>): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-neutral-300">—</span>;
  const relationshipLabel = relationshipOptions?.find((option) => option.value === String(value))?.label;
  if (relationshipLabel) return <span className="text-neutral-700 text-sm">{relationshipLabel}</span>;
  switch (col.type) {
    case 'evm': {
      const cpi = Number(row?.cost_cpi);
      const spi = Number(row?.schedule_spi);
      const costHasData = Number.isFinite(cpi) && cpi > 0;
      const scheduleHasData = Number.isFinite(spi) && spi > 0;
      const costGood = costHasData && cpi >= 1;
      const scheduleGood = scheduleHasData && spi >= 1;
      const Indicator = ({ kind, good, hasData, ratio }: { kind: 'cost' | 'schedule'; good: boolean; hasData: boolean; ratio: number }) => {
        const Icon = hasData ? (good ? CircleCheck : CircleAlert) : CircleMinus;
        const colors = !hasData
          ? 'bg-neutral-100 text-neutral-500 border-neutral-200'
          : good ? 'bg-success-50 text-success-700 border-success-200' : 'bg-error-50 text-error-700 border-error-200';
        const label = kind === 'cost' ? 'Cost' : 'Schedule';
        const state = !hasData ? 'No data' : good ? 'Good' : 'Needs attention';
        const metric = kind === 'cost' ? 'CPI' : 'SPI';
        return (
          <span title={`${label}: ${state}${hasData ? ` — ${metric} ${ratio.toFixed(2)}` : ''}`} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 ${colors}`}>
            {kind === 'cost' ? <BadgeDollarSign size={14} /> : <Calendar size={14} />}
            <Icon size={14} strokeWidth={2.5} />
          </span>
        );
      };
      return <div className="flex items-center gap-1.5"><Indicator kind="cost" good={costGood} hasData={costHasData} ratio={cpi} /><Indicator kind="schedule" good={scheduleGood} hasData={scheduleHasData} ratio={spi} /></div>;
    }
    case 'money': return <span className="font-medium text-neutral-700">{fmtMoney(Number(value))}</span>;
    case 'number': return <span className="text-neutral-600">{Number(value).toLocaleString()}</span>;
    case 'date': return <span className="text-neutral-500 text-sm">{new Date(value).toLocaleDateString()}</span>;
    case 'status':
      return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(String(value))}`}>{value}</span>;
    case 'progress':
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-12">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${value}%` }} />
          </div>
          <span className="text-xs text-neutral-500 w-8">{value}%</span>
        </div>
      );
    case 'boolean':
      return <span className={value ? 'text-success-600 font-medium' : 'text-neutral-400'}>{value ? 'Yes' : 'No'}</span>;
    default: return <span className="text-neutral-700 text-sm">{String(value)}</span>;
  }
}

function InlineCellEditor({
  col, value, onCommit, onCancel, projects, autoFillOptions, relationshipOptions,
}: {
  col: ColumnDef;
  value: any;
  onCommit: (v: any) => void;
  onCancel: () => void;
  projects: Project[];
  autoFillOptions?: string[];
  relationshipOptions?: SelectOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const valRef = useRef<any>(value);

  useEffect(() => {
    const isDropdown = col.type === 'select' || col.type === 'status' || col.type === 'boolean' || Boolean(relationshipOptions?.length) || (autoFillOptions && autoFillOptions.length > 0 && (!col.options || col.options.length === 0));
    if (isDropdown) {
      selectRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onCommit(valRef.current); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }

  function stop(e: React.MouseEvent | React.FocusEvent) { e.stopPropagation(); }

  const baseClass = "w-full px-1 py-0.5 text-sm border-0 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500";

  if (relationshipOptions && relationshipOptions.length > 0) {
    return (
      <select ref={selectRef} value={valRef.current || ''}
        onChange={(e) => { valRef.current = e.target.value; onCommit(e.target.value || null); }}
        onClick={stop} onMouseDown={stop} onKeyDown={handleKeyDown} className={baseClass}>
        <option value="">None (main record)</option>
        {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  if (col.type === 'select' || col.type === 'status') {
    const opts = col.options && col.options.length > 0
      ? col.options
      : (col.key === 'project_id' ? projects.map((p) => p.id) : []);
    return (
      <select
        ref={selectRef}
        value={valRef.current || ''}
        onChange={(e) => { valRef.current = e.target.value; onCommit(e.target.value); }}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={handleKeyDown}
        className={baseClass}
      >
        <option value="">—</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (autoFillOptions && autoFillOptions.length > 0 && (!col.options || col.options.length === 0)) {
    return (
      <select
        ref={selectRef}
        value={valRef.current || ''}
        onChange={(e) => { valRef.current = e.target.value; onCommit(e.target.value); }}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={handleKeyDown}
        className={baseClass}
      >
        <option value="">—</option>
        {autoFillOptions.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (col.type === 'boolean') {
    return (
      <select
        ref={selectRef}
        value={valRef.current ? 'true' : 'false'}
        onChange={(e) => { valRef.current = e.target.value === 'true'; onCommit(e.target.value === 'true'); }}
        onClick={stop}
        onMouseDown={stop}
        onKeyDown={handleKeyDown}
        className={baseClass}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      // Numeric cells deliberately use a text input: HTML number inputs reject
      // an initial "=" and therefore make Excel-style formulas impossible.
      type={col.type === 'date' ? 'date' : 'text'}
      inputMode={col.type === 'number' || col.type === 'money' ? 'decimal' : undefined}
      value={valRef.current ?? ''}
      onChange={(e) => { valRef.current = e.target.value; }}
      onBlur={() => onCommit(valRef.current)}
      onClick={stop}
      onMouseDown={stop}
      onKeyDown={handleKeyDown}
      className={baseClass}
    />
  );
}

export function DataTableView({
  tableName, title, icon: Icon, data, columns, filters, projects, showProjectFilter, initialProjectId, showProjectColumn = showProjectFilter, projectPickerInForm, dateRangeColumn, boqItems, contracts, baselines = [], onMutated, autoFillOptions, relationshipOptions, relationshipAutoFillFields, onInsert, onUpdate, dateWarning, validateRecord, onDeleteGroup, deleteGroupKey, canAdd = true, readOnly = false, createDraft, formColumns, editFormColumns, addButtonLabel = 'Add New', submitLabel = 'Add Record', toolbarAction, rowAction, progressWirs = [],
}: DataTableViewProps) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showViewPicker, setShowViewPicker] = useState(false);
  const [visibleFilterKeys, setVisibleFilterKeys] = useState<string[]>(() => filters?.map((filter) => filter.key) || []);
  const [savedViews, setSavedViews] = useState<{ name: string; search: string; filterValues: Record<string, string>; visibleFilterKeys: string[]; visibleColumnKeys?: string[]; projectFilter: string; dateFrom: string; dateTo: string }[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnResize, setColumnResize] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const [projectFilter, setProjectFilter] = useState(initialProjectId || 'all');
  const [importScope, setImportScope] = useState<Record<string, any> | null>(null);
  const [workContext, setWorkContext] = useState<Record<string, any> | null>(null);
  const [importPreview, setImportPreview] = useState<{ fileName: string; rows: Record<string, any>[] } | null>(null);
  const [lastImportRows, setLastImportRows] = useState<Record<string, any>[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => columns.map((column) => column.key));

  // Entering a work area from Project Workspace establishes that project's
  // context. Once in the table, the normal project selector remains fully
  // available, including the option to inspect all projects.
  useEffect(() => {
    if (initialProjectId) setProjectFilter(initialProjectId);
  }, [initialProjectId]);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`buildtrack:import-scope:${tableName}`);
      const parsed = stored ? JSON.parse(stored) : null;
      setImportScope(parsed && typeof parsed === 'object' ? parsed : null);
      if (parsed?.project_id) setProjectFilter(parsed.project_id);
    } catch { setImportScope(null); }
  }, [tableName]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('buildtrack:work-context');
      const parsed = stored ? JSON.parse(stored) : null;
      setWorkContext(parsed && typeof parsed === 'object' ? parsed : null);
      if (!importScope && parsed?.project_id) setProjectFilter(parsed.project_id);
    } catch { setWorkContext(null); }
  }, [tableName, importScope]);

  const activeScope = importScope || workContext;
  const applicableScope = useMemo(() => Object.fromEntries(
    Object.entries(activeScope || {}).filter(([key]) => columns.some((column) => column.key === key)),
  ), [activeScope, columns]);

  function clearImportScope() {
    window.localStorage.removeItem(`buildtrack:import-scope:${tableName}`);
    setImportScope(null);
  }

  function clearWorkContext() {
    window.localStorage.removeItem('buildtrack:work-context');
    window.localStorage.removeItem(`buildtrack:import-scope:${tableName}`);
    setWorkContext(null);
    setImportScope(null);
    setProjectFilter('all');
  }

  function createScopedDraft() {
    let draft: Record<string, any> = { ...(createDraft ? createDraft() : createCodeDraft(tableName, data)), ...applicableScope };
    ['company_name', 'project_id', 'contract_id', 'boq_header_id'].forEach((key) => {
      if (draft[key]) draft = applyRelationshipSelection(draft, key, String(draft[key]));
    });
    return draft;
  }
  const [newRow, setNewRow] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Record<string, any>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; key: string } | null>(null);
  const [inlineValue, setInlineValue] = useState<any>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [collapsedScheduleItems, setCollapsedScheduleItems] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [formulaInput, setFormulaInput] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState('');
  const [operationNotice, setOperationNotice] = useState<{ kind: 'error' | 'warning' | 'success'; text: string } | null>(null);
  const [lastUndo, setLastUndo] = useState<{ id: string; before: Record<string, any>; label: string } | null>(null);
  const selectionAnchor = useRef<{ rowId: string; columnKey: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedViewport = useRef<{ top: number; left: number } | null>(null);

  function preserveViewport() {
    if (!scrollRef.current) return;
    savedViewport.current = {
      top: scrollRef.current.scrollTop,
      left: scrollRef.current.scrollLeft,
    };
  }

  async function undoLastUpdate() {
    if (!lastUndo || readOnly) return;
    setSaving(true);
    preserveViewport();
    try {
      const restored = await dataRepository.update<Record<string, any>>(tableName, lastUndo.id, lastUndo.before);
      onMutated({ type: 'update', row: restored });
      setClipboardNotice(`Undid ${lastUndo.label}.`);
      setLastUndo(null);
    } catch (error: any) {
      alert(`Could not undo the last change: ${error.message || 'Unknown error'}`);
    } finally { setSaving(false); }
  }

  const availableFilters = useMemo(() => columns
    .filter((column) => !['id', 'created_at', 'notes'].includes(column.key))
    .map((column) => ({ key: column.key, label: column.label, options: column.options || [] })), [columns]);

  useEffect(() => {
    const stored = window.localStorage.getItem(`buildtrack:visible-filters:${tableName}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setVisibleFilterKeys(parsed.filter((key) => availableFilters.some((filter) => filter.key === key)));
    } catch { /* Ignore malformed local preference. */ }
  }, [tableName, availableFilters]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`buildtrack:visible-columns:${tableName}`);
      const parsed = stored ? JSON.parse(stored) : null;
      setVisibleColumnKeys(Array.isArray(parsed) && parsed.length
        ? parsed.filter((key) => columns.some((column) => column.key === key))
        : columns.map((column) => column.key));
    } catch { setVisibleColumnKeys(columns.map((column) => column.key)); }
  }, [tableName, columns]);

  const visibleColumns = useMemo(() => {
    const selected = columns.filter((column) => visibleColumnKeys.includes(column.key));
    return selected.length ? selected : columns.slice(0, 1);
  }, [columns, visibleColumnKeys]);

  function toggleVisibleColumn(key: string) {
    setVisibleColumnKeys((current) => {
      const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
      if (!next.length) return current;
      window.localStorage.setItem(`buildtrack:visible-columns:${tableName}`, JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`buildtrack:saved-views:${tableName}`);
      const parsed = stored ? JSON.parse(stored) : [];
      setSavedViews(Array.isArray(parsed) ? parsed : []);
    } catch { setSavedViews([]); }
  }, [tableName]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`buildtrack:column-widths:${tableName}`);
      const parsed = stored ? JSON.parse(stored) : {};
      setColumnWidths(parsed && typeof parsed === 'object' ? parsed : {});
    } catch { setColumnWidths({}); }
  }, [tableName]);

  function startColumnResize(key: string, event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation();
    const header = event.currentTarget.closest('th');
    const startWidth = header?.getBoundingClientRect().width || 130;
    setColumnResize({ key, startX: event.clientX, startWidth });
  }

  useEffect(() => {
    if (!columnResize) return;
    const resize = columnResize as { key: string; startX: number; startWidth: number };
    function move(event: MouseEvent) {
      const nextWidth = Math.max(80, Math.min(620, resize.startWidth + event.clientX - resize.startX));
      setColumnWidths((current) => ({ ...current, [resize.key]: Math.round(nextWidth) }));
    }
    function up() { setColumnResize(null); }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [columnResize]);

  useEffect(() => {
    if (!Object.keys(columnWidths).length) return;
    window.localStorage.setItem(`buildtrack:column-widths:${tableName}`, JSON.stringify(columnWidths));
  }, [tableName, columnWidths]);

  function saveCurrentView() {
    const name = window.prompt('Name this table view:', `My ${title} view`)?.trim();
    if (!name) return;
    const next = [...savedViews.filter((view) => view.name !== name), { name, search, filterValues, visibleFilterKeys, visibleColumnKeys, projectFilter, dateFrom, dateTo }];
    setSavedViews(next);
    window.localStorage.setItem(`buildtrack:saved-views:${tableName}`, JSON.stringify(next));
  }

  function applySavedView(view: typeof savedViews[number]) {
    setSearch(view.search || ''); setFilterValues(view.filterValues || {}); setVisibleFilterKeys(view.visibleFilterKeys || []);
    setProjectFilter(view.projectFilter || 'all'); setDateFrom(view.dateFrom || ''); setDateTo(view.dateTo || ''); if (view.visibleColumnKeys?.length) setVisibleColumnKeys(view.visibleColumnKeys.filter((key) => columns.some((column) => column.key === key))); setShowViewPicker(false);
  }

  function deleteSavedView(name: string) {
    const next = savedViews.filter((view) => view.name !== name);
    setSavedViews(next);
    window.localStorage.setItem(`buildtrack:saved-views:${tableName}`, JSON.stringify(next));
  }

  function resetColumnWidths() {
    setColumnWidths({});
    window.localStorage.removeItem(`buildtrack:column-widths:${tableName}`);
  }

  function toggleVisibleFilter(key: string) {
    setVisibleFilterKeys((current) => {
      const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
      window.localStorage.setItem(`buildtrack:visible-filters:${tableName}`, JSON.stringify(next));
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = [...data];
    if (showProjectFilter && projectFilter !== 'all') {
      result = result.filter((r) => r.project_id === projectFilter);
    }
    if (activeScope?.contract_id && columns.some((column) => column.key === 'contract_id')) {
      result = result.filter((row) => row.contract_id === activeScope.contract_id);
    }
    Object.entries(filterValues).forEach(([key, val]) => {
      if (val !== 'all') result = result.filter((r) => String(r[key]) === val);
    });
    if (dateRangeColumn && dateFrom && tableName !== 'progress_entries') {
      result = result.filter((r) => { const d = r[dateRangeColumn]; return d && d >= dateFrom; });
    }
    if (dateRangeColumn && dateTo && tableName !== 'progress_entries') {
      result = result.filter((r) => { const d = r[dateRangeColumn]; return d && d <= dateTo; });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => columns.some((c) => String(r[c.key] || '').toLowerCase().includes(q)));
    }
    return result;
  }, [data, search, filterValues, projectFilter, columns, showProjectFilter, dateRangeColumn, dateFrom, dateTo, importScope, tableName]);

  const displayData: Record<string, any>[] = useMemo(() => {
    if (tableName === 'progress_entries') {
      const periodStart = dateFrom || '';
      // Without a selected end date, report through the latest registered
      // inspection. This also keeps imported/test records visible when their
      // dates are later than the workstation clock.
      const wirDates = progressWirs
        .map((wir) => String(wir.inspection_date || ''))
        .filter(Boolean)
        .sort();
      const latestWirDate = wirDates[wirDates.length - 1] || new Date().toISOString().slice(0, 10);
      const periodEnd = dateTo || latestWirDate;
      const contractsById = new Map((contracts || []).map((contract) => [contract.id, contract]));
      const mainContractIdFor = (contractId: string | null | undefined): string | null => {
        if (!contractId) return null;
        const visited = new Set<string>();
        let currentId = contractId;
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const current = contractsById.get(currentId);
          if (!current?.parent_main_contract_id) return currentId;
          currentId = current.parent_main_contract_id;
        }
        return contractId;
      };
      return filtered.map((contract) => {
        const project = projects.find((item) => item.id === contract.project_id) as any;
        // A project is created from its main contract. Use the contract date
        // first so an edited contract immediately controls its own report,
        // while retaining the project date as a safe fallback for old data.
        const contractStart = String(contract.start_date || project?.start_date || '');
        const scopedWirs = progressWirs.filter((wir) =>
          (contract.contract_role === 'Main Contract'
            ? mainContractIdFor(wir.contract_id) === contract.contract_id
            : wir.contract_id === contract.contract_id) &&
          String(wir.inspection_date || '') >= contractStart &&
          String(wir.inspection_date || '') <= periodEnd,
        );
        const valueOf = (wir: Record<string, any>) => {
          const wirContract = contractsById.get(wir.contract_id);
          // WIR keeps the main-contract price for project progress. For a
          // subcontractor's own progress, value its measured quantity using
          // the rate agreed in the subcontract BOQ item instead.
          if (contract.contract_role === 'Subcontract' && wirContract?.parent_main_contract_id) {
            const subcontractItem = boqItems?.find((item: any) => item.id === wir.boq_item_id) as any;
            const subcontractRate = Number(subcontractItem?.unit_rate);
            if (Number.isFinite(subcontractRate)) {
              return (Number(wir.quantity) || 0) * subcontractRate;
            }
          }
          return Number(wir.item_amount) || ((Number(wir.quantity) || 0) * (Number(wir.unit_price) || 0));
        };
        const previous = periodStart
          ? scopedWirs.filter((wir) => String(wir.inspection_date || '') < periodStart)
            .reduce((sum, wir) => sum + valueOf(wir), 0)
          : 0;
        const current = periodStart
          ? scopedWirs.filter((wir) => String(wir.inspection_date || '') >= periodStart)
            .reduce((sum, wir) => sum + valueOf(wir), 0)
          : scopedWirs.reduce((sum, wir) => sum + valueOf(wir), 0);
        const contractValue = Number(contract.contract_value) || 0;
        const total = previous + current;
        const percent = (value: number) => contractValue > 0 ? Math.round(value / contractValue * 10000) / 100 : 0;
        return {
          ...contract,
          date: periodEnd,
          prev_value: previous,
          prev_pct: percent(previous),
          current_value: current,
          current_pct: percent(current),
          total_value: total,
          total_pct: percent(total),
          percent_complete: percent(total),
        };
      });
    }
    if (tableName === 'boq_items') {
      return filtered.map((row) => ({
        ...row,
        amount: Math.round((Number(row.quantity) || 0) * (Number(row.unit_rate) || 0) * 100) / 100,
      }));
    }
    if (tableName === 'labor_duty') {
      return filtered.map((r) => ({
        ...r,
        total_hours: r.total_hours ?? Math.round(((Number(r.no_of_workers) || 0) * (Number(r.hours_per_day) || 0) * (Number(r.days) || 0)) * 100) / 100,
        amount: r.amount ?? Math.round((((Number(r.no_of_workers) || 0) * (Number(r.hours_per_day) || 0) * (Number(r.days) || 0)) * (Number(r.rate_per_hour) || 0)) * 100) / 100,
      }));
    }
    if (tableName === 'equipment') {
      return filtered.map((r) => ({
        ...r,
        amount: r.amount ?? Math.round(((Number(r.quantity) || 0) * (Number(r.unit_rate) || 0)) * 100) / 100,
      }));
    }
    if (tableName === 'cash_flow') {
      const runningBalance = new Map<string, number>();
      const balanceById = new Map<string, number>();
      [...data]
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.created_at || '').localeCompare(String(b.created_at || '')))
        .forEach((row) => {
          const scope = `${String(row.contract_id || row.project_id || 'unassigned')}:${String(row.movement_type || 'Manual')}`;
          const balance = (runningBalance.get(scope) || 0) + (Number(row.inflow) || 0) - (Number(row.outflow) || 0);
          runningBalance.set(scope, balance);
          balanceById.set(String(row.id), Math.round(balance * 100) / 100);
        });
      return filtered.map((row) => ({
        ...row,
        net: Math.round(((Number(row.inflow) || 0) - (Number(row.outflow) || 0)) * 100) / 100,
        cumulative_balance: balanceById.get(String(row.id)) || 0,
      }));
    }
    return filtered;
  }, [filtered, tableName, dateFrom, dateTo, progressWirs, projects]);

  const sortedData = useMemo(() => {
    if (tableName === 'schedules') {
      const byItem = new Map<string, Record<string, any>[]>();
      displayData.forEach((row) => {
        const key = String(row.boq_item_id || row.id);
        byItem.set(key, [...(byItem.get(key) || []), row]);
      });
      const ordered: Record<string, any>[] = [];
      [...byItem.entries()]
        .sort(([, a], [, b]) => String(a[0]?.boq_item_code || a[0]?.boq_item_name || '').localeCompare(String(b[0]?.boq_item_code || b[0]?.boq_item_name || '')))
        .forEach(([boqItemId, rows]) => {
          const summary = rows.find((row) => row.is_summary_row === true);
          const activities = rows.filter((row) => row !== summary)
            .sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')) || String(a.activity_code || '').localeCompare(String(b.activity_code || '')));
          if (summary) ordered.push(summary);
          if (!collapsedScheduleItems.has(boqItemId)) ordered.push(...activities);
        });
      return ordered;
    }
    if (!sortField) return displayData;
    return [...displayData].sort((a, b) => {
      const col = columns.find((c) => c.key === sortField);
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined || aVal === '') return 1;
      if (bVal === null || bVal === undefined || bVal === '') return -1;
      if (col?.type === 'number' || col?.type === 'money') {
        return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
      }
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [displayData, sortField, sortDir, columns, tableName, collapsedScheduleItems]);

  const activeCellInfo = useMemo(() => {
    if (!activeCell) return null;
    const rowIndex = sortedData.findIndex((row) => row.id === activeCell.rowId);
    const columnIndex = columns.findIndex((column) => column.key === activeCell.columnKey);
    if (rowIndex < 0 || columnIndex < 0) return null;
    return { row: sortedData[rowIndex], column: columns[columnIndex], rowIndex, columnIndex };
  }, [activeCell, sortedData, columns]);

  useEffect(() => {
    setFormulaInput(activeCellInfo ? String(activeCellInfo.row[activeCellInfo.column.key] ?? '') : '');
  }, [activeCellInfo]);

  const scheduleBOQIds = useMemo(() => new Set(
    displayData.map((row) => String(row.boq_item_id || '')).filter(Boolean),
  ), [displayData]);
  const hasSingleScheduleBOQ = tableName !== 'schedules' || scheduleBOQIds.size === 1;

  const columnSums = useMemo(() => {
    const sums: Record<string, number> = {};
    if (tableName === 'schedules' && !hasSingleScheduleBOQ) return sums;
    columns.forEach((col) => {
      const shouldSum = tableName === 'boq_items'
        ? col.key === 'amount'
        : tableName === 'wir_entries'
          ? col.key === 'item_amount'
          : (tableName === 'client_invoices' || tableName === 'subcontractor_invoices')
            ? col.key === 'amount'
          : (col.type === 'number' || col.type === 'money');
      if (shouldSum) {
        sums[col.key] = displayData
          .filter((row) => tableName !== 'schedules' || row.is_summary_row === true)
          .filter((row) => !['contracts', 'boq_headers', 'boq_items', 'variations'].includes(tableName) || row.contract_role !== 'Subcontract')
          .reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
      }
    });
    return sums;
  }, [displayData, columns, tableName, contracts, hasSingleScheduleBOQ]);

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  useLayoutEffect(() => {
    const viewport = savedViewport.current;
    const table = scrollRef.current;
    if (!viewport || !table) return;
    // Restore before the browser paints the refreshed rows, then once more on
    // the next frame for WebView layout recalculation after a local SQLite save.
    table.scrollTop = viewport.top;
    table.scrollLeft = viewport.left;
    window.requestAnimationFrame(() => {
      table.scrollTop = viewport.top;
      table.scrollLeft = viewport.left;
    });
    savedViewport.current = null;
  }, [data]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [search, filterValues, projectFilter, dateFrom, dateTo]);

  function toggleSort(key: string) {
    if (sortField === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(key);
      setSortDir('asc');
    }
  }

  function getDynamicFilterOptions(key: string): string[] {
    const vals = [...new Set(data.map((r) => String(r[key])).filter((v) => v && v !== 'null' && v !== 'undefined'))];
    return vals.sort();
  }

  function coerceTypes(row: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const col = columns.find((c) => c.key === key);
      if (col) {
        if (col.type === 'number' || col.type === 'money') {
          out[key] = val === '' || val === null || val === undefined ? 0 : Number(val);
        } else if (col.type === 'boolean') {
          out[key] = val === true || val === 'true';
        } else if (col.type === 'progress') {
          const n = Number(val);
          out[key] = isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
        } else {
          out[key] = val;
        }
      } else {
        out[key] = val;
      }
    }
    if (tableName === 'labor_duty') {
      const nw = Number(out.no_of_workers) || 0;
      const hpd = Number(out.hours_per_day) || 0;
      const d = Number(out.days) || 0;
      const rph = Number(out.rate_per_hour) || 0;
      out.total_hours = Math.round(nw * hpd * d * 100) / 100;
      out.amount = Math.round(out.total_hours * rph * 100) / 100;
    }
    if (tableName === 'equipment') {
      const qty = Number(out.quantity) || 0;
      const ur = Number(out.unit_rate) || 0;
      out.amount = Math.round(qty * ur * 100) / 100;
    }
    if (tableName === 'procurement') {
      const qty = Number(out.quantity) || 0;
      const unitCost = Number(out.unit_cost) || 0;
      out.total_cost = Math.round(qty * unitCost * 100) / 100;
    }
    if (tableName === 'cash_flow') {
      out.inflow = Number(out.inflow) || 0;
      out.outflow = Number(out.outflow) || 0;
      out.net = Math.round((out.inflow - out.outflow) * 100) / 100;
      out.cumulative_balance = 0;
      out.movement_type = out.movement_type || 'Manual';
      out.status = out.status || 'Open';
    }
    if (tableName === 'boq_items') {
      const qty = Number(out.quantity) || 0;
      const unitRate = Number(out.unit_rate) || 0;
      out.amount = Math.round(qty * unitRate * 100) / 100;
    }
    if (tableName === 'wir_entries') {
      const qty = Number(out.quantity) || 0;
      const price = Number(out.unit_price) || 0;
      out.item_amount = Math.round(qty * price * 100) / 100;
      const mainItemValue = Number(out.main_boq_item_value) || 0;
      out.completion_pct = mainItemValue > 0 ? Math.round(out.item_amount / mainItemValue * 10000) / 100 : 0;
    }
    if (tableName === 'subcontractor_invoices' || tableName === 'client_invoices') {
      const qty = Number(out.quantity) || 0;
      const ur = Number(out.unit_rate) || 0;
      if (qty && ur) out.amount = Math.round(qty * ur * 100) / 100;
    }
    if (tableName === 'schedule_distributions') {
      const quantity = Number(out.planned_quantity) || 0;
      const rate = Number(out.unit_rate) || 0;
      out.planned_value = Math.round(quantity * rate * 100) / 100;
    }
    if (tableName === 'schedules') {
      const item = boqItems?.find((candidate) => candidate.id === out.boq_item_id);
      const start = String(out.start_date || '');
      const end = String(out.end_date || '');
      const duration = Number(out.duration_days) || 0;
      if (start && end) {
        const days = Math.ceil((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000);
        if (Number.isFinite(days) && days >= 0) out.duration_days = Math.max(1, days);
      } else if (start && duration > 0) {
        const finish = new Date(`${start}T00:00:00`);
        finish.setDate(finish.getDate() + Math.ceil(duration));
        out.end_date = finish.toISOString().slice(0, 10);
      } else if (end && duration > 0) {
        const begin = new Date(`${end}T00:00:00`);
        begin.setDate(begin.getDate() - Math.ceil(duration));
        out.start_date = begin.toISOString().slice(0, 10);
      }
      const quantity = Number(out.planned_quantity) || 0;
      const rate = Number(item?.unit_rate ?? out.unit_rate) || 0;
      out.unit_rate = rate;
      out.planned_value = Math.round(quantity * rate * 100) / 100;
      out.budget = out.planned_value;
    }
    if (contracts && (tableName === 'subcontractor_invoices' || tableName === 'cost_entries' || tableName === 'costs' || tableName === 'progress_entries' || tableName === 'wir_entries')) {
      const mainContractId = getMainContractId(out.contract_id, contracts);
      if (mainContractId && mainContractId !== out.contract_id) out.main_contract_id = mainContractId;
    }
    return out;
  }

  function autoFillFromBOQItems(row: Record<string, any>, setRow: (r: Record<string, any>) => void, changedKey: string) {
    const col = columns.find((c) => c.key === changedKey);
    if (!col?.autoFillFrom || col.autoFillFrom !== 'boqItems' || !boqItems) return;
    const itemCode = row[changedKey];
    if (!itemCode) return;
    const match = boqItems.find((b) => b.item_code === itemCode || b.id === itemCode);
    if (!match) return;
    const updates: Record<string, any> = { ...row };
    updates.item_name = match.item_name || match.description || '';
    updates.boq_item_name = match.item_name || match.description || '';
    updates.item_desc = match.item_name || match.description || '';
    updates.item_description = match.description || '';
    updates.unit = match.unit || '';
    updates.quantity = match.quantity || 0;
    updates.unit_rate = match.unit_rate || 0;
    updates.unit_price = match.unit_rate || 0;
    updates.boq_code = match.boq_code || '';
    updates.project_code = match.project_code || '';
    if (updates.quantity && updates.unit_rate) {
      updates.amount = (Number(updates.quantity) || 0) * (Number(updates.unit_rate) || 0);
    }
    setRow(updates);
  }

  function autoFillFromData(row: Record<string, any>, setRow: (r: Record<string, any>) => void, changedKey: string) {
    if (!autoFillOptions || !autoFillOptions[changedKey]) return;
    const selected = row[changedKey];
    if (!selected) return;
    const match = data.find((r) => r[changedKey] === selected);
    if (!match) return;
    const updates: Record<string, any> = { ...row };
    columns.forEach((c) => {
      if (c.key !== changedKey && c.key !== 'id' && c.key !== 'created_at' && match[c.key] !== undefined) {
        updates[c.key] = match[c.key];
      }
    });
    setRow(updates);
  }

  function applyRelationshipSelection(row: Record<string, any>, changedKey: string, selectedValue: string | null, existingRows: Record<string, any>[] = data): Record<string, any> {
    const selected = relationshipOptions?.[changedKey]?.find((option) => option.value === selectedValue);
    const allowedFields = new Set([
      ...columns.map((column) => column.key),
      'project_id', 'contract_id', 'boq_header_id', 'boq_item_id', 'schedule_id', 'predecessor_item',
      'boq_code', 'contract_role', 'contract_number', 'contractor', 'company_name',
      'main_boq_item_id', 'main_boq_item_code', 'main_unit_rate', 'main_boq_item_value',
      'baseline_start_date', 'baseline_end_date', 'planned_start_date', 'planned_end_date', 'variance_reason',
      ...(relationshipAutoFillFields || []),
    ]);
    const relatedData = Object.fromEntries(
      Object.entries(selected?.data || {}).filter(([key]) => allowedFields.has(key)),
    );
    const updated = {
      ...row,
      ...relatedData,
      [changedKey]: changedKey === 'company_name' ? (selected?.data?.company_name || '') : selectedValue,
    };
    if (tableName === 'boq_headers' && changedKey === 'contract_id' && selected?.data?.contract_number) {
      const contractCode = String(selected.data.contract_number);
      const prefix = selected.data.contract_role === 'Subcontract'
        ? `${contractCode}-BOQ-SUB-`
        : `${contractCode}-BOQ-`;
      const next = existingRows
        .filter((item) => item.contract_id === selectedValue)
        .map((item) => Number(String(item.boq_code || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.boq_code || /^BOQ-(MAIN|SUB)-\d+$/i.test(String(updated.boq_code))) {
        updated.boq_code = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    if (tableName === 'boq_items' && changedKey === 'boq_header_id' && selected?.data?.boq_code) {
      const boqCode = String(selected.data.boq_code);
      const prefix = `${boqCode}-ITM-`;
      const next = existingRows
        .filter((item) => item.boq_header_id === selectedValue)
        .map((item) => Number(String(item.item_code || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.item_code || /^ITM-\d+$/i.test(String(updated.item_code))) {
        updated.item_code = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    if (tableName === 'schedules' && changedKey === 'boq_item_id' && selected?.data?.item_code) {
      const itemCode = String(selected.data.item_code);
      const next = existingRows.filter((activity) => activity.boq_item_id === selectedValue).length + 1;
      if (!updated.activity_code || /^ACT-\d+$/i.test(String(updated.activity_code))) {
        updated.activity_code = `${itemCode}-ACT-${String(next).padStart(3, '0')}`;
      }
      updated.unit_rate = Number(selected.data.unit_rate) || 0;
      const plannedQuantity = Number(updated.planned_quantity) || 0;
      updated.planned_value = Math.round(plannedQuantity * updated.unit_rate * 100) / 100;
      updated.budget = updated.planned_value;
    }
    if (tableName === 'wir_entries' && changedKey === 'company_name' && selected?.data?.contract_number) {
      const prefix = `${String(selected.data.contract_number)}-${selected.data.contract_role === 'Subcontract' ? 'SUB-' : ''}WIR-`;
      const next = existingRows.filter((item) => item.contract_id === selected?.data?.contract_id)
        .map((item) => Number(String(item.wir_number || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.wir_number || /^WIR-\d+$/i.test(String(updated.wir_number))) {
        updated.wir_number = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    if ((tableName === 'client_invoices' || tableName === 'subcontractor_invoices') && changedKey === 'contract_id' && selected?.data?.contract_number) {
      const suffix = tableName === 'client_invoices' ? 'INV-CLIENT-' : 'INV-SUB-';
      const prefix = `${String(selected.data.contract_number)}-${suffix}`;
      const next = existingRows.filter((item) => item.contract_id === selectedValue)
        .map((item) => Number(String(item.invoice_number || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.invoice_number || /^INV-(CLIENT|SUB)-\d+$/i.test(String(updated.invoice_number))) {
        updated.invoice_number = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    return updated;
  }

  function assertRelationshipScope(record: Record<string, any>): void {
    assertRecordGovernance(tableName, record);
    assertCodeIsUnique(tableName, record, data);
    const selectedContract = relationshipOptions?.contract_id?.find((option) => option.value === record.contract_id);
    const selectedHeader = relationshipOptions?.boq_header_id?.find((option) => option.value === record.boq_header_id);
    const selectedItem = relationshipOptions?.boq_item_id?.find((option) => option.value === record.boq_item_id);
    const selectedSchedule = relationshipOptions?.schedule_id?.find((option) => option.value === record.schedule_id);
    const selectedParty = relationshipOptions?.party_id?.find((option) => option.value === record.party_id);
    const selectedClientParty = relationshipOptions?.client_party_id?.find((option) => option.value === record.client_party_id);
    const selectedContractorParty = relationshipOptions?.contractor_party_id?.find((option) => option.value === record.contractor_party_id);
    const selectedSupplierParty = relationshipOptions?.supplier_party_id?.find((option) => option.value === record.supplier_party_id);

    if (selectedContract?.data?.project_id && record.project_id && selectedContract.data.project_id !== record.project_id) {
      throw new Error('The selected contract belongs to a different project.');
    }
    if (selectedHeader?.data?.project_id && record.project_id && selectedHeader.data.project_id !== record.project_id) {
      throw new Error('The selected BOQ belongs to a different project.');
    }
    if (selectedHeader?.data?.contract_id && record.contract_id && selectedHeader.data.contract_id !== record.contract_id) {
      throw new Error('The selected BOQ belongs to a different contract.');
    }
    if (selectedItem?.data?.project_id && record.project_id && selectedItem.data.project_id !== record.project_id) {
      throw new Error('The selected BOQ item belongs to a different project.');
    }
    if (selectedItem?.data?.boq_header_id && record.boq_header_id && selectedItem.data.boq_header_id !== record.boq_header_id) {
      throw new Error('The selected BOQ item belongs to a different BOQ.');
    }
    if (selectedItem?.data?.contract_id && record.contract_id && selectedItem.data.contract_id !== record.contract_id) {
      throw new Error('The selected BOQ item belongs to a different contract.');
    }
    if (selectedSchedule?.data?.project_id && record.project_id && selectedSchedule.data.project_id !== record.project_id) {
      throw new Error('The selected activity belongs to a different project.');
    }
    if (record.party_id && !selectedParty) throw new Error('Select a valid active party from Master Data.');
    if (record.client_party_id && !selectedClientParty) throw new Error('Select a valid active client from Master Data.');
    if (record.contractor_party_id && !selectedContractorParty) throw new Error('Select a valid active contractor from Master Data.');
    if (record.supplier_party_id && !selectedSupplierParty) throw new Error('Select a valid active supplier from Master Data.');
    const predecessor = relationshipOptions?.predecessor_item?.find((option) => option.value === record.predecessor_item);
    if (predecessor?.data?.project_id && record.project_id && predecessor.data.project_id !== record.project_id) {
      throw new Error('The predecessor activity belongs to a different project.');
    }
    if (tableName === 'schedules' && record.predecessor_item && record.predecessor_item === record.id) {
      throw new Error('An activity cannot be its own predecessor.');
    }

    const selectedContractRow = contracts?.find((contract) => contract.id === record.contract_id);
    if (tableName === 'boq_items' && selectedContractRow?.parent_main_contract_id && !record.main_boq_item_id) {
      throw new Error('A subcontractor BOQ item must be linked to its parent main BOQ item.');
    }
    if (tableName === 'boq_items' && !selectedContractRow?.parent_main_contract_id && record.main_boq_item_id) {
      throw new Error('Only subcontractor BOQ items may have a parent main BOQ item.');
    }
    if (tableName === 'boq_items' && record.main_boq_item_id) {
      const selectedMainItem = relationshipOptions?.main_boq_item_id?.find((option) => option.value === record.main_boq_item_id);
      if (!selectedMainItem) throw new Error('Select a valid parent main BOQ item.');
      if (selectedMainItem.data?.project_id && record.project_id && selectedMainItem.data.project_id !== record.project_id) {
        throw new Error('The parent main BOQ item must belong to the same project.');
      }
    }
    if (tableName === 'client_invoices' && selectedContractRow?.parent_main_contract_id) {
      throw new Error('Client invoices must be assigned to the main contract.');
    }
    if (tableName === 'subcontractor_invoices' && selectedContractRow && !selectedContractRow.parent_main_contract_id) {
      throw new Error('A subcontractor invoice must be assigned to a subcontract.');
    }
    if (tableName === 'cash_flow') {
      const inflow = Number(record.inflow) || 0;
      const outflow = Number(record.outflow) || 0;
      if (inflow > 0 && outflow > 0) throw new Error('A cash-flow row must be either an inflow or an outflow, not both.');
      if (inflow === 0 && outflow === 0) throw new Error('Enter a positive inflow or outflow for the cash-flow row.');
    }
    if (tableName === 'client_invoice_tracking' || tableName === 'subcontractor_invoice_tracking') {
      const paymentStatus = String(record.payment_status || '');
      const paymentDate = String(record.payment_date || '');
      if (paymentStatus === 'Paid' && !paymentDate) throw new Error('A paid invoice requires a payment date.');
      if (paymentStatus !== 'Paid' && paymentDate) throw new Error('Set payment status to Paid before recording a payment date.');
    }
    if (tableName === 'schedules') {
      const item = boqItems?.find((candidate) => candidate.id === record.boq_item_id);
      const isExecutableActivity = Boolean(String(record.activity || '').trim());
      const plannedQuantity = Number(record.planned_quantity) || 0;
      if (!item) throw new Error('Select a valid main BOQ item for the activity.');
      if (isExecutableActivity && plannedQuantity <= 0) throw new Error('Planned quantity must be greater than zero.');
      // A blank activity is the BOQ Total row, not an executable activity.
      // It is derived from children and must not consume BOQ quantity.
      const otherActivities = data.filter((activity) =>
        activity.id !== record.id &&
        activity.boq_item_id === item.id &&
        activity.is_summary_row !== true &&
        String(activity.activity || '').trim(),
      );
      const total = otherActivities.reduce((sum, activity) => sum + (Number(activity.planned_quantity) || 0), 0) + (isExecutableActivity ? plannedQuantity : 0);
      const allowed = Number(item.quantity) || 0;
      if (total > allowed + 0.000001) {
        throw new Error(`Planned quantity exceeds BOQ quantity: existing activities ${otherActivities.reduce((sum, activity) => sum + (Number(activity.planned_quantity) || 0), 0).toLocaleString()} + new ${plannedQuantity.toLocaleString()} = ${total.toLocaleString()}, while BOQ allows ${allowed.toLocaleString()}.`);
      }
      const itemStart = String(item.planned_start_date || item.baseline_start_date || '');
      const itemEnd = String(item.planned_end_date || item.baseline_end_date || '');
      const activityStart = String(record.start_date || '');
      const activityEnd = String(record.end_date || '');
      if (isExecutableActivity && (!itemStart || !itemEnd)) {
        throw new Error('Set the governed BOQ item start and finish dates before adding an activity.');
      }
      const outsideItemDates = (itemStart && activityStart && activityStart < itemStart)
        || (itemEnd && activityEnd && activityEnd > itemEnd);
      if (isExecutableActivity && outsideItemDates && !String(record.variance_reason || '').trim()) {
        throw new Error(`Activity dates are outside the governed BOQ item period (${itemStart || 'not set'} to ${itemEnd || 'not set'}). Enter a variance reason before saving.`);
      }
    }
    if (tableName === 'wir_entries') {
      const item = boqItems?.find((candidate) => candidate.id === record.boq_item_id);
      if (!item) throw new Error('Select a valid BOQ item before saving the inspection request.');
      const mainItemId = String((item as any).main_boq_item_id || item.id);
      const mainItem = boqItems?.find((candidate) => candidate.id === mainItemId) || item;
      const reservedQuantity = progressWirs
        .filter((wir) => wir.id !== record.id && String(wir.result || '') !== 'Fail' && String(wir.status || '') !== 'Rejected')
        .filter((wir) => {
          const wirItem = boqItems?.find((candidate) => candidate.id === wir.boq_item_id);
          return String((wirItem as any)?.main_boq_item_id || wirItem?.id || '') === mainItemId;
        })
        .reduce((sum, wir) => sum + (Number(wir.quantity) || 0), 0);
      const requestedQuantity = Number(record.quantity) || 0;
      const allowedQuantity = Number((mainItem as any).quantity) || 0;
      if (reservedQuantity + requestedQuantity > allowedQuantity + 0.000001) {
        throw new Error(`Inspection quantity exceeds the governed BOQ quantity: existing requests ${reservedQuantity.toLocaleString()} + new ${requestedQuantity.toLocaleString()} = ${(reservedQuantity + requestedQuantity).toLocaleString()}, while BOQ allows ${allowedQuantity.toLocaleString()}.`);
      }
      const itemStart = String((mainItem as any).planned_start_date || (mainItem as any).baseline_start_date || '');
      const itemEnd = String((mainItem as any).planned_end_date || (mainItem as any).baseline_end_date || '');
      const inspectionDate = String(record.inspection_date || '');
      if (!itemStart || !itemEnd) {
        throw new Error('Set the governed main BOQ item start and finish dates before adding an inspection request.');
      }
      if (((itemStart && inspectionDate && inspectionDate < itemStart) || (itemEnd && inspectionDate && inspectionDate > itemEnd))
        && !String(record.variance_reason || '').trim()) {
        throw new Error(`Inspection date is outside the governed BOQ item period (${itemStart || 'not set'} to ${itemEnd || 'not set'}). Enter a variance reason before saving.`);
      }
    }
    if (tableName === 'boq_items' && !selectedContractRow?.parent_main_contract_id) {
      const mainContractId = record.contract_id || selectedHeader?.data?.contract_id;
      const baseline = baselines
        .filter((row) => row.status === 'Approved' && row.contract_id === mainContractId)
        .sort((a, b) => String(b.baseline_date || '').localeCompare(String(a.baseline_date || '')))[0];
      const baselineStart = String(record.baseline_start_date || '');
      const baselineEnd = String(record.baseline_end_date || '');
      if (baseline && baselineStart && baseline.planned_start_date && baselineStart < String(baseline.planned_start_date)) {
        throw new Error('BOQ baseline start cannot be before the approved project baseline start.');
      }
      if (baseline && baselineEnd && baseline.planned_end_date && baselineEnd > String(baseline.planned_end_date)) {
        throw new Error('BOQ baseline finish cannot be after the approved project baseline finish.');
      }
      const currentStart = String(record.planned_start_date || '');
      const currentEnd = String(record.planned_end_date || '');
      const changedFromBaseline = (baselineStart && currentStart && currentStart !== baselineStart)
        || (baselineEnd && currentEnd && currentEnd !== baselineEnd);
      if (changedFromBaseline && !String(record.variance_reason || '').trim()) {
        throw new Error('A BOQ current-plan date differs from its baseline date. Enter a schedule variance reason before saving.');
      }
    }
    if (tableName === 'project_baselines') {
      const baselineContract = contracts?.find((contract) => contract.id === record.contract_id) as Record<string, any> | undefined;
      if (baselineContract?.parent_main_contract_id) throw new Error('A project baseline can be assigned only to a main contract.');
      if (record.status === 'Approved' && data.some((row) => row.id !== record.id && row.contract_id === record.contract_id && row.status === 'Approved')) {
        throw new Error('Only one approved baseline is allowed per main contract. Supersede the current baseline first.');
      }
    }
    assertDateGovernance(record);
  }

  function assertDateGovernance(record: Record<string, any>): void {
    const start = String(record.start_date || '');
    const end = String(record.end_date || '');
    if (start && end && end < start) throw new Error('End date cannot be earlier than start date.');

    const ownContract = contracts?.find((contract) => contract.id === record.contract_id) as Record<string, any> | undefined;
    const parentContract = tableName === 'contracts' && record.parent_main_contract_id
      ? contracts?.find((contract) => contract.id === record.parent_main_contract_id) as Record<string, any> | undefined
      : undefined;
    const mainContractId = ownContract ? getMainContractId(ownContract.id, contracts || []) : null;
    const mainContract = mainContractId ? contracts?.find((contract) => contract.id === mainContractId) as Record<string, any> | undefined : undefined;
    const scope = parentContract || (tableName === 'contracts' ? undefined : (mainContract || ownContract));
    // A main contract is the master date source and is allowed to extend its
    // project; its update is then synchronized to Projects by App. Every
    // other operational record is constrained by its contract/project.
    const project = tableName === 'contracts'
      ? undefined
      : projects.find((candidate) => candidate.id === (record.project_id || ownContract?.project_id));
    const scopeStart = String(scope?.start_date || project?.start_date || '');
    const scopeEnd = String(scope?.revised_end_date || scope?.end_date || project?.end_date || '');
    const dateFields = [
      'start_date', 'end_date', 'planned_start_date', 'planned_end_date',
      'baseline_start_date', 'baseline_end_date', 'inspection_date', 'date',
      'invoice_date', 'due_date', 'payment_date', 'order_date', 'delivery_date',
      'baseline_date', 'data_date', 'raised_date', 'submitted_date',
      'requested_date', 'decision_date', 'approved_date', 'upload_date',
      'period_start', 'period_end', 'from_date', 'to_date', 'effective_date',
    ];
    for (const field of dateFields) {
      const date = String(record[field] || '');
      if (!date) continue;
      const label = field.replace(/_/g, ' ');
      if (scopeStart && date < scopeStart) throw new Error(`${label} must not be before the contract/project start date.`);
      if (scopeEnd && date > scopeEnd) throw new Error(`${label} must not be after the contract/project end date.`);
    }
  }

  async function handleAdd() {
    setSaving(true);
    preserveViewport();
    try {
      const row = prepareCodeControlledInsert(tableName, newRow, data);
      const prepared = coerceTypes(row);
      assertRelationshipScope(prepared);
      validateRecord?.(prepared);
      const inserted = onInsert
        ? await onInsert(prepared)
        : await dataRepository.insert<Record<string, any>>(tableName, prepared);
      setShowAdd(false);
      setMinimizedModal(null);
      setNewRow({});
      if (Array.isArray(inserted)) onMutated({ type: 'insertMany', rows: inserted });
      else onMutated({ type: 'insert', row: inserted });
      const warning = dateWarning?.(Array.isArray(inserted) ? inserted[0] : inserted);
      if (warning) setOperationNotice({ kind: 'warning', text: `Saved with schedule warning: ${warning}` });
      else setOperationNotice({ kind: 'success', text: 'Record saved successfully.' });
    } catch (error: any) {
      console.error(`Could not add a ${tableName} record.`, error);
      setOperationNotice({ kind: 'error', text: describeOperationError(error, 'Failed to add the record.') });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editingId) return;
    setSaving(true);
    preserveViewport();
    try {
      const before = data.find((row) => row.id === editingId);
      const patch = coerceTypes(editRow);
      assertCodeUpdateAllowed(tableName, data.find((row) => row.id === editingId), patch);
      assertValidHierarchyChange(tableName, data, editingId, patch);
      assertRelationshipScope({ ...data.find((row) => row.id === editingId), ...patch });
      validateRecord?.({ ...data.find((row) => row.id === editingId), ...patch });
      const updated = onUpdate
        ? await onUpdate(editingId, patch)
        : await dataRepository.update<Record<string, any>>(tableName, editingId, patch);
      setEditingId(null);
      setMinimizedModal(null);
      setEditRow({});
      onMutated({ type: 'update', row: updated });
      if (before && !onUpdate) setLastUndo({ id: editingId, before: { ...before }, label: 'form edit' });
      const warning = dateWarning?.(updated);
      if (warning) setOperationNotice({ kind: 'warning', text: `Saved with schedule warning: ${warning}` });
      else setOperationNotice({ kind: 'success', text: 'Record updated successfully.' });
    } catch (error: any) {
      setOperationNotice({ kind: 'error', text: error.message || 'Failed to update the record.' });
    } finally {
      setSaving(false);
    }
  }

  function handleImportClick() { fileInputRef.current?.click(); }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const isXer = file.name.toLowerCase().endsWith('.xer');
      if (isXer && tableName !== 'schedules') throw new Error('Primavera XER files can be imported only from Schedule & Activities.');
      const rows: Record<string, any>[] = isXer
        ? parsePrimaveraXerTasks(await file.text())
        : await (async () => { const XLSX = await getXlsx(); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }) as Record<string, any>[]; })();
      if (rows.length === 0) {
        setImportResult({ success: 0, failed: 0, errors: [isXer ? 'No TASK activities were found in the Primavera XER file.' : 'The Excel file is empty or has no data rows.'] });
        setImporting(false);
        e.target.value = '';
        return;
      }
      const normalizeHeader = (value: unknown) => String(value || '')
        .toLowerCase().trim().replace(/[\s_\-\/]+/g, ' ');
      const labelToKey: Record<string, string> = {};
      columns.forEach((c) => { labelToKey[normalizeHeader(c.label)] = c.key; });
      if (showProjectFilter) labelToKey['project'] = 'project_id';
      // Primavera P6 and MS Project exports use different column names. Keep
      // this import adapter deliberately limited to fields that have a clear
      // equivalent in our schedule model; it does not invent relationships.
      if (tableName === 'schedules') {
        Object.assign(labelToKey, {
          'activity id': 'activity_code', 'activity name': 'activity', 'task name': 'activity',
          'wbs': 'wbs_code', 'wbs path': 'wbs_code', 'start date': 'start_date',
          'finish': 'end_date', 'finish date': 'end_date', 'end date': 'end_date',
          'original duration': 'duration_days', 'planned duration': 'duration_days',
          'remaining duration': 'remaining_duration_days', 'budgeted total cost': 'budget',
          'planned cost': 'budget', 'budgeted units': 'planned_quantity', 'planned units': 'planned_quantity',
          'resource names': 'responsible', 'calendar name': 'calendar_name',
          'primary constraint': 'notes', 'predecessors': 'predecessor_item',
        });
      }
      if (tableName === 'schedule_distributions') {
        Object.assign(labelToKey, {
          'activity id': 'schedule_id', 'activity name': 'activity_name', 'start': 'period_start',
          'finish': 'period_end', 'finish date': 'period_end', 'end': 'period_end',
          'budgeted units': 'planned_quantity', 'planned units': 'planned_quantity',
          'budgeted total cost': 'planned_value', 'planned cost': 'planned_value',
        });
      }
      const resolveRelationship = (key: string, value: any) => {
        if (value === '' || value === null || value === undefined) return value;
        const options = relationshipOptions?.[key];
        if (!options?.length) return value;
        const search = String(value).trim().toLowerCase();
        const direct = options.find((option) => String(option.value).toLowerCase() === search);
        const label = options.find((option) => String(option.label).trim().toLowerCase() === search);
        // P6 files normally contain only the displayed activity/contract code,
        // while application labels often include a description after it.
        const codedLabel = options.find((option) => String(option.label).trim().toLowerCase().startsWith(`${search} `)
          || String(option.label).trim().toLowerCase().startsWith(`${search} —`)
          || String(option.label).trim().toLowerCase().startsWith(`${search} -`));
        return (direct || label || codedLabel)?.value || value;
      };
      const rawMapped = rows.map((r) => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          const key = labelToKey[normalizeHeader(k)] || (columns.some((column) => column.key === k) ? k : null);
          if (key) out[key] = v;
        }
        ['project_id', 'company_name', 'contract_id', 'boq_header_id', 'boq_item_id', 'main_boq_item_id', 'schedule_id', 'predecessor_item'].forEach((key) => {
          out[key] = resolveRelationship(key, out[key]);
        });
        return { ...out, ...applicableScope };
      });
      const stagedRows: Record<string, any>[] = [];
      const mapped = rawMapped.map((raw, index) => {
        let enriched = { ...raw };
        ['company_name', 'project_id', 'contract_id', 'boq_header_id', 'main_boq_item_id', 'boq_item_id', 'schedule_id', 'predecessor_item'].forEach((key) => {
          if (enriched[key] !== '' && enriched[key] !== null && enriched[key] !== undefined) {
            enriched = applyRelationshipSelection(enriched, key, String(enriched[key]), [...data, ...stagedRows]);
          }
        });
        const control = getCodeControl(tableName);
        if (control && !String(enriched[control.codeField] || '').trim()) {
          enriched = prepareCodeControlledInsert(tableName, enriched, [...data, ...stagedRows]);
        }
        enriched = coerceTypes(enriched);
        try {
          assertCodeIsUnique(tableName, enriched, [...data, ...stagedRows]);
        } catch (error: any) {
          throw new Error(`Row ${index + 2}: ${error.message || 'Duplicate generated code.'}`);
        }
        stagedRows.push(enriched);
        return enriched;
      });
      if (isXer) {
        mapped.forEach((row, index) => {
          const code = String(row.activity_code || '');
          const item = boqItems?.filter((candidate) => candidate.item_code && (code === candidate.item_code || code.startsWith(`${candidate.item_code}-`)))
            .sort((a, b) => String(b.item_code).length - String(a.item_code).length)[0];
          if (!item) throw new Error(`XER activity ${code} (row ${index + 1}) does not begin with an existing BOQ Item Code. Use the generated ITEMCODE-ACT-### format or import through the Excel mapping template.`);
          const itemOption = relationshipOptions?.boq_item_id?.find((option) => option.value === item.id);
          if (!itemOption?.data?.contract_id) throw new Error(`BOQ item ${item.item_code} has no main-contract relationship.`);
          row.boq_item_id = item.id;
          row.contract_id = itemOption.data.contract_id;
          row.project_id = item.project_id;
        });
      }
      // Spreadsheet imports must meet the same relationship and quantity
      // rules as manual schedule entry. Otherwise an imported P6/MS Project
      // export could silently produce activities that do not contribute to
      // project controls or EVM.
      if (tableName === 'schedules') {
        const importedQtyByItem = new Map<string, number>();
        const existingQtyByItem = new Map<string, number>();
        const existingActivityCountByItem = new Map<string, number>();
        const importedActivityCountByItem = new Map<string, number>();
        data.filter((row) => !row.is_summary_row && String(row.activity || '').trim()).forEach((row) => {
          existingQtyByItem.set(String(row.boq_item_id || ''), (existingQtyByItem.get(String(row.boq_item_id || '')) || 0) + (Number(row.planned_quantity) || 0));
          existingActivityCountByItem.set(String(row.boq_item_id || ''), (existingActivityCountByItem.get(String(row.boq_item_id || '')) || 0) + 1);
        });
        mapped.forEach((row, index) => {
          const contract = contracts?.find((candidate) => candidate.id === row.contract_id);
          const item = boqItems?.find((candidate) => candidate.id === row.boq_item_id);
          if (!contract || contract.parent_main_contract_id) throw new Error(`Row ${index + 2}: select a valid main Contract Code.`);
          if (!item) throw new Error(`Row ${index + 2}: BOQ Item Code must match an existing main-contract BOQ item.`);
          const itemOption = relationshipOptions?.boq_item_id?.find((option) => option.value === item.id);
          if (item.project_id !== contract.project_id || (itemOption?.data?.contract_id && itemOption.data.contract_id !== contract.id)) {
            throw new Error(`Row ${index + 2}: the selected BOQ item does not belong to the selected main contract.`);
          }
          const quantity = Number(row.planned_quantity) || 0;
          if (quantity <= 0) throw new Error(`${isXer ? `XER activity ${row.activity_code}` : `Row ${index + 2}`}: Planned Qty must be greater than zero. Add target work quantity in Primavera or use the Excel mapping template.`);
          if (!String(row.activity || '').trim()) throw new Error(`Row ${index + 2}: Activity is required.`);
          const imported = (importedQtyByItem.get(item.id) || 0) + quantity;
          const existing = existingQtyByItem.get(item.id) || 0;
          if (existing + imported > (Number(item.quantity) || 0) + 0.000001) {
            throw new Error(`Row ${index + 2}: imported planned quantity exceeds the BOQ quantity for ${item.item_code}.`);
          }
          importedQtyByItem.set(item.id, imported);
          importedActivityCountByItem.set(item.id, (importedActivityCountByItem.get(item.id) || 0) + 1);
          row.project_id = contract.project_id;
          row.boq_header_id = item.boq_header_id || null;
          row.boq_item_name = item.item_name || item.description || '';
          row.unit_rate = Number(item.unit_rate) || 0;
          row.budget = Math.round(quantity * row.unit_rate * 100) / 100;
          row.planned_value = row.budget;
          if (!row.activity_code) row.activity_code = `${item.item_code || 'ITEM'}-ACT-${String((existingActivityCountByItem.get(item.id) || 0) + (importedActivityCountByItem.get(item.id) || 0)).padStart(3, '0')}`;
        });
      }
      // Do not write immediately after the user chooses a file.  The user
      // first reviews the mapped values and the active project/contract
      // context, then explicitly accepts the import in the preview panel.
      setImportPreview({ fileName: file.name, rows: mapped });
    } catch (err: any) {
      setImportResult({ success: 0, failed: 0, errors: [err.message || 'Failed to read the Excel file.'] });
    }
    setImporting(false);
    e.target.value = '';
  }

  async function commitImportPreview() {
    if (!importPreview) return;
    setImporting(true);
    let success = 0;
    const insertedRows: Record<string, any>[] = [];
    const errors: string[] = [];
    // Persist one row at a time so that valid operational records survive an
    // invalid row, while the outcome clearly tells the user exactly what was
    // accepted and what must be corrected.
    for (let i = 0; i < importPreview.rows.length; i += 1) {
      const row = importPreview.rows[i];
      try {
        assertRelationshipScope(row);
        validateRecord?.(row);
        const inserted = await dataRepository.insert<Record<string, any>>(tableName, row);
        success += 1;
        insertedRows.push(inserted);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message || 'Failed to import.'}`);
      }
    }
    setImportResult({ success, failed: importPreview.rows.length - success, errors });
    if (insertedRows.length > 0) onMutated({ type: 'insertMany', rows: insertedRows });
    setLastImportRows(insertedRows);
    if (success > 0) setOperationNotice({ kind: errors.length ? 'warning' : 'success', text: errors.length ? `${success} row(s) imported. ${errors.length} row(s) need correction.` : `${success} row(s) imported successfully. You can undo this import during this session.` });
    setImportPreview(null);
    setImporting(false);
  }

  async function undoLastImport() {
    if (!lastImportRows.length || readOnly) return;
    if (!window.confirm(`Remove the ${lastImportRows.length} row(s) imported in the last operation?`)) return;
    setImporting(true);
    const failed: string[] = [];
    for (const row of lastImportRows) {
      try {
        await dataRepository.delete(tableName, row.id);
        onMutated({ type: 'delete', id: row.id });
      } catch (error: any) { failed.push(error.message || `Could not remove row ${row.id}.`); }
    }
    setLastImportRows([]);
    setImporting(false);
    setOperationNotice(failed.length ? { kind: 'warning', text: `Import undo completed with ${failed.length} issue(s).` } : { kind: 'success', text: 'The latest import was removed.' });
  }

  function handlePrint() { window.print(); }

  async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<void> {
    const XLSX = await getXlsx();
    const bytes = new Uint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
    if ('__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      const savedPath = await invoke<string>('save_excel_download', { fileName, bytes: Array.from(bytes) });
      alert(`Excel file saved to:\n${savedPath}`);
      return;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const download = document.createElement('a');
    download.href = url;
    download.download = fileName;
    document.body.appendChild(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function downloadExcelTemplate() {
    const XLSX = await getXlsx();
    const headerRow: Record<string, string> = {};
    const codeField = getCodeControl(tableName)?.codeField;
    const derivedProjectTables = new Set(['boq_headers', 'boq_items', 'schedules', 'wir_entries']);
    const requiredReadOnlyInputs: Record<string, string[]> = {
      schedules: ['duration_days'],
    };
    columns
      .filter((column) => column.key !== codeField && !column.key.endsWith('_locked'))
      .filter((column) => column.editable === true || (requiredReadOnlyInputs[tableName] || []).includes(column.key))
      .forEach((column) => { headerRow[column.label] = ''; });
    // Project, contract, BOQ and pricing fields that are derived from a
    // selected relationship must not be typed again in an import worksheet.
    if (showProjectFilter && !derivedProjectTables.has(tableName)) headerRow.Project = '';
    const ws = XLSX.utils.json_to_sheet([headerRow]);
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    try {
      await saveWorkbook(wb, `${tableName}_template.xlsx`);
    } catch (error: any) {
      alert(`Could not save the template: ${error.message || 'Unknown error'}`);
    }
  }

  function startInlineEdit(id: string, key: string, value: any) {
    setInlineEdit({ id, key });
    setInlineValue(value ?? '');
  }

  async function commitInlineEdit(commitValue?: any, target?: { id: string; key: string } | null) {
    const editTarget = target || inlineEdit;
    if (!editTarget) return;
    preserveViewport();
    const { id, key } = editTarget;
    const col = columns.find((c) => c.key === key);
    let val = commitValue !== undefined ? commitValue : inlineValue;
    if (col) {
      if (col.type === 'number' || col.type === 'money') {
        const raw = String(val ?? '');
        const expression = raw.trim();
        val = expression.startsWith('=') ? evaluateGridFormula(expression) : expression === '' ? null : parseFloat(expression.replace(/[^0-9.\-]/g, ''));
        if (isNaN(val as number)) val = null;
      } else if (col.type === 'boolean') {
        val = val === true || val === 'true' || val === 1 || val === '1';
      } else if (col.type === 'progress') {
        val = val === '' || val === null ? 0 : Math.min(100, Math.max(0, parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0));
      } else if (col.type === 'date') {
        val = val ? String(val).slice(0, 10) : null;
      } else if (col.type === 'select' || col.type === 'status') {
        val = val || null;
      } else {
        val = val === '' ? null : String(val);
      }
    }
    setInlineEdit(null);
    setInlineValue(null);
    try {
      const before = data.find((row) => row.id === id);
      const patch: Record<string, any> = { [key]: val };
      if (tableName === 'boq_items' && (key === 'quantity' || key === 'unit_rate')) {
        const existing = data.find((row) => row.id === id) || {};
        const quantity = Number(key === 'quantity' ? val : existing.quantity) || 0;
        const unitRate = Number(key === 'unit_rate' ? val : existing.unit_rate) || 0;
        patch.amount = Math.round(quantity * unitRate * 100) / 100;
      }
      if (tableName === 'wir_entries' && (key === 'quantity' || key === 'unit_price')) {
        const existing = data.find((row) => row.id === id) || {};
        const quantity = Number(key === 'quantity' ? val : existing.quantity) || 0;
        const unitPrice = Number(key === 'unit_price' ? val : existing.unit_price) || 0;
        patch.item_amount = Math.round(quantity * unitPrice * 100) / 100;
        const mainItemValue = Number(existing.main_boq_item_value) || 0;
        patch.completion_pct = mainItemValue > 0 ? Math.round(patch.item_amount / mainItemValue * 10000) / 100 : 0;
      }
      if (tableName === 'schedules') {
        const existing = data.find((row) => row.id === id) || {};
        const merged = { ...existing, ...patch };
        const item = boqItems?.find((candidate) => candidate.id === merged.boq_item_id);
        if (key === 'planned_quantity' || key === 'boq_item_id') {
          const rate = Number(item?.unit_rate ?? merged.unit_rate) || 0;
          patch.unit_rate = rate;
          patch.planned_value = Math.round((Number(merged.planned_quantity) || 0) * rate * 100) / 100;
          patch.budget = patch.planned_value;
        }
        if ((key === 'start_date' || key === 'end_date') && merged.start_date && merged.end_date) {
          const days = Math.ceil((new Date(`${merged.end_date}T00:00:00`).getTime() - new Date(`${merged.start_date}T00:00:00`).getTime()) / 86400000);
          if (Number.isFinite(days) && days >= 0) patch.duration_days = Math.max(1, days);
        }
        if (key === 'duration_days' && merged.start_date && Number(val) > 0) {
          const finish = new Date(`${merged.start_date}T00:00:00`);
          finish.setDate(finish.getDate() + Math.ceil(Number(val)));
          patch.end_date = finish.toISOString().slice(0, 10);
        }
      }
      assertCodeUpdateAllowed(tableName, data.find((row) => row.id === id), patch);
      assertValidHierarchyChange(tableName, data, id, patch);
      assertRelationshipScope({ ...data.find((row) => row.id === id), ...patch });
      validateRecord?.({ ...data.find((row) => row.id === id), ...patch });
      const updated = await dataRepository.update<Record<string, any>>(tableName, id, patch);
      onMutated({ type: 'update', row: updated });
      if (before) setLastUndo({ id, before: { ...before }, label: `${col?.label || key} edit` });
    } catch (error: any) {
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    }
  }

  function cancelInlineEdit() { setInlineEdit(null); setInlineValue(null); }

  async function toggleCodeLock(row: Record<string, any>) {
    const control = getCodeControl(tableName);
    if (!control) return;
    const locked = Boolean(row[control.lockField]);
    if (!locked) assertCodeCanBeLocked(tableName, row);

    setSaving(true);
    try {
      const updated = await dataRepository.update<Record<string, any>>(tableName, row.id, { [control.lockField]: !locked });
      onMutated({ type: 'update', row: updated });
    } catch (error: any) {
      alert(`Failed to ${locked ? 'unlock' : 'lock'} code: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    preserveViewport();
    try {
      const row = data.find((item) => item.id === deleteId);
      const deletedRows = row && onDeleteGroup
        ? await onDeleteGroup(row)
        : [row].filter(Boolean) as Record<string, any>[];
      if (!onDeleteGroup) await dataRepository.delete(tableName, deleteId);
      setDeleteId(null);
      deletedRows.forEach((deleted) => onMutated({ type: 'delete', id: deleted.id }));
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to delete the record.'}`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: Record<string, any>) { setMinimizedModal(null); setEditingId(row.id); setEditRow({ ...row }); }

  function duplicateRow(row: Record<string, any>) {
    const { id: _id, created_at: _createdAt, is_summary_row: _summary, ...copy } = row;
    const codeDraft = createDraft ? createDraft() : createCodeDraft(tableName, data);
    setMinimizedModal(null);
    setNewRow({ ...copy, ...codeDraft });
    setShowAdd(true);
  }

  const canDuplicateRows = canAdd && !readOnly && !['projects', 'progress_entries', 'audit_log', 'app_users', 'client_invoices', 'subcontractor_invoices', 'client_invoice_tracking', 'subcontractor_invoice_tracking', 'report_templates'].includes(tableName);

  async function exportExcel(rowsToExport = displayData) {
    const XLSX = await getXlsx();
    const exportedRows = rowsToExport.map((row) => {
      const exported: Record<string, any> = {};
      if (showProjectColumn) exported.Project = projectMap[row.project_id] || '';
      columns.forEach((column) => { exported[column.label] = row[column.key] ?? ''; });
      return exported;
    });
    const ws = XLSX.utils.json_to_sheet(exportedRows.length ? exportedRows : [Object.fromEntries(columns.map((column) => [column.label, '']))]);
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    try {
      await saveWorkbook(wb, `${tableName}_export.xlsx`);
    } catch (error: any) {
      alert(`Could not export the Excel file: ${error.message || 'Unknown error'}`);
    }
  }

  function toggleRowSelection(id: string) {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisibleRows() {
    const selectable = sortedData.filter((row) => !row.is_summary_row).map((row) => row.id);
    setSelectedRowIds((current) => selectable.every((id) => current.has(id)) ? new Set() : new Set(selectable));
  }

  async function bulkUpdateStatus() {
    const statusColumn = columns.find((column) => column.key === 'status' && (column.options?.length || 0) > 0);
    const rows = data.filter((row) => selectedRowIds.has(row.id));
    if (!statusColumn || !rows.length || readOnly) return;
    const value = window.prompt(`Set status for ${rows.length} selected row(s):\n${statusColumn.options!.join(', ')}`, statusColumn.options![0]);
    if (!value || !statusColumn.options!.includes(value)) { if (value) setOperationNotice({ kind: 'error', text: 'Choose one of the listed status values.' }); return; }
    setSaving(true);
    const errors: string[] = [];
    for (const row of rows) {
      try {
        const patch = { status: value };
        assertRelationshipScope({ ...row, ...patch });
        validateRecord?.({ ...row, ...patch });
        const updated = await dataRepository.update<Record<string, any>>(tableName, row.id, patch);
        onMutated({ type: 'update', row: updated });
      } catch (error: any) { errors.push(error.message || `Could not update row ${row.id}.`); }
    }
    setSaving(false);
    setOperationNotice(errors.length ? { kind: 'warning', text: `Status updated with ${errors.length} issue(s).` } : { kind: 'success', text: `Status updated for ${rows.length} selected row(s).` });
  }

  async function bulkUpdateTextField(key: 'owner' | 'due_date') {
    const rows = data.filter((row) => selectedRowIds.has(row.id));
    if (!rows.length || readOnly || !columns.some((column) => column.key === key)) return;
    const label = key === 'owner' ? 'owner' : 'due date (YYYY-MM-DD)';
    const value = window.prompt(`Set ${label} for ${rows.length} selected row(s):`, '');
    if (value === null || !value.trim()) return;
    if (key === 'due_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) { setOperationNotice({ kind: 'error', text: 'Enter the due date as YYYY-MM-DD.' }); return; }
    setSaving(true);
    const errors: string[] = [];
    for (const row of rows) {
      try {
        const patch = { [key]: value.trim() };
        assertRelationshipScope({ ...row, ...patch });
        validateRecord?.({ ...row, ...patch });
        const updated = await dataRepository.update<Record<string, any>>(tableName, row.id, patch);
        onMutated({ type: 'update', row: updated });
      } catch (error: any) { errors.push(error.message || `Could not update row ${row.id}.`); }
    }
    setSaving(false);
    setOperationNotice(errors.length ? { kind: 'warning', text: `Bulk update completed with ${errors.length} issue(s).` } : { kind: 'success', text: `${label} updated for ${rows.length} selected row(s).` });
  }

  function printSelectedRows() {
    const rows = displayData.filter((row) => selectedRowIds.has(row.id));
    if (!rows.length) return;
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
    const windowRef = window.open('', '_blank', 'width=1200,height=800');
    if (!windowRef) { setOperationNotice({ kind: 'error', text: 'Allow pop-ups to print the selected rows.' }); return; }
    windowRef.document.write(`<!doctype html><html><head><title>${esc(title)} selected rows</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#1f2937}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left;font-size:11px}th{background:#f1f5f9}</style></head><body><h1>${esc(title)} — selected rows (${rows.length})</h1><table><thead><tr>${visibleColumns.map((column) => `<th>${esc(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${visibleColumns.map((column) => `<td>${esc(row[column.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    windowRef.document.close(); windowRef.focus(); windowRef.print();
  }

  function selectCell(rowId: string, columnKey: string, event: React.MouseEvent<HTMLTableCellElement>) {
    // A click inside a table cell does not automatically focus its scroll
    // container. Without this, Excel shortcuts and arrow navigation never
    // reach handleGridKeyDown in a desktop WebView.
    scrollRef.current?.focus({ preventScroll: true });
    const cellId = `${rowId}:${columnKey}`;
    setActiveCell({ rowId, columnKey });
    if (event.shiftKey && selectionAnchor.current) {
      const anchorRow = sortedData.findIndex((row) => row.id === selectionAnchor.current!.rowId);
      const targetRow = sortedData.findIndex((row) => row.id === rowId);
      const anchorColumn = columns.findIndex((column) => column.key === selectionAnchor.current!.columnKey);
      const targetColumn = columns.findIndex((column) => column.key === columnKey);
      if (anchorRow >= 0 && targetRow >= 0 && anchorColumn >= 0 && targetColumn >= 0) {
        const range = new Set<string>();
        for (let rowIndex = Math.min(anchorRow, targetRow); rowIndex <= Math.max(anchorRow, targetRow); rowIndex += 1) {
          for (let columnIndex = Math.min(anchorColumn, targetColumn); columnIndex <= Math.max(anchorColumn, targetColumn); columnIndex += 1) {
            range.add(`${sortedData[rowIndex].id}:${columns[columnIndex].key}`);
          }
        }
        setSelectedCells(range);
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedCells((previous) => {
        const next = new Set(previous);
        if (next.has(cellId)) next.delete(cellId); else next.add(cellId);
        return next;
      });
    } else {
      setSelectedCells(new Set([cellId]));
      selectionAnchor.current = { rowId, columnKey };
    }
  }

  function selectedBounds() {
    const cells = [...selectedCells].map((cellId) => {
      const divider = cellId.lastIndexOf(':');
      return { row: sortedData.findIndex((row) => row.id === cellId.slice(0, divider)), col: columns.findIndex((column) => column.key === cellId.slice(divider + 1)) };
    }).filter((cell) => cell.row >= 0 && cell.col >= 0);
    if (!cells.length) return null;
    return { fromRow: Math.min(...cells.map((cell) => cell.row)), toRow: Math.max(...cells.map((cell) => cell.row)), fromCol: Math.min(...cells.map((cell) => cell.col)), toCol: Math.max(...cells.map((cell) => cell.col)) };
  }

  function evaluateGridFormula(input: string): number | null {
    if (!input.trim().startsWith('=')) return null;
    const expanded = input.slice(1).replace(/\b([A-Z]+)(\d+)\b/g, (_match, letters: string, rowNumber: string) => {
      const columnIndex = letters.split('').reduce((value, letter) => value * 26 + (letter.charCodeAt(0) - 64), 0) - 1;
      const row = sortedData[Number(rowNumber) - 1];
      const column = columns[columnIndex];
      const value = Number(String(row?.[column?.key] ?? '').replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(value) ? String(value) : 'NaN';
    });
    return evaluateArithmetic(expanded);
  }

  async function copySelectedCells() {
    const bounds = selectedBounds();
    if (!bounds) return;
    const text = Array.from({ length: bounds.toRow - bounds.fromRow + 1 }, (_, rowOffset) =>
      Array.from({ length: bounds.toCol - bounds.fromCol + 1 }, (_, columnOffset) => {
        const row = sortedData[bounds.fromRow + rowOffset];
        const column = columns[bounds.fromCol + columnOffset];
        return selectedCells.has(`${row.id}:${column.key}`) ? String(row[column.key] ?? '') : '';
      }).join('\t'),
    ).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setClipboardNotice(`Copied ${selectedCells.size} cell${selectedCells.size === 1 ? '' : 's'}.`);
    } catch {
      // Fallback for older Windows WebViews which block navigator.clipboard.
      const area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      const copied = document.execCommand('copy'); area.remove();
      setClipboardNotice(copied ? `Copied ${selectedCells.size} cell${selectedCells.size === 1 ? '' : 's'}.` : 'Clipboard access was blocked by the operating system.');
    }
  }

  async function pasteTextAtSelection(clipboardText: string) {
    const anchor = selectionAnchor.current;
    if (!anchor) return;
    try {
      if (!clipboardText.trim()) return;
      const startRow = sortedData.findIndex((row) => row.id === anchor.rowId);
      const startColumn = columns.findIndex((column) => column.key === anchor.columnKey);
      if (startRow < 0 || startColumn < 0) return;
      const matrix = clipboardText.replace(/\r/g, '').split('\n').map((line) => line.split('\t'));
      preserveViewport();
      let updatedCount = 0;
      const nextSelection = new Set<string>();
      for (let rowOffset = 0; rowOffset < matrix.length && startRow + rowOffset < sortedData.length; rowOffset += 1) {
        const targetRow = sortedData[startRow + rowOffset];
        if (targetRow.is_summary_row) continue;
        for (let columnOffset = 0; columnOffset < matrix[rowOffset].length && startColumn + columnOffset < columns.length; columnOffset += 1) {
          const column = columns[startColumn + columnOffset];
          const control = getCodeControl(tableName);
          if (readOnly || column.editable === false || (control?.codeField === column.key && targetRow[control.lockField])) continue;
          let value: any = matrix[rowOffset][columnOffset];
          if (column.type === 'number' || column.type === 'money') {
            const formulaValue = evaluateGridFormula(value);
            value = value === '' ? null : value.trim().startsWith('=') ? formulaValue : Number(value.replace(/[^0-9.\-]/g, ''));
            if (value !== null && !Number.isFinite(value)) throw new Error(`Invalid numeric formula in ${column.label}.`);
          }
          else if (column.type === 'boolean') value = ['true', 'yes', '1'].includes(value.trim().toLowerCase());
          else if (column.type === 'progress') value = Math.min(100, Math.max(0, Number(value) || 0));
          else if (column.type === 'date') value = value ? value.slice(0, 10) : null;
          const patch: Record<string, any> = { [column.key]: value };
          if (tableName === 'boq_items' && (column.key === 'quantity' || column.key === 'unit_rate')) {
            const quantity = Number(column.key === 'quantity' ? value : targetRow.quantity) || 0;
            const rate = Number(column.key === 'unit_rate' ? value : targetRow.unit_rate) || 0;
            patch.amount = Math.round(quantity * rate * 100) / 100;
          }
          assertCodeUpdateAllowed(tableName, targetRow, patch);
          assertRelationshipScope({ ...targetRow, ...patch });
          const updated = await dataRepository.update<Record<string, any>>(tableName, targetRow.id, patch);
          onMutated({ type: 'update', row: updated });
          nextSelection.add(`${targetRow.id}:${column.key}`);
          updatedCount += 1;
        }
      }
      setSelectedCells(nextSelection);
      setClipboardNotice(updatedCount ? `Pasted ${updatedCount} cell${updatedCount === 1 ? '' : 's'}.` : 'No editable cells were available to paste.');
    } catch (error: any) { setClipboardNotice(`Paste failed: ${error.message || 'clipboard access was blocked.'}`); }
  }

  async function pasteSelectedCells() {
    try {
      await pasteTextAtSelection(await navigator.clipboard.readText());
    } catch {
      // The toolbar has no native ClipboardEvent. Ctrl+V is still supported through
      // handleGridPaste below, which works in Tauri even when Clipboard permission is denied.
      setClipboardNotice('Clipboard permission was blocked. Select a cell, then use Ctrl+V to paste.');
    }
  }

  function handleGridPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const clipboardText = event.clipboardData?.getData('text/plain');
    if (!clipboardText) return;
    event.preventDefault();
    void pasteTextAtSelection(clipboardText);
  }

  async function fillDownSelectedCells() {
    const bounds = selectedBounds();
    if (!bounds || bounds.toRow === bounds.fromRow) return;
    preserveViewport();
    let count = 0;
    try {
      for (let columnIndex = bounds.fromCol; columnIndex <= bounds.toCol; columnIndex += 1) {
        const column = columns[columnIndex];
        const source = sortedData[bounds.fromRow];
        const control = getCodeControl(tableName);
        if (source.is_summary_row || readOnly || column.editable === false || (control?.codeField === column.key && source[control.lockField])) continue;
        const value = source[column.key];
        for (let rowIndex = bounds.fromRow + 1; rowIndex <= bounds.toRow; rowIndex += 1) {
          const target = sortedData[rowIndex];
          if (!selectedCells.has(`${target.id}:${column.key}`) || target.is_summary_row || (control?.codeField === column.key && target[control.lockField])) continue;
          const patch: Record<string, any> = { [column.key]: value };
          if (tableName === 'boq_items' && (column.key === 'quantity' || column.key === 'unit_rate')) {
            const quantity = Number(column.key === 'quantity' ? value : target.quantity) || 0;
            const rate = Number(column.key === 'unit_rate' ? value : target.unit_rate) || 0;
            patch.amount = Math.round(quantity * rate * 100) / 100;
          }
          assertCodeUpdateAllowed(tableName, target, patch);
          assertRelationshipScope({ ...target, ...patch });
          const updated = await dataRepository.update<Record<string, any>>(tableName, target.id, patch);
          onMutated({ type: 'update', row: updated });
          count += 1;
        }
      }
      setClipboardNotice(count ? `Filled down ${count} cell${count === 1 ? '' : 's'}.` : 'Select at least two editable rows to fill down.');
    } catch (error: any) { setClipboardNotice(`Fill down failed: ${error.message || 'Unknown error.'}`); }
  }

  function applyFormulaBar() {
    if (!activeCellInfo) return;
    const { row, column } = activeCellInfo;
    const control = getCodeControl(tableName);
    if (readOnly || row.is_summary_row || column.editable === false || (control?.codeField === column.key && row[control.lockField])) {
      setClipboardNotice('The selected cell is read-only.');
      return;
    }
    void commitInlineEdit(formulaInput, { id: row.id, key: column.key });
  }

  function excelColumnName(index: number): string {
    let value = index + 1;
    let result = '';
    while (value > 0) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); }
    return result;
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); void undoLastUpdate(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault(); searchInputRef.current?.focus(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); applyFormulaBar(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault(); void fillDownSelectedCells(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); void copySelectedCells(); return; }
    // Do not consume Ctrl+V here. Tauri's WebView may deny navigator.clipboard,
    // while the browser-native paste event still provides the text securely.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') return;
    const anchor = selectionAnchor.current;
    if (event.key === 'Escape') { setSelectedCells(new Set()); setActiveCell(null); selectionAnchor.current = null; event.preventDefault(); return; }
    if (!anchor) return;
    const rowIndex = sortedData.findIndex((row) => row.id === anchor.rowId);
    const columnIndex = columns.findIndex((column) => column.key === anchor.columnKey);
    if (rowIndex < 0 || columnIndex < 0) return;
    const activeRow = sortedData[rowIndex]; const activeColumn = columns[columnIndex];
    // Typing into an already selected editable cell replaces its value, just
    // like an Excel worksheet. Date/select controls keep F2 or double-click
    // so their native editors remain predictable.
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && !readOnly && !activeRow.is_summary_row && activeColumn.editable !== false && !['date', 'select', 'status', 'boolean'].includes(activeColumn.type || 'text')) {
      startInlineEdit(activeRow.id, activeColumn.key, event.key);
      event.preventDefault(); return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'F2', 'Home', 'End'].includes(event.key)) return;
    if (event.key === 'Enter') {
      const row = sortedData[rowIndex]; const column = columns[columnIndex];
      if (!readOnly && !row.is_summary_row && column.editable !== false) startInlineEdit(row.id, column.key, row[column.key]);
      event.preventDefault(); return;
    }
    if (event.key === 'F2') {
      const row = sortedData[rowIndex]; const column = columns[columnIndex];
      if (!readOnly && !row.is_summary_row && column.editable !== false) startInlineEdit(row.id, column.key, row[column.key]);
      event.preventDefault(); return;
    }
    const nextRow = event.key === 'Home' && event.ctrlKey ? 0 : event.key === 'End' && event.ctrlKey ? sortedData.length - 1 : Math.min(sortedData.length - 1, Math.max(0, rowIndex + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0)));
    const nextColumn = event.key === 'Home' ? 0 : event.key === 'End' ? columns.length - 1 : Math.min(columns.length - 1, Math.max(0, columnIndex + (event.key === 'ArrowRight' || (event.key === 'Tab' && !event.shiftKey) ? 1 : event.key === 'ArrowLeft' || (event.key === 'Tab' && event.shiftKey) ? -1 : 0)));
    const next = { rowId: sortedData[nextRow].id, columnKey: columns[nextColumn].key };
    selectionAnchor.current = next;
    setActiveCell(next);
    setSelectedCells(new Set([`${next.rowId}:${next.columnKey}`]));
    window.requestAnimationFrame(() => document.querySelector(`[data-grid-cell="${next.rowId}:${next.columnKey}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    event.preventDefault();
  }

  const formCols = formColumns || columns.filter((c) => c.editable !== false);
  const editCols = editFormColumns || formCols;
  const allColsForForm = showProjectFilter && projectPickerInForm !== false
    ? [{ key: 'project_id', label: 'Project Code', type: 'text' as const, options: projects.map((p) => p.id) }, ...formCols]
    : formCols;
  const allColsForEdit = showProjectFilter && projectPickerInForm !== false
    ? [{ key: 'project_id', label: 'Project Code', type: 'text' as const, options: projects.map((p) => p.id) }, ...editCols]
    : editCols;

  const hasActiveFilters = search || Object.values(filterValues).some((v) => v !== 'all') || projectFilter !== 'all' || dateFrom || dateTo;
  const numericCols = columns.filter((c) => (c.type === 'number' || c.type === 'money') &&
    (tableName === 'boq_items' ? c.key === 'amount' : tableName === 'wir_entries' ? c.key === 'item_amount' : (tableName === 'client_invoices' || tableName === 'subcontractor_invoices') ? c.key === 'amount' : tableName === 'schedules' ? hasSingleScheduleBOQ && c.type === 'money' : true));
  const scheduleSpanDays = useMemo(() => {
    if (tableName !== 'schedules' || !hasSingleScheduleBOQ) return 0;
    const starts = displayData.map((row) => String(row.start_date || '')).filter(Boolean).sort();
    const ends = displayData.map((row) => String(row.end_date || '')).filter(Boolean).sort();
    if (!starts.length || !ends.length) return 0;
    return Math.max(1, Math.ceil((new Date(`${ends[ends.length - 1]}T00:00:00`).getTime() - new Date(`${starts[0]}T00:00:00`).getTime()) / 86400000));
  }, [tableName, displayData, hasSingleScheduleBOQ]);
  const selectedNumericValues = useMemo(() => {
    const values: number[] = [];
    selectedCells.forEach((cellId) => {
      const separator = cellId.lastIndexOf(':');
      const row = sortedData.find((item) => item.id === cellId.slice(0, separator));
      const column = columns.find((item) => item.key === cellId.slice(separator + 1));
      if (!row || !column || (column.type !== 'number' && column.type !== 'money')) return;
      const value = Number(row[column.key]);
      if (Number.isFinite(value)) values.push(value);
    });
    return values;
  }, [selectedCells, sortedData, columns]);

  function renderFormField(col: ColumnDef, row: Record<string, any>, setRow: (r: Record<string, any>) => void) {
    const codeControl = getCodeControl(tableName);
    const isLockedCode = codeControl?.codeField === col.key && Boolean(row[codeControl.lockField]);
    const isReadOnly = (col.editable === false && col.key !== 'project_id') || isLockedCode;

    if (tableName === 'documents' && col.key === 'file_reference') {
      return <div className="space-y-2"><input value={row[col.key] || ''} onChange={(event) => setRow({ ...row, [col.key]: event.target.value })} placeholder="Local path or URL" className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400" />
        <input type="file" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { if ('__TAURI_INTERNALS__' in window) { const { invoke } = await import('@tauri-apps/api/core'); const bytes = Array.from(new Uint8Array(await file.arrayBuffer())); const path = await invoke<string>('save_document_attachment', { fileName: file.name, bytes }); setRow({ ...row, [col.key]: path }); } else setRow({ ...row, [col.key]: file.name }); } catch (error: any) { alert(`Could not attach file: ${error.message || 'Unknown error'}`); } }} className="block w-full text-xs text-neutral-600" />
      </div>;
    }

    if (col.type === 'boolean') {
      return (
        <select
          value={row[col.key] ?? 'false'}
          onChange={(e) => setRow({ ...row, [col.key]: e.target.value === 'true' })}
          className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    }

    const relationshipSelectOptions = relationshipOptions?.[col.key]?.filter((option) => {
      if (col.key === 'contract_id' && row.project_id) return option.data?.project_id === row.project_id;
      if (col.key === 'boq_header_id' && row.contract_id) return option.data?.contract_id === row.contract_id;
      if (col.key === 'boq_header_id' && row.project_id) return option.data?.project_id === row.project_id;
      if (col.key === 'boq_item_id' && row.contract_id) return option.data?.contract_id === row.contract_id;
      if (col.key === 'boq_item_id' && row.boq_header_id) return option.data?.boq_header_id === row.boq_header_id;
      if (col.key === 'boq_item_id' && row.project_id) return option.data?.project_id === row.project_id;
      if (col.key === 'schedule_id' && row.project_id) return option.data?.project_id === row.project_id;
      if (col.key === 'predecessor_item' && row.contract_id) return option.data?.contract_id === row.contract_id;
      if (col.key === 'main_boq_item_id' && row.project_id) return option.data?.project_id === row.project_id;
      return true;
    });
    if (relationshipSelectOptions && relationshipSelectOptions.length > 0) {
      return (
        <div className="relative">
          <select value={row[col.key] || ''} disabled={isReadOnly}
            onChange={(e) => setRow(applyRelationshipSelection(row, col.key, e.target.value || null))}
            className="w-full appearance-none text-sm px-3 py-2 pr-9 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400 disabled:bg-neutral-50 disabled:text-neutral-500">
            <option value="">None (main record)</option>
            {relationshipSelectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>
      );
    }

    if (col.options && col.options.length > 0) {
      return (
        <div className="relative">
          <select
            value={row[col.key] || ''}
            onChange={(e) => {
              const updated = { ...row, [col.key]: e.target.value };
              setRow(updated);
              autoFillFromBOQItems(updated, setRow, col.key);
              autoFillFromData(updated, setRow, col.key);
            }}
            className="w-full appearance-none text-sm px-3 py-2 pr-9 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
          >
            <option value="">Select...</option>
            {col.key === 'project_id'
              ? projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))
              : col.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>
      );
    }

    if (autoFillOptions && autoFillOptions[col.key] && autoFillOptions[col.key].length > 0) {
      const opts = autoFillOptions[col.key];
      return (
        <div className="relative">
          <select
            value={row[col.key] || ''}
            onChange={(e) => {
              const updated = { ...row, [col.key]: e.target.value };
              setRow(updated);
              autoFillFromData(updated, setRow, col.key);
            }}
            className="w-full appearance-none text-sm px-3 py-2 pr-9 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
          >
            <option value="">Select...</option>
            {opts.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>
      );
    }

    if (col.autoFillFrom && col.autoFillKey && boqItems && boqItems.length > 0) {
      return (
        <div className="relative">
          <select
            value={row[col.key] || ''}
            onChange={(e) => {
              const updated = { ...row, [col.key]: e.target.value };
              setRow(updated);
              autoFillFromBOQItems(updated, setRow, col.key);
            }}
            className="w-full appearance-none text-sm px-3 py-2 pr-9 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
          >
            <option value="">Select Item Code...</option>
            {boqItems.map((b) => (
              <option key={b.id} value={b.item_code}>{b.item_code} — {b.item_name || b.description}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>
      );
    }

    if (isReadOnly) {
      return (
        <input type="text" value={row[col.key] ?? ''} readOnly
          className="w-full text-sm px-3 py-2 border border-neutral-100 rounded-lg bg-neutral-50 text-neutral-500" />
      );
    }

    const applyStandardValue = (value: string) => {
      const updated = { ...row, [col.key]: value };
      // Any two of Start, Finish and Duration determine the third. This keeps
      // manual entry consistent with Primavera-style imported activities.
      if (tableName === 'schedules' && (col.key === 'start_date' || col.key === 'end_date')) {
        const start = col.key === 'start_date' ? value : updated.start_date;
        const end = col.key === 'end_date' ? value : updated.end_date;
        if (start && end) {
          const days = Math.ceil((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000);
          if (Number.isFinite(days) && days >= 0) updated.duration_days = Math.max(1, days);
        }
      }
      if (tableName === 'schedules' && col.key === 'duration_days' && updated.start_date) {
        const days = Number(value);
        if (Number.isFinite(days) && days > 0) {
          const finish = new Date(`${updated.start_date}T00:00:00`);
          finish.setDate(finish.getDate() + Math.ceil(days));
          updated.end_date = finish.toISOString().slice(0, 10);
        }
      }
      if (tableName === 'schedules' && col.key === 'planned_quantity') {
        const item = boqItems?.find((candidate) => candidate.id === updated.boq_item_id);
        const rate = Number(item?.unit_rate ?? updated.unit_rate) || 0;
        updated.unit_rate = rate;
        updated.planned_value = Math.round((Number(value) || 0) * rate * 100) / 100;
        updated.budget = updated.planned_value;
      }
      setRow(updated);
    };
    return (
      <input
        type={col.type === 'number' || col.type === 'money' ? 'number' : col.type === 'date' ? 'date' : col.type === 'password' ? 'password' : 'text'}
        value={row[col.key] ?? ''}
        onChange={(e) => applyStandardValue(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
      />
    );
  }

  const [dragState, setDragState] = useState<{ modal: 'add' | 'edit' | null; offsetX: number; offsetY: number }>({ modal: null, offsetX: 0, offsetY: 0 });
  const [modalPosition, setModalPosition] = useState<Record<'add' | 'edit', { x: number; y: number } | null>>({ add: null, edit: null });
  const [minimizedModal, setMinimizedModal] = useState<'add' | 'edit' | null>(null);

  function startDrag(modal: 'add' | 'edit', e: React.MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    // Form controls keep their native behaviour. Any other point on the
    // dialog can be used as a drag handle, not just its title bar.
    if ((e.target as HTMLElement).closest('input, textarea, select, button, a, [data-no-drag]')) return;
    const modalEl = target.closest('[data-draggable]') as HTMLElement;
    if (!modalEl) return;
    const modalRect = modalEl.getBoundingClientRect();
    setModalPosition((previous) => ({ ...previous, [modal]: { x: modalRect.left, y: modalRect.top } }));
    setDragState({ modal, offsetX: e.clientX - modalRect.left, offsetY: e.clientY - modalRect.top });
  }

  useEffect(() => {
    if (!dragState.modal) return;
    function handleMove(e: MouseEvent) {
      setModalPosition((previous) => dragState.modal ? {
        ...previous,
        [dragState.modal]: { x: e.clientX - dragState.offsetX, y: e.clientY - dragState.offsetY },
      } : previous);
    }
    function handleUp() { setDragState((prev) => ({ ...prev, modal: null })); }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragState.modal]);

  const addModalStyle = modalPosition.add ? { position: 'fixed' as const, left: `${modalPosition.add.x}px`, top: `${modalPosition.add.y}px`, margin: 0 } : {};
  const editModalStyle = modalPosition.edit ? { position: 'fixed' as const, left: `${modalPosition.edit.x}px`, top: `${modalPosition.edit.y}px`, margin: 0 } : {};

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
      <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Icon size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
              <p className="text-sm text-neutral-500">{displayData.length} record{displayData.length !== 1 ? 's' : ''}{hasActiveFilters ? ` (of ${data.length} total)` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void undoLastUpdate()} disabled={!lastUndo || saving || readOnly} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 no-print" title={lastUndo ? `Undo ${lastUndo.label}` : 'Undo the last direct edit'}><Undo2 size={15} /> Undo</button>
            <button onClick={() => void copySelectedCells()} disabled={selectedCells.size === 0} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 no-print" title="Copy selected cells (Ctrl+C)"><Copy size={15} /> Copy</button>
            <button onClick={() => void pasteSelectedCells()} disabled={selectedCells.size === 0} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 no-print" title="Paste starting at selected cell (Ctrl+V)"><ClipboardPaste size={15} /> Paste</button>
            <button onClick={() => void fillDownSelectedCells()} disabled={selectedCells.size < 2} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 no-print" title="Copy the top selected value down through the selected range"><ArrowDownToLine size={15} /> Fill Down</button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Print or save as PDF">
              <Printer size={15} /> Print
            </button>
            <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 no-print" title="Import data from an Excel file">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import
            </button>
            <button onClick={() => void undoLastImport()} disabled={!lastImportRows.length || importing || readOnly} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 no-print" title={lastImportRows.length ? `Remove ${lastImportRows.length} row(s) from the last import` : 'Undo the latest import'}><Undo2 size={15} /> Undo Import</button>
            <button onClick={downloadExcelTemplate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Download a blank Excel template with the correct column headers">
              <FileText size={15} /> Template
            </button>
            {toolbarAction && <button onClick={() => void toolbarAction.onClick()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors no-print" title={toolbarAction.title || toolbarAction.label}>
              <Download size={15} /> {toolbarAction.label}
            </button>}
            <button onClick={() => void exportExcel()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Export the current filtered rows to Excel">
              <Download size={15} /> Export
            </button>
            {selectedRowIds.size > 0 && <button onClick={() => void exportExcel(displayData.filter((row) => selectedRowIds.has(row.id)))} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors no-print" title="Export selected rows only"><Download size={15} /> Export selected ({selectedRowIds.size})</button>}
            {selectedRowIds.size > 0 && <button onClick={printSelectedRows} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors no-print"><Printer size={15} /> Print selected</button>}
            {selectedRowIds.size > 0 && columns.some((column) => column.key === 'status' && (column.options?.length || 0) > 0) && <button onClick={() => void bulkUpdateStatus()} disabled={saving || readOnly} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 no-print">Update status ({selectedRowIds.size})</button>}
            {selectedRowIds.size > 0 && columns.some((column) => column.key === 'owner') && <button onClick={() => void bulkUpdateTextField('owner')} disabled={saving || readOnly} className="px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 no-print">Assign owner</button>}
            {selectedRowIds.size > 0 && columns.some((column) => column.key === 'due_date') && <button onClick={() => void bulkUpdateTextField('due_date')} disabled={saving || readOnly} className="px-3 py-2 text-sm font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 no-print">Set due date</button>}
            {canAdd && <button onClick={() => { setMinimizedModal(null); setNewRow(createScopedDraft()); setShowAdd(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm no-print">
              <Plus size={15} /> {addButtonLabel}
            </button>}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.xer" onChange={handleImportFile} className="hidden" />
        </div>

        {activeScope && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800"><span className="font-semibold">Working context</span><span>{projectMap[activeScope.project_id] || 'Selected project'}</span>{activeScope.contract_id && <><span className="text-primary-300">/</span><span>{(contracts?.find((contract: any) => contract.id === activeScope.contract_id) as any)?.contract_number || 'Selected contract'}</span></>}<span className="text-xs text-primary-600">Applicable fields are filled automatically for new rows and imports.</span><button onClick={clearWorkContext} className="ml-auto rounded-md px-2 py-1 text-xs font-semibold hover:bg-primary-100">Clear context</button>{importScope && <button onClick={clearImportScope} className="rounded-md px-2 py-1 text-xs font-medium hover:bg-primary-100">This table only</button>}</div>}
        {operationNotice && <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${operationNotice.kind === 'error' ? 'border-error-200 bg-error-50 text-error-800' : operationNotice.kind === 'warning' ? 'border-warning-200 bg-warning-50 text-warning-800' : 'border-success-200 bg-success-50 text-success-800'}`}><CircleAlert className="mt-0.5 shrink-0" size={16}/><span className="flex-1">{operationNotice.text}</span><button onClick={() => setOperationNotice(null)} className="rounded p-0.5 hover:bg-black/5" title="Dismiss"><X size={15}/></button></div>}

        {/* Filters bar */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input ref={searchInputRef} type="text" placeholder={`Search ${title.toLowerCase()}...`} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm pl-9 pr-3 py-2 border border-neutral-200 rounded-lg w-56 focus:outline-none focus:border-primary-400 bg-white" />
          </div>
          {showProjectFilter && (
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              className="text-sm px-3 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-primary-400">
              <option value="all">All Projects</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          )}
          {visibleFilterKeys.map((key) => {
            const f = availableFilters.find((filter) => filter.key === key);
            if (!f) return null;
            const opts = f.options.length > 0 ? f.options : getDynamicFilterOptions(f.key);
            return (
              <select key={f.key} value={filterValues[f.key] || 'all'}
                onChange={(e) => setFilterValues({ ...filterValues, [f.key]: e.target.value })}
                className="text-sm px-3 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-primary-400">
                <option value="all">All {f.label}</option>
                {opts.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            );
          })}
          <div className="relative">
            <button onClick={() => setShowFilterPicker((shown) => !shown)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-100">
              <SlidersHorizontal size={15} /> Filters
            </button>
            {showFilterPicker && (
              <div className="absolute right-0 top-11 z-30 w-72 max-h-80 overflow-auto rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-semibold text-neutral-500">Choose visible filter slicers</p>
                <div className="space-y-1">
                  {availableFilters.map((filter) => (
                    <label key={filter.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                      <input type="checkbox" checked={visibleFilterKeys.includes(filter.key)} onChange={() => toggleVisibleFilter(filter.key)} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                      {filter.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowViewPicker((shown) => !shown)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-100" title="Save or apply a complete filter view">
              <Bookmark size={15} /> Views
            </button>
            {showViewPicker && (
              <div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                <button onClick={saveCurrentView} className="mb-2 w-full rounded-lg bg-primary-50 px-3 py-2 text-left text-sm font-semibold text-primary-700 hover:bg-primary-100">Save current filters as a view</button>
                <button onClick={resetColumnWidths} className="mb-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-600 hover:bg-neutral-100">Reset column widths</button>
                <div className="mb-3 border-t border-neutral-100 pt-3"><p className="mb-1 px-2 text-xs font-semibold text-neutral-500">Displayed columns</p><div className="max-h-40 space-y-1 overflow-auto">{columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"><input type="checkbox" checked={visibleColumnKeys.includes(column.key)} onChange={() => toggleVisibleColumn(column.key)} className="rounded border-neutral-300 text-primary-600"/>{column.label}</label>)}</div></div>
                {savedViews.length ? <div className="max-h-56 space-y-1 overflow-auto">{savedViews.map((view) => <div key={view.name} className="flex items-center gap-1 rounded-lg hover:bg-neutral-50"><button onClick={() => applySavedView(view)} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm text-neutral-700">{view.name}</button><button onClick={() => deleteSavedView(view.name)} className="rounded p-1 text-neutral-400 hover:bg-error-50 hover:text-error-600" title="Delete saved view"><X size={14}/></button></div>)}</div> : <p className="px-2 py-2 text-xs text-neutral-500">No saved views yet.</p>}
              </div>
            )}
          </div>
          {dateRangeColumn && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-neutral-400" />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm px-2 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-primary-400" />
              <span className="text-xs text-neutral-400">to</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="text-sm px-2 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-primary-400" />
            </div>
          )}
          {hasActiveFilters && (
            <button onClick={() => { setSearch(''); setFilterValues({}); setProjectFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Summary bar — Excel-like status bar with Count, Sum, Average */}
        <div className="mb-3 flex items-center gap-2 flex-wrap text-xs bg-neutral-100 rounded-lg px-3 py-2">
          <span className="font-semibold text-neutral-700">Count: <span className="text-primary-600">{displayData.length}</span></span>
          {tableName === 'schedules' && !hasSingleScheduleBOQ && <><span className="text-neutral-300">|</span><span className="text-neutral-500">Totals are shown only after filtering to one BOQ item.</span></>}
          {(tableName !== 'schedules' || hasSingleScheduleBOQ) && <span className="text-neutral-300">|</span>}
          {numericCols.map((col) => (
            <span key={`sum-${col.key}`} className="inline-flex items-center gap-1">
              <span className="text-neutral-500">Σ {col.label}:</span>
              <span className="font-semibold text-neutral-800">{col.type === 'money' ? fmtMoney(columnSums[col.key] || 0) : (columnSums[col.key] || 0).toLocaleString()}</span>
            </span>
          ))}
          {tableName === 'schedules' && scheduleSpanDays > 0 && <span className="inline-flex items-center gap-1"><span className="text-neutral-500">Project duration:</span><span className="font-semibold text-neutral-800">{scheduleSpanDays.toLocaleString()} days</span></span>}
          {displayData.length > 0 && numericCols.length > 0 && <span className="text-neutral-300">|</span>}
          {displayData.length > 0 && numericCols.map((col) => {
            const avg = (columnSums[col.key] || 0) / displayData.length;
            return (
              <span key={`avg-${col.key}`} className="inline-flex items-center gap-1">
                <span className="text-neutral-500">Avg {col.label}:</span>
                <span className="font-semibold text-primary-700">{col.type === 'money' ? fmtMoney(avg) : avg.toFixed(1)}</span>
              </span>
            );
          })}
          {selectedCells.size > 0 && (
            <>
              <span className="text-neutral-300">|</span>
              <span className="font-semibold text-neutral-700">Selected: <span className="text-primary-600">{selectedCells.size}</span></span>
              {selectedNumericValues.length > 0 && <span className="text-neutral-600">Sum <span className="font-semibold text-primary-700">{selectedNumericValues.reduce((sum, value) => sum + value, 0).toLocaleString()}</span> · Avg <span className="font-semibold text-primary-700">{(selectedNumericValues.reduce((sum, value) => sum + value, 0) / selectedNumericValues.length).toFixed(2)}</span></span>}
            </>
          )}
          {clipboardNotice && <><span className="text-neutral-300">|</span><span className="text-primary-700">{clipboardNotice}</span></>}
        </div>

        {/* Import result banner */}
        {importResult && (
          <div className={`mb-4 rounded-lg border p-4 ${importResult.errors.length > 0 ? 'border-warning-200 bg-warning-50' : 'border-success-200 bg-success-50'} no-print`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800">
                  Import complete: {importResult.success} record{importResult.success !== 1 ? 's' : ''} imported successfully{importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}.
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 text-xs text-neutral-600 space-y-1 max-h-32 overflow-auto">
                    {importResult.errors.map((err, i) => (<li key={i}>• {err}</li>))}
                  </ul>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"><X size={16} /></button>
            </div>
          </div>
        )}

        {/* Table hint */}
        <p className="text-xs text-neutral-400 mb-2">Click to select. Shift-click selects a range; Ctrl-click adds cells. Type to replace a cell; F2 edits; Tab moves. Ctrl+C / Ctrl+V copies and pastes ranges, Ctrl+D fills down, Ctrl+Z undoes the last direct edit, Ctrl+F searches, Ctrl+S applies the formula bar, Esc clears selection. Numeric cells accept safe formulas such as =12*5 or =A1+B1.</p>
        <div className="mb-3 flex min-w-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 shadow-sm">
          <div className="w-16 shrink-0 rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center text-xs font-semibold text-primary-700" title={activeCellInfo?.column.label || 'Select a cell'}>
            {activeCellInfo ? `${excelColumnName(activeCellInfo.columnIndex)}${activeCellInfo.rowIndex + 1}` : '—'}
          </div>
          <span className="shrink-0 text-sm font-semibold text-neutral-400">fx</span>
          <input
            value={formulaInput}
            onChange={(event) => setFormulaInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's')) { event.preventDefault(); applyFormulaBar(); } }}
            disabled={!activeCellInfo || readOnly}
            placeholder="Select a cell to view or edit its value"
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm text-neutral-800 outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
            title={activeCellInfo?.column.label || 'Select a cell'}
          />
          <button onClick={applyFormulaBar} disabled={!activeCellInfo || readOnly} className="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
        </div>

        {/* Table */}
        <div ref={printableRef} className="bg-white rounded-xl border border-neutral-300 shadow-sm overflow-hidden printable-area flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} tabIndex={0} onKeyDown={handleGridKeyDown} onPaste={handleGridPaste} className="scrollbar-always flex-1 overflow-auto min-h-0 outline-none" style={{ overflowX: 'scroll', overflowY: 'auto' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-neutral-100">
                  <th className="w-9 bg-neutral-100 px-2 py-2 text-center no-print"><input type="checkbox" checked={sortedData.filter((row) => !row.is_summary_row).length > 0 && sortedData.filter((row) => !row.is_summary_row).every((row) => selectedRowIds.has(row.id))} onChange={toggleAllVisibleRows} aria-label="Select all visible rows" className="rounded border-neutral-300 text-primary-600"/></th>
                  {showProjectColumn && <th className="sticky left-0 z-20 bg-neutral-100 text-left text-xs font-semibold text-neutral-700 px-2 py-2 border border-neutral-300 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Project Name</th>}
                  {visibleColumns.map((col) => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="relative text-left text-xs font-semibold text-neutral-700 px-2 py-2 whitespace-nowrap border border-neutral-300 cursor-pointer hover:bg-neutral-200 select-none transition-colors"
                      style={columnWidths[col.key] ? { width: `${columnWidths[col.key]}px` } : col.width ? { width: col.width } : undefined}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && <span className="text-primary-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                      <button onMouseDown={(event) => startColumnResize(col.key, event)} onClick={(event) => event.stopPropagation()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:w-1.5 hover:bg-primary-400" title="Drag to resize column" aria-label={`Resize ${col.label} column`} />
                    </th>
                  ))}
                  <th className="text-right text-xs font-semibold text-neutral-700 px-2 py-2 border border-neutral-300 bg-neutral-100 no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + (showProjectColumn ? 3 : 2)} className="text-center text-sm text-neutral-400 py-12">
                      No records found. {data.length === 0 ? (canAdd ? 'Click "Add New" to create the first record.' : 'Create a main contract to create the first project.') : 'Try adjusting your filters.'}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, rowIndex) => {
                    const isScheduleSummary = tableName === 'schedules' && row.is_summary_row === true;
                    return (
                    <tr key={row.id} className={`border-b border-neutral-200 ${isScheduleSummary ? 'bg-primary-50 font-semibold border-y-2 border-primary-300' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                      <td className="px-2 py-1.5 text-center no-print">{!isScheduleSummary && <input type="checkbox" checked={selectedRowIds.has(row.id)} onChange={() => toggleRowSelection(row.id)} aria-label={`Select row ${rowIndex + 1}`} className="rounded border-neutral-300 text-primary-600"/>}</td>
                      {showProjectColumn && (
                        <td className={`sticky left-0 z-10 px-2 py-1.5 text-sm text-neutral-600 whitespace-nowrap border border-neutral-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>{projectMap[row.project_id] || '—'}</td>
                      )}
                      {visibleColumns.map((col) => {
                        const isEditing = inlineEdit?.id === row.id && inlineEdit?.key === col.key;
                        const codeControl = getCodeControl(tableName);
                        const codeIsLocked = codeControl?.codeField === col.key && Boolean(row[codeControl.lockField]);
                        const canEdit = !readOnly && !isScheduleSummary && col.editable !== false && col.key !== 'id' && col.key !== 'created_at' && !codeIsLocked;
                        return (
                          <td
                            key={col.key}
                            data-grid-cell={`${row.id}:${col.key}`}
                            onClick={(event) => selectCell(row.id, col.key, event)}
                            onDoubleClick={() => { if (canEdit) startInlineEdit(row.id, col.key, row[col.key]); }}
                            className={`px-2 py-1.5 whitespace-nowrap border border-neutral-200 text-sm ${
                              isEditing ? 'p-0' : ''
                            } ${
                              isEditing ? 'bg-primary-50' : selectedCells.has(`${row.id}:${col.key}`) ? 'bg-primary-100 ring-1 ring-inset ring-primary-500' : isScheduleSummary ? 'bg-primary-50 text-primary-950 font-semibold' : canEdit ? 'hover:bg-primary-50/30 cursor-cell' : 'bg-neutral-50 cursor-default'
                            }`}
                          >
                            {isEditing ? (
                              <InlineCellEditor
                                col={col}
                                value={inlineValue}
                                onCommit={commitInlineEdit}
                                onCancel={cancelInlineEdit}
                                projects={projects}
                                autoFillOptions={autoFillOptions?.[col.key]}
                                relationshipOptions={relationshipOptions?.[col.key]}
                              />
                            ) : tableName === 'schedules' && col.key === 'activity' && isScheduleSummary ? (
                              <div className="flex items-center gap-1.5 min-w-[220px]">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const boqItemId = String(row.boq_item_id || row.id);
                                    setCollapsedScheduleItems((current) => {
                                      const next = new Set(current);
                                      if (next.has(boqItemId)) next.delete(boqItemId); else next.add(boqItemId);
                                      return next;
                                    });
                                  }}
                                  className="rounded p-0.5 text-primary-700 hover:bg-primary-100"
                                  title={collapsedScheduleItems.has(String(row.boq_item_id || row.id)) ? 'Expand activities' : 'Collapse activities'}
                                >
                                  {collapsedScheduleItems.has(String(row.boq_item_id || row.id)) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                </button>
                                <span className="font-bold text-primary-900">{row[col.key]}</span>
                              </div>
                            ) : tableName === 'schedules' && col.key === 'activity' ? (
                              <div className="pl-7 text-neutral-700 before:content-['↳'] before:mr-2 before:text-primary-400">{renderCell(row[col.key], col, relationshipOptions?.[col.key], row)}</div>
                            ) : (
                              renderCell(row[col.key], col, relationshipOptions?.[col.key], row)
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border border-neutral-200 no-print">
                        <div className="flex items-center justify-end gap-1">
                          {rowAction && <button onClick={() => void rowAction.onClick(row)} className="text-xs text-violet-700 hover:text-violet-800 font-medium px-2 py-1 rounded hover:bg-violet-50 transition-colors" title={rowAction.title || rowAction.label}>{rowAction.label}</button>}
                          {canDuplicateRows && !row.is_summary_row && <button onClick={() => duplicateRow(row)} className="text-xs text-neutral-600 hover:text-neutral-800 font-medium px-2 py-1 rounded hover:bg-neutral-100 transition-colors" title="Copy this record into a new row">Duplicate</button>}
                          <button onClick={() => startEdit(row)} className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors">Edit</button>
                          {getCodeControl(tableName) && (
                            <button onClick={() => void toggleCodeLock(row)} className="text-xs text-neutral-600 hover:text-neutral-800 font-medium px-2 py-1 rounded hover:bg-neutral-100 transition-colors">
                              {row[getCodeControl(tableName)!.lockField] ? 'Unlock Code' : 'Lock Code'}
                            </button>
                          )}
                          <button onClick={() => setDeleteId(row.id)} className="text-xs text-error-600 hover:text-error-700 font-medium px-2 py-1 rounded hover:bg-error-50 transition-colors">{deleteGroupKey ? 'Delete Invoice' : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
              {sortedData.length > 0 && (
                <tfoot className="sticky bottom-0 z-10">
                  <tr className="bg-neutral-200/90 backdrop-blur border-t-2 border-neutral-400 font-semibold">
                    <td className="border border-neutral-300 no-print"></td>
                    {showProjectColumn && <td className="px-2 py-2 text-xs font-bold text-neutral-700 border border-neutral-300"></td>}
                    {visibleColumns.map((col, ci) => (
                      <td key={col.key} className="px-2 py-2 text-xs font-bold text-neutral-800 border border-neutral-300 whitespace-nowrap">
                        {tableName === 'schedules' && !hasSingleScheduleBOQ
                          ? (ci === 0 ? 'FILTER ONE BOQ ITEM FOR TOTALS' : '')
                          : columnSums[col.key] !== undefined
                          ? (col.type === 'money' ? fmtMoney(columnSums[col.key]) : columnSums[col.key].toLocaleString())
                          : (ci === 0 ? 'SUM' : '')
                        }
                      </td>
                    ))}
                    <td className="px-2 py-2 border border-neutral-300 no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-neutral-900">Review import before saving</h3><p className="mt-1 text-sm text-neutral-500">{importPreview.fileName} · {importPreview.rows.length.toLocaleString()} mapped row(s). No data has been saved yet.</p></div><button onClick={() => setImportPreview(null)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" title="Cancel import"><X size={20}/></button></div>
            {activeScope && <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">Context applied: {projectMap[activeScope.project_id] || 'Selected project'}{activeScope.contract_id ? ` / ${(contracts?.find((contract: any) => contract.id === activeScope.contract_id) as any)?.contract_number || 'Selected contract'}` : ''}</div>}
            <p className="mt-4 text-sm text-neutral-600">Review the first rows below. Relationship, quantity, date and locked-period rules will run again for every row when you confirm. Invalid rows will be listed after import and will not be saved.</p>
            <div className="mt-4 overflow-auto rounded-lg border border-neutral-200"><table className="min-w-full border-collapse text-sm"><thead className="bg-neutral-100"><tr>{columns.filter((column) => importPreview.rows.some((row) => row[column.key] !== undefined)).slice(0, 8).map((column) => <th key={column.key} className="whitespace-nowrap border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-700">{column.label}</th>)}</tr></thead><tbody>{importPreview.rows.slice(0, 10).map((row, index) => <tr key={index} className="odd:bg-neutral-50">{columns.filter((column) => importPreview.rows.some((candidate) => candidate[column.key] !== undefined)).slice(0, 8).map((column) => <td key={column.key} className="max-w-48 truncate whitespace-nowrap border border-neutral-200 px-3 py-2 text-neutral-700">{renderCell(row[column.key], column, relationshipOptions?.[column.key], row)}</td>)}</tr>)}</tbody></table></div>
            {importPreview.rows.length > 10 && <p className="mt-2 text-xs text-neutral-500">Preview shows the first 10 rows and 8 mapped columns.</p>}
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setImportPreview(null)} disabled={importing} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button><button onClick={() => void commitImportPreview()} disabled={importing} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{importing ? 'Importing…' : `Confirm and import ${importPreview.rows.length} row(s)`}</button></div>
          </div>
        </div>
      )}
      {showAdd && !readOnly && (
        minimizedModal === 'add' ? (
          <button onClick={() => setMinimizedModal(null)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-primary-700">
              <Plus size={16} /> Add {title}
          </button>
        ) : (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div data-draggable onMouseDown={(e) => startDrag('add', e)} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto scrollbar-thin p-6" style={addModalStyle}>
            <div className="flex items-center justify-between mb-4 cursor-move select-none">
              <h3 className="text-lg font-semibold text-neutral-900">Add {title}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimizedModal('add')} className="text-neutral-400 hover:text-neutral-600" title="Minimize">—</button>
                <button onClick={() => { setMinimizedModal(null); setShowAdd(false); }} className="text-neutral-400 hover:text-neutral-600" title="Close"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-3">
              {allColsForEdit.map((col) => (
                <div key={col.key}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{col.label}</label>
                  {renderFormField(col, newRow, setNewRow)}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => { setMinimizedModal(null); setShowAdd(false); }} className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {submitLabel}
              </button>
            </div>
          </div>
        </div>
        )
      )}

      {/* Edit Modal */}
      {editingId && !readOnly && (
        minimizedModal === 'edit' ? (
          <button onClick={() => setMinimizedModal(null)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-primary-700">
              <FileText size={16} /> Edit {title}
          </button>
        ) : (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div data-draggable onMouseDown={(e) => startDrag('edit', e)} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto scrollbar-thin p-6" style={editModalStyle}>
            <div className="flex items-center justify-between mb-4 cursor-move select-none">
              <h3 className="text-lg font-semibold text-neutral-900">Edit {title}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimizedModal('edit')} className="text-neutral-400 hover:text-neutral-600" title="Minimize">—</button>
                <button onClick={() => { setMinimizedModal(null); setEditingId(null); }} className="text-neutral-400 hover:text-neutral-600" title="Close"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-3">
              {allColsForForm.map((col) => (
                <div key={col.key}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{col.label}</label>
                  {renderFormField(col, editRow, setEditRow)}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => { setMinimizedModal(null); setEditingId(null); }} className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
          </div>
        </div>
        )
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Delete Record?</h3>
            <p className="text-sm text-neutral-500 mb-5">This action cannot be undone. The record will be permanently removed.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
