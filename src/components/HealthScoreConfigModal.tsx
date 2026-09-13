import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  ArrowRight,
  Sliders,
  AlertOctagon,
  RefreshCw,
  FileText,
} from 'lucide-react';
import type {
  HealthScoreVersion,
  GovernedHealthScoreConfig,
} from '../types/index.ts';
import {
  GOVERNED_HEALTH_CONFIG_TEMPLATE,
  validateHealthConfig,
} from '../utils/governedHealthScore';
import {
  saveHealthScoreVersion,
  approveHealthScoreVersion,
  reopenHealthScoreVersion,
  listHealthScoreVersions,
} from '../data/healthScoreWorkflow';

interface HealthScoreConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentApprovedVersion?: HealthScoreVersion | null;
  onVersionUpdated?: (version: HealthScoreVersion) => void;
  currentActor?: string;
  dataDate?: string;
}

export function HealthScoreConfigModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentApprovedVersion,
  onVersionUpdated,
  currentActor = 'PMO Lead',
  dataDate,
}: HealthScoreConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
  const [versions, setVersions] = useState<HealthScoreVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Draft / Configuration
  const [versionCode, setVersionCode] = useState(`V-HEALTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const [title, setTitle] = useState(`Project Health Thresholds Baseline`);
  const [actorName, setActorName] = useState(currentActor);
  const [approverActor, setApproverActor] = useState('Executive Approver');
  const [notes, setNotes] = useState('');

  // Weights
  const [scheduleWeight, setScheduleWeight] = useState(20);
  const [costWeight, setCostWeight] = useState(20);
  const [cashWeight, setCashWeight] = useState(20);
  const [scopeWeight, setScopeWeight] = useState(15);
  const [qualityWeight, setQualityWeight] = useState(15);
  const [dataQualityWeight, setDataQualityWeight] = useState(10);

  // Thresholds
  const [scheduleWarning, setScheduleWarning] = useState(0.95);
  const [scheduleCritical, setScheduleCritical] = useState(0.85);
  const [costWarning, setCostWarning] = useState(0.95);
  const [costCritical, setCostCritical] = useState(0.85);
  const [cashWarning, setCashWarning] = useState(0);
  const [cashCritical, setCashCritical] = useState(-50000);
  const [scopeWarning, setScopeWarning] = useState(0.10);
  const [scopeCritical, setScopeCritical] = useState(0.25);
  const [qualityWarning, setQualityWarning] = useState(0.05);
  const [qualityCritical, setQualityCritical] = useState(0.15);
  const [dataQualityWarning, setDataQualityWarning] = useState(0.05);
  const [dataQualityCritical, setDataQualityCritical] = useState(0.15);

  // Selected draft for approval modal
  const [selectedDraftForApproval, setSelectedDraftForApproval] = useState<HealthScoreVersion | null>(null);
  // Reopen prompt state
  const [reopenReason, setReopenReason] = useState('');
  const [selectedVersionForReopen, setSelectedVersionForReopen] = useState<HealthScoreVersion | null>(null);

  const totalWeight = scheduleWeight + costWeight + cashWeight + scopeWeight + qualityWeight + dataQualityWeight;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  useEffect(() => {
    if (isOpen && projectId) {
      loadVersions();
    }
  }, [isOpen, projectId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const list = await listHealthScoreVersions(projectId);
      setVersions(list);
    } catch {
      // Fallback empty list if in web-only mode without desktop DB
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setActionError(null);
    setSuccessMessage(null);

    const config: GovernedHealthScoreConfig = {
      scheduleWeight,
      costWeight,
      cashWeight,
      scopeWeight,
      qualityWeight,
      dataQualityWeight,
      thresholds: {
        schedule: { warning: scheduleWarning, critical: scheduleCritical, direction: 'higher_is_better' },
        cost: { warning: costWarning, critical: costCritical, direction: 'higher_is_better' },
        cash: { warning: cashWarning, critical: cashCritical, direction: 'higher_is_better' },
        scope: { warning: scopeWarning, critical: scopeCritical, direction: 'lower_is_better' },
        quality: { warning: qualityWarning, critical: qualityCritical, direction: 'lower_is_better' },
        dataQuality: { warning: dataQualityWarning, critical: dataQualityCritical, direction: 'lower_is_better' },
      },
    };

    const val = validateHealthConfig(config);
    if (!val.isValid) {
      setActionError(val.errors.join('; '));
      return;
    }

    try {
      setLoading(true);
      const opId = `op-save-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const saved = await saveHealthScoreVersion({
        operation_id: opId,
        project_id: projectId,
        version_code: versionCode.trim(),
        title: title.trim(),
        data_date: dataDate || null,
        schedule_weight: scheduleWeight,
        cost_weight: costWeight,
        cash_weight: cashWeight,
        scope_weight: scopeWeight,
        quality_weight: qualityWeight,
        data_quality_weight: dataQualityWeight,
        schedule_warning_threshold: scheduleWarning,
        schedule_critical_threshold: scheduleCritical,
        schedule_direction: 'higher_is_better',
        cost_warning_threshold: costWarning,
        cost_critical_threshold: costCritical,
        cost_direction: 'higher_is_better',
        cash_warning_threshold: cashWarning,
        cash_critical_threshold: cashCritical,
        cash_direction: 'higher_is_better',
        scope_warning_threshold: scopeWarning,
        scope_critical_threshold: scopeCritical,
        scope_direction: 'lower_is_better',
        quality_warning_threshold: qualityWarning,
        quality_critical_threshold: qualityCritical,
        quality_direction: 'lower_is_better',
        data_quality_warning_threshold: dataQualityWarning,
        data_quality_critical_threshold: dataQualityCritical,
        data_quality_direction: 'lower_is_better',
        notes: notes.trim() || null,
        actor: actorName.trim() || 'PMO Lead',
      });

      setSuccessMessage(`Draft version ${saved.version_code} saved successfully.`);
      await loadVersions();
      if (onVersionUpdated) onVersionUpdated(saved);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save health score draft version.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (version: HealthScoreVersion) => {
    setActionError(null);
    setSuccessMessage(null);

    if (version.created_by && approverActor.trim().toLowerCase() === version.created_by.trim().toLowerCase()) {
      setActionError(`Maker-Checker violation: Creator (${version.created_by}) cannot approve their own version. Please provide a different reviewer actor.`);
      return;
    }

    try {
      setLoading(true);
      const opId = `op-appr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const approved = await approveHealthScoreVersion({
        operation_id: opId,
        version_id: version.id,
        actor: approverActor.trim() || 'Executive Approver',
        approved_at: new Date().toISOString(),
      });

      setSuccessMessage(`Version ${approved.version_code} is now APPROVED as the active project authority.`);
      setSelectedDraftForApproval(null);
      await loadVersions();
      if (onVersionUpdated) onVersionUpdated(approved);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve health score version.');
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedVersionForReopen) return;
    setActionError(null);
    setSuccessMessage(null);

    if (!reopenReason.trim()) {
      setActionError('A valid reason is required to reopen an approved version.');
      return;
    }

    try {
      setLoading(true);
      const opId = `op-reopen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const reopened = await reopenHealthScoreVersion({
        operation_id: opId,
        version_id: selectedVersionForReopen.id,
        new_version_code: `${selectedVersionForReopen.version_code}-REV`,
        actor: actorName.trim() || 'PMO Lead',
        reopened_at: new Date().toISOString(),
        reason: reopenReason.trim(),
      });

      setSuccessMessage(`Version reopened as new Draft ${reopened.version_code}.`);
      setSelectedVersionForReopen(null);
      setReopenReason('');
      await loadVersions();
      if (onVersionUpdated) onVersionUpdated(reopened);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reopen health score version.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Governed Project Health Score Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Project: <span className="font-semibold text-slate-700">{projectName}</span> | Authority: Project-Scoped Approved Snapshot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Thresholds & Weights Setup</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadVersions();
            }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Version Lifecycle & Governance</span>
            {versions.length > 0 && (
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                {versions.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback Alerts */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-start space-x-2 rtl:space-x-reverse">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-start space-x-2 rtl:space-x-reverse">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'config' ? (
            <>
              {/* Active Authority Status Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                currentApprovedVersion
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  {currentApprovedVersion ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-bold">
                      {currentApprovedVersion
                        ? `Approved Authority: ${currentApprovedVersion.version_code}`
                        : 'No Approved Configuration Active'}
                    </div>
                    <div className="text-xs opacity-80">
                      {currentApprovedVersion
                        ? `Approved by ${currentApprovedVersion.approved_by || 'PMO Authority'} on ${currentApprovedVersion.approved_at?.slice(0, 10)}`
                        : 'Calculations will display "Requires setup" until a baseline is approved by a secondary reviewer.'}
                    </div>
                  </div>
                </div>
                {currentApprovedVersion && (
                  <button
                    onClick={() => {
                      setSelectedVersionForReopen(currentApprovedVersion);
                    }}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Reopen for Re-baseline
                  </button>
                )}
              </div>

              {/* Version Header Meta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Version Code</label>
                  <input
                    type="text"
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. V-HEALTH-2026-Q3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Version description"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author / Planner</label>
                  <input
                    type="text"
                    value={actorName}
                    onChange={(e) => setActorName(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Author Name"
                  />
                </div>
              </div>

              {/* Weight Distribution Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Dimension Weight Distribution (Total Must Equal 100%)
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isWeightValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    Total: {totalWeight}%
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Schedule</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scheduleWeight}
                      onChange={(e) => setScheduleWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Cost (EVM)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={costWeight}
                      onChange={(e) => setCostWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Cash Flow</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cashWeight}
                      onChange={(e) => setCashWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Scope Creep</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scopeWeight}
                      onChange={(e) => setScopeWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Quality (WIR)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={qualityWeight}
                      onChange={(e) => setQualityWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Data Quality</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={dataQualityWeight}
                      onChange={(e) => setDataQualityWeight(Number(e.target.value))}
                      className="w-full text-center font-bold text-slate-900 border border-slate-300 rounded p-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Threshold Calibration Tables */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Dimension Thresholds & Direction Calibration
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Dimension</th>
                        <th className="px-4 py-2.5">Metric & Direction</th>
                        <th className="px-4 py-2.5">Warning Threshold (Amber)</th>
                        <th className="px-4 py-2.5">Critical Threshold (Red)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Schedule</td>
                        <td className="px-4 py-2 text-slate-600">SPI (Higher is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={scheduleWarning}
                            onChange={(e) => setScheduleWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={scheduleCritical}
                            onChange={(e) => setScheduleCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Cost</td>
                        <td className="px-4 py-2 text-slate-600">CPI (Higher is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={costWarning}
                            onChange={(e) => setCostWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={costCritical}
                            onChange={(e) => setCostCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Cash Flow</td>
                        <td className="px-4 py-2 text-slate-600">Net Balance $ (Higher is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={1000}
                            value={cashWarning}
                            onChange={(e) => setCashWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={1000}
                            value={cashCritical}
                            onChange={(e) => setCashCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Scope Creep</td>
                        <td className="px-4 py-2 text-slate-600">Unapproved Variation % (Lower is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={scopeWarning}
                            onChange={(e) => setScopeWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={scopeCritical}
                            onChange={(e) => setScopeCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Quality</td>
                        <td className="px-4 py-2 text-slate-600">WIR Failure % (Lower is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={qualityWarning}
                            onChange={(e) => setQualityWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={qualityCritical}
                            onChange={(e) => setQualityCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-slate-800">Data Quality</td>
                        <td className="px-4 py-2 text-slate-600">Missing Controls % (Lower is better)</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={dataQualityWarning}
                            onChange={(e) => setDataQualityWarning(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step={0.01}
                            value={dataQualityCritical}
                            onChange={(e) => setDataQualityCritical(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-slate-800 font-semibold w-24"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Governance Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Rationale for project-specific threshold or weight calibration..."
                />
              </div>
            </>
          ) : (
            /* Version History & Governance List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Project Health Governance Versions
                </h3>
                <button
                  onClick={loadVersions}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center space-x-1 rtl:space-x-reverse font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {versions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                  No governed health score versions recorded yet for this project. Save a draft to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-shadow shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="font-bold text-slate-900 text-sm">{v.version_code}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            v.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'Draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {v.status}
                          </span>
                          <span className="text-xs text-slate-500">{v.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Created by: <strong className="text-slate-700">{v.created_by || 'Unknown'}</strong></span>
                          {v.approved_by && (
                            <span>Approved by: <strong className="text-slate-700">{v.approved_by}</strong> ({v.approved_at?.slice(0, 10)})</span>
                          )}
                          {v.reopened_from_id && (
                            <span>Reopened from prior version</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {v.status === 'Draft' && (
                          <button
                            onClick={() => setSelectedDraftForApproval(v)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1 rtl:space-x-reverse"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve (Maker-Checker)</span>
                          </button>
                        )}
                        {v.status === 'Approved' && (
                          <button
                            onClick={() => setSelectedVersionForReopen(v)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
          >
            Close
          </button>
          {activeTab === 'config' && (
            <button
              onClick={handleSaveDraft}
              disabled={loading || !isWeightValid}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center space-x-2 rtl:space-x-reverse"
            >
              <FileText className="w-4 h-4" />
              <span>Save Governed Draft</span>
            </button>
          )}
        </div>

        {/* Secondary Modal: Maker-Checker Approval */}
        <AnimatePresence>
          {selectedDraftForApproval && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-slate-800"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse text-indigo-700">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="font-bold text-base text-slate-900">
                    Maker-Checker Independent Approval
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You are approving version <strong>{selectedDraftForApproval.version_code}</strong> as the active governance baseline for <strong>{projectName}</strong>.
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <strong>Maker-Checker Policy:</strong> The author (<code>{selectedDraftForApproval.created_by || 'Planner'}</code>) cannot approve their own baseline.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approver Name / Role</label>
                  <input
                    type="text"
                    value={approverActor}
                    onChange={(e) => setApproverActor(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. PMO Director"
                  />
                </div>

                <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                  <button
                    onClick={() => setSelectedDraftForApproval(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApprove(selectedDraftForApproval)}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Confirm Approval
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Secondary Modal: Reopen Version */}
        <AnimatePresence>
          {selectedVersionForReopen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-slate-800"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse text-amber-700">
                  <Lock className="w-6 h-6" />
                  <h3 className="font-bold text-base text-slate-900">
                    Reopen Governed Baseline
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reopening version <strong>{selectedVersionForReopen.version_code}</strong> will create a new editable <strong>Draft</strong> revision with full lineage tracking.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reopening Reason (Mandatory)</label>
                  <textarea
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Explain why thresholds or weights are being adjusted..."
                  />
                </div>

                <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                  <button
                    onClick={() => setSelectedVersionForReopen(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReopen}
                    disabled={loading || !reopenReason.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    Confirm Reopen
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
