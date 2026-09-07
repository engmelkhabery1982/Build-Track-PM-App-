import React, { useState, useMemo } from 'react';
import { Activity, ShieldAlert, Sliders, CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  HealthDimensionKey,
  HealthDimensionThreshold,
  HealthScoreResult,
} from '../types/index.ts';
import {
  DEFAULT_HEALTH_CONFIG,
  validateHealthConfig,
  calculateGovernedHealthScore,
  RawHealthInputs,
} from '../utils/governedHealthScore.ts';

interface GovernedHealthScoreCardProps {
  inputs: RawHealthInputs;
  customConfig?: HealthDimensionThreshold[];
  onConfigChange?: (newConfig: HealthDimensionThreshold[]) => void;
  dataDate?: string;
}

export const GovernedHealthScoreCard: React.FC<GovernedHealthScoreCardProps> = ({
  inputs,
  customConfig,
  onConfigChange,
  dataDate,
}) => {
  const [config, setConfig] = useState<HealthDimensionThreshold[]>(customConfig || DEFAULT_HEALTH_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [expandedDimension, setExpandedDimension] = useState<HealthDimensionKey | null>(null);

  const result: HealthScoreResult = useMemo(() => {
    return calculateGovernedHealthScore({ ...inputs, dataDate }, config);
  }, [inputs, config, dataDate]);

  const validation = useMemo(() => validateHealthConfig(config), [config]);

  const handleWeightChange = (dimension: HealthDimensionKey, newWeight: number) => {
    const updated = config.map(c => c.dimension === dimension ? { ...c, weight: newWeight } : c);
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const getStatusBadge = (status: HealthScoreResult['status']) => {
    switch (status) {
      case 'Green':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Green (Healthy)</span>;
      case 'Amber':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Amber (Warning)</span>;
      case 'Red':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><XCircle className="w-3.5 h-3.5 mr-1" /> Red (Critical)</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><Info className="w-3.5 h-3.5 mr-1" /> Unavailable</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Governed Project Health Score</h3>
            <p className="text-xs text-gray-500">
              Version: <span className="font-mono text-gray-700">{result.versionCode}</span> {dataDate ? `| Data Date: ${dataDate}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge(result.status)}
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>{isConfigOpen ? 'Close Thresholds Config' : 'Configure Weights & Thresholds'}</span>
          </button>
        </div>
      </div>

      {/* Missing Input Warning Banner */}
      {result.hasMissingCriticalInputs && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Data Quality Notice:</strong> One or more critical operational inputs are missing. Overall confidence is reduced ({result.overallConfidence}%) and status is capped below Green.
          </span>
        </div>
      )}

      {/* Threshold Configuration Panel */}
      {isConfigOpen && (
        <div className="p-5 bg-gray-50 border-b border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wider">Dimension Weights & Thresholds Matrix</h4>
            {!validation.isValid && (
              <span className="text-xs font-semibold text-red-600 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                {validation.errors[0]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.map((dim) => (
              <div key={dim.dimension} className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between items-center font-semibold text-gray-800">
                  <span>{dim.dimension}</span>
                  <span className="text-indigo-600">{dim.weight}% weight</span>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Weight Slider</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={dim.weight}
                    onChange={(e) => handleWeightChange(dim.dimension, Number(e.target.value))}
                    className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div>Warning: &lt; {dim.warningThreshold}</div>
                  <div>Critical: &lt; {dim.criticalThreshold}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Score & Dimension Grid */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  result.status === 'Green' ? 'text-green-500' :
                  result.status === 'Amber' ? 'text-amber-500' :
                  result.status === 'Red' ? 'text-red-500' : 'text-gray-400'
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
              <span className="text-2xl font-bold text-gray-900">{result.overallScore}</span>
              <span className="text-[10px] uppercase font-semibold text-gray-500">Score / 100</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Confidence: <span className="font-semibold text-gray-800">{result.overallConfidence}%</span>
          </div>
        </div>

        {/* 6 Dimensions Breakdown */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {result.dimensions.map((dim) => {
            const isExpanded = expandedDimension === dim.dimension;
            return (
              <div
                key={dim.dimension}
                onClick={() => setExpandedDimension(isExpanded ? null : dim.dimension)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  dim.status === 'Green' ? 'bg-green-50/50 border-green-200 hover:border-green-300' :
                  dim.status === 'Amber' ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' :
                  dim.status === 'Red' ? 'bg-red-50/50 border-red-200 hover:border-red-300' :
                  'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800">{dim.dimension}</span>
                  <span className="text-[10px] text-gray-500">{dim.weight}% weight</span>
                </div>

                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-gray-600 text-[11px]">
                    {dim.rawMetricValue !== null ? `${dim.rawMetricValue}` : 'No Data'}
                  </span>
                  <span className={`font-bold ${
                    dim.status === 'Green' ? 'text-green-700' :
                    dim.status === 'Amber' ? 'text-amber-700' :
                    dim.status === 'Red' ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {dim.score}/100
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200/60 text-[10px] text-gray-500 flex justify-between items-center">
                  <span>Contrib: +{dim.weightedScore} pts</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-600 space-y-1 bg-white/80 p-2 rounded">
                    <div><strong>Metric:</strong> {dim.metricName}</div>
                    <div><strong>Source:</strong> {dim.source}</div>
                    <div><strong>Confidence:</strong> {dim.confidence}%</div>
                    {dim.exclusions && (
                      <div className="text-red-600"><strong>Note:</strong> {dim.exclusions.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GovernedHealthScoreCard;
