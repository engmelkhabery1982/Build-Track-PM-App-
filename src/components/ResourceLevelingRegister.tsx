import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Play,
  RotateCcw,
  Eye,
  Plus,
  Info,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import {
  ResourceLevelingProposal,
  LevelingAlgorithm,
  LevelingProposalStatus,
  LevelingActivityChange,
} from '../types/index.ts';
import {
  generateLevelingProposal,
  buildForecastScheduleVersionInputFromProposal,
} from '../utils/resourceLevelingEngine.ts';
import { captureScheduleVersion } from '../utils/scheduleVersioning.ts';

interface ResourceLevelingRegisterProps {
  projectId: string;
  dataDate: string;
  schedules: Array<Record<string, any>>;
  resources: Array<Record<string, any>>;
  assignments: Array<Record<string, any>>;
  workCalendars?: Array<Record<string, any>>;
  existingProposals?: ResourceLevelingProposal[];
  onProposalsChange?: (proposals: ResourceLevelingProposal[]) => void;
  onApplyProposalToForecast?: (forecastScheduleInput: any) => void;
}

export const ResourceLevelingRegister: React.FC<ResourceLevelingRegisterProps> = ({
  projectId,
  dataDate,
  schedules,
  resources,
  assignments,
  workCalendars = [],
  existingProposals = [],
  onProposalsChange,
  onApplyProposalToForecast,
}) => {
  const [proposals, setProposals] = useState<ResourceLevelingProposal[]>(existingProposals);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedProposal, setSelectedProposal] = useState<ResourceLevelingProposal | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Proposal Generation Modal Form State
  const [proposalTitle, setProposalTitle] = useState<string>('Resource Leveling Run');
  const [algorithm, setAlgorithm] = useState<LevelingAlgorithm>('CPM_FLOAT_FIRST');
  const [owner, setOwner] = useState<string>('Planning Engineer');
  const [maxDelayDays, setMaxDelayDays] = useState<number>(30);
  const [protectCriticalPath, setProtectCriticalPath] = useState<boolean>(true);
  const [previewProposal, setPreviewProposal] = useState<ResourceLevelingProposal | null>(null);

  // Rejection reason state
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  // Success / Notice Banner
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const filteredProposals = useMemo(() => {
    if (selectedStatusFilter === 'ALL') return proposals;
    return proposals.filter((p) => p.status === selectedStatusFilter);
  }, [proposals, selectedStatusFilter]);

  const kpis = useMemo(() => {
    const total = proposals.length;
    const applied = proposals.filter((p) => p.status === 'Applied').length;
    const pending = proposals.filter((p) => p.status === 'Draft' || p.status === 'Reviewed' || p.status === 'Approved').length;
    const maxSlippage = proposals.reduce((max, p) => Math.max(max, p.impact_summary?.maxScheduleSlippageDays || 0), 0);
    return { total, applied, pending, maxSlippage };
  }, [proposals]);

  const handleGeneratePreview = () => {
    const code = `RLP-${new Date().getFullYear()}-${String(proposals.length + 1).padStart(3, '0')}`;
    const generated = generateLevelingProposal({
      projectId,
      proposalCode: code,
      title: proposalTitle,
      owner,
      dataDate,
      algorithm,
      schedules,
      resources,
      assignments,
      workCalendars,
      options: {
        maxDelayDays,
        protectCriticalPath,
      },
    });
    setPreviewProposal(generated);
  };

  const handleSaveProposal = () => {
    if (!previewProposal) return;
    const updated = [previewProposal, ...proposals];
    setProposals(updated);
    if (onProposalsChange) onProposalsChange(updated);
    setIsGenerateModalOpen(false);
    setPreviewProposal(null);
    setNotice({ type: 'success', message: `Proposal ${previewProposal.proposal_code} generated and saved as Draft.` });
  };

  const handleUpdateStatus = (proposalId: string, newStatus: LevelingProposalStatus, rejectionReason?: string) => {
    const updated = proposals.map((p) => {
      if (p.id !== proposalId) return p;
      return {
        ...p,
        status: newStatus,
        rejection_reason: rejectionReason || p.rejection_reason,
        updated_at: new Date().toISOString(),
      };
    });
    setProposals(updated);
    if (onProposalsChange) onProposalsChange(updated);
    if (selectedProposal && selectedProposal.id === proposalId) {
      setSelectedProposal({
        ...selectedProposal,
        status: newStatus,
        rejection_reason: rejectionReason || selectedProposal.rejection_reason,
      });
    }
    setNotice({ type: 'info', message: `Proposal status updated to ${newStatus}.` });
  };

  const handleApplyProposal = (proposal: ResourceLevelingProposal) => {
    if (proposal.status === 'Applied') {
      setNotice({ type: 'error', message: 'Proposal is already applied.' });
      return;
    }

    try {
      const { scheduleVersionInput } = buildForecastScheduleVersionInputFromProposal(proposal, schedules, assignments);

      // Validate & create Forecast Schedule Version
      const forecastVersion = captureScheduleVersion(scheduleVersionInput);

      if (onApplyProposalToForecast) {
        onApplyProposalToForecast(forecastVersion);
      }

      // Update proposal status to Applied
      const updated = proposals.map((p) => {
        if (p.id !== proposal.id) return p;
        return {
          ...p,
          status: 'Applied' as LevelingProposalStatus,
          applied_schedule_version_id: forecastVersion.id,
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      setProposals(updated);
      if (onProposalsChange) onProposalsChange(updated);
      if (selectedProposal && selectedProposal.id === proposal.id) {
        setSelectedProposal({
          ...selectedProposal,
          status: 'Applied',
          applied_schedule_version_id: forecastVersion.id,
          applied_at: new Date().toISOString(),
        });
      }

      setNotice({
        type: 'success',
        message: `Applied ${proposal.proposal_code}: Created Forecast Schedule Version ${forecastVersion.version_code}. Approved Baseline Schedule remains unchanged.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', message: `Failed to apply proposal: ${err.message}` });
    }
  };

  const handleReverseProposal = (proposal: ResourceLevelingProposal) => {
    if (proposal.status !== 'Applied') {
      setNotice({ type: 'error', message: 'Only Applied proposals can be reversed.' });
      return;
    }

    const updated = proposals.map((p) => {
      if (p.id !== proposal.id) return p;
      return {
        ...p,
        status: 'Reversed' as LevelingProposalStatus,
        reversed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    setProposals(updated);
    if (onProposalsChange) onProposalsChange(updated);
    if (selectedProposal && selectedProposal.id === proposal.id) {
      setSelectedProposal({ ...selectedProposal, status: 'Reversed', reversed_at: new Date().toISOString() });
    }

    setNotice({
      type: 'info',
      message: `Proposal ${proposal.proposal_code} reversed. Status set to Reversed.`,
    });
  };

  const getStatusBadge = (status: LevelingProposalStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Draft</span>;
      case 'Reviewed':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Reviewed</span>;
      case 'Approved':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">Approved</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>;
      case 'Applied':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-900 font-semibold">Applied</span>;
      case 'Reversed':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Reversed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
            <Sliders className="text-indigo-600 w-6 h-6" />
            Resource Leveling Decision Register
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            F7 Governed Resource Leveling: Simulate & approve leveling decisions. Applying creates a Forecast Schedule Version without altering Approved Baseline.
          </p>
        </div>

        <button
          onClick={() => {
            setProposalTitle(`Resource Leveling Run ${proposals.length + 1}`);
            setPreviewProposal(null);
            setIsGenerateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Leveling Proposal</span>
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-lg text-xs font-medium flex justify-between items-center ${
            notice.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-900'
              : notice.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-blue-50 border border-blue-200 text-blue-900'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Proposals</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpis.total}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{kpis.pending}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Applied Forecasts</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{kpis.applied}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Max Schedule Slippage</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{kpis.maxSlippage} days</p>
        </div>
      </div>

      {/* Decision Register Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-gray-700">Filter Status:</span>
            {['ALL', 'Draft', 'Reviewed', 'Approved', 'Rejected', 'Applied', 'Reversed'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedStatusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-500">
            Showing <strong>{filteredProposals.length}</strong> of <strong>{proposals.length}</strong> decision proposals
          </span>
        </div>

        {/* Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Proposal Code</th>
                <th className="p-3">Title & Reason</th>
                <th className="p-3">Data Date</th>
                <th className="p-3">Algorithm</th>
                <th className="p-3">Status</th>
                <th className="p-3">Overloaded Res.</th>
                <th className="p-3">Shifted Act.</th>
                <th className="p-3">Max Slippage</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No resource leveling proposals found for this filter. Click "Generate Leveling Proposal" above to run leveling analysis.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-semibold text-indigo-700 font-mono">{prop.proposal_code}</td>
                    <td className="p-3 font-medium text-gray-900 max-w-xs truncate">
                      <div>{prop.title}</div>
                      <div className="text-[10px] text-gray-400 font-normal truncate">{prop.reason}</div>
                    </td>
                    <td className="p-3 text-gray-600">{prop.data_date}</td>
                    <td className="p-3 font-mono text-gray-500 text-[11px]">{prop.algorithm}</td>
                    <td className="p-3">{getStatusBadge(prop.status)}</td>
                    <td className="p-3 font-semibold text-gray-800">{prop.overloaded_resources?.length || 0} resources</td>
                    <td className="p-3 font-semibold text-gray-800">{prop.impact_summary?.totalActivitiesShifted || 0} activities</td>
                    <td className="p-3 font-semibold text-indigo-600">{prop.impact_summary?.maxScheduleSlippageDays || 0} days</td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedProposal(prop);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Details
                      </button>

                      {prop.status === 'Draft' && (
                        <button
                          onClick={() => handleUpdateStatus(prop.id, 'Reviewed')}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-medium"
                        >
                          Review
                        </button>
                      )}

                      {(prop.status === 'Draft' || prop.status === 'Reviewed') && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(prop.id, 'Approved')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProposal(prop);
                              setIsRejectModalOpen(true);
                            }}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(prop.status === 'Approved' || prop.status === 'Reviewed' || prop.status === 'Draft') && (
                        <button
                          onClick={() => handleApplyProposal(prop)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold shadow-2xs"
                        >
                          <Play className="w-3 h-3 inline mr-1" />
                          Apply Forecast
                        </button>
                      )}

                      {prop.status === 'Applied' && (
                        <button
                          onClick={() => handleReverseProposal(prop)}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-medium"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Leveling Proposal Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Generate Governed Resource Leveling Proposal
              </h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Proposal Title</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Owner / Engineer</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Leveling Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as LevelingAlgorithm)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="CPM_FLOAT_FIRST">CPM Float First (Non-critical large float shifted first)</option>
                  <option value="PRIORITY_BASED">Priority Based (Lower priority shifted first)</option>
                  <option value="RESOURCE_SMOOTHING">Resource Smoothing (Max peak load reduction)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Max Delay Constraint (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={maxDelayDays}
                  onChange={(e) => setMaxDelayDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="protectCritical"
                  checked={protectCriticalPath}
                  onChange={(e) => setProtectCriticalPath(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <label htmlFor="protectCritical" className="text-xs text-gray-700 font-medium">
                  Protect Critical Path (Do not shift critical activities unless non-critical candidates are exhausted)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t pt-4">
              <button
                onClick={handleGeneratePreview}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold"
              >
                Run Simulation Preview
              </button>
            </div>

            {/* Simulation Preview Results */}
            {previewProposal && (
              <div className="p-4 bg-gray-50 border border-indigo-100 rounded-lg space-y-4 text-xs">
                <div className="flex justify-between items-center font-bold text-gray-900 border-b pb-2">
                  <span>Simulation Result — {previewProposal.proposal_code}</span>
                  <span className="text-indigo-600 font-mono">{previewProposal.impact_summary.totalActivitiesShifted} Activities Shifted</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Overloads Before</p>
                    <p className="font-bold text-amber-600 text-base">{previewProposal.impact_summary.beforeOverloadedDays}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Overloads Cleared</p>
                    <p className="font-bold text-emerald-600 text-base">{previewProposal.impact_summary.clearedOverloadsCount}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Remaining Overloads</p>
                    <p className="font-bold text-gray-700 text-base">{previewProposal.impact_summary.remainingOverloadsCount}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Max Slippage</p>
                    <p className="font-bold text-indigo-600 text-base">{previewProposal.impact_summary.maxScheduleSlippageDays} d</p>
                  </div>
                </div>

                {/* Shifted Activities List */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Proposed Activity Shifts ({previewProposal.changes.length})</h4>
                  <div className="max-h-48 overflow-y-auto border rounded bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-100 font-semibold text-gray-600 border-b">
                        <tr>
                          <th className="p-2">Code</th>
                          <th className="p-2">Activity Name</th>
                          <th className="p-2">Original Dates</th>
                          <th className="p-2">Proposed Dates</th>
                          <th className="p-2">Delay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewProposal.changes.map((c) => (
                          <tr key={c.scheduleId}>
                            <td className="p-2 font-mono font-semibold text-indigo-700">{c.activityCode}</td>
                            <td className="p-2">{c.activityName}</td>
                            <td className="p-2 text-gray-500">{c.originalStart} → {c.originalFinish}</td>
                            <td className="p-2 text-emerald-700 font-semibold">{c.proposedStart} → {c.proposedFinish}</td>
                            <td className="p-2 font-bold text-amber-700">+{c.delayDays} d</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={handleSaveProposal}
                    className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-xs font-semibold shadow-xs"
                  >
                    Save Proposal as Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proposal Details Modal */}
      {isDetailModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 mr-2">{selectedProposal.proposal_code}</span>
                <span className="text-base font-bold text-gray-900">{selectedProposal.title}</span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-500 block">Status:</span>
                {getStatusBadge(selectedProposal.status)}
              </div>
              <div>
                <span className="text-gray-500 block">Data Date:</span>
                <span className="font-semibold text-gray-800">{selectedProposal.data_date}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Algorithm:</span>
                <span className="font-mono text-gray-800">{selectedProposal.algorithm}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Owner:</span>
                <span className="font-semibold text-gray-800">{selectedProposal.owner}</span>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Leveling Impact Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <p className="text-gray-500">Activities Shifted</p>
                  <p className="text-lg font-bold text-indigo-700">{selectedProposal.impact_summary?.totalActivitiesShifted || 0}</p>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <p className="text-gray-500">Max Schedule Slippage</p>
                  <p className="text-lg font-bold text-amber-700">{selectedProposal.impact_summary?.maxScheduleSlippageDays || 0} days</p>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <p className="text-gray-500">Overloads Cleared</p>
                  <p className="text-lg font-bold text-emerald-700">{selectedProposal.impact_summary?.clearedOverloadsCount || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">Critical Path Impact</p>
                  <p className="text-lg font-bold text-gray-800">{selectedProposal.impact_summary?.criticalPathShifted ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Shifted Activities Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Shifted Activities Breakdown</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-700 border-b">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Activity Name</th>
                      <th className="p-2.5">Original Start → Finish</th>
                      <th className="p-2.5">Proposed Start → Finish</th>
                      <th className="p-2.5">Float (Before/After)</th>
                      <th className="p-2.5">Delay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedProposal.changes?.map((change) => (
                      <tr key={change.scheduleId} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-semibold text-indigo-700">{change.activityCode}</td>
                        <td className="p-2.5 font-medium text-gray-900">{change.activityName}</td>
                        <td className="p-2.5 text-gray-500">{change.originalStart} → {change.originalFinish}</td>
                        <td className="p-2.5 font-semibold text-emerald-700">{change.proposedStart} → {change.proposedFinish}</td>
                        <td className="p-2.5 text-gray-600">{change.originalTotalFloat}d → {change.proposedTotalFloat}d</td>
                        <td className="p-2.5 font-bold text-amber-700">+{change.delayDays} d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer inside Details Modal */}
            <div className="flex justify-between items-center border-t pt-4">
              <div className="text-xs text-gray-500">
                Created at: {new Date(selectedProposal.created_at).toLocaleString()}
              </div>

              <div className="flex space-x-2">
                {(selectedProposal.status === 'Approved' || selectedProposal.status === 'Reviewed' || selectedProposal.status === 'Draft') && (
                  <button
                    onClick={() => {
                      handleApplyProposal(selectedProposal);
                      setIsDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md text-xs font-semibold shadow-xs"
                  >
                    Apply Forecast Version
                  </button>
                )}

                {selectedProposal.status === 'Applied' && (
                  <button
                    onClick={() => {
                      handleReverseProposal(selectedProposal);
                      setIsDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md text-xs font-semibold"
                  >
                    Reverse Proposal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && selectedProposal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Reject Leveling Proposal {selectedProposal.proposal_code}</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md text-xs"
                placeholder="Specify why this proposal is rejected..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateStatus(selectedProposal.id, 'Rejected', rejectReason);
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceLevelingRegister;
