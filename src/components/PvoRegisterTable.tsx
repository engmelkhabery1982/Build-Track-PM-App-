import React, { useState, useMemo } from 'react';
import { PotentialVariationOrder, PvoStatus } from '@/types/pvo';
import { DollarSign, Clock, ShieldAlert, CheckCircle2, Plus, X, AlertTriangle, FileSignature } from 'lucide-react';

interface PvoRegisterTableProps {
  pvoList: PotentialVariationOrder[];
  currency?: string;
  onStatusChange?: (id: string, newStatus: PvoStatus) => void;
  onAddNewPvo?: (newPvo: Omit<PotentialVariationOrder, 'id'>) => void;
}

const statusBadgeColor = (status: PvoStatus): string => {
  switch (status) {
    case 'Identified':
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    case 'Submitted':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Under Review':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
};

const ALL_STATUSES: PvoStatus[] = ['Identified', 'Submitted', 'Under Review', 'Approved', 'Rejected'];

export const PvoRegisterTable: React.FC<PvoRegisterTableProps> = ({
  pvoList,
  currency = '$',
  onStatusChange,
  onAddNewPvo,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [pvoNumber, setPvoNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCostImpact, setEstimatedCostImpact] = useState('');
  const [estimatedTimeImpactDays, setEstimatedTimeImpactDays] = useState('');
  const [identifiedDate, setIdentifiedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // 1. Top Metric Cards calculations
  const totalPotentialExposure = useMemo(() => {
    return pvoList
      .filter((p) => p.status !== 'Rejected')
      .reduce((sum, p) => sum + (p.estimatedCostImpact || 0), 0);
  }, [pvoList]);

  const approvedClaimsValue = useMemo(() => {
    return pvoList
      .filter((p) => p.status === 'Approved')
      .reduce((sum, p) => sum + (p.approvedCostImpact ?? p.estimatedCostImpact ?? 0), 0);
  }, [pvoList]);

  const estimatedDelayExposure = useMemo(() => {
    return pvoList
      .filter((p) => p.status !== 'Rejected')
      .reduce((sum, p) => sum + (p.estimatedTimeImpactDays || 0), 0);
  }, [pvoList]);

  const activeClaimsCount = useMemo(() => {
    return pvoList.filter((p) => p.status !== 'Rejected' && p.status !== 'Approved').length;
  }, [pvoList]);

  const handleOpenModal = () => {
    setPvoNumber(`PVO-${String(pvoList.length + 1).padStart(3, '0')}`);
    setTitle('');
    setDescription('');
    setEstimatedCostImpact('');
    setEstimatedTimeImpactDays('');
    setIdentifiedDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvoNumber.trim() || !title.trim()) return;

    if (onAddNewPvo) {
      onAddNewPvo({
        pvoNumber: pvoNumber.trim(),
        title: title.trim(),
        description: description.trim(),
        estimatedCostImpact: Math.max(0, Number(estimatedCostImpact) || 0),
        estimatedTimeImpactDays: Math.max(0, Number(estimatedTimeImpactDays) || 0),
        identifiedDate: identifiedDate || new Date().toISOString().slice(0, 10),
        status: 'Identified',
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Metric Cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Potential Exposure */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Total Potential Exposure</span>
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {currency}{totalPotentialExposure.toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Non-rejected claims & variations</p>
        </div>

        {/* Approved Claims Value */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">Approved Claims Value</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {currency}{approvedClaimsValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Formalized commercial revisions</p>
        </div>

        {/* Estimated Delay Exposure */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-rose-600" />
            <span className="text-xs font-semibold text-rose-800">Estimated Delay Exposure</span>
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-1">
            {estimatedDelayExposure} <span className="text-sm font-normal text-rose-700">days</span>
          </p>
          <p className="text-[11px] text-rose-700 mt-0.5">Potential schedule impact</p>
        </div>

        {/* Active Claims Count */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={16} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">Active Claims Count</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {activeClaimsCount}
          </p>
          <p className="text-[11px] text-blue-700 mt-0.5">Under evaluation / pending</p>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h4 className="text-sm font-semibold text-neutral-800">Potential Variation Orders & Claims Log</h4>
          <p className="text-xs text-neutral-500">Record scope deviations and early warning claims prior to contract amendment</p>
        </div>
        {onAddNewPvo && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>New Claim / PVO</span>
          </button>
        )}
      </div>

      {/* 3. Interactive Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-left">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">PVO #</th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Title & Scope</th>
              <th className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Identified Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Est. Cost</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">Est. Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Approved Cost</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              {onStatusChange && (
                <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">Quick Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {pvoList.length === 0 ? (
              <tr>
                <td colSpan={onStatusChange ? 8 : 7} className="py-8 text-center text-sm text-neutral-400">
                  No potential variation orders or claims recorded yet.
                </td>
              </tr>
            ) : (
              pvoList.map((pvo) => (
                <tr key={pvo.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-neutral-900">
                    {pvo.pvoNumber}
                  </td>
                  <td className="px-4 py-3.5 max-w-xs">
                    <p className="text-sm font-semibold text-neutral-800 leading-tight">{pvo.title}</p>
                    {pvo.description && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5" title={pvo.description}>
                        {pvo.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-neutral-600">
                    {pvo.identifiedDate}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-semibold text-neutral-900">
                    {currency}{pvo.estimatedCostImpact.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-medium text-neutral-700">
                    {pvo.estimatedTimeImpactDays} d
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-semibold text-emerald-700">
                    {pvo.approvedCostImpact !== undefined ? `${currency}${pvo.approvedCostImpact.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeColor(pvo.status)}`}>
                      {pvo.status}
                    </span>
                  </td>
                  {onStatusChange && (
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <select
                        aria-label={`Update status for ${pvo.pvoNumber}`}
                        value={pvo.status}
                        onChange={(e) => onStatusChange(pvo.id, e.target.value as PvoStatus)}
                        className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white text-neutral-700 hover:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Claim / PVO Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-pvo-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileSignature size={18} className="text-primary-600" />
                <h3 id="new-pvo-modal-title" className="text-base font-semibold text-neutral-900">
                  New Potential Variation Order (PVO)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pvo-number" className="block text-xs font-medium text-neutral-700 mb-1">
                    PVO Number *
                  </label>
                  <input
                    id="pvo-number"
                    type="text"
                    required
                    value={pvoNumber}
                    onChange={(e) => setPvoNumber(e.target.value)}
                    placeholder="e.g. PVO-005"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="pvo-date" className="block text-xs font-medium text-neutral-700 mb-1">
                    Identified Date *
                  </label>
                  <input
                    id="pvo-date"
                    type="date"
                    required
                    value={identifiedDate}
                    onChange={(e) => setIdentifiedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pvo-title" className="block text-xs font-medium text-neutral-700 mb-1">
                  Title / Reason *
                </label>
                <input
                  id="pvo-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Foundation Unforeseen Obstruction"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="pvo-desc" className="block text-xs font-medium text-neutral-700 mb-1">
                  Description & Impact Details
                </label>
                <textarea
                  id="pvo-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the condition, scope change, or contractual clause..."
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pvo-cost" className="block text-xs font-medium text-neutral-700 mb-1">
                    Estimated Cost Impact ({currency}) *
                  </label>
                  <input
                    id="pvo-cost"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={estimatedCostImpact}
                    onChange={(e) => setEstimatedCostImpact(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="pvo-days" className="block text-xs font-medium text-neutral-700 mb-1">
                    Estimated Delay (Days) *
                  </label>
                  <input
                    id="pvo-days"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={estimatedTimeImpactDays}
                    onChange={(e) => setEstimatedTimeImpactDays(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
                >
                  Save Claim / PVO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PvoRegisterTable;
