import type { DataRepository, DataRow, ListOptions } from "./repository";

const TABLES = new Set([
  "projects", "tasks", "costs", "cost_entries", "procurement", "safety",
  "progress_entries", "schedules", "contracts", "boq_headers", "boq_items",
  "schedule_distributions",
  "project_baselines", "reporting_periods", "governance_register",
  "cash_flow", "subcontractor_invoices", "client_invoices", "variations",
  "documents", "wir_entries", "labor_duty", "equipment", "tracking_sheet",
  "client_invoice_tracking", "subcontractor_invoice_tracking",
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
        .then(({ default: Database }) => Database.load("sqlite:buildtrack.db"));
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
    return record as T;
  }

  async delete(tableName: string, id: string): Promise<void> {
    assertKnownTable(tableName);
    const database = await this.database();
    await database.execute(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
  }
}
