export interface XerTask {
  task_code: string;
  task_name: string;
  target_start_date: string;
  target_end_date: string;
  remain_drtn_hr_cnt: number;
  phys_complete_pct: number;
}

export interface XerPred {
  pred_task_code: string;
  succ_task_code: string;
  pred_type: 'PR_FS' | 'PR_SS' | 'PR_FF' | 'PR_SF';
  lag_hr_cnt: number;
}

export interface XerParseResult {
  success: boolean;
  version?: string;
  tasks: XerTask[];
  relationships: XerPred[];
  errors: string[];
}

export function parseXerFileContent(content: string): XerParseResult {
  const result: XerParseResult = {
    success: false,
    tasks: [],
    relationships: [],
    errors: []
  };

  if (!content || !content.trim()) {
    result.errors.push('XER file is empty');
    return result;
  }

  const lines = content.split(/\r?\n/);
  let currentTable = '';
  let currentFields: string[] = [];
  const taskIdToCodeMap = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    const recordType = parts[0];

    if (recordType === 'ERMHDR') {
      result.version = parts[1] || 'Primavera P6 Standard';
    } else if (recordType === '%T') {
      currentTable = parts[1] || '';
      currentFields = [];
    } else if (recordType === '%F') {
      currentFields = parts.slice(1);
    } else if (recordType === '%R') {
      const values = parts.slice(1);
      const row: Record<string, string> = {};
      currentFields.forEach((field, idx) => {
        row[field] = values[idx] || '';
      });

      if (currentTable === 'TASK') {
        const taskId = row['task_id'] || '';
        const taskCode = row['task_code'] || `T-${result.tasks.length + 1}`;
        if (taskId) {
          taskIdToCodeMap.set(taskId, taskCode);
        }

        const durationHrs = parseFloat(row['remain_drtn_hr_cnt'] || row['target_drtn_hr_cnt'] || '64');
        const completePct = parseFloat(row['phys_complete_pct'] || '0');

        result.tasks.push({
          task_code: taskCode,
          task_name: row['task_name'] || 'Untitled Activity',
          target_start_date: row['target_start_date'] ? row['target_start_date'].split(' ')[0] : '2026-05-01',
          target_end_date: row['target_end_date'] ? row['target_end_date'].split(' ')[0] : '2026-05-15',
          remain_drtn_hr_cnt: isNaN(durationHrs) ? 64 : durationHrs,
          phys_complete_pct: isNaN(completePct) ? 0 : completePct
        });
      } else if (currentTable === 'TASKPRED') {
        const predId = row['pred_task_id'] || '';
        const succId = row['task_id'] || '';
        const predCode = taskIdToCodeMap.get(predId) || predId || 'P-01';
        const succCode = taskIdToCodeMap.get(succId) || succId || 'P-02';

        let predType: 'PR_FS' | 'PR_SS' | 'PR_FF' | 'PR_SF' = 'PR_FS';
        const rawType = row['pred_type'] || 'PR_FS';
        if (rawType === 'PR_SS' || rawType === 'PR_FF' || rawType === 'PR_SF') {
          predType = rawType;
        }

        const lagHrs = parseFloat(row['lag_hr_cnt'] || '0');

        result.relationships.push({
          pred_task_code: predCode,
          succ_task_code: succCode,
          pred_type: predType,
          lag_hr_cnt: isNaN(lagHrs) ? 0 : lagHrs
        });
      }
    }
  }

  result.success = result.tasks.length > 0;
  return result;
}

export function generateCleanXer(tasks: XerTask[], preds: XerPred[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 10);

  lines.push(`ERMHDR\t8.4\t${now}\tUSER\tBuildTrack P6 Round-Trip Suite\tUSD`);
  lines.push('%T\tPROJECT');
  lines.push('%F\tproj_id\tproj_short_name\tproj_name');
  lines.push('%R\t1\tBT-2026\tBuildTrack Master Schedule');

  lines.push('%T\tTASK');
  lines.push('%F\ttask_id\tproj_id\ttask_code\ttask_name\ttarget_start_date\ttarget_end_date\tremain_drtn_hr_cnt\tphys_complete_pct');
  tasks.forEach((t, index) => {
    const taskId = (index + 1001).toString();
    lines.push(`%R\t${taskId}\t1\t${t.task_code}\t${t.task_name}\t${t.target_start_date} 08:00\t${t.target_end_date} 17:00\t${t.remain_drtn_hr_cnt}\t${t.phys_complete_pct}`);
  });

  lines.push('%T\tTASKPRED');
  lines.push('%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt');
  preds.forEach((p, index) => {
    lines.push(`%R\t${index + 5001}\t${p.succ_task_code}\t${p.pred_task_code}\t${p.pred_type}\t${p.lag_hr_cnt}`);
  });

  lines.push('%T\tCALENDAR');
  lines.push('%F\tclndr_id\tclndr_name');
  lines.push('%R\t1\tStandard 6-Day Site Calendar');
  lines.push('%E');
  return lines.join('\r\n');
}