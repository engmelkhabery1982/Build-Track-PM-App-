use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

mod import_batch;
mod supplier_ap;
mod commercial_workflow;

#[tauri::command]
async fn commit_governed_import(
    app: tauri::AppHandle,
    request: import_batch::ImportCommitRequest,
) -> Result<import_batch::ImportCommitResult, String> {
    let database_path = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("buildtrack.db");
    import_batch::commit_governed_import(&database_path, request).await
}

#[tauri::command]
async fn reverse_governed_import(
    app: tauri::AppHandle,
    request: import_batch::ImportReverseRequest,
) -> Result<import_batch::ImportReverseResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    import_batch::reverse_governed_import(&database_path, request).await
}

#[tauri::command]
async fn reverse_supplier_ap_posting(app: tauri::AppHandle, request: supplier_ap::SupplierApOperationRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::reverse_supplier_ap_posting(&database_path, request).await
}
#[tauri::command]
async fn approve_supplier_invoice(app: tauri::AppHandle, request: supplier_ap::SupplierInvoiceApprovalRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::approve_supplier_invoice(&database_path, request).await
}
#[tauri::command]
async fn settle_supplier_invoice_payment(app: tauri::AppHandle, request: supplier_ap::SupplierPaymentSettlementRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::settle_supplier_invoice_payment(&database_path, request).await
}
#[tauri::command]
async fn approve_purchase_order(app: tauri::AppHandle, request: supplier_ap::PurchaseOrderApprovalRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::approve_purchase_order(&database_path, request).await
}
#[tauri::command]
async fn accept_procurement_receipt(app: tauri::AppHandle, request: supplier_ap::ProcurementReceiptAcceptanceRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::accept_procurement_receipt(&database_path, request).await
}
#[tauri::command]
async fn cancel_purchase_order(app: tauri::AppHandle, request: supplier_ap::PurchaseOrderCancellationRequest) -> Result<supplier_ap::SupplierApOperationResult, String> {
    let database_path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    supplier_ap::cancel_purchase_order(&database_path, request).await
}

#[tauri::command]
async fn approve_cost_change(app: tauri::AppHandle, request: commercial_workflow::ApprovalRequest) -> Result<commercial_workflow::Result, String> {
    let path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    commercial_workflow::approve_cost_change(&path, request).await
}
#[tauri::command]
async fn approve_payment_certificate(app: tauri::AppHandle, request: commercial_workflow::ApprovalRequest) -> Result<commercial_workflow::Result, String> {
    let path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    commercial_workflow::approve_payment_certificate(&path, request).await
}
#[tauri::command]
async fn settle_payment_certificate(app: tauri::AppHandle, request: commercial_workflow::CertificateSettlementRequest) -> Result<commercial_workflow::Result, String> {
    let path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    commercial_workflow::settle_payment_certificate(&path, request).await
}
#[tauri::command]
async fn reverse_commercial_posting(app: tauri::AppHandle, request: commercial_workflow::ReversalRequest) -> Result<commercial_workflow::Result, String> {
    let path = app.path().app_config_dir().map_err(|error| error.to_string())?.join("buildtrack.db");
    commercial_workflow::reverse_commercial_posting(&path, request).await
}

#[tauri::command]
fn save_excel_download(
    app: tauri::AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let safe_name = std::path::Path::new(&file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .ok_or_else(|| "Invalid file name.".to_string())?;
    let directory = app
        .path()
        .download_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let target = directory.join(safe_name);
    fs::write(&target, bytes).map_err(|error| error.to_string())?;
    Ok(target.display().to_string())
}

#[tauri::command]
fn save_document_attachment(
    app: tauri::AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    if bytes.len() > 25 * 1024 * 1024 {
        return Err("Attachment exceeds the 25 MB local limit.".to_string());
    }
    let safe_name = std::path::Path::new(&file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .ok_or_else(|| "Invalid file name.".to_string())?;
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("attachments");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let target = directory.join(format!("{}_{}", chrono_like_timestamp(), safe_name));
    fs::write(&target, bytes).map_err(|error| error.to_string())?;
    Ok(target.display().to_string())
}

#[tauri::command]
fn backup_local_database(app: tauri::AppHandle) -> Result<String, String> {
    // The SQLite plugin stores the local workspace under the app data directory.
    // Preserve the WAL companions too, so an active SQLite database can be
    // restored with its most recent committed transactions intact.
    let source = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("buildtrack.db");
    let directory = app
        .path()
        .download_dir()
        .map_err(|error| error.to_string())?
        .join("BuildTrack Backups");
    let attachments = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("attachments");
    let backup_directory = backup_workspace(&source, &attachments, &directory)?;
    verify_backup_workspace(&backup_directory)?;
    Ok(backup_directory.display().to_string())
}

#[tauri::command]
fn verify_local_backup(backup_path: String) -> Result<String, String> {
    let backup_directory = PathBuf::from(backup_path);
    verify_backup_workspace(&backup_directory)?;
    Ok(format!("Backup verified: {}", backup_directory.display()))
}

#[tauri::command]
fn stage_local_restore(app: tauri::AppHandle, backup_path: String) -> Result<String, String> {
    let backup_directory = PathBuf::from(backup_path);
    verify_backup_workspace(&backup_directory)?;
    // SQLite can retain an active handle while the UI is open.  Stage a verified
    // copy and apply it during the next startup before the front end opens it.
    let staging = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("restore-pending");
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|error| error.to_string())?;
    }
    copy_directory(&backup_directory, &staging)?;
    verify_backup_workspace(&staging)?;
    Ok("Restore is ready. Close and reopen BuildTrack to apply the verified backup.".to_string())
}

fn backup_workspace(
    source: &Path,
    attachments: &Path,
    backup_root: &Path,
) -> Result<PathBuf, String> {
    if !source.exists() {
        return Err("The local BuildTrack database has not been created yet.".to_string());
    }
    fs::create_dir_all(backup_root).map_err(|error| error.to_string())?;
    let stamp = chrono_like_timestamp();
    let backup_directory = backup_root.join(format!("buildtrack-backup-{}", stamp));
    fs::create_dir_all(&backup_directory).map_err(|error| error.to_string())?;
    let target = backup_directory.join("buildtrack.db");
    fs::copy(source, &target).map_err(|error| error.to_string())?;
    for suffix in ["-wal", "-shm"] {
        let companion = PathBuf::from(format!("{}{}", source.display(), suffix));
        if companion.exists() {
            let companion_target = PathBuf::from(format!("{}{}", target.display(), suffix));
            fs::copy(companion, companion_target).map_err(|error| error.to_string())?;
        }
    }
    if attachments.exists() {
        copy_directory(attachments, &backup_directory.join("attachments"))?;
    }
    let database_bytes = fs::metadata(&target)
        .map_err(|error| error.to_string())?
        .len();
    fs::write(backup_directory.join("BACKUP_INFO.txt"), format!(
    "BuildTrack local workspace backup\nCreated (UTC milliseconds): {}\nDatabase: buildtrack.db\nDatabase bytes: {}\nAttachments: {}\n\nVerified automatically when created. Restore only while BuildTrack is closed. Keep this folder intact.",
    stamp, database_bytes, if attachments.exists() { "included" } else { "none" },
  )).map_err(|error| error.to_string())?;
    Ok(backup_directory)
}

fn verify_backup_workspace(backup_directory: &Path) -> Result<(), String> {
    let database = backup_directory.join("buildtrack.db");
    let metadata = fs::metadata(&database)
        .map_err(|_| "Backup does not contain buildtrack.db.".to_string())?;
    if metadata.len() < 16 {
        return Err("Backup database is too small to be a valid SQLite database.".to_string());
    }
    let signature = fs::read(&database).map_err(|error| error.to_string())?;
    if signature.get(..16) != Some(b"SQLite format 3\0") {
        return Err("Backup database does not have a valid SQLite signature.".to_string());
    }
    if !backup_directory.join("BACKUP_INFO.txt").is_file() {
        return Err("Backup manifest BACKUP_INFO.txt is missing.".to_string());
    }
    Ok(())
}

#[allow(dead_code)] // Used by the isolated round-trip test; production restore remains manual while the app is closed.
fn restore_workspace_from_backup(
    backup_directory: &Path,
    target_database: &Path,
    target_attachments: &Path,
) -> Result<(), String> {
    verify_backup_workspace(backup_directory)?;
    if let Some(parent) = target_database.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::copy(backup_directory.join("buildtrack.db"), target_database)
        .map_err(|error| error.to_string())?;
    for suffix in ["-wal", "-shm"] {
        let source = PathBuf::from(format!(
            "{}{}",
            backup_directory.join("buildtrack.db").display(),
            suffix
        ));
        if source.exists() {
            let target = PathBuf::from(format!("{}{}", target_database.display(), suffix));
            fs::copy(source, target).map_err(|error| error.to_string())?;
        }
    }
    let backup_attachments = backup_directory.join("attachments");
    if backup_attachments.exists() {
        copy_directory(&backup_attachments, target_attachments)?;
    }
    Ok(())
}

fn apply_staged_restore(app: &tauri::AppHandle) -> Result<(), String> {
    let config_directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    let staging = config_directory.join("restore-pending");
    if !staging.exists() {
        return Ok(());
    }
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    restore_workspace_from_backup(
        &staging,
        &config_directory.join("buildtrack.db"),
        &app_data.join("attachments"),
    )?;
    fs::remove_dir_all(staging).map_err(|error| error.to_string())?;
    Ok(())
}

fn copy_directory(source: &Path, target: &Path) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let destination = target.join(entry.file_name());
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            copy_directory(&entry.path(), &destination)?;
        } else {
            fs::copy(entry.path(), destination).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn chrono_like_timestamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod backup_tests {
    use super::*;

    #[test]
    fn backup_verify_and_restore_round_trip_preserves_workspace() {
        let root = std::env::temp_dir().join(format!(
            "buildtrack-backup-test-{}",
            chrono_like_timestamp()
        ));
        let source_dir = root.join("source");
        let attachments = source_dir.join("attachments");
        fs::create_dir_all(&attachments).unwrap();
        let database = source_dir.join("buildtrack.db");
        fs::write(
            &database,
            [b"SQLite format 3\0".as_slice(), b"test workspace"].concat(),
        )
        .unwrap();
        fs::write(attachments.join("evidence.txt"), b"inspection evidence").unwrap();

        let backup = backup_workspace(&database, &attachments, &root.join("backups")).unwrap();
        verify_backup_workspace(&backup).unwrap();

        let restore_root = root.join("restored");
        let restored_database = restore_root.join("buildtrack.db");
        let restored_attachments = restore_root.join("attachments");
        restore_workspace_from_backup(&backup, &restored_database, &restored_attachments).unwrap();
        assert_eq!(
            fs::read(&database).unwrap(),
            fs::read(&restored_database).unwrap()
        );
        assert_eq!(
            fs::read(attachments.join("evidence.txt")).unwrap(),
            fs::read(restored_attachments.join("evidence.txt")).unwrap()
        );

        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
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
        },
        tauri_plugin_sql::Migration {
            version: 7,
            description: "add_field_quality_collaboration_registers",
            sql: r#"
      CREATE TABLE IF NOT EXISTS rfi_register (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS submittals (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS quality_register (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_rfi_project ON rfi_register(project_id);
      CREATE INDEX IF NOT EXISTS idx_submittals_project ON submittals(project_id);
      CREATE INDEX IF NOT EXISTS idx_quality_project ON quality_register(project_id);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 8,
            description: "add_pmo_reporting_snapshots",
            sql: r#"
      CREATE TABLE IF NOT EXISTS pmo_snapshots (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_pmo_snapshots_project_date ON pmo_snapshots(project_id, created_at DESC);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 9,
            description: "add_local_user_accounts",
            sql: r#"
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_username ON app_users(json_extract(payload, '$.username'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 10,
            description: "add_party_master_data",
            sql: r#"
      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS party_contacts (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rate_history (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_party_code ON parties(json_extract(payload, '$.party_code'));
      CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_legal_name ON parties(lower(json_extract(payload, '$.legal_name')));
      CREATE INDEX IF NOT EXISTS idx_party_contacts_party_id ON party_contacts(json_extract(payload, '$.party_id'));
      CREATE INDEX IF NOT EXISTS idx_rate_history_party_item ON rate_history(json_extract(payload, '$.party_id'), json_extract(payload, '$.item_code'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 11,
            description: "add_report_templates",
            sql: r#"
      CREATE TABLE IF NOT EXISTS report_templates (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_report_templates_name ON report_templates(lower(json_extract(payload, '$.template_name')));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 12,
            description: "add_variation_lines",
            sql: r#"
      CREATE TABLE IF NOT EXISTS variation_lines (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_variation_lines_variation ON variation_lines(json_extract(payload, '$.variation_id'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 13,
            description: "index_governed_project_controls_relationships",
            sql: r#"
      CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
      CREATE INDEX IF NOT EXISTS idx_contracts_parent_main ON contracts(parent_main_contract_id);
      CREATE INDEX IF NOT EXISTS idx_boq_headers_project_contract ON boq_headers(project_id, contract_id);
      CREATE INDEX IF NOT EXISTS idx_boq_items_project_header ON boq_items(project_id, boq_header_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_project_contract_item ON schedules(project_id, contract_id, boq_item_id);
      CREATE INDEX IF NOT EXISTS idx_wirs_project_contract_item ON wir_entries(project_id, contract_id, boq_item_id);
      CREATE INDEX IF NOT EXISTS idx_cost_entries_project_contract_item ON cost_entries(project_id, contract_id, boq_item_id);
      CREATE INDEX IF NOT EXISTS idx_cash_flow_project_contract ON cash_flow(project_id, contract_id);
      CREATE INDEX IF NOT EXISTS idx_variations_project_contract ON variations(project_id, contract_id);
      CREATE INDEX IF NOT EXISTS idx_reporting_periods_project ON reporting_periods(project_id);
      CREATE INDEX IF NOT EXISTS idx_boq_items_business_code ON boq_items(boq_header_id, json_extract(payload, '$.item_code'));
      CREATE INDEX IF NOT EXISTS idx_schedules_activity_code ON schedules(contract_id, json_extract(payload, '$.activity_code'));
      CREATE INDEX IF NOT EXISTS idx_wirs_business_number ON wir_entries(contract_id, json_extract(payload, '$.wir_number'));
      CREATE INDEX IF NOT EXISTS idx_variations_business_number ON variations(contract_id, json_extract(payload, '$.variation_number'));
      CREATE INDEX IF NOT EXISTS idx_cost_entries_date ON cost_entries(project_id, json_extract(payload, '$.date'));
      CREATE INDEX IF NOT EXISTS idx_wirs_inspection_date ON wir_entries(project_id, json_extract(payload, '$.inspection_date'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 14,
            description: "add_commercial_cost_cbs_wbs_masters",
            sql: r#"
      CREATE TABLE IF NOT EXISTS cost_codes (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
      );
      CREATE TABLE IF NOT EXISTS wbs_nodes (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT NOT NULL, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_codes_scope_code
        ON cost_codes(COALESCE(project_id, ''), lower(json_extract(payload, '$.cost_code')));
      CREATE UNIQUE INDEX IF NOT EXISTS uq_wbs_nodes_project_code
        ON wbs_nodes(project_id, lower(json_extract(payload, '$.wbs_code')));
      CREATE INDEX IF NOT EXISTS idx_cost_codes_project_parent
        ON cost_codes(project_id, json_extract(payload, '$.parent_cost_code_id'));
      CREATE INDEX IF NOT EXISTS idx_wbs_nodes_project_parent
        ON wbs_nodes(project_id, json_extract(payload, '$.parent_wbs_id'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 15,
            description: "add_contract_schedule_of_values",
            sql: r#"
      CREATE TABLE IF NOT EXISTS contract_sov_lines (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT NOT NULL, contract_id TEXT NOT NULL,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE SET NULL,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_main_contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_sov_line_code
        ON contract_sov_lines(contract_id, lower(json_extract(payload, '$.sov_line_code')));
      CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_sov_item
        ON contract_sov_lines(contract_id, COALESCE(boq_item_id, ''));
      CREATE INDEX IF NOT EXISTS idx_contract_sov_project_contract
        ON contract_sov_lines(project_id, contract_id);
      CREATE INDEX IF NOT EXISTS idx_contract_sov_cost_code
        ON contract_sov_lines(json_extract(payload, '$.cost_code_id'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 16,
            description: "govern_purchase_order_commitments",
            sql: r#"
      CREATE UNIQUE INDEX IF NOT EXISTS uq_procurement_purchase_order
        ON procurement(COALESCE(contract_id, ''), lower(json_extract(payload, '$.purchase_order_number')))
        WHERE json_extract(payload, '$.purchase_order_number') IS NOT NULL
          AND trim(json_extract(payload, '$.purchase_order_number')) <> '';
      CREATE INDEX IF NOT EXISTS idx_procurement_commitment_scope
        ON procurement(project_id, contract_id, boq_item_id, json_extract(payload, '$.status'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 17,
            description: "add_governed_payment_certificates",
            sql: r#"
      CREATE TABLE IF NOT EXISTS payment_certificates (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT NOT NULL, contract_id TEXT NOT NULL,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_certificate_number
        ON payment_certificates(contract_id, lower(json_extract(payload, '$.certificate_type')), lower(json_extract(payload, '$.certificate_number')));
      CREATE INDEX IF NOT EXISTS idx_payment_certificates_scope_status
        ON payment_certificates(project_id, contract_id, json_extract(payload, '$.status'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 18,
            description: "add_site_daily_reports",
            sql: r#"
      CREATE TABLE IF NOT EXISTS site_daily_reports (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT NOT NULL, contract_id TEXT,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_site_daily_report_number
        ON site_daily_reports(project_id, lower(json_extract(payload, '$.report_number')));
      CREATE INDEX IF NOT EXISTS idx_site_daily_reports_scope_date
        ON site_daily_reports(project_id, contract_id, json_extract(payload, '$.report_date'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 19,
            description: "expose_financial_reporting_columns",
            sql: r#"
      -- Generated columns keep legacy JSON rows readable while exposing the
      -- financial reporting facts to SQLite's query planner and future APIs.
      ALTER TABLE cost_entries ADD COLUMN financial_date TEXT GENERATED ALWAYS AS (json_extract(payload, '$.date')) VIRTUAL;
      ALTER TABLE cost_entries ADD COLUMN financial_amount REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE cost_entries ADD COLUMN financial_type TEXT GENERATED ALWAYS AS (json_extract(payload, '$.cost_type')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_cost_entries_financial_reporting ON cost_entries(project_id, contract_id, financial_date, financial_type);

      ALTER TABLE cash_flow ADD COLUMN financial_date TEXT GENERATED ALWAYS AS (json_extract(payload, '$.date')) VIRTUAL;
      ALTER TABLE cash_flow ADD COLUMN financial_inflow REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.inflow'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE cash_flow ADD COLUMN financial_outflow REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.outflow'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE cash_flow ADD COLUMN financial_status TEXT GENERATED ALWAYS AS (json_extract(payload, '$.status')) VIRTUAL;
      ALTER TABLE cash_flow ADD COLUMN movement_type_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.movement_type')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_cash_flow_financial_reporting ON cash_flow(project_id, contract_id, financial_date, movement_type_sql, financial_status);

      ALTER TABLE variations ADD COLUMN approved_date_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.approved_date')) VIRTUAL;
      ALTER TABLE variations ADD COLUMN cost_impact_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.cost_impact'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE variations ADD COLUMN status_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.status')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_variations_financial_reporting ON variations(project_id, contract_id, approved_date_sql, status_sql);

      ALTER TABLE client_invoices ADD COLUMN invoice_date_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.invoice_date')) VIRTUAL;
      ALTER TABLE client_invoices ADD COLUMN due_date_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.due_date')) VIRTUAL;
      ALTER TABLE client_invoices ADD COLUMN amount_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE client_invoices ADD COLUMN payment_status_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.payment_status')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_client_invoice_financial_reporting ON client_invoices(project_id, contract_id, invoice_date_sql, payment_status_sql);

      ALTER TABLE subcontractor_invoices ADD COLUMN invoice_date_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.invoice_date')) VIRTUAL;
      ALTER TABLE subcontractor_invoices ADD COLUMN amount_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE subcontractor_invoices ADD COLUMN payment_status_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.payment_status')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_sub_invoice_financial_reporting ON subcontractor_invoices(project_id, contract_id, invoice_date_sql, payment_status_sql);

      ALTER TABLE payment_certificates ADD COLUMN certificate_date_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.certificate_date')) VIRTUAL;
      ALTER TABLE payment_certificates ADD COLUMN gross_value_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.gross_certified_value'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE payment_certificates ADD COLUMN status_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.status')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_payment_certificate_financial_reporting ON payment_certificates(project_id, contract_id, certificate_date_sql, status_sql);

      ALTER TABLE contract_sov_lines ADD COLUMN budget_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.original_budget'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE contract_sov_lines ADD COLUMN forecast_sql REAL GENERATED ALWAYS AS (CAST(COALESCE(json_extract(payload, '$.forecast_at_completion'), 0) AS REAL)) VIRTUAL;
      ALTER TABLE contract_sov_lines ADD COLUMN status_sql TEXT GENERATED ALWAYS AS (json_extract(payload, '$.status')) VIRTUAL;
      CREATE INDEX IF NOT EXISTS idx_contract_sov_financial_reporting ON contract_sov_lines(project_id, contract_id, status_sql);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 20,
            description: "add_governed_cost_changes",
            sql: r#"
      CREATE TABLE IF NOT EXISTS cost_changes (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, project_id TEXT NOT NULL, contract_id TEXT NOT NULL,
        boq_header_id TEXT, boq_item_id TEXT, parent_main_project_id TEXT,
        parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_change_number
        ON cost_changes(contract_id, lower(json_extract(payload, '$.cost_change_number')));
      CREATE INDEX IF NOT EXISTS idx_cost_changes_scope_status
        ON cost_changes(project_id, contract_id, json_extract(payload, '$.status'), json_extract(payload, '$.effective_date'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 21,
            description: "add_normalized_financial_ledger",
            sql: r#"
      CREATE TABLE IF NOT EXISTS financial_ledger (
        id TEXT PRIMARY KEY,
        source_table TEXT NOT NULL,
        source_id TEXT NOT NULL,
        project_id TEXT,
        contract_id TEXT,
        boq_item_id TEXT,
        transaction_date TEXT,
        ledger_type TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        status TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(source_table, source_id)
      );
      CREATE INDEX IF NOT EXISTS idx_financial_ledger_reporting ON financial_ledger(project_id, contract_id, transaction_date, ledger_type, direction, status);

      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'cost:' || id, 'cost_entries', id, project_id, contract_id, boq_item_id, json_extract(payload, '$.date'), 'Actual Cost', 'Outflow', CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL), json_extract(payload, '$.cost_type'), created_at FROM cost_entries;
      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'cash:' || id, 'cash_flow', id, project_id, contract_id, boq_item_id, json_extract(payload, '$.date'), 'Cash Flow', CASE WHEN CAST(COALESCE(json_extract(payload, '$.inflow'), 0) AS REAL) > 0 THEN 'Inflow' ELSE 'Outflow' END, ABS(CAST(COALESCE(json_extract(payload, '$.inflow'), 0) AS REAL) - CAST(COALESCE(json_extract(payload, '$.outflow'), 0) AS REAL)), json_extract(payload, '$.status'), created_at FROM cash_flow;
      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'variation:' || id, 'variations', id, project_id, contract_id, boq_item_id, json_extract(payload, '$.approved_date'), 'Commercial Variation', CASE WHEN CAST(COALESCE(json_extract(payload, '$.cost_impact'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(payload, '$.cost_impact'), 0) AS REAL)), json_extract(payload, '$.status'), created_at FROM variations;
      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'certificate:' || id, 'payment_certificates', id, project_id, contract_id, boq_item_id, json_extract(payload, '$.certificate_date'), 'Payment Certificate', CASE WHEN json_extract(payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END, CAST(COALESCE(json_extract(payload, '$.gross_certified_value'), 0) AS REAL), json_extract(payload, '$.status'), created_at FROM payment_certificates;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_entries_ai AFTER INSERT ON cost_entries BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cost:' || NEW.id, 'cost_entries', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.date'), 'Actual Cost', 'Outflow', CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL), json_extract(NEW.payload, '$.cost_type'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_entries_au AFTER UPDATE ON cost_entries BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cost:' || NEW.id, 'cost_entries', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.date'), 'Actual Cost', 'Outflow', CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL), json_extract(NEW.payload, '$.cost_type'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_entries_ad AFTER DELETE ON cost_entries BEGIN DELETE FROM financial_ledger WHERE source_table = 'cost_entries' AND source_id = OLD.id; END;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_cash_flow_ai AFTER INSERT ON cash_flow BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cash:' || NEW.id, 'cash_flow', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.date'), 'Cash Flow', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.inflow'), 0) AS REAL) > 0 THEN 'Inflow' ELSE 'Outflow' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.inflow'), 0) AS REAL) - CAST(COALESCE(json_extract(NEW.payload, '$.outflow'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cash_flow_au AFTER UPDATE ON cash_flow BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cash:' || NEW.id, 'cash_flow', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.date'), 'Cash Flow', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.inflow'), 0) AS REAL) > 0 THEN 'Inflow' ELSE 'Outflow' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.inflow'), 0) AS REAL) - CAST(COALESCE(json_extract(NEW.payload, '$.outflow'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cash_flow_ad AFTER DELETE ON cash_flow BEGIN DELETE FROM financial_ledger WHERE source_table = 'cash_flow' AND source_id = OLD.id; END;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_variations_ai AFTER INSERT ON variations BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('variation:' || NEW.id, 'variations', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.approved_date'), 'Commercial Variation', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.cost_impact'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.cost_impact'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_variations_au AFTER UPDATE ON variations BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('variation:' || NEW.id, 'variations', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.approved_date'), 'Commercial Variation', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.cost_impact'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.cost_impact'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_variations_ad AFTER DELETE ON variations BEGIN DELETE FROM financial_ledger WHERE source_table = 'variations' AND source_id = OLD.id; END;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_payment_certificates_ai AFTER INSERT ON payment_certificates BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('certificate:' || NEW.id, 'payment_certificates', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.certificate_date'), 'Payment Certificate', CASE WHEN json_extract(NEW.payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END, CAST(COALESCE(json_extract(NEW.payload, '$.gross_certified_value'), 0) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_payment_certificates_au AFTER UPDATE ON payment_certificates BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('certificate:' || NEW.id, 'payment_certificates', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.certificate_date'), 'Payment Certificate', CASE WHEN json_extract(NEW.payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END, CAST(COALESCE(json_extract(NEW.payload, '$.gross_certified_value'), 0) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_payment_certificates_ad AFTER DELETE ON payment_certificates BEGIN DELETE FROM financial_ledger WHERE source_table = 'payment_certificates' AND source_id = OLD.id; END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 22,
            description: "govern_sov_cost_changes_and_commitment_ledger",
            sql: r#"
      -- A cost change is allocated to exactly one SOV line. The repository
      -- writes this real column as well as the audit payload.
      ALTER TABLE cost_changes ADD COLUMN contract_sov_line_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_cost_changes_sov_line ON cost_changes(contract_sov_line_id, project_id, contract_id, json_extract(payload, '$.status'));
      UPDATE cost_changes SET contract_sov_line_id = json_extract(payload, '$.contract_sov_line_id')
        WHERE contract_sov_line_id IS NULL;

      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'cost-change:' || id, 'cost_changes', id, project_id, contract_id, boq_item_id, COALESCE(json_extract(payload, '$.approved_date'), json_extract(payload, '$.effective_date')), 'Cost Change', CASE WHEN CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(payload, '$.amount'), 0) AS REAL)), json_extract(payload, '$.status'), created_at FROM cost_changes;
      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'commitment:' || id, 'procurement', id, project_id, contract_id, boq_item_id, COALESCE(json_extract(payload, '$.order_date'), json_extract(payload, '$.date')), 'Commitment', 'Commitment', CAST(COALESCE(json_extract(payload, '$.total_cost'), CAST(COALESCE(json_extract(payload, '$.quantity'), 0) AS REAL) * CAST(COALESCE(json_extract(payload, '$.unit_cost'), 0) AS REAL)) AS REAL), json_extract(payload, '$.status'), created_at FROM procurement;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_changes_ai AFTER INSERT ON cost_changes BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cost-change:' || NEW.id, 'cost_changes', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, COALESCE(json_extract(NEW.payload, '$.approved_date'), json_extract(NEW.payload, '$.effective_date')), 'Cost Change', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_changes_au AFTER UPDATE ON cost_changes BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('cost-change:' || NEW.id, 'cost_changes', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, COALESCE(json_extract(NEW.payload, '$.approved_date'), json_extract(NEW.payload, '$.effective_date')), 'Cost Change', CASE WHEN CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL) >= 0 THEN 'Increase' ELSE 'Decrease' END, ABS(CAST(COALESCE(json_extract(NEW.payload, '$.amount'), 0) AS REAL)), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_cost_changes_ad AFTER DELETE ON cost_changes BEGIN DELETE FROM financial_ledger WHERE source_table = 'cost_changes' AND source_id = OLD.id; END;

      CREATE TRIGGER IF NOT EXISTS financial_ledger_procurement_ai AFTER INSERT ON procurement BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('commitment:' || NEW.id, 'procurement', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, COALESCE(json_extract(NEW.payload, '$.order_date'), json_extract(NEW.payload, '$.date')), 'Commitment', 'Commitment', CAST(COALESCE(json_extract(NEW.payload, '$.total_cost'), CAST(COALESCE(json_extract(NEW.payload, '$.quantity'), 0) AS REAL) * CAST(COALESCE(json_extract(NEW.payload, '$.unit_cost'), 0) AS REAL)) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_procurement_au AFTER UPDATE ON procurement BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('commitment:' || NEW.id, 'procurement', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, COALESCE(json_extract(NEW.payload, '$.order_date'), json_extract(NEW.payload, '$.date')), 'Commitment', 'Commitment', CAST(COALESCE(json_extract(NEW.payload, '$.total_cost'), CAST(COALESCE(json_extract(NEW.payload, '$.quantity'), 0) AS REAL) * CAST(COALESCE(json_extract(NEW.payload, '$.unit_cost'), 0) AS REAL)) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_procurement_ad AFTER DELETE ON procurement BEGIN DELETE FROM financial_ledger WHERE source_table = 'procurement' AND source_id = OLD.id; END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 23,
            description: "repair_schedule_project_scope_from_contract",
            sql: r#"
      -- Older P6 schedule-only rows could retain the selected contract while
      -- missing project_id because project_id is a controlled UI relation.
      -- Repair both the relational column and JSON payload from that contract.
      UPDATE schedules
      SET project_id = (SELECT project_id FROM contracts WHERE contracts.id = schedules.contract_id),
          payload = json_set(payload, '$.project_id', (SELECT project_id FROM contracts WHERE contracts.id = schedules.contract_id))
      WHERE (project_id IS NULL OR project_id = '')
        AND contract_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM contracts WHERE contracts.id = schedules.contract_id AND contracts.project_id IS NOT NULL);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 24,
            description: "add_governed_import_batches",
            sql: r#"
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        committed_at TEXT,
        source TEXT NOT NULL,
        file_name TEXT NOT NULL,
        target_table TEXT NOT NULL,
        project_id TEXT,
        contract_id TEXT,
        status TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        committed_count INTEGER NOT NULL DEFAULT 0,
        rejected_count INTEGER NOT NULL DEFAULT 0,
        summary_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_batch_rows (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        source_row_number INTEGER NOT NULL,
        target_table TEXT NOT NULL,
        target_record_id TEXT,
        status TEXT NOT NULL,
        error_json TEXT,
        source_json TEXT NOT NULL,
        mapped_json TEXT NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_import_batches_scope
        ON import_batches(project_id, contract_id, target_table, status);
      CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch
        ON import_batch_rows(batch_id, source_row_number);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 25,
            description: "add_procurement_receipts_for_actual_cost",
            sql: r#"
      CREATE TABLE IF NOT EXISTS procurement_receipts (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
        project_id TEXT NOT NULL, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT,
        parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_procurement_receipt_number
        ON procurement_receipts(lower(json_extract(payload, '$.receipt_number')));
      CREATE INDEX IF NOT EXISTS idx_procurement_receipts_scope_po
        ON procurement_receipts(project_id, contract_id, boq_item_id, json_extract(payload, '$.procurement_id'), json_extract(payload, '$.status'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 26,
            description: "add_supplier_ap_three_way_match",
            sql: r#"
      CREATE TABLE IF NOT EXISTS supplier_invoices (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
        project_id TEXT NOT NULL, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT,
        parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_invoice_supplier_number
        ON supplier_invoices(json_extract(payload, '$.supplier_party_id'), lower(json_extract(payload, '$.invoice_number')));
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_scope_status
        ON supplier_invoices(project_id, contract_id, json_extract(payload, '$.supplier_party_id'), json_extract(payload, '$.status'));
      CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
        project_id TEXT NOT NULL, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT,
        parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
        FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_match
        ON supplier_invoice_lines(json_extract(payload, '$.supplier_invoice_id'), json_extract(payload, '$.procurement_receipt_id'));
      CREATE TABLE IF NOT EXISTS supplier_invoice_payments (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
        project_id TEXT NOT NULL, contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT,
        parent_main_project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_payment_reference
        ON supplier_invoice_payments(lower(json_extract(payload, '$.payment_number')));
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_payments_invoice
        ON supplier_invoice_payments(json_extract(payload, '$.supplier_invoice_id'), json_extract(payload, '$.status'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 27,
            description: "add_supplier_ap_posting_audit",
            sql: r#"
      CREATE TABLE IF NOT EXISTS supplier_ap_postings (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, source_table TEXT NOT NULL,
        source_id TEXT NOT NULL, posting_type TEXT NOT NULL, status TEXT NOT NULL,
        actor TEXT NOT NULL, effective_date TEXT, reason TEXT NOT NULL, snapshot_json TEXT NOT NULL,
        UNIQUE(source_table, source_id, posting_type)
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_ap_postings_source ON supplier_ap_postings(source_table, source_id, status);
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 28,
            description: "lock_governed_supplier_ap_documents",
            sql: r#"
      CREATE TABLE IF NOT EXISTS supplier_ap_mutation_guard (
        operation_id TEXT PRIMARY KEY, created_at TEXT NOT NULL
      );
      CREATE TRIGGER IF NOT EXISTS supplier_invoice_governed_insert
      BEFORE INSERT ON supplier_invoices
      WHEN json_extract(NEW.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Supplier AP approval must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_invoice_governed_update
      BEFORE UPDATE ON supplier_invoices
      WHEN (json_extract(OLD.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
         OR json_extract(NEW.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed'))
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed supplier invoice is immutable; use a reversal.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_payment_governed_insert
      BEFORE INSERT ON supplier_invoice_payments
      WHEN json_extract(NEW.payload, '$.status') IN ('Settled','Reversed')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Supplier payment settlement must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_payment_governed_update
      BEFORE UPDATE ON supplier_invoice_payments
      WHEN (json_extract(OLD.payload, '$.status') IN ('Settled','Reversed')
         OR json_extract(NEW.payload, '$.status') IN ('Settled','Reversed'))
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed supplier payment is immutable; use a reversal.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_ap_line_governed_update
      BEFORE UPDATE ON supplier_invoice_lines
      WHEN EXISTS (
        SELECT 1 FROM supplier_invoices i
        WHERE i.id = json_extract(OLD.payload, '$.supplier_invoice_id')
          AND json_extract(i.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
      ) AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Approved supplier invoice match lines are immutable.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_ap_line_governed_delete
      BEFORE DELETE ON supplier_invoice_lines
      WHEN EXISTS (
        SELECT 1 FROM supplier_invoices i
        WHERE i.id = json_extract(OLD.payload, '$.supplier_invoice_id')
          AND json_extract(i.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
      ) AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Approved supplier invoice match lines are immutable.'); END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        // The command layer already owns AP state changes.  These initial
        // triggers are retired immediately until all legacy direct-write
        // paths have been migrated to the scoped mutation guard.
        tauri_plugin_sql::Migration {
            version: 29,
            description: "retire_incomplete_supplier_ap_sql_guards",
            sql: r#"
      DROP TRIGGER IF EXISTS supplier_invoice_governed_insert;
      DROP TRIGGER IF EXISTS supplier_invoice_governed_update;
      DROP TRIGGER IF EXISTS supplier_payment_governed_insert;
      DROP TRIGGER IF EXISTS supplier_payment_governed_update;
      DROP TRIGGER IF EXISTS supplier_ap_line_governed_update;
      DROP TRIGGER IF EXISTS supplier_ap_line_governed_delete;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 30,
            description: "enforce_supplier_ap_posting_entry_points",
            sql: r#"
      CREATE TRIGGER IF NOT EXISTS supplier_invoice_governed_insert_v2
      BEFORE INSERT ON supplier_invoices
      WHEN json_extract(NEW.payload, '$.status') IN ('Approved','Partially Paid','Paid')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Supplier AP approval must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_invoice_governed_update_v2
      BEFORE UPDATE ON supplier_invoices
      WHEN json_extract(NEW.payload, '$.status') IN ('Approved','Partially Paid','Paid')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed supplier invoice changes must use an AP posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_payment_governed_insert_v2
      BEFORE INSERT ON supplier_invoice_payments
      WHEN json_extract(NEW.payload, '$.status') = 'Settled'
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Supplier payment settlement must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_payment_governed_update_v2
      BEFORE UPDATE ON supplier_invoice_payments
      WHEN json_extract(NEW.payload, '$.status') = 'Settled'
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed supplier payment changes must use an AP posting.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_ap_line_governed_update_v2
      BEFORE UPDATE ON supplier_invoice_lines
      WHEN EXISTS (
        SELECT 1 FROM supplier_invoices i
        WHERE i.id = json_extract(OLD.payload, '$.supplier_invoice_id')
          AND json_extract(i.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
      )
      BEGIN SELECT RAISE(ABORT, 'Approved supplier invoice match lines are immutable.'); END;
      CREATE TRIGGER IF NOT EXISTS supplier_ap_line_governed_delete_v2
      BEFORE DELETE ON supplier_invoice_lines
      WHEN EXISTS (
        SELECT 1 FROM supplier_invoices i
        WHERE i.id = json_extract(OLD.payload, '$.supplier_invoice_id')
          AND json_extract(i.payload, '$.status') IN ('Approved','Partially Paid','Paid','Reversed')
      )
      BEGIN SELECT RAISE(ABORT, 'Approved supplier invoice match lines are immutable.'); END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 31,
            description: "govern_commercial_sov_cost_change_and_certificate_postings",
            sql: r#"
      CREATE TABLE IF NOT EXISTS commercial_workflow_postings (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, source_table TEXT NOT NULL,
        source_id TEXT NOT NULL, posting_type TEXT NOT NULL, status TEXT NOT NULL,
        actor TEXT NOT NULL, effective_date TEXT, reason TEXT NOT NULL, snapshot_json TEXT NOT NULL,
        UNIQUE(source_table, source_id, posting_type)
      );
      CREATE INDEX IF NOT EXISTS idx_commercial_workflow_postings_source
        ON commercial_workflow_postings(source_table, source_id, status);
      CREATE TABLE IF NOT EXISTS commercial_mutation_guard (
        operation_id TEXT PRIMARY KEY, created_at TEXT NOT NULL
      );

      -- The ledger is a reporting fact. Certificates report their governed
      -- net certified value once it has been calculated by the posting command.
      DROP TRIGGER IF EXISTS financial_ledger_payment_certificates_ai;
      DROP TRIGGER IF EXISTS financial_ledger_payment_certificates_au;
      INSERT OR REPLACE INTO financial_ledger (id, source_table, source_id, project_id, contract_id, boq_item_id, transaction_date, ledger_type, direction, amount, status, created_at)
        SELECT 'certificate:' || id, 'payment_certificates', id, project_id, contract_id, boq_item_id,
          json_extract(payload, '$.certificate_date'), 'Payment Certificate',
          CASE WHEN json_extract(payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END,
          CAST(COALESCE(json_extract(payload, '$.net_certified_value'), json_extract(payload, '$.gross_certified_value'), 0) AS REAL),
          json_extract(payload, '$.status'), created_at FROM payment_certificates;
      CREATE TRIGGER financial_ledger_payment_certificates_ai AFTER INSERT ON payment_certificates BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('certificate:' || NEW.id, 'payment_certificates', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.certificate_date'), 'Payment Certificate', CASE WHEN json_extract(NEW.payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END, CAST(COALESCE(json_extract(NEW.payload, '$.net_certified_value'), json_extract(NEW.payload, '$.gross_certified_value'), 0) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;
      CREATE TRIGGER financial_ledger_payment_certificates_au AFTER UPDATE ON payment_certificates BEGIN
        INSERT OR REPLACE INTO financial_ledger VALUES ('certificate:' || NEW.id, 'payment_certificates', NEW.id, NEW.project_id, NEW.contract_id, NEW.boq_item_id, json_extract(NEW.payload, '$.certificate_date'), 'Payment Certificate', CASE WHEN json_extract(NEW.payload, '$.certificate_type') = 'Client' THEN 'Inflow' ELSE 'Outflow' END, CAST(COALESCE(json_extract(NEW.payload, '$.net_certified_value'), json_extract(NEW.payload, '$.gross_certified_value'), 0) AS REAL), json_extract(NEW.payload, '$.status'), NEW.created_at);
      END;

      CREATE TRIGGER IF NOT EXISTS cost_change_governed_insert_v1
      BEFORE INSERT ON cost_changes
      WHEN json_extract(NEW.payload, '$.status') IN ('Approved','Reversed')
       AND NOT EXISTS (SELECT 1 FROM commercial_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Cost-change approval must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS cost_change_governed_update_v1
      BEFORE UPDATE ON cost_changes
      WHEN (json_extract(OLD.payload, '$.status') IN ('Approved','Reversed')
         OR json_extract(NEW.payload, '$.status') IN ('Approved','Reversed'))
       AND NOT EXISTS (SELECT 1 FROM commercial_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed cost change is immutable; use a reversal.'); END;
      CREATE TRIGGER IF NOT EXISTS certificate_governed_insert_v1
      BEFORE INSERT ON payment_certificates
      WHEN json_extract(NEW.payload, '$.status') IN ('Approved','Paid','Reversed')
       AND NOT EXISTS (SELECT 1 FROM commercial_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Certificate approval must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS certificate_governed_update_v1
      BEFORE UPDATE ON payment_certificates
      WHEN (json_extract(OLD.payload, '$.status') IN ('Approved','Paid','Reversed')
         OR json_extract(NEW.payload, '$.status') IN ('Approved','Paid','Reversed'))
       AND NOT EXISTS (SELECT 1 FROM commercial_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed payment certificate is immutable; use settlement or reversal.'); END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 32,
            description: "govern_purchase_order_commitment_and_grn_acceptance",
            sql: r#"
      CREATE TRIGGER IF NOT EXISTS procurement_governed_insert_v1
      BEFORE INSERT ON procurement
      WHEN json_extract(NEW.payload, '$.status') IN ('Ordered','Partially Delivered','Delivered','Closed')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Purchase-order approval must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS procurement_governed_update_v1
      BEFORE UPDATE ON procurement
      WHEN (json_extract(OLD.payload, '$.status') IN ('Ordered','Partially Delivered','Delivered','Closed')
         OR json_extract(NEW.payload, '$.status') IN ('Ordered','Partially Delivered','Delivered','Closed'))
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed purchase order is immutable; use a controlled amendment or reversal.'); END;
      CREATE TRIGGER IF NOT EXISTS procurement_receipt_governed_insert_v1
      BEFORE INSERT ON procurement_receipts
      WHEN json_extract(NEW.payload, '$.status') = 'Accepted'
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'GRN acceptance must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS procurement_receipt_governed_update_v1
      BEFORE UPDATE ON procurement_receipts
      WHEN (json_extract(OLD.payload, '$.status') = 'Accepted'
         OR json_extract(NEW.payload, '$.status') = 'Accepted')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Accepted GRN is immutable; use a controlled correction.'); END;
      CREATE INDEX IF NOT EXISTS idx_procurement_commitment_status
        ON procurement(project_id, contract_id, boq_item_id, json_extract(payload, '$.status'));
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 33,
            description: "govern_purchase_order_cancellation",
            sql: r#"
      CREATE TRIGGER IF NOT EXISTS procurement_governed_cancel_insert_v1
      BEFORE INSERT ON procurement
      WHEN json_extract(NEW.payload, '$.status') = 'Cancelled'
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Purchase-order cancellation must use a governed posting.'); END;
      CREATE TRIGGER IF NOT EXISTS procurement_governed_cancel_update_v1
      BEFORE UPDATE ON procurement
      WHEN (json_extract(OLD.payload, '$.status') = 'Cancelled'
         OR json_extract(NEW.payload, '$.status') = 'Cancelled')
       AND NOT EXISTS (SELECT 1 FROM supplier_ap_mutation_guard)
      BEGIN SELECT RAISE(ABORT, 'Governed purchase-order cancellation is immutable.'); END;
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:buildtrack.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            save_excel_download,
            save_document_attachment,
            backup_local_database,
            verify_local_backup,
            stage_local_restore
            ,commit_governed_import, reverse_governed_import, reverse_supplier_ap_posting, approve_supplier_invoice, settle_supplier_invoice_payment, approve_purchase_order, accept_procurement_receipt, cancel_purchase_order,
            approve_cost_change, approve_payment_certificate, settle_payment_certificate, reverse_commercial_posting
        ])
        .setup(|app| {
            apply_staged_restore(app.handle())?;
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
