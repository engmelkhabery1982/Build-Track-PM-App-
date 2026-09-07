const fs = require('fs');
let code = fs.readFileSync('src/data/dataDictionary.ts', 'utf8');

const syncDefs = `
  sync_outbox: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'operation_id', label: 'Operation ID', type: 'string', required: true },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'payload_json', label: 'Payload', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'retry_count', label: 'Retry Count', type: 'number', required: true },
    { key: 'last_error', label: 'Last Error', type: 'string', required: false },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
    { key: 'synced_at', label: 'Synced At', type: 'date', required: false }
  ],
  sync_inbox: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'operation_id', label: 'Operation ID', type: 'string', required: true },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'payload_json', label: 'Payload', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
    { key: 'applied_at', label: 'Applied At', type: 'date', required: false }
  ],
  sync_metadata: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'last_synced_at', label: 'Last Synced At', type: 'date', required: false },
    { key: 'status', label: 'Status', type: 'string', required: false },
    { key: 'last_error', label: 'Last Error', type: 'string', required: false }
  ],`;
code = code.replace("export const CANONICAL_FIELDS = {", "export const CANONICAL_FIELDS = {" + syncDefs);
fs.writeFileSync('src/data/dataDictionary.ts', code);
