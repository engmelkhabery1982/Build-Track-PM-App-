const fs = require('fs');

let activeCode = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');
activeCode = activeCode.replace(/Users, Roles & Segregation of Duties/g, 'Scoped External Portal');
activeCode = activeCode.replace(/G2 المقصودة حصريًا/g, 'G3 المقصودة حصريًا');
activeCode = activeCode.replace(/قسم G2/g, 'قسم G3');
activeCode = activeCode.replace(/حزمة G2/g, 'حزمة G3');
activeCode = activeCode.replace(/مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8 وF9 وG1/g, 'مسودات F1 وF2 وF3 وF4 وF5 وF6 وF7 وF8 وF9 وG1 وG2');
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', activeCode);

let ledgerCode = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');
ledgerCode = ledgerCode.replace(/Current capability: `G2 — Users, Roles & Segregation of Duties`/g, 'Current capability: `G3 — Scoped External Portal`');
ledgerCode = ledgerCode.replace(/F1\/F2\/F3\/F4\/F5\/F6\/F7\/F8\/F9\/G1 await/g, 'F1/F2/F3/F4/F5/F6/F7/F8/F9/G1/G2 await');
ledgerCode = ledgerCode.replace(/Last accepted capability: `G1 — Desktop\/Web Hybrid Sync Protocol \(provisional\)`/g, 'Last accepted capability: `G2 — Users, Roles & Segregation of Duties (provisional)`');
fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', ledgerCode);
