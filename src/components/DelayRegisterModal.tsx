import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  Trash2,
  Edit3,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  DelayEvent,
  Project,
  Contract,
  Schedule,
  WBSNode,
  Variation,
} from '../types';
import {
  DELAY_CATEGORIES,
  ENTITLEMENT_TYPES,
  DELAY_STATUSES,
  validateDelayEventInput,
  calculateTimeImpactAnalysis,
  calculateProjectDelaySummary,
} from '../utils/delayImpact';

interface DelayRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string | null;
  selectedContractId: string | null;
  projects: Project[];
  contracts: Contract[];
  schedules: Schedule[];
  baselines: Record<string, any>[];
  scheduleVersions: Record<string, any>[];
  dataDate: string;
  wbsNodes: WBSNode[];
  variations: Variation[];
  delayEvents: DelayEvent[];
  onSaveDelayEvent: (event: Partial<DelayEvent>) => Promise<void>;
  onDeleteDelayEvent: (id: string) => Promise<void>;
}

export const DelayRegisterModal: React.FC<DelayRegisterModalProps> = ({
  isOpen,
  onClose,
  selectedProjectId,
  selectedContractId,
  projects,
  contracts,
  schedules,
  baselines,
  scheduleVersions,
  dataDate,
  wbsNodes,
  variations,
  delayEvents,
  onSaveDelayEvent,
  onDeleteDelayEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Modal state for create/edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<DelayEvent> | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedTiaEvent, setSelectedTiaEvent] = useState<DelayEvent | null>(null);
  const [scopeProjectId, setScopeProjectId] = useState(selectedProjectId || '');
  const [scopeContractId, setScopeContractId] = useState(selectedContractId || '');

  React.useEffect(() => {
    if (selectedProjectId) setScopeProjectId(selectedProjectId);
    if (selectedContractId) setScopeContractId(selectedContractId);
  }, [selectedProjectId, selectedContractId]);

  const scopedContracts = contracts.filter((contract) => contract.project_id === scopeProjectId && !contract.parent_main_contract_id);
  const scopedActivities = schedules.filter((activity) => activity.project_id === scopeProjectId && (!scopeContractId || activity.contract_id === scopeContractId) && String(activity.activity || '').trim());
  const scopedWbs = wbsNodes.filter((node) => node.project_id === scopeProjectId && (!scopeContractId || !node.contract_id || node.contract_id === scopeContractId));
  const scopedVariations = variations.filter((variation) => variation.project_id === scopeProjectId && (!scopeContractId || variation.contract_id === scopeContractId));

  // Filter delay events by project/contract scope
  const scopedEvents = useMemo(() => {
    return delayEvents.filter((e) => {
      if (scopeProjectId && e.project_id !== scopeProjectId) return false;
      if (scopeContractId && e.contract_id !== scopeContractId) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && e.event_category !== categoryFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          e.delay_code.toLowerCase().includes(q) ||
          e.event_name.toLowerCase().includes(q) ||
          e.responsible_party.toLowerCase().includes(q) ||
          e.root_cause.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [delayEvents, scopeProjectId, scopeContractId, statusFilter, categoryFilter, searchTerm]);

  // Selected project / contract baseline finish
  const activeProject = projects.find((p) => p.id === scopeProjectId);
  const activeContract = contracts.find((c) => c.id === scopeContractId);
  const approvedVersion = scheduleVersions.filter((version) => version.project_id === scopeProjectId && (!scopeContractId || version.contract_id === scopeContractId) && version.status === 'Approved' && version.version_type === 'Baseline').sort((a, b) => Number(b.revision_number || 0) - Number(a.revision_number || 0))[0];
  const approvedBaseline = baselines.filter((baseline) => baseline.contract_id === scopeContractId && baseline.status === 'Approved' && Array.isArray(baseline.activity_snapshot)).sort((a, b) => Number(b.revision_number || 0) - Number(a.revision_number || 0))[0];
  const baselineActivities = (approvedVersion?.activity_snapshot || approvedBaseline?.activity_snapshot || []) as Schedule[];
  const baselineFinishes = baselineActivities.map((activity: any) => String(activity.end_date || '')).filter(Boolean).sort();
  const baselineFinishDate = baselineFinishes[baselineFinishes.length - 1] || null;

  // Summary statistics
  const summary = useMemo(() => {
    return calculateProjectDelaySummary(
      delayEvents.filter((e) => (!scopeProjectId || e.project_id === scopeProjectId) && (!scopeContractId || e.contract_id === scopeContractId)),
      baselineFinishDate
    );
  }, [delayEvents, scopeProjectId, scopeContractId, baselineFinishDate]);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    const projId = scopeProjectId || (projects[0]?.id ?? '');
    const contractId = scopeContractId || contracts.find((contract) => contract.project_id === projId && !contract.parent_main_contract_id)?.id || '';
    const defaultCode = `DEL-${new Date().getFullYear()}-${String(delayEvents.length + 1).padStart(3, '0')}`;
    setEditingEvent({
      id: crypto.randomUUID(),
      project_id: projId,
      contract_id: contractId || null,
      delay_code: defaultCode,
      event_name: '',
      event_category: 'Employer Delay',
      discovery_date: new Date().toISOString().slice(0, 10),
      root_cause: '',
      responsible_party: 'Client / Engineer',
      entitlement_type: 'Compensable & Excusable',
      requested_extension_days: 10,
      approved_extension_days: 0,
      mitigation_action: '',
      status: 'Identified',
      cpm_impact_days: 0,
      notes: '',
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (event: DelayEvent) => {
    setEditingEvent({ ...event });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    // Run validation
    const val = validateDelayEventInput(editingEvent);
    if (!val.valid) {
      setFormErrors(val.errors);
      return;
    }

    // Calculate TIA
    if (['Approved', 'Closed'].includes(String(editingEvent.status)) && !baselineFinishDate) {
      setFormErrors(['An approved frozen schedule baseline is required before approving a time impact.']);
      return;
    }
    const tia = calculateTimeImpactAnalysis(editingEvent, baselineActivities.length ? baselineActivities : scopedActivities, baselineFinishDate, dataDate);
    const eventToSave: Partial<DelayEvent> = {
      ...editingEvent,
      baseline_id: approvedVersion?.id || approvedBaseline?.id || null,
      analysis_date: tia.analysisDate || dataDate,
      pre_impact_finish: tia.preDelayFinishDate || null,
      post_impact_finish: tia.postDelayFinishDate || null,
      cpm_impact_days: tia.netCpmImpactDays,
      time_impact_analysis: tia,
      updated_at: new Date().toISOString(),
    };

    try {
      await onSaveDelayEvent(eventToSave);
      setIsFormOpen(false);
      setEditingEvent(null);
    } catch (err: any) {
      setFormErrors([err.message || 'Failed to save delay event']);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delay event?')) {
      try {
        await onDeleteDelayEvent(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete delay event.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Delay & Time-Impact Register (C3)
              </h2>
              <p className="text-xs text-slate-400">
                Auditable decision records for delays, EOT claims, and CPM time impact governance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Dashboard Cards */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-800 bg-slate-950/50 p-6 md:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
            <span className="text-xs font-medium text-slate-400">Total Delays</span>
            <div className="mt-1 text-2xl font-bold text-white">{summary.totalIdentifiedDelays}</div>
            <span className="text-[10px] text-slate-500">Identified events</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
            <span className="text-xs font-medium text-amber-400">Requested EOT</span>
            <div className="mt-1 text-2xl font-bold text-amber-400">{summary.totalRequestedDays} <span className="text-xs font-normal">days</span></div>
            <span className="text-[10px] text-slate-500">Pending & submitted</span>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
            <span className="text-xs font-medium text-emerald-400">Approved EOT</span>
            <div className="mt-1 text-2xl font-bold text-emerald-400">+{summary.totalApprovedEotDays} <span className="text-xs font-normal">days</span></div>
            <span className="text-[10px] text-emerald-500">Extends contract finish</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
            <span className="text-xs font-medium text-cyan-400">CPM Net Impact</span>
            <div className="mt-1 text-2xl font-bold text-cyan-400">{summary.totalCpmImpactDays} <span className="text-xs font-normal">days</span></div>
            <span className="text-[10px] text-slate-500">Net critical path delta</span>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
            <span className="text-xs font-medium text-blue-400">Baseline vs Forecast</span>
            <div className="mt-1 text-sm font-semibold text-white">
              <span className="text-slate-400 line-through mr-1">{summary.originalBaselineFinish}</span>
              <span className="text-emerald-400 font-bold">{summary.revisedForecastFinish}</span>
            </div>
            <span className="text-[10px] text-slate-400">Baseline is 100% immutable</span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-3 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search delay code, name, cause..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {DELAY_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {DELAY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>New Delay Event</span>
          </button>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto p-6">
          {scopedEvents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-8 text-center">
              <Clock className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">No delay events recorded for this scope</p>
              <p className="text-xs text-slate-500 mt-1">Click "New Delay Event" above to create an auditable delay record.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Code / Event Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Discovery Date</th>
                  <th className="px-4 py-3">Responsible Party</th>
                  <th className="px-4 py-3">Entitlement</th>
                  <th className="px-4 py-3 text-center">Requested / Approved</th>
                  <th className="px-4 py-3 text-center">CPM Net Impact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scopedEvents.map((evt) => {
                  const tia = evt.time_impact_analysis || {};
                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{evt.delay_code}</div>
                        <div className="text-[11px] text-slate-400">{evt.event_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                          {evt.event_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{evt.discovery_date}</td>
                      <td className="px-4 py-3 text-slate-300">{evt.responsible_party}</td>
                      <td className="px-4 py-3 text-slate-300">{evt.entitlement_type}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-amber-400">{evt.requested_extension_days}d</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="font-semibold text-emerald-400">{evt.approved_extension_days}d</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          evt.cpm_impact_days > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {evt.cpm_impact_days > 0 ? `+${evt.cpm_impact_days}d` : '0d'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          evt.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          evt.status === 'Submitted' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          evt.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          evt.status === 'Closed' ? 'bg-slate-700 text-slate-300' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedTiaEvent(evt)}
                            title="Run Time Impact Analysis"
                            className="rounded p-1.5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            title="Edit Event"
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(evt.id)}
                            title="Delete Event"
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form for Create/Edit */}
      {isFormOpen && editingEvent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <span>{editingEvent.id ? 'Edit Delay Event' : 'New Delay Event'}</span>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </h3>

            {formErrors.length > 0 && (
              <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                <div className="font-semibold mb-1 flex items-center space-x-1">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span>Validation Errors</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-slate-400 font-medium mb-1">Project *</label><select required value={editingEvent.project_id || ''} onChange={(e) => { const projectId = e.target.value; const main = contracts.find((contract) => contract.project_id === projectId && !contract.parent_main_contract_id); setScopeProjectId(projectId); setScopeContractId(main?.id || ''); setEditingEvent({ ...editingEvent, project_id: projectId, contract_id: main?.id || null, wbs_id: null, schedule_activity_id: null, variation_id: null }); }} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} — {project.name}</option>)}</select></div>
                <div><label className="block text-slate-400 font-medium mb-1">Main Contract *</label><select required value={editingEvent.contract_id || ''} onChange={(e) => { setScopeContractId(e.target.value); setEditingEvent({ ...editingEvent, contract_id: e.target.value || null, wbs_id: null, schedule_activity_id: null, variation_id: null }); }} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Select main contract</option>{scopedContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contract_number} — {contract.title}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-slate-400 font-medium mb-1">Affected Activity *</label><select required value={editingEvent.schedule_activity_id || ''} onChange={(e) => { const activity = scopedActivities.find((row) => row.id === e.target.value); setEditingEvent({ ...editingEvent, schedule_activity_id: e.target.value || null, wbs_id: activity?.wbs_id || editingEvent.wbs_id || null }); }} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Select activity</option>{scopedActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.activity_code} — {activity.activity}</option>)}</select></div>
                <div><label className="block text-slate-400 font-medium mb-1">WBS</label><select value={editingEvent.wbs_id || ''} onChange={(e) => setEditingEvent({ ...editingEvent, wbs_id: e.target.value || null })} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">Derived / none</option>{scopedWbs.map((node) => <option key={node.id} value={node.id}>{node.wbs_code} — {node.name}</option>)}</select></div>
                <div><label className="block text-slate-400 font-medium mb-1">Related Variation</label><select value={editingEvent.variation_id || ''} onChange={(e) => setEditingEvent({ ...editingEvent, variation_id: e.target.value || null })} className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white"><option value="">None</option>{scopedVariations.map((variation) => <option key={variation.id} value={variation.id}>{variation.variation_number} — {variation.title}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Delay Code *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.delay_code || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, delay_code: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. DEL-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Event Name *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.event_name || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_name: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Unforeseen Utilities Disruption"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Event Category *</label>
                  <select
                    value={editingEvent.event_category || 'Employer Delay'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, event_category: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {DELAY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Discovery Date *</label>
                  <input
                    type="date"
                    required
                    value={editingEvent.discovery_date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, discovery_date: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Responsible Party *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.responsible_party || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, responsible_party: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Employer / Engineer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Entitlement Type *</label>
                  <select
                    value={editingEvent.entitlement_type || 'Compensable & Excusable'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, entitlement_type: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {ENTITLEMENT_TYPES.map((ent) => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Requested EOT (Days) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingEvent.requested_extension_days ?? 0}
                    onChange={(e) => setEditingEvent({ ...editingEvent, requested_extension_days: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Approved EOT (Days) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingEvent.approved_extension_days ?? 0}
                    onChange={(e) => setEditingEvent({ ...editingEvent, approved_extension_days: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-emerald-400 font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status *</label>
                  <select
                    value={editingEvent.status || 'Identified'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {DELAY_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Root Cause</label>
                <textarea
                  rows={2}
                  value={editingEvent.root_cause || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, root_cause: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Detailed description of underlying delay cause..."
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Mitigation Action</label>
                <textarea
                  rows={2}
                  value={editingEvent.mitigation_action || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, mitigation_action: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Actions taken to mitigate time impact..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Save Delay Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIA Details Modal */}
      {selectedTiaEvent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="flex w-full max-w-lg flex-col rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <span>Time Impact Analysis (TIA)</span>
              </span>
              <button onClick={() => setSelectedTiaEvent(null)} className="text-slate-400 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </h3>

            <div className="space-y-4 text-xs mt-2">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <div className="font-semibold text-amber-400">{selectedTiaEvent.delay_code} - {selectedTiaEvent.event_name}</div>
                <div className="text-slate-400 mt-0.5">Category: {selectedTiaEvent.event_category}</div>
              </div>

              {(() => {
                const tia = calculateTimeImpactAnalysis(selectedTiaEvent, baselineActivities.length ? baselineActivities : scopedActivities, baselineFinishDate, dataDate);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Pre-Delay Finish Date</span>
                        <span className="text-sm font-bold text-white">{tia.preDelayFinishDate}</span>
                      </div>
                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Post-Delay Impacted Finish</span>
                        <span className="text-sm font-bold text-amber-400">{tia.postDelayFinishDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Net Critical Path Impact</span>
                        <span className="text-sm font-bold text-cyan-400">+{tia.netCpmImpactDays} Days</span>
                      </div>
                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Critical Path Affected</span>
                        <span className={`text-sm font-bold ${tia.criticalPathAffected ? 'text-red-400' : 'text-emerald-400'}`}>
                          {tia.criticalPathAffected ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-950/20 p-3 border border-emerald-500/30">
                      <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Contract Governance Verification</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Original Baseline Finish (<strong className="text-white">{tia.baselineFinishDate}</strong>) remains <strong>strictly unchanged and immutable</strong>.
                        Forecast Revised Finish (<strong className="text-emerald-400">{tia.forecastRevisedFinishDate}</strong>) is adjusted by approved extension of time ({selectedTiaEvent.approved_extension_days} days).
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-800 pt-3">
              <button
                onClick={() => setSelectedTiaEvent(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-slate-200 hover:bg-slate-700"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
