import React, { useMemo, useRef, useState } from 'react';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, GitFork, ShieldCheck } from 'lucide-react';
import { generateCleanXer, parseXerFileContent, type XerPred, type XerTask } from '../utils/xerEngine';

type Row = Record<string, any>;
type ActivityStatus = 'synced' | 'duration_discrepancy' | 'date_drift' | 'new_in_p6' | 'missing_in_p6';
export interface XerActivityReconcile { activityId: string; taskName: string; p6Duration: number; localDuration: number; p6StartDate: string; localStartDate: string; p6FinishDate: string; localFinishDate: string; status: ActivityStatus; }
export interface XerRelationship { predId: string; succId: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lagDays: number; status: 'matched' | 'mismatched' | 'missing_in_p6' | 'missing_in_local'; }
export interface XerReconciliationProps { dataDate?: string; localActivities?: Row[]; }

const codeOf = (row: Row) => String(row.activity_code || row.id || '').trim();
const durationOf = (row: Row) => Math.max(0, Number(row.remaining_duration_days ?? row.remaining_duration ?? row.duration_days ?? row.duration ?? 0) || 0);
const relationType = (value: unknown): 'FS' | 'SS' | 'FF' | 'SF' => {
  const type = String(value || 'FS').replace('PR_', '').toUpperCase();
  return ['FS', 'SS', 'FF', 'SF'].includes(type) ? type as 'FS' | 'SS' | 'FF' | 'SF' : 'FS';
};
const localLinks = (rows: Row[]): XerRelationship[] => {
  const codeById = new Map(rows.map((row): [string, string] => [String(row.id || ''), codeOf(row)]));
  return rows.flatMap((row) => {
  let links: Row[] = [];
  if (Array.isArray(row.predecessor_links)) links = row.predecessor_links;
  else if (typeof row.predecessor_links === 'string' && row.predecessor_links.trim()) { try { const parsed = JSON.parse(row.predecessor_links); if (Array.isArray(parsed)) links = parsed; } catch { /* legacy link below */ } }
  if (!links.length && row.predecessor_item) links = [{ predecessor_id: row.predecessor_item, relationship_type: row.relationship_type, lag_days: row.lag_days }];
    return links.map((link) => {
      const predecessorReference = String(link.predecessor_code || link.predecessor_id || link.id || '').trim();
      return { predId: codeById.get(predecessorReference) || predecessorReference, succId: codeOf(row), type: relationType(link.relationship_type || link.type), lagDays: Number(link.lag_days ?? link.lag ?? 0) || 0, status: 'missing_in_p6' as const };
    }).filter((link) => link.predId && link.succId);
  });
};
const relKey = (row: Pick<XerRelationship, 'predId' | 'succId' | 'type'>) => `${row.predId}|${row.succId}|${row.type}`;

export const XerReconciliationBoard: React.FC<XerReconciliationProps> = ({ dataDate = new Date().toISOString().slice(0, 10), localActivities = [] }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'relationships'>('activities');
  const [currentFile, setCurrentFile] = useState('No XER selected');
  const [activityList, setActivityList] = useState<XerActivityReconcile[]>([]);
  const [relationList, setRelationList] = useState<XerRelationship[]>([]);
  const [auditMessage, setAuditMessage] = useState('Read-only comparison. Use the governed Schedule import to persist approved changes.');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localByCode = useMemo(() => new Map<string, Row>(localActivities.map((row): [string, Row] => [codeOf(row), row]).filter(([code]) => Boolean(code))), [localActivities]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); setCurrentFile(file.name);
    reader.onload = (loadEvent) => {
      const parsed = parseXerFileContent(String(loadEvent.target?.result || ''));
      if (!parsed.success) { setAuditMessage(`Could not parse ${file.name}.`); setActivityList([]); setRelationList([]); return; }
      const p6Codes = new Set(parsed.tasks.map((task) => task.task_code));
      const compared: XerActivityReconcile[] = parsed.tasks.map((task) => {
        const local = localByCode.get(task.task_code); const p6Duration = Math.max(0, Math.round((Number(task.remain_drtn_hr_cnt) || 0) / 8));
        const localStart = String(local?.start_date || '—'); const localFinish = String(local?.end_date || '—'); const localDuration = local ? durationOf(local) : 0;
        let status: ActivityStatus = 'new_in_p6';
        if (local) status = localStart !== task.target_start_date || localFinish !== task.target_end_date ? 'date_drift' : localDuration !== p6Duration ? 'duration_discrepancy' : 'synced';
        return { activityId: task.task_code, taskName: task.task_name, p6Duration, localDuration, p6StartDate: task.target_start_date, localStartDate: localStart, p6FinishDate: task.target_end_date, localFinishDate: localFinish, status };
      });
      localActivities.filter((row) => !p6Codes.has(codeOf(row))).forEach((row) => compared.push({ activityId: codeOf(row), taskName: String(row.activity || codeOf(row)), p6Duration: 0, localDuration: durationOf(row), p6StartDate: '—', localStartDate: String(row.start_date || '—'), p6FinishDate: '—', localFinishDate: String(row.end_date || '—'), status: 'missing_in_p6' }));
      const localRels = localLinks(localActivities); const localRelMap = new Map(localRels.map((row) => [relKey(row), row])); const seen = new Set<string>();
      const comparedRels: XerRelationship[] = parsed.relationships.map((row) => { const candidate = { predId: row.pred_task_code, succId: row.succ_task_code, type: relationType(row.pred_type), lagDays: Math.round((Number(row.lag_hr_cnt) || 0) / 8) }; const key = relKey(candidate); seen.add(key); const local = localRelMap.get(key); return { ...candidate, status: !local ? 'missing_in_local' : local.lagDays === candidate.lagDays ? 'matched' : 'mismatched' }; });
      localRels.filter((row) => !seen.has(relKey(row))).forEach((row) => comparedRels.push({ ...row, status: 'missing_in_p6' }));
      setActivityList(compared); setRelationList(comparedRels); setAuditMessage(`Compared ${parsed.tasks.length} P6 activities and ${parsed.relationships.length} P6 relationships with ${localActivities.length} local activities at ${dataDate}. No database records were changed.`);
    };
    reader.readAsText(file);
  };

  const handleExportXer = () => {
    if (!activityList.length) return;
    const tasks: XerTask[] = activityList.filter((row) => row.status !== 'missing_in_p6').map((row) => ({ task_code: row.activityId, task_name: row.taskName, target_start_date: row.p6StartDate, target_end_date: row.p6FinishDate, remain_drtn_hr_cnt: row.p6Duration * 8, phys_complete_pct: 0 }));
    const preds: XerPred[] = relationList.filter((row) => row.status !== 'missing_in_p6').map((row) => ({ pred_task_code: row.predId, succ_task_code: row.succId, pred_type: `PR_${row.type}` as XerPred['pred_type'], lag_hr_cnt: row.lagDays * 8 }));
    const url = URL.createObjectURL(new Blob([generateCleanXer(tasks, preds)], { type: 'text/plain;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `reviewed_${currentFile}`; anchor.click(); URL.revokeObjectURL(url);
  };
  const synced = activityList.filter((row) => row.status === 'synced').length; const activityIssues = activityList.length - synced; const logicIssues = relationList.filter((row) => row.status !== 'matched').length;
  return <div className="space-y-4" id="xer-reconciliation-board">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3"><div><h3 className="text-base font-bold text-neutral-900">Governed Primavera XER reconciliation</h3><p className="text-xs text-neutral-500">Evidence-based, read-only comparison against the selected local schedule.</p></div><div className="flex gap-2"><input ref={fileInputRef} type="file" accept=".xer,.txt" onChange={handleFileUpload} className="hidden"/><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"><Upload className="h-3.5 w-3.5"/>Compare XER</button><button disabled={!activityList.length} onClick={handleExportXer} className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"><Download className="h-3.5 w-3.5"/>Export reviewed XER</button></div></div>
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900"><ShieldCheck className="h-4 w-4"/><span>{auditMessage}</span></div>
    <div className="grid grid-cols-3 gap-3"><div className="rounded-xl border bg-neutral-50 p-3"><FileText className="h-4 w-4"/><p className="mt-1 text-lg font-bold">{activityList.length}</p><p className="text-xs text-neutral-500">{currentFile}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><CheckCircle2 className="h-4 w-4 text-emerald-600"/><p className="mt-1 text-lg font-bold">{synced}</p><p className="text-xs">Activities matched</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><AlertTriangle className="h-4 w-4 text-amber-600"/><p className="mt-1 text-lg font-bold">{activityIssues + logicIssues}</p><p className="text-xs">Evidence differences</p></div></div>
    <div className="flex gap-2"><button onClick={() => setActiveTab('activities')} className={`rounded px-3 py-1 text-xs font-semibold ${activeTab === 'activities' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}>Activities ({activityList.length})</button><button onClick={() => setActiveTab('relationships')} className={`rounded px-3 py-1 text-xs font-semibold ${activeTab === 'relationships' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}><GitFork className="mr-1 inline h-3 w-3"/>Relationships ({relationList.length})</button></div>
    <div className="max-h-96 overflow-auto rounded-xl border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-neutral-50"><tr>{activeTab === 'activities' ? <><th className="p-3">Activity</th><th className="p-3">P6 duration/dates</th><th className="p-3">Local duration/dates</th><th className="p-3">Status</th></> : <><th className="p-3">Predecessor</th><th className="p-3">Type / lag</th><th className="p-3">Successor</th><th className="p-3">Status</th></>}</tr></thead><tbody className="divide-y">{activeTab === 'activities' ? activityList.map((row) => <tr key={row.activityId}><td className="p-3"><b>{row.activityId}</b><br/>{row.taskName}</td><td className="p-3">{row.p6Duration}d<br/>{row.p6StartDate} → {row.p6FinishDate}</td><td className="p-3">{row.localDuration || '—'}{row.localDuration ? 'd' : ''}<br/>{row.localStartDate} → {row.localFinishDate}</td><td className="p-3 font-semibold">{row.status.replace(/_/g, ' ')}</td></tr>) : relationList.map((row, index) => <tr key={`${relKey(row)}-${index}`}><td className="p-3 font-mono">{row.predId}</td><td className="p-3">{row.type} / {row.lagDays}d</td><td className="p-3 font-mono">{row.succId}</td><td className="p-3 font-semibold">{row.status.replace(/_/g, ' ')}</td></tr>)}</tbody></table>{!activityList.length && activeTab === 'activities' && <p className="p-8 text-center text-xs text-neutral-500">Choose an XER file to compare it with the current local schedule.</p>}</div>
  </div>;
};

export default XerReconciliationBoard;
