const fs = require('fs');
let code = fs.readFileSync('src/data/dataDictionary.ts', 'utf8');

const authDefs = `
  app_users: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'username', label: 'Username', type: 'string', required: true },
    { key: 'password_hash', label: 'Password', type: 'string', required: true },
    { key: 'display_name', label: 'Display Name', type: 'string', required: false },
    { key: 'email', label: 'Email', type: 'string', required: false },
    { key: 'role', label: 'Role', type: 'string', required: true },
    { key: 'status', label: 'Status', type: 'string', required: true },
    { key: 'approval_limit', label: 'Approval Limit', type: 'number', required: false },
    { key: 'created_at', label: 'Created At', type: 'date', required: true }
  ],
  audit_auth: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'timestamp', label: 'Timestamp', type: 'date', required: true },
    { key: 'user_id', label: 'User ID', type: 'string', required: false },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'details', label: 'Details', type: 'string', required: false },
    { key: 'ip_address', label: 'IP', type: 'string', required: false }
  ],`;
code = code.replace("export const CANONICAL_FIELDS = {", "export const CANONICAL_FIELDS = {" + authDefs);
fs.writeFileSync('src/data/dataDictionary.ts', code);
