import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  ShieldCheck,
  Building2,
  CalendarClock,
  Info,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  getKpiReconciliation,
  KpiReconciliationInput,
  KpiReconciliationResult,
  KpiContributionItem,
  KpiExclusionItem,
} from '../utils/kpiReconciliation.ts';

interface KpiDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiKey: string;
  onSelectKpiKey?: (key: string) => void;
  inputData: KpiReconciliationInput;
  currency?: string;
}

const AVAILABLE_KPIS: { key: string; label: string; group: string }[] = [
  { key: 'modified_contract_value', label: 'Modified Contract Value', group: 'Commercial' },
  { key: 'revenue_pv', label: 'Revenue Planned Value (PV)', group: 'EVM Schedule' },
  { key: 'revenue_ev', label: 'Revenue Earned Value (EV)', group: 'EVM Progress' },
  { key: 'delivery_ac', label: 'Delivery Actual Cost (AC)', group: 'Cost & Delivery' },
  { key: 'open_commitment', label: 'Open Commitments', group: 'Cost & Delivery' },
  { key: 'net_cash_flow', label: 'Net Cash Flow', group: 'Treasury & Cash' },
  { key: 'cost_bac', label: 'Delivery Cost BAC (SOV)', group: 'Internal Cost Plan' },
  { key: 'cost_pv', label: 'Delivery Cost Planned Value (PV)', group: 'Internal Cost Plan' },
  { key: 'cost_ev', label: 'Delivery Cost Earned Value (EV)', group: 'Internal Cost Plan' },
  { key: 'cost_eac', label: 'Delivery Cost Estimate at Completion (EAC)', group: 'Cost Forecast' },
];

export const KpiDrilldownModal: React.FC<KpiDrilldownModalProps> = ({
  isOpen,
  onClose,
  kpiKey,
  onSelectKpiKey,
  inputData,
  currency = '$',
}) => {
  const [activeTab, setActiveTab] = useState<'contributions' | 'exclusions'>('contributions');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'amount' | 'date' | 'title'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const reconciliation: KpiReconciliationResult = useMemo(() => {
    return getKpiReconciliation(kpiKey, inputData);
  }, [kpiKey, inputData]);

  if (!isOpen) return null;

  const fmtCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Unavailable';
    return `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter & sort contributions
  const filteredContributions = reconciliation.contributions
    .filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.sourceTable.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'all' || item.sourceTable === sourceFilter;
      const matchesContract = contractFilter === 'all' || item.contractId === contractFilter;
      return matchesSearch && matchesSource && matchesContract;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  // Filter & sort exclusions
  const filteredExclusions = reconciliation.exclusions
    .filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sourceTable.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'all' || item.sourceTable === sourceFilter;
      const matchesContract = contractFilter === 'all' || item.contractId === contractFilter;
      return matchesSearch && matchesSource && matchesContract;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'amount') cmp = (a.amount || 0) - (b.amount || 0);
      else if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const availableSources = Array.from(
    new Set([
      ...reconciliation.contributions.map((c) => c.sourceTable),
      ...reconciliation.exclusions.map((e) => e.sourceTable),
    ])
  );
  const availableContractIds = Array.from(new Set([
    ...reconciliation.contributions.map((item) => item.contractId),
    ...reconciliation.exclusions.map((item) => item.contractId),
  ].filter((value): value is string => Boolean(value)))).sort();

  const exportCsv = () => {
    const headers = ['Type', 'Source Entity', 'Code / ID', 'Description', 'Date', 'Status', 'Category/Reason', 'Amount'];
    const rows: (string | number)[][] = [];

    filteredContributions.forEach((c) => {
      rows.push(['Contribution (Included)', c.sourceTable, c.code || c.id, `"${c.title.replace(/"/g, '""')}"`, c.date || '', c.status || '', c.category || '', c.amount]);
    });

    filteredExclusions.forEach((e) => {
      rows.push(['Exclusion (Excluded)', e.sourceTable, e.code || e.id, `"${e.title.replace(/"/g, '""')}"`, e.date || '', e.status || '', `"${e.reason.replace(/"/g, '""')}"`, e.amount || 0]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reconciliation_${reconciliation.kpiKey}_${reconciliation.dataDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-neutral-900">
                  KPI Source Drill-Down & Reconciliation
                </h3>
                {reconciliation.isReconciled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 border border-success-200">
                    <CheckCircle2 size={13} /> Reconciled (100% Match)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700 border border-warning-200">
                    <AlertTriangle size={13} /> Discrepancy: {fmtCurrency(reconciliation.discrepancy)}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inspect every source record, mathematical contribution, and governed exclusion rule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* KPI Selector */}
            <select
              value={kpiKey}
              onChange={(e) => onSelectKpiKey && onSelectKpiKey(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {AVAILABLE_KPIS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label} ({k.group})
                </option>
              ))}
            </select>

            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors"
              title="Export audit reconciliation trail as CSV"
            >
              <FileSpreadsheet size={14} className="text-success-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Overview Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-5 border-b border-neutral-100">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Reported KPI Value</span>
            <p className="text-xl font-bold text-neutral-900 mt-0.5">
              {reconciliation.value !== null ? fmtCurrency(reconciliation.value) : 'Unavailable'}
            </p>
            <span className="text-xs text-neutral-400">{reconciliation.kpiLabel}</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Reconciled Source Sum</span>
            <p className="text-xl font-bold text-primary-700 mt-0.5">
              {fmtCurrency(reconciliation.reconciliationTotal)}
            </p>
            <span className="text-xs text-neutral-400">
              {reconciliation.contributions.length} contributing line items
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Project Scope</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-neutral-800 mt-0.5 truncate">
              <Building2 size={14} className="text-neutral-400 shrink-0" />
              <span className="truncate">{reconciliation.projectName}</span>
            </div>
            <span className="text-xs text-neutral-400">{reconciliation.projectId === 'all' ? 'Entire Portfolio' : `ID: ${reconciliation.projectId}`}</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Unified Data Date</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-neutral-800 mt-0.5">
              <CalendarClock size={14} className="text-neutral-400 shrink-0" />
              <span>{reconciliation.dataDate}</span>
            </div>
            <span className="text-xs text-neutral-400">{reconciliation.exclusions.length} excluded records</span>
          </div>
        </div>

        {/* Governed Formula / Basis Banner */}
        <div className="px-5 py-3 bg-primary-50/60 border-b border-primary-100 flex items-start gap-2.5 text-xs text-primary-950">
          <Info size={16} className="text-primary-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-primary-900">Governance & Calculation Basis: </span>
            <span>{reconciliation.basis}</span>
            <div className="mt-1 font-mono text-[11px] text-primary-800 bg-white/70 px-2 py-1 rounded border border-primary-200/60 inline-block">
              {reconciliation.formula}
            </div>
          </div>
        </div>

        {/* Controls and Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-neutral-200 bg-neutral-50">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 rounded-lg bg-neutral-200/80 p-1">
            <button
              onClick={() => setActiveTab('contributions')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'contributions'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CheckCircle2 size={13} className="text-success-600" />
              <span>Included Records ({reconciliation.contributions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('exclusions')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'exclusions'
                  ? 'bg-white text-error-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <AlertTriangle size={13} className="text-warning-600" />
              <span>Excluded Records ({reconciliation.exclusions.length})</span>
            </button>
          </div>

          {/* Search & filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search records or reasons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
              />
            </div>

            {availableSources.length > 1 && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none"
              >
                <option value="all">All Sources</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src.replace('_', ' ')}
                  </option>
                ))}
              </select>
            )}

            {availableContractIds.length > 1 && (
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none"
                title="Filter audit rows by contract"
              >
                <option value="all">All Contracts</option>
                {availableContractIds.map((contractId) => (
                  <option key={contractId} value={contractId}>{contractId}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              title="Toggle sort direction"
            >
              <ArrowUpDown size={13} />
              <span>{sortOrder === 'desc' ? 'High to Low' : 'Low to High'}</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {activeTab === 'contributions' && (
            <div>
              {filteredContributions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/90 text-neutral-600 font-semibold">
                        <th className="py-2.5 px-4">Source Entity</th>
                        <th className="py-2.5 px-3">Reference / Code</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-4 text-right">Contributing Amount</th>
                        <th className="py-2.5 px-3 text-right">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredContributions.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-700">
                              {item.sourceTable}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-neutral-800">
                            {item.code || item.id}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-neutral-900 max-w-xs truncate" title={item.title}>
                            {item.title}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                            {item.date || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block rounded-full bg-success-50 text-success-700 px-2 py-0.5 text-[10px] font-semibold border border-success-200">
                              {item.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600">
                            {item.category || 'General'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold font-mono text-neutral-900">
                            {fmtCurrency(item.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-neutral-500 font-mono">
                            {item.sharePct !== undefined ? `${item.sharePct.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-300 bg-neutral-100/90 font-bold text-neutral-900">
                        <td colSpan={6} className="py-3 px-4 text-right">
                          Total Reconciled Contributions:
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-primary-700">
                          {fmtCurrency(reconciliation.reconciliationTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-neutral-600">
                          100.0%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
                  <p className="font-semibold">No contributing source records match your filter.</p>
                  <p className="text-xs text-neutral-400 mt-1">Try clearing the search term or adjusting filters.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exclusions' && (
            <div>
              {filteredExclusions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/90 text-neutral-600 font-semibold">
                        <th className="py-2.5 px-4">Source Entity</th>
                        <th className="py-2.5 px-3">Reference / Code</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Raw Amount</th>
                        <th className="py-2.5 px-4">Governance Reason for Exclusion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredExclusions.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-700">
                              {item.sourceTable}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-700">
                            {item.code || item.id}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-neutral-800 max-w-xs truncate" title={item.title}>
                            {item.title}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                            {item.date || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block rounded-full bg-neutral-100 text-neutral-600 px-2 py-0.5 text-[10px] font-medium border border-neutral-200">
                              {item.status || 'Draft'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                            {item.amount !== undefined ? fmtCurrency(item.amount) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-warning-800 font-medium">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-warning-500 shrink-0" />
                              <span>{item.reason}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
                  <p className="font-semibold">No excluded records found for this KPI cut-off.</p>
                  <p className="text-xs text-neutral-400 mt-1">All scanned project items met the governance criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck size={14} className="text-primary-600" />
            <span>Governed single source of truth across UI cards, modals, and export packs.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-900 transition-colors"
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};
