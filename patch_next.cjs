const fs = require('fs');

let activeCode = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');
activeCode = activeCode.replace(/F9 — Append-only Audit Explorer/g, 'G1 — Advanced Data Validations');
activeCode = activeCode.replace(/F9 المقصودة حصريًا/g, 'G1 المقصودة حصريًا');
activeCode = activeCode.replace(/قسم F9/g, 'قسم G1');
activeCode = activeCode.replace(/حزمة F9/g, 'حزمة G1');
activeCode = activeCode.replace(/مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8/g, 'مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8 وF9');
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', activeCode);

let ledgerCode = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');
ledgerCode = ledgerCode.replace(/Current capability: `F9 — Append-only Audit Explorer`/g, 'Current capability: `G1 — Advanced Data Validations`');
ledgerCode = ledgerCode.replace(/F1\/F2\/F3\/F4\/F5\/F6\/F7\/F8 await/g, 'F1/F2/F3/F4/F5/F6/F7/F8/F9 await');
ledgerCode = ledgerCode.replace(/Last accepted capability: `E3 — Controlled Reproducible Report Pack \(Codex-repaired, reviewed and gate-tested\)`/g, 'Last accepted capability: `F9 — Append-only Audit Explorer (provisional)`');
fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', ledgerCode);
