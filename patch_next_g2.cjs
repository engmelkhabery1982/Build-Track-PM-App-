const fs = require('fs');

let activeCode = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');
activeCode = activeCode.replace(/G1 — Advanced Data Validations/g, 'G2 — Users, Roles & Segregation of Duties');
activeCode = activeCode.replace(/G1 المقصودة حصريًا/g, 'G2 المقصودة حصريًا');
activeCode = activeCode.replace(/قسم G1/g, 'قسم G2');
activeCode = activeCode.replace(/حزمة G1/g, 'حزمة G2');
activeCode = activeCode.replace(/مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8 وF9/g, 'مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8 وF9 وG1');
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', activeCode);

let ledgerCode = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');
ledgerCode = ledgerCode.replace(/Current capability: `G1 — Advanced Data Validations`/g, 'Current capability: `G2 — Users, Roles & Segregation of Duties`');
ledgerCode = ledgerCode.replace(/F1\/F2\/F3\/F4\/F5\/F6\/F7\/F8\/F9 await/g, 'F1/F2/F3/F4/F5/F6/F7/F8/F9/G1 await');
ledgerCode = ledgerCode.replace(/Last accepted capability: `F9 — Append-only Audit Explorer \(provisional\)`/g, 'Last accepted capability: `G1 — Desktop/Web Hybrid Sync Protocol (provisional)`');
fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', ledgerCode);
