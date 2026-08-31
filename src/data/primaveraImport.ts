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
  const calendarRows = new Map((tables.get('CALENDAR') || []).map((row) => [row.clndr_id, row]));
  const excelDate = (value: string) => {
    const serial = Number(value);
    if (!Number.isFinite(serial)) return '';
    const date = new Date(Date.UTC(1899, 11, 30));
    date.setUTCDate(date.getUTCDate() + Math.floor(serial));
    return date.toISOString().slice(0, 10);
  };
  const calendarFor = (id: string, seen = new Set<string>()): { name: string; pattern: string; workingDays: number[]; exceptions: string[]; dayHours: number } => {
    const row = calendarRows.get(id);
    if (!row || seen.has(id)) return { name: id || '', pattern: '', workingDays: [], exceptions: [], dayHours: 8 };
    const inherited = row.base_clndr_id ? calendarFor(row.base_clndr_id, new Set([...seen, id])) : { name: '', pattern: '', workingDays: [], exceptions: [], dayHours: 8 };
    const data = String(row.clndr_data || '');
    const workingDays = Array.from({ length: 7 }, (_, index) => index + 1)
      .filter((p6Day) => new RegExp(`\\|${p6Day}\\(\\)\\(\\(\\d+\\|\\|`).test(data))
      .map((p6Day) => p6Day % 7);
    const exceptions = [...data.matchAll(/\(d\|(\d+)\)/g)].map((match) => excelDate(match[1])).filter(Boolean);
    const effectiveDays = workingDays.length ? workingDays : inherited.workingDays;
    const pattern = effectiveDays.length === 7 ? 'Calendar Days'
      : effectiveDays.length === 5 && effectiveDays.join(',') === '1,2,3,4,5' ? '5-Day Week'
      : effectiveDays.length === 6 && !effectiveDays.includes(5) ? '6-Day Week'
      : effectiveDays.length ? 'Custom' : inherited.pattern;
    const declaredDayHours = Number(row.day_hr_cnt);
    return { name: row.clndr_name || inherited.name || id, pattern, workingDays: effectiveDays, exceptions: [...new Set([...inherited.exceptions, ...exceptions])], dayHours: Number.isFinite(declaredDayHours) && declaredDayHours > 0 ? declaredDayHours : inherited.dayHours };
  };
  const wbsRows = tables.get('PROJWBS') || tables.get('WBS') || [];
  const wbsById = new Map(wbsRows.map((row) => [row.wbs_id, {
    code: row.wbs_short_name || row.wbs_code || row.wbs_id || '',
    name: row.wbs_name || row.wbs_short_name || row.wbs_id || '',
    parentId: row.parent_wbs_id || '',
  }]));
  const wbsFor = (id: string) => wbsById.get(id) || { code: id || '', name: id || '', parentId: '' };
  const wbsHierarchy = (id: string, seen = new Set<string>()): Array<{ code: string; name: string; parentCode: string }> => {
    if (!id || seen.has(id)) return [];
    const node = wbsFor(id);
    const parent = wbsFor(node.parentId);
    const nextSeen = new Set(seen); nextSeen.add(id);
    return [...wbsHierarchy(node.parentId, nextSeen), { code: node.code, name: node.name, parentCode: node.parentId ? parent.code : '' }];
  };
  const tasks = tables.get('TASK') || [];
  const codeCount = new Map<string, number>();
  tasks.forEach((task) => codeCount.set(task.task_code || '', (codeCount.get(task.task_code || '') || 0) + 1));
  const uniqueTaskCode = (task: Record<string, string>) => {
    const source = task.task_code || 'ACT';
    return (codeCount.get(source) || 0) > 1 ? `${source}-P6-${task.task_id}` : source;
  };
  const taskCodeById = new Map(tasks.map((task) => [task.task_id, uniqueTaskCode(task)]));
  const resourceById = new Map((tables.get('RSRC') || []).map((resource) => [resource.rsrc_id, resource]));
  const resourceAssignmentsByTask = new Map<string, Record<string, string>[]>();
  for (const assignment of tables.get('TASKRSRC') || []) {
    resourceAssignmentsByTask.set(assignment.task_id, [...(resourceAssignmentsByTask.get(assignment.task_id) || []), assignment]);
  }
  const resourceType = (resource: Record<string, string> | undefined) => {
    const value = String(resource?.rsrc_type || resource?.resource_type || '').toLowerCase();
    return /equip/.test(value) ? 'Equipment' : /labor|labour|person|crew/.test(value) ? 'Labor' : 'Other';
  };
  const resourceHours = (assignment: Record<string, string>) => Number(assignment.target_qty || assignment.target_labor_units || assignment.target_equip_units || assignment.target_qty_per_hr || 0) || 0;
  const resourceCost = (assignment: Record<string, string>) => Number(assignment.target_cost || assignment.target_labor_cost || assignment.target_equip_cost || 0) || 0;
  const predecessorsByTask = new Map<string, Record<string, string>[]>();
  const constraintName = (value: string) => ({
    CS_SNET: 'Start No Earlier Than', CS_FNLT: 'Finish No Later Than',
    CS_MSO: 'Mandatory Start', CS_MFO: 'Mandatory Finish',
  }[String(value || '').toUpperCase()] || 'None');
  for (const link of tables.get('TASKPRED') || []) predecessorsByTask.set(link.task_id, [...(predecessorsByTask.get(link.task_id) || []), link]);
  return tasks.map((task) => {
    const calendar = calendarFor(task.clndr_id || '');
    const wbs = wbsFor(task.wbs_id || '');
    const parentWbs = wbsFor(wbs.parentId);
    const links = predecessorsByTask.get(task.task_id) || [];
    const resourceAssignments = resourceAssignmentsByTask.get(task.task_id) || [];
    const resourceSummary = resourceAssignments.map((assignment) => {
      const resource = resourceById.get(assignment.rsrc_id);
      return {
        resource_id: assignment.rsrc_id || '', resource_code: resource?.rsrc_short_name || resource?.rsrc_name || assignment.rsrc_id || '',
        resource_name: resource?.rsrc_name || resource?.rsrc_short_name || assignment.rsrc_id || '', resource_type: resourceType(resource),
        planned_hours: resourceHours(assignment), planned_cost: resourceCost(assignment),
      };
    });
    const laborHours = resourceSummary.filter((assignment) => assignment.resource_type === 'Labor').reduce((sum, assignment) => sum + assignment.planned_hours, 0);
    const equipmentHours = resourceSummary.filter((assignment) => assignment.resource_type === 'Equipment').reduce((sum, assignment) => sum + assignment.planned_hours, 0);
    const plannedResourceCost = resourceSummary.reduce((sum, assignment) => sum + assignment.planned_cost, 0);
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
      'WBS Hierarchy': JSON.stringify(wbsHierarchy(task.wbs_id || '')),
      Start: String(task.act_start_date || task.target_start_date || task.early_start_date || '').slice(0, 10),
      Finish: String(task.act_end_date || task.target_end_date || task.early_end_date || '').slice(0, 10),
      'Original Duration': task.target_drtn || task.remain_drtn || '',
      'Constraint Type': constraintName(task.cstr_type || task.primary_cstr_type || ''),
      'Constraint Date': String(task.cstr_date || task.primary_cstr_date || '').slice(0, 10),
      Milestone: /mile/i.test(String(task.task_type || task.activity_type || '')),
      'Planned Qty': '',
      'Planned Labor Hours': laborHours || '',
      'Planned Equipment Hours': equipmentHours || '',
      'Planned Resource Cost': plannedResourceCost || '',
      'P6 Resource Assignments': JSON.stringify(resourceSummary),
      Calendar: calendar.name,
      'Calendar Pattern': calendar.pattern,
      'Calendar Working Days': JSON.stringify(calendar.workingDays),
      'Calendar Exceptions': JSON.stringify(calendar.exceptions),
      'Calendar Hours Per Day': calendar.dayHours,
      Predecessors: predecessorCodes.join(', '),
      // P6 supports multiple independent links for one successor. Preserve
      // each relationship type and lag rather than collapsing to the first.
      'Predecessor Links': JSON.stringify(links.map((link) => ({
        predecessor_code: taskCodeById.get(link.pred_task_id) || '',
        relationship_type: String(link.pred_type || 'PR_FS').replace(/^PR_/, '') || 'FS',
        lag_days: Number(link.lag_hr_cnt) ? Math.round((Number(link.lag_hr_cnt) / calendar.dayHours) * 100) / 100 : 0,
      })).filter((link) => link.predecessor_code)),
      Relationship: relation,
      'Lag (days)': lagHours ? Math.round((lagHours / calendar.dayHours) * 100) / 100 : 0,
      Critical: task.driving_path_flag === 'Y' || task.critical_path_flag === 'Y',
      Notes: `${task.task_descr || ''}${resourceSummary.length ? `${task.task_descr ? '\n' : ''}Imported P6 resources: ${resourceSummary.map((assignment) => `${assignment.resource_code} / ${assignment.resource_name} (${assignment.resource_type}, ${assignment.planned_hours}h)`).join(', ')}` : ''}`,
    };
  }).filter((row) => row['Activity ID'] && row['Activity Name']);
}
