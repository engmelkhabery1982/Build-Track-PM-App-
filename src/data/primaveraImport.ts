/**
 * Parses the P6 XER tables used by the governed schedule-import workflow.
 * The importer deliberately retains both the P6 source activity ID and the
 * unique local activity ID because P6 allows duplicate visible task codes.
 */
export function parsePrimaveraXerTasks(content: string): Record<string, any>[] {
  const tables = new Map<string, Record<string, string>[]>();
  let table = '';
  let fields: string[] = [];
  for (const line of content.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')) {
    if (!line) continue;
    const cells = line.split('\t');
    if (cells[0] === '%T') { table = cells[1] || ''; fields = []; if (!tables.has(table)) tables.set(table, []); continue; }
    if (cells[0] === '%F') { fields = cells.slice(1); continue; }
    if (cells[0] === '%R' && table && fields.length) tables.get(table)?.push(Object.fromEntries(fields.map((field, index) => [field, cells[index + 1] ?? ''])));
  }
  const calendars = new Map((tables.get('CALENDAR') || []).map((row) => [row.clndr_id, row.clndr_name || row.clndr_id]));
  const wbsRows = tables.get('PROJWBS') || tables.get('WBS') || [];
  const wbsById = new Map(wbsRows.map((row) => [row.wbs_id, {
    code: row.wbs_short_name || row.wbs_code || row.wbs_id || '',
    name: row.wbs_name || row.wbs_short_name || row.wbs_id || '',
    parentId: row.parent_wbs_id || '',
  }]));
  const wbsFor = (id: string) => wbsById.get(id) || { code: id || '', name: id || '', parentId: '' };
  const tasks = tables.get('TASK') || [];
  const codeCount = new Map<string, number>();
  tasks.forEach((task) => codeCount.set(task.task_code || '', (codeCount.get(task.task_code || '') || 0) + 1));
  const uniqueTaskCode = (task: Record<string, string>) => {
    const source = task.task_code || 'ACT';
    return (codeCount.get(source) || 0) > 1 ? `${source}-P6-${task.task_id}` : source;
  };
  const taskCodeById = new Map(tasks.map((task) => [task.task_id, uniqueTaskCode(task)]));
  const predecessorsByTask = new Map<string, Record<string, string>[]>();
  const constraintName = (value: string) => ({
    CS_SNET: 'Start No Earlier Than', CS_FNLT: 'Finish No Later Than',
    CS_MSO: 'Mandatory Start', CS_MFO: 'Mandatory Finish',
  }[String(value || '').toUpperCase()] || 'None');
  for (const link of tables.get('TASKPRED') || []) predecessorsByTask.set(link.task_id, [...(predecessorsByTask.get(link.task_id) || []), link]);
  return tasks.map((task) => {
    const wbs = wbsFor(task.wbs_id || '');
    const parentWbs = wbsFor(wbs.parentId);
    const links = predecessorsByTask.get(task.task_id) || [];
    const predecessorCodes = links.map((link) => taskCodeById.get(link.pred_task_id)).filter(Boolean) as string[];
    const first = links[0];
    const relation = String(first?.pred_type || 'PR_FS').replace(/^PR_/, '') || 'FS';
    const lagHours = Number(first?.lag_hr_cnt) || 0;
    return {
      'Activity ID': uniqueTaskCode(task),
      'Source Activity ID': task.task_code || '',
      'Activity Name': task.task_name || '',
      WBS: wbs.code,
      'WBS Name': wbs.name,
      'WBS Parent': wbs.parentId ? parentWbs.code : '',
      Start: String(task.act_start_date || task.target_start_date || task.early_start_date || '').slice(0, 10),
      Finish: String(task.act_end_date || task.target_end_date || task.early_end_date || '').slice(0, 10),
      'Original Duration': task.target_drtn || task.remain_drtn || '',
      'Constraint Type': constraintName(task.cstr_type || task.primary_cstr_type || ''),
      'Constraint Date': String(task.cstr_date || task.primary_cstr_date || '').slice(0, 10),
      Milestone: /mile/i.test(String(task.task_type || task.activity_type || '')),
      'Planned Qty': '',
      Calendar: calendars.get(task.clndr_id) || task.clndr_id || '',
      Predecessors: predecessorCodes.join(', '),
      // P6 supports multiple independent links for one successor. Preserve
      // each relationship type and lag rather than collapsing to the first.
      'Predecessor Links': JSON.stringify(links.map((link) => ({
        predecessor_code: taskCodeById.get(link.pred_task_id) || '',
        relationship_type: String(link.pred_type || 'PR_FS').replace(/^PR_/, '') || 'FS',
        lag_days: Number(link.lag_hr_cnt) ? Math.round((Number(link.lag_hr_cnt) / 8) * 100) / 100 : 0,
      })).filter((link) => link.predecessor_code)),
      Relationship: relation,
      'Lag (days)': lagHours ? Math.round((lagHours / 8) * 100) / 100 : 0,
      Critical: task.driving_path_flag === 'Y' || task.critical_path_flag === 'Y',
      Notes: task.task_descr || '',
    };
  }).filter((row) => row['Activity ID'] && row['Activity Name']);
}
