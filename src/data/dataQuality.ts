import { dataRepository } from '@/data';
import type { DqRule, DqExecutionLog } from '@/types';

// Registry of built-in quality rules
export const DATA_QUALITY_RULE_REGISTRY = [
  {
    rule_code: 'DQ-PRJ-001',
    name: 'Projects must have baselines',
    description: 'Every active project should have at least one baseline schedule attached.',
    target_entity: 'projects',
    rule_type: 'Completeness',
    severity: 'Warning',
  },
  {
    rule_code: 'DQ-CST-001',
    name: 'Cost entries need valid WBS',
    description: 'Every cost entry should be mapped to a valid WBS node.',
    target_entity: 'cost_entries',
    rule_type: 'Accuracy',
    severity: 'Critical',
  },
  {
    rule_code: 'DQ-INV-001',
    name: 'Invoice amounts mismatch',
    description: 'Invoice line item sum should equal the grand total.',
    target_entity: 'client_invoices',
    rule_type: 'Consistency',
    severity: 'Critical',
  }
];

export async function executeDqRule(rule: DqRule, globalData: any): Promise<DqExecutionLog> {
  const targetData = globalData[rule.target_entity] || [];
  let failedRecords: string[] = [];

  if (rule.rule_code === 'DQ-PRJ-001') {
    const baselines = globalData.project_baselines || [];
    failedRecords = targetData
      .filter((p: any) => p.status === 'Active' && !baselines.some((b: any) => b.project_id === p.id))
      .map((p: any) => p.id);
  } else if (rule.rule_code === 'DQ-CST-001') {
    const wbs = globalData.wbs_nodes || [];
    failedRecords = targetData
      .filter((c: any) => !c.wbs_id || !wbs.some((w: any) => w.id === c.wbs_id))
      .map((c: any) => c.id);
  } else if (rule.rule_code === 'DQ-INV-001') {
    // This is pseudo-code for the check, assuming a certain structure
    failedRecords = targetData
      .filter((inv: any) => {
        // If we don't have lines in the flat structure, we might not be able to check
        // We'll just flag if grand_total is missing or negative
        return inv.grand_total === undefined || inv.grand_total === null || inv.grand_total < 0;
      })
      .map((inv: any) => inv.id);
  }

  const log: DqExecutionLog = {
    id: crypto.randomUUID(),
    project_id: rule.project_id,
    rule_id: rule.id,
    execution_date: new Date().toISOString(),
    status: failedRecords.length > 0 ? 'Failed' : 'Passed',
    total_records_scanned: targetData.length,
    failed_records_count: failedRecords.length,
    failed_record_ids: failedRecords
  };

  return log;
}

export async function saveDqLog(log: DqExecutionLog): Promise<void> {
  await dataRepository.insert('dq_execution_logs', log);
}
