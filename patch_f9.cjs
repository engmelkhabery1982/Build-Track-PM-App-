const fs = require('fs');

let activeCode = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');
activeCode = activeCode.replace(/F8 — Persistent Report Designer/g, 'F9 — Append-only Audit Explorer');
activeCode = activeCode.replace(/F8 المقصودة حصريًا/g, 'F9 المقصودة حصريًا');
activeCode = activeCode.replace(/قسم F8/g, 'قسم F9');
activeCode = activeCode.replace(/حزمة F8/g, 'حزمة F9');
activeCode = activeCode.replace(/مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7/g, 'مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8');
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', activeCode);

let ledgerCode = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');
ledgerCode = ledgerCode.replace(/Current capability: `F8 — Persistent Report Designer`/g, 'Current capability: `F9 — Append-only Audit Explorer`');
ledgerCode = ledgerCode.replace(/F1\/F2\/F3\/F4\/F5\/F6\/F7 await/g, 'F1/F2/F3/F4/F5/F6/F7/F8 await');
fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', ledgerCode);

