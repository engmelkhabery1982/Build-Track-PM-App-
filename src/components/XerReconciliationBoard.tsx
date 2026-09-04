import React, { useState } from 'react';

export interface XerRelationship {
  predId: string;
  succId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
  status: 'matched' | 'mismatched' | 'missing_in_p6' | 'missing_in_local';
}

export interface XerActivityReconcile {
  activityId: string;
  taskName: string;
  p6Duration: number;
  localDuration: number;
  p6StartDate: string;
  localStartDate: string;
  p6FinishDate: string;
  localFinishDate: string;
  status: 'synced' | 'duration_discrepancy' | 'date_drift' | 'new_in_p6';
}

export interface XerReconciliationProps {
  fileName?: string;
  dataDate?: string;
  activities?: XerActivityReconcile[];
  relationships?: XerRelationship[];
}

const DEFAULT_ACTIVITIES: XerActivityReconcile[] = [
  {
    activityId: 'A1000',
    taskName: 'Site Mobilization & Setup',
    p6Duration: 10,
    localDuration: 10,
    p6StartDate: '2026-09-01',
    localStartDate: '2026-09-01',
    p6FinishDate: '2026-09-12',
    localFinishDate: '2026-09-12',
    status: 'synced',
  },
  {
    activityId: 'A1010',
    taskName: 'Substructure Excavation',
    p6Duration: 15,
    localDuration: 15,
    p6StartDate: '2026-09-15',
    localStartDate: '2026-09-15',
    p6FinishDate: '2026-10-02',
    localFinishDate: '2026-10-02',
    status: 'synced',
  },
  {
    activityId: 'A1020',
    taskName: 'Concrete Substructure & Foundations',
    p6Duration: 25,
    localDuration: 25,
    p6StartDate: '2026-10-07',
    localStartDate: '2026-10-05',
    p6FinishDate: '2026-11-06',
    localFinishDate: '2026-11-04',
    status: 'date_drift',
  },
  {
    activityId: 'A1030',
    taskName: 'MEP Rough-In & Services In-Ground',
    p6Duration: 45,
    localDuration: 40,
    p6StartDate: '2026-11-09',
    localStartDate: '2026-11-09',
    p6FinishDate: '2027-01-08',
    localFinishDate: '2026-12-30',
    status: 'duration_discrepancy',
  },
  {
    activityId: 'A1040',
    taskName: 'Superstructure Structural Steel',
    p6Duration: 30,
    localDuration: 30,
    p6StartDate: '2026-11-10',
    localStartDate: '2026-11-10',
    p6FinishDate: '2026-12-21',
    localFinishDate: '2026-12-21',
    status: 'synced',
  },
  {
    activityId: 'A1050',
    taskName: 'Façade Cladding Installation',
    p6Duration: 20,
    localDuration: 0,
    p6StartDate: '2026-12-22',
    localStartDate: '-',
    p6FinishDate: '2027-01-20',
    localFinishDate: '-',
    status: 'new_in_p6',
  },
];

const DEFAULT_RELATIONSHIPS: XerRelationship[] = [
  {
    predId: 'A1000',
    succId: 'A1010',
    type: 'FS',
    lagDays: 0,
    status: 'matched',
  },
  {
    predId: 'A1010',
    succId: 'A1020',
    type: 'FS',
    lagDays: 3,
    status: 'mismatched',
  },
  {
    predId: 'A1020',
    succId: 'A1030',
    type: 'SS',
    lagDays: 5,
    status: 'matched',
  },
  {
    predId: 'A1020',
    succId: 'A1040',
    type: 'FS',
    lagDays: 0,
    status: 'matched',
  },
  {
    predId: 'A1040',
    succId: 'A1050',
    type: 'FS',
    lagDays: 0,
    status: 'missing_in_local',
  },
];

export const XerReconciliationBoard: React.FC<XerReconciliationProps> = ({
  fileName = 'PROJECT_BASELINE_REV3.XER',
  dataDate = '2026-09-01',
  activities = DEFAULT_ACTIVITIES,
  relationships = DEFAULT_RELATIONSHIPS,
}) => {
  const activeActivities = activities.length > 0 ? activities : DEFAULT_ACTIVITIES;
  const activeRelationships = relationships.length > 0 ? relationships : DEFAULT_RELATIONSHIPS;

  const [activeTab, setActiveTab] = useState<'activities' | 'relationships'>('activities');
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const totalScanned = activeActivities.length;
  const syncedCount = activeActivities.filter((a) => a.status === 'synced').length;
  const varianceCount = activeActivities.filter(
    (a) => a.status === 'date_drift' || a.status === 'duration_discrepancy' || a.status === 'new_in_p6'
  ).length;
  const logicDiscrepancies = activeRelationships.filter((r) => r.status !== 'matched').length;

  const handleRunAudit = () => {
    setAuditMessage(`Audit complete: Scanned ${totalScanned} activities and ${activeRelationships.length} relationships. Found ${varianceCount} activity variances and ${logicDiscrepancies} logic discrepancies.`);
  };

  const handleAcceptRevisions = () => {
    setAuditMessage('P6 revisions accepted and synced with local dataset.');
  };

  const handleExportCleanXer = () => {
    setAuditMessage(`Exported clean XER file: RECONCILED_${fileName}`);
  };

  const getActivityStatusBadge = (status: XerActivityReconcile['status']) => {
    switch (status) {
      case 'synced':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Synced</span>;
      case 'date_drift':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Date Drift</span>;
      case 'duration_discrepancy':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Duration Discrepancy</span>;
      case 'new_in_p6':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">New in P6</span>;
    }
  };

  const getRelationshipStatusBadge = (status: XerRelationship['status']) => {
    switch (status) {
      case 'matched':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Matched</span>;
      case 'mismatched':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-100 text-rose-800">Lag Mismatch</span>;
      case 'missing_in_p6':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-100 text-rose-800">Missing in P6</span>;
      case 'missing_in_local':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-100 text-rose-800">Missing in Local</span>;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Primavera P6 Reconciliation & Round-Trip (SCH-06)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            XER Logic Audit: Relationship Checks (FS/SS/FF/SF), Lags & Calendar Matching
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
            <span>File: <strong className="text-slate-700">{fileName}</strong></span>
            <span>Data Date: <strong className="text-slate-700">{dataDate}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRunAudit}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Run Discrepancy Audit
          </button>
          <button
            onClick={handleAcceptRevisions}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
          >
            Accept P6 Revisions
          </button>
          <button
            onClick={handleExportCleanXer}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
          >
            Export Clean XER
          </button>
        </div>
      </div>

      {auditMessage && (
        <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
          {auditMessage}
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total P6 Activities Scanned</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalScanned}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Synchronized Activities</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{syncedCount}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Variance / Drift Count</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{varianceCount}</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Logic & Relationship Discrepancies</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{logicDiscrepancies}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activities'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Activity Comparison Table
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'relationships'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Relationship Logic Matrix
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Activity ID</th>
                <th className="px-4 py-3">Task Name</th>
                <th className="px-4 py-3">P6 / Local Dur (d)</th>
                <th className="px-4 py-3">P6 Start / Finish</th>
                <th className="px-4 py-3">Local Start / Finish</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeActivities.map((act) => (
                <tr key={act.activityId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{act.activityId}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{act.taskName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className={act.p6Duration !== act.localDuration ? 'text-amber-600 font-semibold' : ''}>
                      {act.p6Duration}d
                    </span>{' '}
                    / {act.localDuration}d
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{act.p6StartDate}</div>
                    <div className="text-xs text-slate-400">{act.p6FinishDate}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{act.localStartDate}</div>
                    <div className="text-xs text-slate-400">{act.localFinishDate}</div>
                  </td>
                  <td className="px-4 py-3">{getActivityStatusBadge(act.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'relationships' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Predecessor ID</th>
                <th className="px-4 py-3">Successor ID</th>
                <th className="px-4 py-3">Relationship Type</th>
                <th className="px-4 py-3">Lag (Days)</th>
                <th className="px-4 py-3">Reconciliation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeRelationships.map((rel, idx) => (
                <tr key={`${rel.predId}-${rel.succId}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{rel.predId}</td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{rel.succId}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {rel.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{rel.lagDays}d</td>
                  <td className="px-4 py-3">{getRelationshipStatusBadge(rel.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default XerReconciliationBoard;
