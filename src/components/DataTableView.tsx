import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Download, Loader as Loader2, X, ChevronDown, ChevronRight, Calendar, Upload, Printer, FileText, CircleAlert, CircleCheck, CircleMinus, BadgeDollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  assertCodeCanBeLocked,
  assertCodeUpdateAllowed,
  assertValidHierarchyChange,
  createCodeDraft,
  dataRepository,
  getCodeControl,
  prepareCodeControlledInsert,
  getMainContractId,
} from '@/data';
import type { Project, BOQItem } from '@/types';
import type { LocalDataMutation } from '@/hooks/useData';

export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'status' | 'progress' | 'boolean' | 'select' | 'evm';
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
  showProjectColumn?: boolean;
  projectPickerInForm?: boolean;
  dateRangeColumn?: string;
  boqItems?: BOQItem[];
  onMutated: (mutation: LocalDataMutation) => void;
  autoFillOptions?: Record<string, string[]>;
  relationshipOptions?: Record<string, SelectOption[]>;
  relationshipAutoFillFields?: string[];
  contracts?: { id: string; project_id: string; parent_main_contract_id?: string | null; start_date?: string | null; end_date?: string | null }[];
  onInsert?: (row: Record<string, any>) => Promise<Record<string, any> | Record<string, any>[]>;
  dateWarning?: (row: Record<string, any>) => string | null;
  onDeleteGroup?: (row: Record<string, any>) => Promise<Record<string, any>[]>;
  deleteGroupKey?: string;
  canAdd?: boolean;
  createDraft?: () => Record<string, any>;
  formColumns?: ColumnDef[];
  addButtonLabel?: string;
  submitLabel?: string;
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
      type={col.type === 'number' || col.type === 'money' ? 'number' : col.type === 'date' ? 'date' : 'text'}
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
  tableName, title, icon: Icon, data, columns, filters, projects, showProjectFilter, showProjectColumn = showProjectFilter, projectPickerInForm, dateRangeColumn, boqItems, contracts, onMutated, autoFillOptions, relationshipOptions, relationshipAutoFillFields, onInsert, dateWarning, onDeleteGroup, deleteGroupKey, canAdd = true, createDraft, formColumns, addButtonLabel = 'Add New', submitLabel = 'Add Record', progressWirs = [],
}: DataTableViewProps) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);
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
  const selectionAnchor = useRef<{ rowId: string; columnKey: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef<number>(0);

  const filtered = useMemo(() => {
    let result = [...data];
    if (showProjectFilter && projectFilter !== 'all') {
      result = result.filter((r) => r.project_id === projectFilter);
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
  }, [data, search, filterValues, projectFilter, columns, showProjectFilter, dateRangeColumn, dateFrom, dateTo]);

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

  useEffect(() => {
    if (scrollRef.current && savedScroll.current) {
      scrollRef.current.scrollTop = savedScroll.current;
      savedScroll.current = 0;
    }
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

  function applyRelationshipSelection(row: Record<string, any>, changedKey: string, selectedValue: string | null): Record<string, any> {
    const selected = relationshipOptions?.[changedKey]?.find((option) => option.value === selectedValue);
    const allowedFields = new Set([
      ...columns.map((column) => column.key),
      'project_id', 'contract_id', 'boq_header_id', 'boq_item_id', 'schedule_id', 'predecessor_item',
      'boq_code', 'contract_role', 'contract_number', 'contractor', 'company_name',
      'main_boq_item_id', 'main_boq_item_code', 'main_unit_rate', 'main_boq_item_value',
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
      const next = data
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
      const next = data
        .filter((item) => item.boq_header_id === selectedValue)
        .map((item) => Number(String(item.item_code || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.item_code || /^ITM-\d+$/i.test(String(updated.item_code))) {
        updated.item_code = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    if (tableName === 'schedules' && changedKey === 'boq_item_id' && selected?.data?.item_code) {
      const itemCode = String(selected.data.item_code);
      const next = data.filter((activity) => activity.boq_item_id === selectedValue).length + 1;
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
      const next = data.filter((item) => item.contract_id === selected?.data?.contract_id)
        .map((item) => Number(String(item.wir_number || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.wir_number || /^WIR-\d+$/i.test(String(updated.wir_number))) {
        updated.wir_number = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    if ((tableName === 'client_invoices' || tableName === 'subcontractor_invoices') && changedKey === 'contract_id' && selected?.data?.contract_number) {
      const suffix = tableName === 'client_invoices' ? 'INV-CLIENT-' : 'INV-SUB-';
      const prefix = `${String(selected.data.contract_number)}-${suffix}`;
      const next = data.filter((item) => item.contract_id === selectedValue)
        .map((item) => Number(String(item.invoice_number || '').replace(prefix, '')) || 0)
        .reduce((highest, value) => Math.max(highest, value), 0) + 1;
      if (!updated.invoice_number || /^INV-(CLIENT|SUB)-\d+$/i.test(String(updated.invoice_number))) {
        updated.invoice_number = `${prefix}${String(next).padStart(3, '0')}`;
      }
    }
    return updated;
  }

  function assertRelationshipScope(record: Record<string, any>): void {
    const selectedContract = relationshipOptions?.contract_id?.find((option) => option.value === record.contract_id);
    const selectedHeader = relationshipOptions?.boq_header_id?.find((option) => option.value === record.boq_header_id);
    const selectedItem = relationshipOptions?.boq_item_id?.find((option) => option.value === record.boq_item_id);
    const selectedSchedule = relationshipOptions?.schedule_id?.find((option) => option.value === record.schedule_id);

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
    if (selectedSchedule?.data?.project_id && record.project_id && selectedSchedule.data.project_id !== record.project_id) {
      throw new Error('The selected activity belongs to a different project.');
    }
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
    if (tableName === 'schedules') {
      const item = boqItems?.find((candidate) => candidate.id === record.boq_item_id);
      const plannedQuantity = Number(record.planned_quantity) || 0;
      if (!item) throw new Error('Select a valid main BOQ item for the activity.');
      if (plannedQuantity <= 0) throw new Error('Planned quantity must be greater than zero.');
      const otherActivities = data.filter((activity) => activity.id !== record.id && activity.boq_item_id === item.id);
      const total = otherActivities.reduce((sum, activity) => sum + (Number(activity.planned_quantity) || 0), 0) + plannedQuantity;
      if (total > (Number(item.quantity) || 0)) {
        throw new Error('The combined planned quantities of activities cannot exceed the BOQ item quantity.');
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
    const scope = parentContract || (tableName === 'contracts' ? undefined : ownContract);
    // A main contract is the master date source and is allowed to extend its
    // project; its update is then synchronized to Projects by App. Every
    // other operational record is constrained by its contract/project.
    const project = tableName === 'contracts'
      ? undefined
      : projects.find((candidate) => candidate.id === (record.project_id || ownContract?.project_id));
    const scopeStart = String(scope?.start_date || project?.start_date || '');
    const scopeEnd = String(scope?.end_date || project?.end_date || '');
    const dateFields = ['start_date', 'end_date', 'inspection_date', 'date', 'invoice_date', 'order_date', 'delivery_date'];
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
    savedScroll.current = scrollRef.current?.scrollTop || 0;
    try {
      const row = prepareCodeControlledInsert(tableName, newRow, data);
      const prepared = coerceTypes(row);
      assertRelationshipScope(prepared);
      const inserted = onInsert
        ? await onInsert(prepared)
        : await dataRepository.insert<Record<string, any>>(tableName, prepared);
      setShowAdd(false);
      setNewRow({});
      if (Array.isArray(inserted)) onMutated({ type: 'insertMany', rows: inserted });
      else onMutated({ type: 'insert', row: inserted });
      const warning = dateWarning?.(Array.isArray(inserted) ? inserted[0] : inserted);
      if (warning) alert(`Saved with schedule warning: ${warning}`);
    } catch (error: any) {
      console.error(`Could not add a ${tableName} record.`, error);
      alert(`Error: ${describeOperationError(error, 'Failed to add the record.')}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editingId) return;
    setSaving(true);
    savedScroll.current = scrollRef.current?.scrollTop || 0;
    try {
      const patch = coerceTypes(editRow);
      assertCodeUpdateAllowed(tableName, data.find((row) => row.id === editingId), patch);
      assertValidHierarchyChange(tableName, data, editingId, patch);
      assertRelationshipScope({ ...data.find((row) => row.id === editingId), ...patch });
      const updated = await dataRepository.update<Record<string, any>>(tableName, editingId, patch);
      setEditingId(null);
      setEditRow({});
      onMutated({ type: 'update', row: updated });
      const warning = dateWarning?.(updated);
      if (warning) alert(`Saved with schedule warning: ${warning}`);
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to update the record.'}`);
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
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) {
        setImportResult({ success: 0, failed: 0, errors: ['The Excel file is empty or has no data rows.'] });
        setImporting(false);
        e.target.value = '';
        return;
      }
      const labelToKey: Record<string, string> = {};
      columns.forEach((c) => { labelToKey[c.label.toLowerCase()] = c.key; });
      if (showProjectFilter) labelToKey['project'] = 'project_id';
      const mapped = rows.map((r) => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          const key = labelToKey[k.toString().toLowerCase().trim()] || k;
          out[key] = v;
        }
        return coerceTypes(out);
      });
      const BATCH = 500;
      let success = 0;
      const insertedRows: Record<string, any>[] = [];
      const errors: string[] = [];
      for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        try {
          const inserted = await dataRepository.insertMany<Record<string, any>>(tableName, batch);
          success += inserted.length;
          insertedRows.push(...inserted);
        } catch (error: any) {
          errors.push(`Rows ${i + 1}-${i + batch.length}: ${error.message || 'Failed to import.'}`);
        }
      }
      setImportResult({ success, failed: mapped.length - success, errors });
      if (insertedRows.length > 0) onMutated({ type: 'insertMany', rows: insertedRows });
    } catch (err: any) {
      setImportResult({ success: 0, failed: 0, errors: [err.message || 'Failed to read the Excel file.'] });
    }
    setImporting(false);
    e.target.value = '';
  }

  function handlePrint() { window.print(); }

  async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<void> {
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
    const headerRow: Record<string, string> = {};
    columns.forEach((c) => { headerRow[c.label] = ''; });
    if (showProjectFilter) headerRow['Project'] = '';
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

  async function commitInlineEdit(commitValue?: any) {
    if (!inlineEdit) return;
    savedScroll.current = scrollRef.current?.scrollTop || 0;
    const { id, key } = inlineEdit;
    const col = columns.find((c) => c.key === key);
    let val = commitValue !== undefined ? commitValue : inlineValue;
    if (col) {
      if (col.type === 'number' || col.type === 'money') {
        val = val === '' || val === null ? null : parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
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
      const updated = await dataRepository.update<Record<string, any>>(tableName, id, patch);
      onMutated({ type: 'update', row: updated });
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
    savedScroll.current = scrollRef.current?.scrollTop || 0;
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

  function startEdit(row: Record<string, any>) { setEditingId(row.id); setEditRow({ ...row }); }

  async function exportExcel() {
    const exportedRows = displayData.map((row) => {
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

  function selectCell(rowId: string, columnKey: string, event: React.MouseEvent<HTMLTableCellElement>) {
    const cellId = `${rowId}:${columnKey}`;
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

  const formCols = formColumns || columns.filter((c) => c.editable !== false);
  const allColsForForm = showProjectFilter && projectPickerInForm !== false
    ? [{ key: 'project_id', label: 'Project Code', type: 'text' as const, options: projects.map((p) => p.id) }, ...formCols]
    : formCols;

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
        type={col.type === 'number' || col.type === 'money' ? 'number' : col.type === 'date' ? 'date' : 'text'}
        value={row[col.key] ?? ''}
        onChange={(e) => applyStandardValue(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400"
      />
    );
  }

  const [dragState, setDragState] = useState<{ modal: 'add' | 'edit' | null; offsetX: number; offsetY: number }>({ modal: null, offsetX: 0, offsetY: 0 });
  const [modalPosition, setModalPosition] = useState<Record<'add' | 'edit', { x: number; y: number } | null>>({ add: null, edit: null });

  function startDrag(modal: 'add' | 'edit', e: React.MouseEvent) {
    const target = e.currentTarget as HTMLElement;
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
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Print or save as PDF">
              <Printer size={15} /> Print
            </button>
            <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 no-print" title="Import data from an Excel file">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import
            </button>
            <button onClick={downloadExcelTemplate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Download a blank Excel template with the correct column headers">
              <FileText size={15} /> Template
            </button>
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors no-print" title="Export the current filtered rows to Excel">
              <Download size={15} /> Export
            </button>
            {canAdd && <button onClick={() => { setNewRow(createDraft ? createDraft() : createCodeDraft(tableName, data)); setShowAdd(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm no-print">
              <Plus size={15} /> {addButtonLabel}
            </button>}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
        </div>

        {/* Filters bar */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input type="text" placeholder={`Search ${title.toLowerCase()}...`} value={search}
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
          {filters?.map((f) => {
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
        <p className="text-xs text-neutral-400 mb-2">Click to select. Shift-click selects a range; Ctrl-click adds cells. Double-click to edit. Press Enter to save, Esc to cancel.</p>

        {/* Table */}
        <div ref={printableRef} className="bg-white rounded-xl border border-neutral-300 shadow-sm overflow-hidden printable-area flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} className="scrollbar-always flex-1 overflow-auto min-h-0" style={{ overflowX: 'scroll', overflowY: 'auto' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-neutral-100">
                  {showProjectColumn && <th className="text-left text-xs font-semibold text-neutral-700 px-2 py-2 border border-neutral-300">Project Name</th>}
                  {columns.map((col) => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="text-left text-xs font-semibold text-neutral-700 px-2 py-2 whitespace-nowrap border border-neutral-300 cursor-pointer hover:bg-neutral-200 select-none transition-colors"
                      style={col.width ? { width: col.width } : undefined}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && <span className="text-primary-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 text-right text-xs font-semibold text-neutral-700 px-2 py-2 border border-neutral-300 bg-neutral-100 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (showProjectColumn ? 2 : 1)} className="text-center text-sm text-neutral-400 py-12">
                      No records found. {data.length === 0 ? (canAdd ? 'Click "Add New" to create the first record.' : 'Create a main contract to create the first project.') : 'Try adjusting your filters.'}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, rowIndex) => {
                    const isScheduleSummary = tableName === 'schedules' && row.is_summary_row === true;
                    return (
                    <tr key={row.id} className={`border-b border-neutral-200 ${isScheduleSummary ? 'bg-primary-50 font-semibold border-y-2 border-primary-300' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                      {showProjectColumn && (
                        <td className="px-2 py-1.5 text-sm text-neutral-600 whitespace-nowrap border border-neutral-200">{projectMap[row.project_id] || '—'}</td>
                      )}
                      {columns.map((col) => {
                        const isEditing = inlineEdit?.id === row.id && inlineEdit?.key === col.key;
                        const codeControl = getCodeControl(tableName);
                        const codeIsLocked = codeControl?.codeField === col.key && Boolean(row[codeControl.lockField]);
                        const canEdit = !isScheduleSummary && col.editable !== false && col.key !== 'id' && col.key !== 'created_at' && !codeIsLocked;
                        return (
                          <td
                            key={col.key}
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
                      <td className="sticky right-0 z-10 px-2 py-1.5 text-right whitespace-nowrap border border-neutral-200 bg-inherit shadow-[-2px_0_4px_rgba(0,0,0,0.05)] no-print">
                        <div className="flex items-center justify-end gap-1">
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
                    {showProjectColumn && <td className="px-2 py-2 text-xs font-bold text-neutral-700 border border-neutral-300"></td>}
                    {columns.map((col, ci) => (
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
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowAdd(false)}>
          <div data-draggable className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto scrollbar-thin p-6" style={addModalStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 cursor-move select-none" onMouseDown={(e) => startDrag('add', e)}>
              <h3 className="text-lg font-semibold text-neutral-900">Add {title}</h3>
              <button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {allColsForForm.map((col) => (
                <div key={col.key}>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{col.label}</label>
                  {renderFormField(col, newRow, setNewRow)}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditingId(null)}>
          <div data-draggable className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto scrollbar-thin p-6" style={editModalStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 cursor-move select-none" onMouseDown={(e) => startDrag('edit', e)}>
              <h3 className="text-lg font-semibold text-neutral-900">Edit {title}</h3>
              <button onClick={() => setEditingId(null)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
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
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
          </div>
        </div>
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
