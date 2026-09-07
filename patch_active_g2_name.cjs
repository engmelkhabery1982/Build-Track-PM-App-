const fs = require('fs');
let code = fs.readFileSync('docs/agent-work-orders/ACTIVE.md', 'utf8');
code = code.replace(/Persistent Report Designer/g, 'Users, Roles & Segregation of Duties');
fs.writeFileSync('docs/agent-work-orders/ACTIVE.md', code);
