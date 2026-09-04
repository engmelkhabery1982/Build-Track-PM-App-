# Local Ollama Review

- Phase: phase2-resource-activity-governance
- Model: qwen2.5-coder:7b
- Files: src\components\DataTableView.tsx, src\data\dataQuality.ts, src\App.tsx, tests\phase0-governance.test.mjs

```json
{
  "code": "function calculateCpm(tasks) {\n  // Calculate early start and f[1D[K
finish dates for each task\n  tasks.forEach((task, index) => {\n    task.ea[7D[K
task.earlyStart = 0;\n    task.earlyFinish = task.duration_days;\n    if (t[2D[K
(task.predecessor_item) {\n      const predecessor = tasks.find(t => t.id =[1D[K
=== task.predecessor_item);\n      if (predecessor) {\n        task.earlySt[12D[K
task.earlyStart = predecessor.earlyFinish + task.lag_days;\n        task.ea[7D[K
task.earlyFinish = task.earlyStart + task.duration_days;\n      }\n    }\n [K
   if (task.predecessor_items) {\n      const earliestPredecessorFinish = M[1D[K
Math.max(...task.predecessor_items.map(id => tasks.find(t => t.id === id).e[5D[K
id).earlyFinish + task.lag_days));\n      task.earlyStart = earliestPredece[15D[K
earliestPredecessorFinish;\n      task.earlyFinish = task.earlyStart + task[4D[K
task.duration_days;\n    }\n  });\n\n  // Identify cycles and report them\n[6D[K
them\n  tasks.forEach((task) => {\n    if (task.predecessor_items) {\n     [K
 const predecessorIds = task.predecessor_items;\n      while (predecessorId[14D[K
(predecessorIds.includes(task.id)) {\n        task.cycle = true;\n        b[1D[K
break;\n      }\n    }\n  });\n\n  return tasks;\n}\n\nfunction calculateCp[11D[K
calculateCpmForecast(tasks, startDate) {\n  // Calculate forecast start and[3D[K
and finish dates for each task\n  tasks.forEach((task) => {\n    task.forec[10D[K
task.forecastStart = startDate;\n    task.forecastFinish = startDate + task[4D[K
task.duration_days;\n    if (task.predecessor_item) {\n      const predeces[8D[K
predecessor = tasks.find(t => t.id === task.predecessor_item);\n      if (p[2D[K
(predecessor) {\n        task.forecastStart = new Date(predecessor.forecast[25D[K
Date(predecessor.forecastFinish + task.lag_days);\n        task.forecastFin[16D[K
task.forecastFinish = new Date(task.forecastStart + task.duration_days);\n [K
     }\n    }\n  });\n\n  return tasks;\n}\n\nfunction assertRecordPeriodIs[20D[K
assertRecordPeriodIsOpen(periods, record, update) {\n  // Check if a record[6D[K
record period is open for insertion, update, or deletion\n  const openPerio[9D[K
openPeriod = periods.find(p => p.status === 'Open' && p.project_id === reco[4D[K
record.project_id);\n  if (openPeriod && update && update.project_id === op[2D[K
openPeriod.project_id) {\n    throw new Error(`Cannot ${update.action} ${up[4D[K
${update.period_name} because another period is open for the same project`)[9D[K
project`);\n  }\n  if (openPeriod && record.project_id === openPeriod.proje[16D[K
openPeriod.project_id) {\n    throw new Error(`Cannot ${record.action} ${re[4D[K
${record.period_name} because another period is open for the same project`)[9D[K
project`);\n  }\n}\n\nfunction assertReportingPeriodDefinition(period, exis[4D[K
existingPeriods) {\n  // Check if a reporting period definition is valid\n [K
 if (period.start_date > period.end_date) {\n    throw new Error('Reporting[16D[K
Error('Reporting period start date must be before end date');\n  }\n  if (![2D[K
(!period.data_date) {\n    throw new Error('Reporting period data date is r[1D[K
required');\n  }\n  if (existingPeriods.some(p => p.project_id === period.p[8D[K
period.project_id && p.start_date < period.end_date && p.end_date > period.[7D[K
period.start_date)) {\n    throw new Error('Reporting period overlaps with [K
an existing period');\n  }\n}\n\nfunction runDataQualityChecks(data) {\n  /[1D[K
// Run data quality checks and return findings\n  const findings = [];\n  /[1D[K
// Add your data quality checks here\n  return findings;\n}"
}
```

[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G[K[2K[1G
