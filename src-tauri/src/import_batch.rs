use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sqlx::{sqlite::SqliteConnectOptions, Sqlite, SqlitePool, Transaction};
use std::{collections::HashSet, path::Path};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitRequest {
    pub batch_id: String,
    pub source: String,
    pub file_name: String,
    pub target_table: String,
    pub project_id: String,
    pub contract_id: String,
    pub rows: Vec<Value>,
    #[serde(default)]
    pub derived_patches: Vec<ImportDerivedPatch>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDerivedPatch { pub table: String, pub id: String, pub patch: Value }

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReverseRequest { pub batch_id: String, pub reason: String }

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitResult {
    pub batch_id: String,
    pub status: String,
    pub committed_count: usize,
    pub committed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReverseResult { pub batch_id: String, pub status: String, pub reversed_count: usize }

fn now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    format!("{}Z", millis)
}

fn supported_table(table: &str) -> bool {
    matches!(table, "boq_items" | "schedules" | "wir_entries")
}

fn string_value(row: &Map<String, Value>, key: &str) -> String {
    row.get(key).and_then(Value::as_str).unwrap_or_default().trim().to_string()
}

fn number_value(row: &Map<String, Value>, key: &str) -> f64 {
    row.get(key).and_then(Value::as_f64).or_else(|| row.get(key).and_then(Value::as_str).and_then(|value| value.parse().ok())).unwrap_or(0.0)
}

async fn query_payloads(tx: &mut Transaction<'_, Sqlite>, table: &str, project_id: &str, contract_id: &str) -> Result<Vec<Value>, String> {
    let sql = match table {
        "boq_items" => "SELECT b.payload FROM boq_items b JOIN boq_headers h ON h.id=b.boq_header_id WHERE b.project_id=?",
        "schedules" | "wir_entries" => {
            let rows = sqlx::query_scalar::<_, String>(&format!("SELECT payload FROM {table} WHERE project_id=? AND contract_id=?"))
                .bind(project_id).bind(contract_id).fetch_all(&mut **tx).await.map_err(|error| error.to_string())?;
            return Ok(rows.into_iter().filter_map(|payload| serde_json::from_str(&payload).ok()).collect());
        }
        _ => return Ok(vec![]),
    };
    let rows = sqlx::query_scalar::<_, String>(sql).bind(project_id).fetch_all(&mut **tx).await.map_err(|error| error.to_string())?;
    Ok(rows.into_iter().filter_map(|payload| serde_json::from_str(&payload).ok()).collect())
}

async fn validate_scope(tx: &mut Transaction<'_, Sqlite>, request: &ImportCommitRequest, row: &Map<String, Value>, source_row: usize) -> Result<(), String> {
    let contract_project: Option<String> = sqlx::query_scalar("SELECT project_id FROM contracts WHERE id=?")
        .bind(&request.contract_id).fetch_optional(&mut **tx).await.map_err(|error| error.to_string())?;
    if contract_project.as_deref() != Some(request.project_id.as_str()) {
        return Err(format!("Row {source_row}: selected contract is missing or outside the selected project."));
    }
    let row_project = string_value(row, "project_id");
    if !row_project.is_empty() && row_project != request.project_id {
        return Err(format!("Row {source_row}: project scope does not match the selected project."));
    }
    let row_contract = string_value(row, "contract_id");
    if !row_contract.is_empty() && row_contract != request.contract_id {
        return Err(format!("Row {source_row}: contract scope does not match the selected contract."));
    }
    if request.target_table == "boq_items" {
        let header_id = string_value(row, "boq_header_id");
        let header_contract: Option<String> = sqlx::query_scalar("SELECT contract_id FROM boq_headers WHERE id=? AND project_id=?")
            .bind(&header_id).bind(&request.project_id).fetch_optional(&mut **tx).await.map_err(|error| error.to_string())?;
        if header_contract.as_deref() != Some(request.contract_id.as_str()) {
            return Err(format!("Row {source_row}: BOQ header is missing or outside the selected contract."));
        }
    } else if request.target_table == "wir_entries" || !row.get("boq_item_id").map(Value::is_null).unwrap_or(true) {
        let item_id = string_value(row, "boq_item_id");
        if !item_id.is_empty() {
            let item_contract: Option<String> = sqlx::query_scalar(
                "SELECT h.contract_id FROM boq_items b JOIN boq_headers h ON h.id=b.boq_header_id WHERE b.id=? AND b.project_id=?",
            ).bind(&item_id).bind(&request.project_id).fetch_optional(&mut **tx).await.map_err(|error| error.to_string())?;
            if item_contract.as_deref() != Some(request.contract_id.as_str()) {
                return Err(format!("Row {source_row}: BOQ item is missing or outside the selected contract."));
            }
        } else if request.target_table == "wir_entries" {
            return Err(format!("Row {source_row}: WIR requires a BOQ item."));
        }
    }
    Ok(())
}

async fn validate_rows(tx: &mut Transaction<'_, Sqlite>, request: &ImportCommitRequest) -> Result<(), String> {
    if !supported_table(&request.target_table) { return Err("This import target is not governed by atomic import.".into()); }
    if request.rows.is_empty() { return Err("The import contains no rows.".into()); }
    let existing = query_payloads(tx, &request.target_table, &request.project_id, &request.contract_id).await?;
    let mut codes = HashSet::new();
    let mut planned_by_item: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut wir_by_item: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for payload in existing {
        let object = payload.as_object().cloned().unwrap_or_default();
        let code_key = match request.target_table.as_str() { "boq_items" => "item_code", "schedules" => "activity_code", _ => "wir_number" };
        let code = string_value(&object, code_key).to_lowercase();
        if !code.is_empty() { codes.insert(code); }
        if request.target_table == "schedules" { *planned_by_item.entry(string_value(&object, "boq_item_id")).or_default() += number_value(&object, "planned_quantity"); }
        if request.target_table == "wir_entries" && string_value(&object, "result").to_lowercase() != "fail" { *wir_by_item.entry(string_value(&object, "boq_item_id")).or_default() += number_value(&object, "quantity"); }
    }
    for (index, value) in request.rows.iter().enumerate() {
        let source_row = index + 2;
        let row = value.as_object().ok_or_else(|| format!("Row {source_row}: import data is not an object."))?;
        if string_value(row, "id").is_empty() { return Err(format!("Row {source_row}: missing controlled record identifier.")); }
        await_scope(tx, request, row, source_row).await?;
        let code_key = match request.target_table.as_str() { "boq_items" => "item_code", "schedules" => "activity_code", _ => "wir_number" };
        let code = string_value(row, code_key).to_lowercase();
        if code.is_empty() { return Err(format!("Row {source_row}: {code_key} is required.")); }
        if !codes.insert(code) { return Err(format!("Row {source_row}: duplicate {code_key}; no rows were saved.")); }
        if request.target_table == "schedules" || request.target_table == "wir_entries" {
            let item_id = string_value(row, "boq_item_id");
            if !item_id.is_empty() {
                let capacity: Option<f64> = sqlx::query_scalar("SELECT CAST(json_extract(payload, '$.quantity') AS REAL) FROM boq_items WHERE id=?")
                    .bind(&item_id).fetch_optional(&mut **tx).await.map_err(|error| error.to_string())?;
                let quantity_key = if request.target_table == "schedules" { "planned_quantity" } else { "quantity" };
                let amount = number_value(row, quantity_key);
                if amount <= 0.0 { return Err(format!("Row {source_row}: {quantity_key} must be greater than zero.")); }
                let totals = if request.target_table == "schedules" { &mut planned_by_item } else { &mut wir_by_item };
                let total = totals.entry(item_id.clone()).or_default();
                *total += amount;
                if *total > capacity.unwrap_or(0.0) + 0.000001 { return Err(format!("Row {source_row}: cumulative {quantity_key} exceeds the BOQ quantity; no rows were saved.")); }
            }
        }
    }
    Ok(())
}

// The alias makes the validation flow easier to read while retaining a small
// function above that is directly testable in the SQLite transaction.
async fn await_scope(tx: &mut Transaction<'_, Sqlite>, request: &ImportCommitRequest, row: &Map<String, Value>, source_row: usize) -> Result<(), String> {
    validate_scope(tx, request, row, source_row).await
}

async fn insert_target(tx: &mut Transaction<'_, Sqlite>, table: &str, row: &Map<String, Value>) -> Result<(), String> {
    let id = string_value(row, "id"); let created = string_value(row, "created_at");
    let payload = Value::Object(row.clone()).to_string();
    if table == "boq_items" {
        sqlx::query("INSERT INTO boq_items (id,created_at,project_id,boq_header_id,payload) VALUES (?,?,?,?,?)")
            .bind(id).bind(created).bind(string_value(row,"project_id")).bind(string_value(row,"boq_header_id")).bind(payload).execute(&mut **tx).await.map_err(|error| error.to_string())?;
    } else {
        sqlx::query(&format!("INSERT INTO {table} (id,created_at,project_id,contract_id,parent_main_project_id,parent_main_contract_id,boq_header_id,boq_item_id,payload) VALUES (?,?,?,?,?,?,?,?,?)"))
            .bind(id).bind(created).bind(string_value(row,"project_id")).bind(string_value(row,"contract_id"))
            .bind(string_value(row,"parent_main_project_id")).bind(string_value(row,"parent_main_contract_id"))
            .bind(string_value(row,"boq_header_id")).bind(string_value(row,"boq_item_id")).bind(payload).execute(&mut **tx).await.map_err(|error| error.to_string())?;
    }
    Ok(())
}

async fn update_payload(tx: &mut Transaction<'_, Sqlite>, table: &str, id: &str, patch: &Value) -> Result<(Value, Value), String> {
    if !matches!(table, "boq_items" | "contracts") { return Err("Only BOQ item and contract derived updates are allowed in an import batch.".into()); }
    let before_text: String = sqlx::query_scalar(&format!("SELECT payload FROM {table} WHERE id=?")).bind(id).fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Derived update record {id} was not found."))?;
    let mut after: Value = serde_json::from_str(&before_text).map_err(|e| e.to_string())?;
    let after_object = after.as_object_mut().ok_or("Derived update payload is not an object.")?;
    for (key, value) in patch.as_object().ok_or("Derived update patch is not an object.")? { after_object.insert(key.clone(), value.clone()); }
    if table == "boq_items" {
        sqlx::query("UPDATE boq_items SET project_id=?,boq_header_id=?,payload=? WHERE id=?")
            .bind(string_value(after_object,"project_id")).bind(string_value(after_object,"boq_header_id")).bind(after.to_string()).bind(id).execute(&mut **tx).await.map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE contracts SET project_id=?,parent_main_contract_id=?,payload=? WHERE id=?")
            .bind(string_value(after_object,"project_id")).bind(string_value(after_object,"parent_main_contract_id")).bind(after.to_string()).bind(id).execute(&mut **tx).await.map_err(|e| e.to_string())?;
    }
    Ok((serde_json::from_str(&before_text).map_err(|e| e.to_string())?, after))
}

pub async fn commit_governed_import(database_path: &Path, request: ImportCommitRequest) -> Result<ImportCommitResult, String> {
    let options = SqliteConnectOptions::new().filename(database_path).create_if_missing(true).foreign_keys(true);
    let pool = SqlitePool::connect_with(options).await.map_err(|error| error.to_string())?;
    let started = now();
    let mut tx = pool.begin().await.map_err(|error| error.to_string())?;
    let outcome = async {
        sqlx::query("INSERT INTO import_batches (id,created_at,source,file_name,target_table,project_id,contract_id,status,row_count,summary_json) VALUES (?,?,?,?,?,?,?,?,?,?)")
            .bind(&request.batch_id).bind(&started).bind(&request.source).bind(&request.file_name).bind(&request.target_table).bind(&request.project_id).bind(&request.contract_id).bind("Validating").bind(request.rows.len() as i64).bind("{}").execute(&mut *tx).await.map_err(|error| error.to_string())?;
        validate_rows(&mut tx, &request).await?;
        for (index, value) in request.rows.iter().enumerate() {
            let row = value.as_object().ok_or_else(|| format!("Row {}: invalid mapped payload.", index + 2))?;
            insert_target(&mut tx, &request.target_table, row).await?;
            let record_id = string_value(row, "id");
            let audit_id = format!("{}-audit-{}", request.batch_id, index + 2);
            let audit_payload = json!({
                "id": audit_id, "created_at": started, "project_id": request.project_id,
                "contract_id": request.contract_id, "entity_type": request.target_table,
                "entity_id": record_id, "action": "Insert", "actor": "Local User",
                "after": Value::Object(row.clone()), "summary": format!("Atomic import {}", request.batch_id),
                "import_batch_id": request.batch_id,
            });
            sqlx::query("INSERT INTO audit_log (id,created_at,project_id,contract_id,parent_main_project_id,parent_main_contract_id,boq_header_id,boq_item_id,payload) VALUES (?,?,?,?,?,?,?,?,?)")
                .bind(&audit_id).bind(&started).bind(&request.project_id).bind(&request.contract_id)
                .bind("").bind("").bind(string_value(row,"boq_header_id")).bind(string_value(row,"boq_item_id")).bind(audit_payload.to_string())
                .execute(&mut *tx).await.map_err(|error| error.to_string())?;
            sqlx::query("INSERT INTO import_batch_rows (id,batch_id,source_row_number,target_table,target_record_id,status,source_json,mapped_json) VALUES (?,?,?,?,?,?,?,?)")
                .bind(format!("{}-{}", request.batch_id, index + 2)).bind(&request.batch_id).bind((index + 2) as i64).bind(&request.target_table).bind(string_value(row,"id")).bind("Committed").bind(value.to_string()).bind(value.to_string()).execute(&mut *tx).await.map_err(|error| error.to_string())?;
        }
        for (index, derived) in request.derived_patches.iter().enumerate() {
            let (before, after) = update_payload(&mut tx, &derived.table, &derived.id, &derived.patch).await?;
            sqlx::query("INSERT INTO import_batch_rows (id,batch_id,source_row_number,target_table,target_record_id,status,source_json,mapped_json) VALUES (?,?,?,?,?,?,?,?)")
                .bind(format!("{}-derived-{}", request.batch_id, index + 1)).bind(&request.batch_id).bind(0_i64).bind(&derived.table).bind(&derived.id).bind("Updated").bind(before.to_string()).bind(after.to_string()).execute(&mut *tx).await.map_err(|error| error.to_string())?;
        }
        let committed = now();
        sqlx::query("UPDATE import_batches SET status='Committed',committed_at=?,committed_count=? WHERE id=?")
            .bind(&committed).bind(request.rows.len() as i64).bind(&request.batch_id).execute(&mut *tx).await.map_err(|error| error.to_string())?;
        Ok::<String, String>(committed)
    }.await;
    match outcome {
        Ok(committed_at) => { tx.commit().await.map_err(|error| error.to_string())?; Ok(ImportCommitResult { batch_id: request.batch_id, status: "Committed".into(), committed_count: request.rows.len(), committed_at }) }
        Err(error) => { tx.rollback().await.map_err(|rollback| rollback.to_string())?; Err(error) }
    }
}

pub async fn reverse_governed_import(database_path: &Path, request: ImportReverseRequest) -> Result<ImportReverseResult, String> {
    let pool = SqlitePool::connect_with(SqliteConnectOptions::new().filename(database_path).create_if_missing(true).foreign_keys(true)).await.map_err(|e| e.to_string())?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let status: Option<String> = sqlx::query_scalar("SELECT status FROM import_batches WHERE id=?").bind(&request.batch_id).fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
    if status.as_deref() != Some("Committed") { return Err("Only a committed import batch can be reversed.".into()); }
    let rows = sqlx::query_as::<_, (String, String, String, String)>("SELECT target_table,target_record_id,status,source_json FROM import_batch_rows WHERE batch_id=? ORDER BY source_row_number DESC")
        .bind(&request.batch_id).fetch_all(&mut *tx).await.map_err(|e| e.to_string())?;
    for (table, id, row_status, source) in &rows {
        if row_status == "Committed" { sqlx::query(&format!("DELETE FROM {table} WHERE id=?")).bind(id).execute(&mut *tx).await.map_err(|e| format!("Cannot reverse batch because {table} record {id} is referenced by later data: {e}"))?; }
        if row_status == "Updated" {
            let original: Value = serde_json::from_str(source).map_err(|e| e.to_string())?;
            update_payload(&mut tx, table, id, &original).await?;
        }
    }
    sqlx::query("UPDATE import_batches SET status='Reversed', summary_json=? WHERE id=?").bind(json!({"reversal_reason":request.reason,"reversed_at":now()}).to_string()).bind(&request.batch_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(ImportReverseResult { batch_id: request.batch_id, status: "Reversed".into(), reversed_count: rows.len() })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup(path: &Path) {
        let options = SqliteConnectOptions::new().filename(path).create_if_missing(true).foreign_keys(true);
        let pool = SqlitePool::connect_with(options).await.unwrap();
        for sql in [
            "CREATE TABLE projects (id TEXT PRIMARY KEY)",
            "CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT)",
            "CREATE TABLE boq_headers (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT)",
            "CREATE TABLE boq_items (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, boq_header_id TEXT, payload TEXT)",
            "CREATE TABLE schedules (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, payload TEXT)",
            "CREATE TABLE wir_entries (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, payload TEXT)",
            "CREATE TABLE audit_log (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, parent_main_project_id TEXT, parent_main_contract_id TEXT, boq_header_id TEXT, boq_item_id TEXT, payload TEXT)",
            "CREATE TABLE import_batches (id TEXT PRIMARY KEY, created_at TEXT, committed_at TEXT, source TEXT, file_name TEXT, target_table TEXT, project_id TEXT, contract_id TEXT, status TEXT, row_count INTEGER, committed_count INTEGER, rejected_count INTEGER, summary_json TEXT)",
            "CREATE TABLE import_batch_rows (id TEXT PRIMARY KEY, batch_id TEXT, source_row_number INTEGER, target_table TEXT, target_record_id TEXT, status TEXT, error_json TEXT, source_json TEXT, mapped_json TEXT)",
        ] { sqlx::query(sql).execute(&pool).await.unwrap(); }
        sqlx::query("INSERT INTO projects VALUES ('p1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO contracts VALUES ('c1','p1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO boq_headers VALUES ('h1','p1','c1')").execute(&pool).await.unwrap();
        pool.close().await;
    }

    #[tokio::test]
    async fn late_duplicate_rolls_back_every_target_and_audit_row() {
        let path = std::env::temp_dir().join(format!("buildtrack-import-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        let request = ImportCommitRequest { batch_id: "batch-1".into(), source: "Excel".into(), file_name: "boq.xlsx".into(), target_table: "boq_items".into(), project_id: "p1".into(), contract_id: "c1".into(), rows: vec![
            json!({"id":"i1","created_at":"2026-01-01T00:00:00Z","project_id":"p1","boq_header_id":"h1","item_code":"A-01","quantity":10}),
            json!({"id":"i2","created_at":"2026-01-01T00:00:00Z","project_id":"p1","boq_header_id":"h1","item_code":"A-01","quantity":10}),
        ], derived_patches: vec![] };
        assert!(commit_governed_import(&path, request).await.is_err());
        let pool = SqlitePool::connect_with(SqliteConnectOptions::new().filename(&path).foreign_keys(true)).await.unwrap();
        assert_eq!(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM boq_items").fetch_one(&pool).await.unwrap(), 0);
        assert_eq!(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM audit_log").fetch_one(&pool).await.unwrap(), 0);
        assert_eq!(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM import_batches").fetch_one(&pool).await.unwrap(), 0);
        pool.close().await;
        let _ = std::fs::remove_file(&path);
    }

    #[tokio::test]
    async fn reverse_removes_the_entire_committed_batch() {
        let path = std::env::temp_dir().join(format!("buildtrack-import-reverse-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        let request = ImportCommitRequest {
            batch_id: "batch-reverse".into(), source: "Excel".into(), file_name: "boq.xlsx".into(), target_table: "boq_items".into(), project_id: "p1".into(), contract_id: "c1".into(),
            rows: vec![json!({"id":"i1","created_at":"2026-01-01T00:00:00Z","project_id":"p1","boq_header_id":"h1","item_code":"A-01","quantity":10})],
            derived_patches: vec![],
        };
        let committed = commit_governed_import(&path, request).await.unwrap();
        assert_eq!(committed.status, "Committed");
        let reversed = reverse_governed_import(&path, ImportReverseRequest { batch_id: "batch-reverse".into(), reason: "acceptance test".into() }).await.unwrap();
        assert_eq!(reversed.status, "Reversed");
        assert_eq!(reversed.reversed_count, 1);
        let pool = SqlitePool::connect_with(SqliteConnectOptions::new().filename(&path).foreign_keys(true)).await.unwrap();
        assert_eq!(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM boq_items").fetch_one(&pool).await.unwrap(), 0);
        assert_eq!(sqlx::query_scalar::<_, String>("SELECT status FROM import_batches WHERE id='batch-reverse'").fetch_one(&pool).await.unwrap(), "Reversed");
        pool.close().await;
        let _ = std::fs::remove_file(&path);
    }
}
