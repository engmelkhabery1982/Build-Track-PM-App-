import type { DataRepository, DataRow, ListOptions } from "./repository";
import { assertRecordPeriodIsOpen, assertReportingPeriodDefinition, assertReportingPeriodMutation } from "./reportingPeriodGovernance";

const TABLES = new Set([
  "projects", "tasks", "costs", "cost_entries", "procurement", "safety",
  "progress_entries", "schedules", "contracts", "boq_headers", "boq_items",
  "schedule_distributions",
  "project_baselines", "reporting_periods", "governance_register",
  "approval_requests", "audit_log",
  "rfi_register", "submittals", "quality_register",
  "site_daily_reports",
  "pmo_snapshots",
  "app_users",
  "cash_flow", "subcontractor_invoices", "client_invoices", "variations", "variation_lines",
  "documents", "wir_entries", "labor_duty", "equipment", "tracking_sheet",
  "client_invoice_tracking", "subcontractor_invoice_tracking",
  "parties", "party_contacts", "rate_history",
  "report_templates",
  "cost_codes", "wbs_nodes", "contract_sov_lines", "payment_certificates",
]);

type StoredRow = {
  id: string;
  created_at: string;
  project_id: string | null;
  contract_id: string | null;
  parent_main_project_id: string | null;
  parent_main_contract_id: string | null;
  boq_header_id: string | null;
  boq_item_id: string | null;
  payload: string;
};

function assertKnownTable(tableName: string): void {
  if (!TABLES.has(tableName)) throw new Error(`Unsupported SQLite table: ${tableName}`);
}

function nullableId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function createId(): string {
  return crypto.randomUUID();
}

export class SqliteRepository implements DataRepository {
  private databasePromise?: Promise<import("@tauri-apps/plugin-sql").default>;

  private async database() {
    if (!this.databasePromise) {
      this.databasePromise = import("@tauri-apps/plugin-sql")
        .then(async ({ default: Database }) => {
          const database = await Database.load("sqlite:buildtrack.db");
          // SQLite does not enforce declared foreign keys unless enabled for
          // every connection. This makes the schema constraints effective.
          await database.execute("PRAGMA foreign_keys = ON");
          return database;
        });
    }
    return this.databasePromise;
  }

  private unpack<T extends DataRow>(stored: StoredRow): T {
    return {
      ...JSON.parse(stored.payload),
      id: stored.id,
      created_at: stored.created_at,
    } as T;
  }

  private async findStored(id: string, tableName: string): Promise<StoredRow> {
    const database = await this.database();
    const rows = await database.select<StoredRow[]>(
      `SELECT * FROM ${tableName} WHERE id = $1`, [id],
    );
    if (!rows[0]) throw new Error(`Record ${id} was not found in ${tableName}.`);
    return rows[0];
  }

  private async writeAudit(
    database: Awaited<ReturnType<SqliteRepository['database']>>,
    action: 'Insert' | 'Update' | 'Delete',
    entityType: string,
    record: Record<string, any>,
    before?: Record<string, any>,
  ): Promise<void> {
    if (entityType === 'audit_log') return;
    const now = new Date().toISOString();
    const audit = {
      id: createId(), created_at: now, project_id: record.project_id || null, contract_id: record.contract_id || null,
      entity_type: entityType, entity_id: record.id, action, actor: 'Local User',
      before: before || null, after: action === 'Delete' ? null : record,
      summary: `${action} ${entityType}`,
    };
    await database.execute(
      `INSERT INTO audit_log (id, created_at, project_id, contract_id, parent_main_project_id, parent_main_contract_id, boq_header_id, boq_item_id, payload)
       VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $7)`,
      [audit.id, now, nullableId(audit.project_id), nullableId(audit.contract_id), nullableId(record.boq_header_id), nullableId(record.boq_item_id), JSON.stringify(audit)],
    );
  }

  private async assertReportingPeriodMutationAllowed(
    database: Awaited<ReturnType<SqliteRepository['database']>>,
    operation: 'insert' | 'update' | 'delete',
    tableName: string,
    next?: Record<string, any>,
    before?: Record<string, any>,
  ): Promise<void> {
    // Audit entries are generated after a permitted mutation and must remain
    // append-only evidence, not be blocked by the period they describe.
    if (tableName === 'audit_log') return;
    const storedPeriods = await database.select<StoredRow[]>("SELECT * FROM reporting_periods");
    const periods = storedPeriods.map((period) => this.unpack<Record<string, any>>(period));
    if (tableName === 'reporting_periods') {
      assertReportingPeriodMutation(operation, next, before);
      if (operation !== 'delete' && next) assertReportingPeriodDefinition(next, periods);
      return;
    }
    const governedNext = tableName === 'projects' && next ? { ...next, project_id: next.id } : next;
    const governedBefore = tableName === 'projects' && before ? { ...before, project_id: before.id } : before;
    assertRecordPeriodIsOpen(periods, governedNext, governedBefore);
  }

  async list<T extends DataRow>(tableName: string, options: ListOptions = {}): Promise<T[]> {
    assertKnownTable(tableName);
    const database = await this.database();
    const ascending = options.ascending ?? false;
    const rows = await database.select<StoredRow[]>(
      `SELECT * FROM ${tableName} ORDER BY created_at ${ascending ? "ASC" : "DESC"}`,
    );
    return rows.map((row) => this.unpack<T>(row));
  }

  async insert<T extends DataRow>(tableName: string, row: T): Promise<T> {
    assertKnownTable(tableName);
    const database = await this.database();
    const now = new Date().toISOString();
    const record = { ...row, id: (row as any).id || createId(), created_at: (row as any).created_at || now } as Record<string, any>;
    await this.assertReportingPeriodMutationAllowed(database, 'insert', tableName, record);
    // The first desktop release created compact schemas for Projects and
    // Contracts. Keep their write shape compatible with both that database
    // and the newer migration, while relationships remain in the payload.
    if (tableName === "projects") {
      await database.execute(
        "INSERT INTO projects (id, created_at, payload) VALUES ($1, $2, $3)",
        [record.id, record.created_at, JSON.stringify(record)],
      );
    } else if (tableName === "contracts") {
      await database.execute(
        `INSERT INTO contracts (id, created_at, project_id, parent_main_contract_id, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          record.id, record.created_at, nullableId(record.project_id),
          nullableId(record.parent_main_contract_id), JSON.stringify(record),
        ],
      );
    } else if (tableName === "boq_headers") {
      await database.execute(
        `INSERT INTO boq_headers (id, created_at, project_id, contract_id, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          record.id, record.created_at, nullableId(record.project_id),
          nullableId(record.contract_id), JSON.stringify(record),
        ],
      );
    } else if (tableName === "boq_items") {
      await database.execute(
        `INSERT INTO boq_items (id, created_at, project_id, boq_header_id, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          record.id, record.created_at, nullableId(record.project_id),
          nullableId(record.boq_header_id), JSON.stringify(record),
        ],
      );
    } else {
      await database.execute(
        `INSERT INTO ${tableName} (id, created_at, project_id, contract_id, parent_main_project_id, parent_main_contract_id, boq_header_id, boq_item_id, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.id, record.created_at, nullableId(record.project_id), nullableId(record.contract_id),
          nullableId(record.parent_main_project_id), nullableId(record.parent_main_contract_id),
          nullableId(record.boq_header_id), nullableId(record.boq_item_id), JSON.stringify(record),
        ],
      );
    }
    await this.writeAudit(database, 'Insert', tableName, record);
    return record as T;
  }

  async insertMany<T extends DataRow>(tableName: string, rows: T[]): Promise<T[]> {
    const inserted: T[] = [];
    for (const row of rows) inserted.push(await this.insert(tableName, row));
    return inserted;
  }

  async update<T extends DataRow>(tableName: string, id: string, patch: Partial<T>): Promise<T> {
    assertKnownTable(tableName);
    const existing = this.unpack<T>(await this.findStored(id, tableName));
    const record = { ...existing, ...patch, id } as Record<string, any>;
    const database = await this.database();
    await this.assertReportingPeriodMutationAllowed(database, 'update', tableName, record, existing as Record<string, any>);
    if (tableName === "projects") {
      await database.execute(
        "UPDATE projects SET payload = $1 WHERE id = $2",
        [JSON.stringify(record), id],
      );
    } else if (tableName === "contracts") {
      await database.execute(
        `UPDATE contracts
         SET project_id = $1, parent_main_contract_id = $2, payload = $3
         WHERE id = $4`,
        [
          nullableId(record.project_id), nullableId(record.parent_main_contract_id),
          JSON.stringify(record), id,
        ],
      );
    } else if (tableName === "boq_headers") {
      await database.execute(
        `UPDATE boq_headers
         SET project_id = $1, contract_id = $2, payload = $3
         WHERE id = $4`,
        [
          nullableId(record.project_id), nullableId(record.contract_id),
          JSON.stringify(record), id,
        ],
      );
    } else if (tableName === "boq_items") {
      await database.execute(
        `UPDATE boq_items
         SET project_id = $1, boq_header_id = $2, payload = $3
         WHERE id = $4`,
        [
          nullableId(record.project_id), nullableId(record.boq_header_id),
          JSON.stringify(record), id,
        ],
      );
    } else {
      await database.execute(
        `UPDATE ${tableName}
         SET project_id = $1, contract_id = $2, parent_main_project_id = $3, parent_main_contract_id = $4,
             boq_header_id = $5, boq_item_id = $6, payload = $7
         WHERE id = $8`,
        [
          nullableId(record.project_id), nullableId(record.contract_id), nullableId(record.parent_main_project_id),
          nullableId(record.parent_main_contract_id), nullableId(record.boq_header_id), nullableId(record.boq_item_id),
          JSON.stringify(record), id,
        ],
      );
    }
    await this.writeAudit(database, 'Update', tableName, record, existing as Record<string, any>);
    return record as T;
  }

  async delete(tableName: string, id: string): Promise<void> {
    assertKnownTable(tableName);
    const existing = this.unpack<Record<string, any>>(await this.findStored(id, tableName));
    const database = await this.database();
    await this.assertReportingPeriodMutationAllowed(database, 'delete', tableName, undefined, existing);
    await database.execute(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    await this.writeAudit(database, 'Delete', tableName, existing, existing);
  }
}
