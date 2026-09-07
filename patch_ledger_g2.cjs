const fs = require('fs');
let code = fs.readFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', 'utf8');

if (!code.includes('- [x] G2: Provisional Cloud Delivery')) {
  code = code.replace("## Phase Deliveries", "## Phase Deliveries\n- [x] G2: Provisional Cloud Delivery");
  fs.writeFileSync('docs/agent-work-orders/CLOUD_PROGRESS_LEDGER.md', code);
}
