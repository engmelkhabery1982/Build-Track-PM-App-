const fs = require('fs');
let code = fs.readFileSync('src/data/sqliteRepository.ts', 'utf8');

const oldAudit = `    const audit = {
      id: createId(), created_at: now, project_id: record.project_id || null, contract_id: record.contract_id || null,
      entity_type: entityType, entity_id: record.id, action, actor: 'Local User',
      before: before || null, after: action === 'Delete' ? null : record,
      summary: \`\${action} \${entityType}\`,
    };`;

const redactFn = `    const redact = (obj: any): any => {
      if (!obj) return obj;
      const copy = { ...obj };
      for (const k of Object.keys(copy)) {
        if (k.match(/token|password|secret|content|attachment/i)) {
          copy[k] = '[REDACTED]';
        }
      }
      return copy;
    };
    const audit = {
      id: createId(), created_at: now, project_id: record.project_id || null, contract_id: record.contract_id || null,
      entity_type: entityType, entity_id: record.id, action, actor: 'Local User',
      before: redact(before) || null, after: action === 'Delete' ? null : redact(record),
      summary: \`\${action} \${entityType}\`,
    };`;

if (code.includes(oldAudit)) {
    code = code.replace(oldAudit, redactFn);
    fs.writeFileSync('src/data/sqliteRepository.ts', code);
    console.log("Patched redact sqliteRepository.ts");
} else {
    console.log("oldAudit not found in sqliteRepository.ts");
}
