const fs = require('fs');
let code = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');

code = code.replace(
  "- [ ] **F8 — Persistent Report Designer** (قيد التنفيذ)",
  "- [x] **F8 — Persistent Report Designer** (مكتملة)"
);

code = code.replace(
  "الهدف الحالي: البدء في تنفيذ F8 — Persistent Report Designer",
  "الهدف الحالي: البدء في تنفيذ F9 — Custom Data Quality Checks"
);

fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', code);
