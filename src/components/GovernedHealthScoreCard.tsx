import React, { useState } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Database,
  Layers,
} from 'lucide-react';
import type {
  HealthScoreResult,
  HealthScoreVersion,
  GovernedHealthScoreConfig,
  HealthDimensionContribution,
} from '../types/index.ts';
import {
  calculateGovernedHealthScore,
  configFromVersion,
  resultFromVersion,
  RawHealthInputs,
} from '../utils/governedHealthScore';
import { HealthScoreConfigModal } from './HealthScoreConfigModal';

interface GovernedHealthScoreCardProps {
  inputs: RawHealthInputs;
  approvedVersion?: HealthScoreVersion | null;
  customConfig?: GovernedHealthScoreConfig | null;
  projectId?: string;
  projectName?: string;
  dataDate?: string;
  onVersionUpdated?: (version: HealthScoreVersion) => void;
}

export const GovernedHealthScoreCard: React.FC<GovernedHealthScoreCardProps> = ({
  inputs,
  approvedVersion,
  customConfig,
  projectId = 'default',
  projectName = 'Active Project',
  dataDate,
  onVersionUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  // Derive effective config and result snapshot
  const activeConfig = customConfig || (approvedVersion ? configFromVersion(approvedVersion) : null);
  const isApproved = Boolean(approvedVersion && approvedVersion.status === 'Approved') || Boolean(customConfig);

  const snapshotResult = resultFromVersion(approvedVersion, dataDate);
  const result: HealthScoreResult = snapshotResult || calculateGovernedHealthScore(
    { ...inputs, dataDate },
    activeConfig,
    isApproved
  );

  const getStatusBadge = (status: HealthScoreResult['status']) => {
    switch (status) {
      case 'Green':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-emerald-600" /> Green (Healthy)
          </span>
        );
      case 'Amber':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-amber-600" /> Amber (Warning)
          </span>
        );
      case 'Red':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-rose-600" /> Red (Critical)
          </span>
        );
      case 'Requires setup':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Sliders className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-indigo-600" /> Requires setup
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3.5 h-3.5 mr-1 rtl:ml-1 rtl:mr-0 text-slate-500" /> Unavailable
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <h3 className="font-bold text-slate-900 text-base">Governed Project Health Score</h3>
              {approvedVersion?.status === 'Approved' && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> Governed Authority
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Version: <span className="font-mono font-semibold text-slate-700">{approvedVersion?.version_code || result.versionCode || 'None (Requires Setup)'}</span>
              {dataDate ? ` | Data Date: ${dataDate}` : ''}
              {approvedVersion?.approved_by ? ` | Approver: ${approvedVersion.approved_by}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {getStatusBadge(result.status)}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>Manage Thresholds & Approvals</span>
          </button>
        </div>
      </div>

      {/* Unapproved Setup Notice */}
      {!isApproved && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Governance Requirement:</strong> No approved threshold configuration exists for this project. Save and approve a project baseline to activate live score scoring.
            </span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shrink-0 shadow-sm"
          >
            Configure Now
          </button>
        </div>
      )}

      {/* Main Score & Dimension Grid */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  result.status === 'Green' ? 'text-emerald-500' :
                  result.status === 'Amber' ? 'text-amber-500' :
                  result.status === 'Red' ? 'text-rose-500' : 'text-slate-400'
                }
                strokeDasharray={`${result.overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{isApproved ? result.overallScore : '--'}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Score / 100</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Confidence: <span className="font-bold text-slate-800">{result.confidence}%</span>
          </div>
        </div>

        {/* 6 Dimensions Breakdown */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {result.dimensions.length === 0 ? (
            <div className="col-span-3 p-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Dimension scores will appear here once an approved configuration is loaded.
            </div>
          ) : (
            result.dimensions.map((dim: HealthDimensionContribution) => {
              const isExpanded = expandedDimension === dim.dimension;
              return (
                <div
                  key={dim.dimension}
                  onClick={() => setExpandedDimension(isExpanded ? null : dim.dimension)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    dim.status === 'Green' ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300' :
                    dim.status === 'Amber' ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300' :
                    dim.status === 'Red' ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300' :
                    'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">{dim.dimension}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{dim.weight}% weight</span>
                  </div>

                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-slate-600 text-[11px] font-mono">
                      {dim.rawValue !== null ? (typeof dim.rawValue === 'number' && Math.abs(dim.rawValue) >= 1000 ? `$${dim.rawValue.toLocaleString()}` : `${dim.rawValue}`) : 'Unavailable'}
                    </span>
                    <span className={`font-black ${
                      dim.status === 'Green' ? 'text-emerald-700' :
                      dim.status === 'Amber' ? 'text-amber-700' :
                      dim.status === 'Red' ? 'text-rose-700' : 'text-slate-500'
                    }`}>
                      {dim.status === 'Unavailable' ? '--' : `${dim.score}/100`}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 text-[10px] text-slate-500 flex justify-between items-center">
                    <span>Contrib: +{dim.weightedScore} pts</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600 space-y-1.5 bg-white/90 p-2.5 rounded border border-slate-200">
                      <div><strong>Metric:</strong> {dim.metricName}</div>
                      <div><strong>Source:</strong> {dim.source}</div>
                      <div><strong>Freshness:</strong> <span className="font-semibold text-slate-800">{dim.freshnessStatus}</span></div>
                      <div><strong>Records:</strong> {dim.sourceRecordIds?.length || 0} linked</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <HealthScoreConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        currentApprovedVersion={approvedVersion}
        onVersionUpdated={onVersionUpdated}
        dataDate={dataDate}
      />
    </div>
  );
};

export default GovernedHealthScoreCard;
