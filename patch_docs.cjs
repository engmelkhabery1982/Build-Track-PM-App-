const fs = require('fs');
let code = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');

code = code.replace(
  "العمل على F9 — Append-only Audit Explorer",
  "العمل على F9 — Custom Data Quality Checks"
);
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', code);

code = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');
code = code.replace(
  "الهدف الحالي: البدء في تنفيذ F9 — Custom Data Quality Checks",
  "الهدف الحالي: العمل على تنفيذ F9 — Custom Data Quality Checks"
);
fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', code);
