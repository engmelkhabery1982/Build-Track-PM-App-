import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  History,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Layers,
  ShieldCheck,
  X,
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import type { Schedule, ScheduleVersion } from '../types';
import {
  captureScheduleVersion,
  compareScheduleVersions,
  type ScheduleVersionComparisonSummary,
} from '../utils/scheduleVersioning';

interface ScheduleVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  contractId?: string | null;
  projects?: Array<{ id: string; project_code?: string; name?: string }>;
  contracts?: Array<{ id: string; project_id: string; contract_number?: string; title?: string; parent_main_contract_id?: string | null }>;
  currentActivities: Schedule[];
  currentDistributions?: Record<string, any>[];
  existingVersions: ScheduleVersion[];
  onSaveVersion: (version: ScheduleVersion) => Promise<void>;
  onSupersedeVersion?: (version: ScheduleVersion) => Promise<void>;
  currencySymbol?: string;
  dataDate?: string;
}

export const ScheduleVersionModal: React.FC<ScheduleVersionModalProps> = ({
  isOpen,
  onClose,
  projectId,
  contractId,
  projects = [],
  contracts = [],
  currentActivities,
  currentDistributions = [],
  existingVersions,
  onSaveVersion,
  onSupersedeVersion,
  currencySymbol = '$',
  dataDate: governedDataDate,
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'capture' | 'compare'>('register');

  // Capture Form State
  const [versionCode, setVersionCode] = useState(`VER-${new Date().toISOString().slice(0, 10)}`);
  const [versionName, setVersionName] = useState('Current Schedule Snapshot');
  const [versionType, setVersionType] = useState<'Baseline' | 'Current' | 'Forecast' | 'What-If'>('Current');
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [status, setStatus] = useState<'Draft' | 'Approved' | 'Superseded'>('Draft');
  const [dataDate, setDataDate] = useState(governedDataDate || new Date().toISOString().slice(0, 10));
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [selectedContractId, setSelectedContractId] = useState(contractId || '');
  const [owner, setOwner] = useState('Planning Lead');
  const [reason, setReason] = useState('Periodic schedule review and baseline tracking');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Comparison State
  const [selectedV1Id, setSelectedV1Id] = useState<string>('');
  const [selectedV2Id, setSelectedV2Id] = useState<string>('LIVE');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Set default comparison versions when modal opens or versions change
  React.useEffect(() => {
    if (!isOpen) return;
    const nextProjectId = projectId || selectedProjectId || projects[0]?.id || currentActivities[0]?.project_id || '';
    setSelectedProjectId(nextProjectId);
    if (contractId) setSelectedContractId(contractId);
    if (governedDataDate) setDataDate(governedDataDate);
  }, [isOpen, projectId, contractId, projects, currentActivities, governedDataDate, selectedProjectId]);

  React.useEffect(() => {
    if (existingVersions.length > 0) {
      if (!selectedV1Id) {
        const approvedBaseline = existingVersions.find((v) => v.status === 'Approved' && v.version_type === 'Baseline');
        setSelectedV1Id(approvedBaseline ? approvedBaseline.id : existingVersions[0].id);
      }
    }
  }, [existingVersions, selectedV1Id]);

  const scopedContracts = contracts.filter((contract) => contract.project_id === selectedProjectId && !contract.parent_main_contract_id);
  const scopedActivities = currentActivities.filter((activity) =>
    activity.project_id === selectedProjectId && (!selectedContractId || activity.contract_id === selectedContractId)
    && String(activity.activity || '').trim(),
  );
  const scopedActivityIds = new Set(scopedActivities.map((activity) => activity.id));
  const scopedDistributions = currentDistributions.filter((row) => scopedActivityIds.has(String(row.schedule_id || row.activity_id || '')));
  const projectVersions = existingVersions.filter((v) => v.project_id === selectedProjectId && (!selectedContractId || v.contract_id === selectedContractId));

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const newVersion = captureScheduleVersion({
        projectId: selectedProjectId,
        contractId: selectedContractId || null,
        versionCode,
        versionName,
        versionType,
        status,
        revisionNumber,
        dataDate,
        owner,
        reason,
        activities: scopedActivities,
        distributions: scopedDistributions,
        notes,
      });

      await onSaveVersion(newVersion);
      setIsSubmitting(false);
      setActiveTab('register');
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'Failed to capture schedule version.');
    }
  };

  const version1 = projectVersions.find((v) => v.id === selectedV1Id);

  const comparisonSummary: ScheduleVersionComparisonSummary | null = useMemo(() => {
    if (!version1) return null;

    if (selectedV2Id === 'LIVE') {
      return compareScheduleVersions(version1, {
        versionCode: 'LIVE',
        versionName: 'Live Executable Schedule',
        activities: scopedActivities,
        dataDate,
      });
    }

    const version2 = projectVersions.find((v) => v.id === selectedV2Id);
    if (!version2) return null;

    return compareScheduleVersions(version1, version2);
  }, [version1, selectedV2Id, projectVersions, scopedActivities, dataDate]);

  const filteredVariances = useMemo(() => {
    if (!comparisonSummary) return [];
    return comparisonSummary.activityVariances.filter((varItem) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        varItem.activityCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        varItem.activity.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'ADDED') return varItem.status === 'Added';
      if (filterStatus === 'REMOVED') return varItem.status === 'Removed';
      if (filterStatus === 'CHANGED') return varItem.status === 'Changed';
      if (filterStatus === 'UNCHANGED') return varItem.status === 'Unchanged';
      if (filterStatus === 'CRITICAL_SHIFT') {
        return varItem.baselineCritical !== null && varItem.currentCritical !== null && varItem.baselineCritical !== varItem.currentCritical;
      }
      return true;
    });
  }, [comparisonSummary, filterStatus, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Schedule Versions, Scenarios & Comparison</h2>
              <p className="text-xs text-slate-400">
                Track baselines, what-if scenarios and perform activity-level delta analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'register'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Version Register ({projectVersions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('capture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'capture'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Capture Version / Scenario</span>
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'compare'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Versions</span>
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-white px-6 py-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Project
            <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setSelectedContractId(''); setSelectedV1Id(''); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{[project.project_code, project.name].filter(Boolean).join(' — ') || project.id}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Main contract
            <select value={selectedContractId} onChange={(event) => { setSelectedContractId(event.target.value); setSelectedV1Id(''); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" disabled={!selectedProjectId}>
              <option value="">All main contracts in project</option>
              {scopedContracts.map((contract) => <option key={contract.id} value={contract.id}>{[contract.contract_number, contract.title].filter(Boolean).join(' — ') || contract.id}</option>)}
            </select>
          </label>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* TAB 1: VERSION REGISTER */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Saved Schedule Snapshots & Scenarios</h3>
                  <p className="text-xs text-slate-500">
                    Approved baselines are immutable. Draft versions and what-if scenarios allow iterative planning.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('capture')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Snapshot</span>
                </button>
              </div>

              {projectVersions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-medium text-slate-800">No schedule versions saved yet</h4>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Capture your current schedule as an approved baseline or what-if scenario to track changes and forecast variance.
                  </p>
                  <button
                    onClick={() => setActiveTab('capture')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Capture First Snapshot
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectVersions.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md">
                            {v.version_code}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              v.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : v.status === 'Superseded'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {v.status === 'Approved' && <ShieldCheck className="w-3 h-3" />}
                            {v.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mb-1">{v.version_name}</h4>

                        <div className="flex flex-wrap gap-2 my-2 text-xs text-slate-600">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-xs font-medium">
                            {v.version_type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Data Date: {v.data_date}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md my-2 line-clamp-2">
                          <span className="font-semibold text-slate-700">Reason:</span> {v.reason}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400">Activities:</span>{' '}
                            <span className="font-semibold text-slate-800">{v.activity_count}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Critical:</span>{' '}
                            <span className="font-semibold text-rose-600">{v.critical_activity_count}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {v.owner}
                        </span>
                        <div className="flex items-center gap-3">
                          {v.status === 'Approved' && onSupersedeVersion && <button type="button" onClick={() => void onSupersedeVersion(v).catch((error) => window.alert(error?.message || 'Could not supersede the approved version.'))} className="text-xs font-semibold text-amber-700 hover:text-amber-900">Supersede</button>}
                          <button
                            onClick={() => {
                              setSelectedV1Id(v.id);
                              setActiveTab('compare');
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>Compare</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAPTURE VERSION / SCENARIO */}
          {activeTab === 'capture' && (
            <form onSubmit={handleCaptureSubmit} className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Capture Schedule Version / Scenario</h3>
                <p className="text-xs text-slate-500">
                  Captures the {scopedActivities.length} executable activities in the selected scope as a frozen snapshot or draft scenario.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version Code *</label>
                  <input
                    type="text"
                    required
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                    placeholder="e.g. BL-01, FCST-MAY26"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revision Number *</label>
                  <input type="number" required min={1} step={1} value={revisionNumber} onChange={(event) => setRevisionNumber(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version Name *</label>
                  <input
                    type="text"
                    required
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="e.g. Approved Contract Baseline Rev 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version Type *</label>
                  <select
                    value={versionType}
                    onChange={(e) => setVersionType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Baseline">Baseline (Contractual / Control Target)</option>
                    <option value="Current">Current (Executable Update)</option>
                    <option value="Forecast">Forecast (CPM Network Projection)</option>
                    <option value="What-If">What-If (Scenario Simulation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Governance Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Draft">Draft (Editable / Temporary)</option>
                    <option value="Approved">Approved (Immutable Control Point)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Date (Status Cut-off) *</label>
                  <input
                    type="date"
                    required
                    value={dataDate}
                    onChange={(e) => setDataDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author / Owner *</label>
                  <input
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. Senior Planner"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Revision Reason / Governance Purpose *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this version is being captured..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key assumptions, risk mitigation scenario context..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                <span>Activities to freeze: <strong>{currentActivities.length} items</strong></span>
                {status === 'Approved' && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approved snapshots are immutable in SQLite
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Snapshot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: COMPARE VERSIONS */}
          {activeTab === 'compare' && (
            <div className="space-y-6">
              {/* Version Selectors */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Base Version (Reference A)
                  </label>
                  <select
                    value={selectedV1Id}
                    onChange={(e) => setSelectedV1Id(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {projectVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version_code} - {v.version_name} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Comparison Target (Version B)
                  </label>
                  <select
                    value={selectedV2Id}
                    onChange={(e) => setSelectedV2Id(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="LIVE">Live Executable Schedule (Current State)</option>
                    {projectVersions
                      .filter((v) => v.id !== selectedV1Id)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.version_code} - {v.version_name} ({v.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {!comparisonSummary ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                  Select a valid Base Version to begin comparison.
                </div>
              ) : (
                <>
                  {/* High Level KPI Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Activities Breakdown</span>
                        <Layers className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        {comparisonSummary.totalV1Activities} → {comparisonSummary.totalV2Activities}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-emerald-600 font-medium">+{comparisonSummary.addedCount} Added</span>
                        <span className="text-rose-600 font-medium">-{comparisonSummary.removedCount} Removed</span>
                        <span className="text-amber-600 font-medium">Δ{comparisonSummary.changedCount} Changed</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Finish Date Slippage</span>
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {comparisonSummary.finishVarianceDays === null ? (
                          'N/A'
                        ) : comparisonSummary.finishVarianceDays === 0 ? (
                          <span className="text-emerald-600">On Track (0d)</span>
                        ) : comparisonSummary.finishVarianceDays > 0 ? (
                          <span className="text-rose-600">+{comparisonSummary.finishVarianceDays} days delay</span>
                        ) : (
                          <span className="text-emerald-600">{comparisonSummary.finishVarianceDays} days ahead</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2 truncate">
                        Finish A: {comparisonSummary.v1FinishDate || 'N/A'} | Finish B: {comparisonSummary.v2FinishDate || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Critical Path Activities</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        {comparisonSummary.criticalPathV1Count} → {comparisonSummary.criticalPathV2Count}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        <span className="font-semibold text-amber-600">{comparisonSummary.criticalPathShiftCount}</span> activities shifted critical status
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Planned Budget Variance</span>
                        <DollarSign className="w-4 h-4 text-slate-400" />
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          comparisonSummary.budgetVariance > 0
                            ? 'text-rose-600'
                            : comparisonSummary.budgetVariance < 0
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {comparisonSummary.budgetVariance > 0 ? '+' : ''}
                        {currencySymbol}
                        {comparisonSummary.budgetVariance.toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-500 mt-2 truncate">
                        A: {currencySymbol}{comparisonSummary.totalBudgetV1.toLocaleString()} | B: {currencySymbol}{comparisonSummary.totalBudgetV2.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Activity Level Drill-Down Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Activity Delta Analysis ({filteredVariances.length})</h4>
                        <p className="text-xs text-slate-500">
                          Comparing {comparisonSummary.v1Code} against {comparisonSummary.v2Code}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter code or activity..."
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="ALL">All Changes</option>
                          <option value="ADDED">Added Activities</option>
                          <option value="REMOVED">Removed Activities</option>
                          <option value="CHANGED">Modified Activities</option>
                          <option value="CRITICAL_SHIFT">Critical Path Shifts</option>
                          <option value="UNCHANGED">Unchanged Activities</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">Activity Code & Name</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Start (A → B)</th>
                            <th className="py-2.5 px-3">Finish (A → B)</th>
                            <th className="py-2.5 px-3 text-center">Finish Δ</th>
                            <th className="py-2.5 px-3 text-center">Duration (A → B)</th>
                            <th className="py-2.5 px-3 text-center">Total Float (A → B)</th>
                            <th className="py-2.5 px-3 text-center">Critical</th>
                            <th className="py-2.5 px-3">Changed Attributes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredVariances.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No activity variances found matching current filters.
                              </td>
                            </tr>
                          ) : (
                            filteredVariances.map((row) => (
                              <tr key={row.identity} className="hover:bg-slate-50/80 transition">
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-slate-800">{row.activityCode}</div>
                                  <div className="text-slate-600 text-xs truncate max-w-xs">{row.activity}</div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                      row.status === 'Added'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : row.status === 'Removed'
                                        ? 'bg-rose-100 text-rose-800'
                                        : row.status === 'Changed'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {row.status}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 font-mono text-[11px]">
                                  {row.baselineStartDate || 'N/A'} → {row.currentStartDate || 'N/A'}
                                </td>

                                <td className="py-2.5 px-3 font-mono text-[11px]">
                                  {row.baselineEndDate || 'N/A'} → {row.currentEndDate || 'N/A'}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono font-bold">
                                  {row.finishVarianceDays === null ? (
                                    '-'
                                  ) : row.finishVarianceDays === 0 ? (
                                    <span className="text-slate-500">0d</span>
                                  ) : row.finishVarianceDays > 0 ? (
                                    <span className="text-rose-600">+{row.finishVarianceDays}d</span>
                                  ) : (
                                    <span className="text-emerald-600">{row.finishVarianceDays}d</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono">
                                  {row.baselineDurationDays ?? '-'} → {row.currentDurationDays ?? '-'}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono">
                                  {row.baselineTotalFloatDays ?? '-'} → {row.currentTotalFloatDays ?? '-'}
                                </td>

                                <td className="py-2.5 px-3 text-center font-semibold">
                                  {row.baselineCritical === row.currentCritical ? (
                                    row.currentCritical ? (
                                      <span className="text-rose-600">Critical</span>
                                    ) : (
                                      <span className="text-slate-400">Non-Crit</span>
                                    )
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-xs">
                                      {row.baselineCritical ? 'Crit' : 'Non'} → {row.currentCritical ? 'Crit' : 'Non'}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  {row.changedFields && row.changedFields.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {row.changedFields.map((f, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-xs text-[10px]">
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
