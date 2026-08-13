use std::fs;
use tauri::Manager;

#[tauri::command]
fn save_excel_download(app: tauri::AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
  let safe_name = std::path::Path::new(&file_name)
    .file_name()
    .and_then(|name| name.to_str())
    .filter(|name| !name.is_empty())
    .ok_or_else(|| "Invalid file name.".to_string())?;
  let directory = app.path().download_dir().map_err(|error| error.to_string())?;
  fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
  let target = directory.join(safe_name);
  fs::write(&target, bytes).map_err(|error| error.to_string())?;
  Ok(target.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![tauri_plugin_sql::Migration {
    version: 1,
    description: "create_buildtrack_local_schema",
    sql: r#"
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (parent_main_contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sqlite_main_contract_per_project
        ON contracts(project_id)
        WHERE project_id IS NOT NULL AND parent_main_contract_id IS NULL;
      CREATE TABLE IF NOT EXISTS boq_headers (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS boq_items (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, boq_header_id TEXT,
        payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS costs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS cost_entries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS procurement (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS safety (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS progress_entries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS cash_flow (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS subcontractor_invoices (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS client_invoices (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS variations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS wir_entries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS labor_duty (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS tracking_sheet (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS client_invoice_tracking (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
      CREATE TABLE IF NOT EXISTS subcontractor_invoice_tracking (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT, FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT, FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT);
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }, tauri_plugin_sql::Migration {
    version: 2,
    description: "sync_local_invoice_tracking",
    sql: r#"
      CREATE TRIGGER IF NOT EXISTS sync_client_invoice_tracking_insert
      AFTER INSERT ON client_invoices
      BEGIN
        INSERT INTO client_invoice_tracking (
          id, created_at, project_id, contract_id, parent_main_project_id, parent_main_contract_id,
          boq_header_id, boq_item_id, payload
        ) VALUES (
          NEW.id, NEW.created_at, NEW.project_id, NEW.contract_id, NULL, NULL, NEW.boq_header_id, NEW.boq_item_id,
          json_object(
            'id', NEW.id, 'invoice_id', NEW.id, 'project_id', NEW.project_id, 'contract_id', NEW.contract_id,
            'invoice_number', json_extract(NEW.payload, '$.invoice_number'),
            'invoice_date', json_extract(NEW.payload, '$.invoice_date'),
            'due_date', json_extract(NEW.payload, '$.due_date'),
            'status', json_extract(NEW.payload, '$.status'),
            'payment_status', json_extract(NEW.payload, '$.payment_status'),
            'payment_date', json_extract(NEW.payload, '$.payment_date'),
            'notes', json_extract(NEW.payload, '$.notes'), 'created_at', NEW.created_at
          )
        );
      END;
      CREATE TRIGGER IF NOT EXISTS sync_client_invoice_tracking_update
      AFTER UPDATE ON client_invoices
      BEGIN
        UPDATE client_invoice_tracking SET
          project_id = NEW.project_id, contract_id = NEW.contract_id, boq_header_id = NEW.boq_header_id,
          boq_item_id = NEW.boq_item_id,
          payload = json_object(
            'id', NEW.id, 'invoice_id', NEW.id, 'project_id', NEW.project_id, 'contract_id', NEW.contract_id,
            'invoice_number', json_extract(NEW.payload, '$.invoice_number'),
            'invoice_date', json_extract(NEW.payload, '$.invoice_date'),
            'due_date', json_extract(NEW.payload, '$.due_date'),
            'status', json_extract(NEW.payload, '$.status'),
            'payment_status', json_extract(NEW.payload, '$.payment_status'),
            'payment_date', json_extract(NEW.payload, '$.payment_date'),
            'notes', json_extract(NEW.payload, '$.notes'), 'created_at', NEW.created_at
          )
        WHERE id = NEW.id;
      END;
      CREATE TRIGGER IF NOT EXISTS sync_client_invoice_tracking_delete
      AFTER DELETE ON client_invoices
      BEGIN DELETE FROM client_invoice_tracking WHERE id = OLD.id; END;

      CREATE TRIGGER IF NOT EXISTS sync_subcontractor_invoice_tracking_insert
      AFTER INSERT ON subcontractor_invoices
      BEGIN
        INSERT INTO subcontractor_invoice_tracking (
          id, created_at, project_id, contract_id, parent_main_project_id, parent_main_contract_id,
          boq_header_id, boq_item_id, payload
        ) VALUES (
          NEW.id, NEW.created_at, NEW.project_id, NEW.contract_id, NULL, NULL, NEW.boq_header_id, NEW.boq_item_id,
          json_object(
            'id', NEW.id, 'invoice_id', NEW.id, 'project_id', NEW.project_id, 'contract_id', NEW.contract_id,
            'invoice_number', json_extract(NEW.payload, '$.invoice_number'),
            'invoice_date', json_extract(NEW.payload, '$.invoice_date'),
            'due_date', NULL, 'status', json_extract(NEW.payload, '$.status'),
            'payment_status', json_extract(NEW.payload, '$.payment_status'),
            'payment_date', json_extract(NEW.payload, '$.payment_date'),
            'notes', json_extract(NEW.payload, '$.notes'), 'created_at', NEW.created_at
          )
        );
      END;
      CREATE TRIGGER IF NOT EXISTS sync_subcontractor_invoice_tracking_update
      AFTER UPDATE ON subcontractor_invoices
      BEGIN
        UPDATE subcontractor_invoice_tracking SET
          project_id = NEW.project_id, contract_id = NEW.contract_id, boq_header_id = NEW.boq_header_id,
          boq_item_id = NEW.boq_item_id,
          payload = json_object(
            'id', NEW.id, 'invoice_id', NEW.id, 'project_id', NEW.project_id, 'contract_id', NEW.contract_id,
            'invoice_number', json_extract(NEW.payload, '$.invoice_number'),
            'invoice_date', json_extract(NEW.payload, '$.invoice_date'),
            'due_date', NULL, 'status', json_extract(NEW.payload, '$.status'),
            'payment_status', json_extract(NEW.payload, '$.payment_status'),
            'payment_date', json_extract(NEW.payload, '$.payment_date'),
            'notes', json_extract(NEW.payload, '$.notes'), 'created_at', NEW.created_at
          )
        WHERE id = NEW.id;
      END;
      CREATE TRIGGER IF NOT EXISTS sync_subcontractor_invoice_tracking_delete
      AFTER DELETE ON subcontractor_invoices
      BEGIN DELETE FROM subcontractor_invoice_tracking WHERE id = OLD.id; END;
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }, tauri_plugin_sql::Migration {
    version: 3,
    description: "complete_local_relation_columns",
    sql: r#"
      ALTER TABLE projects ADD COLUMN project_id TEXT;
      ALTER TABLE projects ADD COLUMN contract_id TEXT;
      ALTER TABLE projects ADD COLUMN parent_main_project_id TEXT;
      ALTER TABLE projects ADD COLUMN parent_main_contract_id TEXT;
      ALTER TABLE projects ADD COLUMN boq_header_id TEXT;
      ALTER TABLE projects ADD COLUMN boq_item_id TEXT;
      ALTER TABLE contracts ADD COLUMN contract_id TEXT;
      ALTER TABLE contracts ADD COLUMN parent_main_project_id TEXT;
      ALTER TABLE contracts ADD COLUMN boq_header_id TEXT;
      ALTER TABLE contracts ADD COLUMN boq_item_id TEXT;
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }, tauri_plugin_sql::Migration {
    version: 4,
    description: "add_schedule_time_phasing",
    sql: r#"
      CREATE TABLE IF NOT EXISTS schedule_distributions (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }, tauri_plugin_sql::Migration {
    version: 5,
    description: "add_pmo_governance_registers",
    sql: r#"
      CREATE TABLE IF NOT EXISTS project_baselines (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS reporting_periods (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS governance_register (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_baselines_project ON project_baselines(project_id);
      CREATE INDEX IF NOT EXISTS idx_reporting_periods_project ON reporting_periods(project_id);
      CREATE INDEX IF NOT EXISTS idx_governance_register_project ON governance_register(project_id);
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }, tauri_plugin_sql::Migration {
    version: 6,
    description: "add_approval_and_audit_governance",
    sql: r#"
      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_approvals_project ON approval_requests(project_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id);
    "#,
    kind: tauri_plugin_sql::MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:buildtrack.db", migrations)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![save_excel_download])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
