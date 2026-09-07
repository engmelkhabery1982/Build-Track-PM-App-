const fs = require('fs');
let code = fs.readFileSync('src/data/dataDictionary.ts', 'utf8');

if (!code.includes('audit_log:')) {
    const auditDef = `
  audit_log: [
    { key: 'id', label: 'ID', type: 'string', required: true },
    { key: 'project_id', label: 'Project ID', type: 'string', required: false },
    { key: 'contract_id', label: 'Contract ID', type: 'string', required: false },
    { key: 'entity_type', label: 'Entity Type', type: 'string', required: true },
    { key: 'entity_id', label: 'Entity ID', type: 'string', required: true },
    { key: 'action', label: 'Action', type: 'string', required: true },
    { key: 'actor', label: 'Actor', type: 'string', required: true },
    { key: 'before', label: 'Before State', type: 'object', required: false },
    { key: 'after', label: 'After State', type: 'object', required: false },
    { key: 'summary', label: 'Summary', type: 'string', required: true },
    { key: 'created_at', label: 'Created At', type: 'date', required: true },
  ],`;
    code = code.replace("export const CANONICAL_FIELDS = {", "export const CANONICAL_FIELDS = {" + auditDef);
    fs.writeFileSync('src/data/dataDictionary.ts', code);
    console.log("Patched dataDictionary.ts");
}
