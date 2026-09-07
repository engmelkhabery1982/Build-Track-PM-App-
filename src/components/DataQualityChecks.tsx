import { useState } from 'react';
import { ShieldAlert, Play, CheckCircle2, AlertTriangle, Info, Shield, RefreshCw } from 'lucide-react';
import { useProjectDataDate } from '@/context/ProjectDataDateContext';
import type { DqRule, DqExecutionLog } from '@/types';
import { executeDqRule, saveDqLog, DATA_QUALITY_RULE_REGISTRY } from '@/data/dataQuality';
import { dataRepository } from '@/data';

export function DataQualityChecks({ 
  rules, 
  logs, 
  globalData,
  onMutated 
}: { 
  rules: DqRule[]; 
  logs: DqExecutionLog[]; 
  globalData: any;
  onMutated: (collection: string, mutation: any) => void 
}) {
  const { projectId } = useProjectDataDate();
  const [runningRule, setRunningRule] = useState<string | null>(null);

  const projectRules = rules.filter(r => !r.project_id || r.project_id === projectId);
  
  async function seedRules() {
    for (const def of DATA_QUALITY_RULE_REGISTRY) {
      if (!projectRules.some(r => r.rule_code === def.rule_code)) {
        const newRule: DqRule = {
          id: crypto.randomUUID(),
          project_id: projectId,
          rule_code: def.rule_code,
          name: def.name,
          description: def.description,
          target_entity: def.target_entity,
          rule_type: def.rule_type as any,
          severity: def.severity as any,
          status: 'Active',
          conditions: {}
        };
        await dataRepository.insert('dq_rules', newRule);
        onMutated('dq_rules', { type: 'insert', row: newRule });
      }
    }
  }

  async function runRule(rule: DqRule) {
    setRunningRule(rule.id);
    try {
      const log = await executeDqRule(rule, globalData);
      await saveDqLog(log, dataRepository);
      onMutated('dq_execution_logs', { type: 'insert', row: log });
    } catch (e: any) {
      alert("Error executing rule: " + e.message);
    } finally {
      setRunningRule(null);
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'Critical': return <ShieldAlert className="text-red-500" size={16} />;
      case 'Warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'Info': return <Info className="text-blue-500" size={16} />;
      default: return <Shield className="text-neutral-500" size={16} />;
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Data Quality Checks</h1>
            <p className="text-sm text-neutral-500">Define rules and monitor data health.</p>
          </div>
          <button onClick={seedRules} className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">
            <RefreshCw size={16} /> Load Built-in Rules
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {projectRules.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
                <ShieldAlert className="mx-auto mb-3 text-neutral-300" size={48} />
                <h3 className="font-semibold text-neutral-800">No Quality Rules Configured</h3>
                <p className="mt-1 text-sm text-neutral-500">Click "Load Built-in Rules" to get started.</p>
              </div>
            ) : (
              projectRules.map(rule => {
                const ruleLogs = logs.filter(l => l.rule_id === rule.id).sort((a, b) => b.execution_date.localeCompare(a.execution_date));
                const latestLog = ruleLogs[0];
                const isRunning = runningRule === rule.id;
                
                return (
                  <div key={rule.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getSeverityIcon(rule.severity)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-neutral-900">{rule.name}</h3>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase text-neutral-600 border border-neutral-200">
                              {rule.rule_code}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-neutral-600">{rule.description}</p>
                          <div className="mt-2 flex gap-3 text-xs text-neutral-500">
                            <span>Type: {rule.rule_type}</span>
                            <span>Target: {rule.target_entity}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => runRule(rule)} 
                        disabled={isRunning}
                        className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                      >
                        {isRunning ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                        Run Check
                      </button>
                    </div>

                    {latestLog && (
                      <div className={`mt-4 rounded-xl border p-3 text-sm ${latestLog.status === 'Passed' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium">
                            {latestLog.status === 'Passed' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            {latestLog.status === 'Passed' ? 'Check Passed' : `${latestLog.failed_records_count} Issue(s) Found`}
                          </div>
                          <div className="text-xs opacity-75">
                            Last run: {new Date(latestLog.execution_date).toLocaleString()}
                          </div>
                        </div>
                        {latestLog.status !== 'Passed' && (
                          <div className="mt-2 text-xs opacity-80">
                            Out of {latestLog.total_records_scanned} records scanned, {latestLog.failed_records_count} failed the condition.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-neutral-900">Execution History</h3>
              <div className="space-y-3">
                {logs.slice(0, 10).map(log => {
                  const rule = rules.find(r => r.id === log.rule_id);
                  return (
                    <div key={log.id} className="flex items-start justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="text-xs font-medium text-neutral-800">{rule?.name || 'Unknown Rule'}</div>
                        <div className="text-[10px] text-neutral-500">{new Date(log.execution_date).toLocaleString()}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${log.status === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
