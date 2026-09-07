const fs = require('fs');
let code = fs.readFileSync('src/data/sqliteRepository.ts', 'utf8');

const internalTables = `['audit_log', 'sync_outbox', 'sync_inbox', 'sync_metadata', 'commercial_workflow_postings', 'supplier_ap_postings']`;

const writeOutbox = `
  private async writeOutbox(tableName: string, entityId: string, action: 'Insert' | 'Update' | 'Delete', payload: any) {
    if (${internalTables}.includes(tableName)) return;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const operationId = crypto.randomUUID();
    
    const db = await this.database();
    await db.execute(
      "INSERT INTO sync_outbox (id, operation_id, entity_type, entity_id, action, payload_json, status, retry_count, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [id, operationId, tableName, entityId, action, JSON.stringify(payload || {}), 'Pending', 0, now]
    );
  }
`;

// Inject writeOutbox method after writeAudit
code = code.replace("private async assertReportingPeriodMutationAllowed", writeOutbox + "\n  private async assertReportingPeriodMutationAllowed");

// Inject into insert
code = code.replace("await this.writeAudit(tableName, 'Insert', null, row);", "await this.writeAudit(tableName, 'Insert', null, row);\n      await this.writeOutbox(tableName, String((row as any).id), 'Insert', row);");

// Inject into update
code = code.replace("await this.writeAudit(tableName, 'Update', existingRow, merged);", "await this.writeAudit(tableName, 'Update', existingRow, merged);\n      await this.writeOutbox(tableName, String(id), 'Update', merged);");

// Inject into delete
code = code.replace("await this.writeAudit(tableName, 'Delete', existingRow, null);", "await this.writeAudit(tableName, 'Delete', existingRow, null);\n      await this.writeOutbox(tableName, String(id), 'Delete', existingRow);");

fs.writeFileSync('src/data/sqliteRepository.ts', code);
