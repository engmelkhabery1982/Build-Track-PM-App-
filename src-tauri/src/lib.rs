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
  }];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:buildtrack.db", migrations)
        .build(),
    )
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
