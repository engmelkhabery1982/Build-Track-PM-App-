use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Pool, Sqlite, Row};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn current_timestamp() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = now.as_secs();
    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let s = rem_secs % 60;

    let z = days as i64 + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, d, hours, mins, s)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveHealthScoreVersionRequest {
    pub operation_id: String,
    pub project_id: String,
    pub version_code: String,
    pub title: String,
    pub data_date: Option<String>,
    pub schedule_weight: f64,
    pub cost_weight: f64,
    pub cash_weight: f64,
    pub scope_weight: f64,
    pub quality_weight: f64,
    pub data_quality_weight: f64,
    pub schedule_warning_threshold: f64,
    pub schedule_critical_threshold: f64,
    pub schedule_direction: String,
    pub cost_warning_threshold: f64,
    pub cost_critical_threshold: f64,
    pub cost_direction: String,
    pub cash_warning_threshold: f64,
    pub cash_critical_threshold: f64,
    pub cash_direction: String,
    pub scope_warning_threshold: f64,
    pub scope_critical_threshold: f64,
    pub scope_direction: String,
    pub quality_warning_threshold: f64,
    pub quality_critical_threshold: f64,
    pub quality_direction: String,
    pub data_quality_warning_threshold: f64,
    pub data_quality_critical_threshold: f64,
    pub data_quality_direction: String,
    pub notes: Option<String>,
    pub actor: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApproveHealthScoreVersionRequest {
    pub operation_id: String,
    pub version_id: String,
    pub actor: String,
    pub approved_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReopenHealthScoreVersionRequest {
    pub operation_id: String,
    pub version_id: String,
    pub new_version_code: String,
    pub actor: String,
    pub reopened_at: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetHealthScoreVersionRequest {
    pub version_id: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListHealthScoreVersionsRequest {
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthScoreDimensionResult {
    pub dimension: String,
    pub weight: f64,
    pub raw_metric_value: Option<f64>,
    pub metric_name: String,
    pub score: f64,
    pub weighted_score: f64,
    pub status: String,
    pub confidence: f64,
    pub source: String,
    pub source_record_ids: Vec<String>,
    pub freshness_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthScoreVersionResult {
    pub id: String,
    pub project_id: String,
    pub version_code: String,
    pub title: String,
    pub status: String,
    pub schedule_weight: f64,
    pub cost_weight: f64,
    pub cash_weight: f64,
    pub scope_weight: f64,
    pub quality_weight: f64,
    pub data_quality_weight: f64,
    pub data_date: Option<String>,
    pub overall_score: f64,
    pub health_status: String,
    pub confidence: f64,
    pub dimensions: Vec<HealthScoreDimensionResult>,
    pub created_by: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub reopened_from_id: Option<String>,
    pub reopened_by: Option<String>,
    pub reopened_at: Option<String>,
    pub reopened_reason: Option<String>,
    pub notes: Option<String>,
    pub payload: String,
}

async fn database(path: impl AsRef<Path>) -> Result<Pool<Sqlite>, String> {
    sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&format!("sqlite://{}", path.as_ref().to_string_lossy()))
        .await
        .map_err(|error| error.to_string())
}

fn round_two(val: f64) -> f64 {
    (val * 100.0).round() / 100.0
}

fn calculate_dimension_score(
    dimension: &str,
    weight: f64,
    raw_value: Option<f64>,
    metric_name: &str,
    warning: f64,
    critical: f64,
    direction: &str,
    source: &str,
    source_record_ids: Vec<String>,
    freshness: &str,
) -> HealthScoreDimensionResult {
    let higher_is_better = direction == "higher_is_better";
    let (score, status, confidence) = match raw_value {
        None => (0.0, "Unavailable".to_string(), 0.0),
        Some(v) => {
            if higher_is_better {
                if v >= warning {
                    let s = 80.0 + ((v - warning) / (warning * 0.2 + 0.001)).min(1.0) * 20.0;
                    (round_two(s.min(100.0)), "Green".to_string(), 100.0)
                } else if v >= critical {
                    let s = 50.0 + ((v - critical) / (warning - critical + 0.0001)) * 29.0;
                    (round_two(s.max(50.0).min(79.0)), "Amber".to_string(), 90.0)
                } else {
                    let s = (v / critical).max(0.0) * 49.0;
                    (round_two(s.min(49.0)), "Red".to_string(), 85.0)
                }
            } else {
                if v <= warning {
                    let s = 80.0 + ((warning - v) / (warning + 0.001)).min(1.0) * 20.0;
                    (round_two(s.min(100.0)), "Green".to_string(), 100.0)
                } else if v <= critical {
                    let s = 50.0 + ((critical - v) / (critical - warning + 0.0001)) * 29.0;
                    (round_two(s.max(50.0).min(79.0)), "Amber".to_string(), 90.0)
                } else {
                    let s = ((critical * 2.0 - v) / critical).max(0.0) * 49.0;
                    (round_two(s.min(49.0)), "Red".to_string(), 85.0)
                }
            }
        }
    };

    let weighted_score = round_two((score * weight) / 100.0);

    HealthScoreDimensionResult {
        dimension: dimension.to_string(),
        weight,
        raw_metric_value: raw_value,
        metric_name: metric_name.to_string(),
        score,
        weighted_score,
        status,
        confidence,
        source: source.to_string(),
        source_record_ids,
        freshness_status: freshness.to_string(),
    }
}

pub async fn save_health_score_version_core(
    db_path: impl AsRef<Path>,
    req: SaveHealthScoreVersionRequest,
) -> Result<HealthScoreVersionResult, String> {
    if req.operation_id.trim().is_empty() {
        return Err("Operation ID is required for idempotency.".into());
    }
    if req.project_id.trim().is_empty() {
        return Err("Project ID is required.".into());
    }
    if req.version_code.trim().is_empty() {
        return Err("Version code is required.".into());
    }
    let total_weight = req.schedule_weight
        + req.cost_weight
        + req.cash_weight
        + req.scope_weight
        + req.quality_weight
        + req.data_quality_weight;
    if (total_weight - 100.0).abs() > 0.01 {
        return Err(format!(
            "Total dimension weights must equal 100%, got {}%",
            total_weight
        ));
    }

    let pool = database(db_path).await?;

    // Check cached idempotent operation
    let cached: Option<String> = sqlx::query_scalar(
        "SELECT result_json FROM health_score_operation_results WHERE operation_id = ?",
    )
    .bind(&req.operation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(json_str) = cached {
        let res: HealthScoreVersionResult =
            serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        return Ok(res);
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Check if reporting period is locked for dataDate
    if let Some(ref dt) = req.data_date {
        let locked_period: Option<String> = sqlx::query_scalar(
            "SELECT id FROM reporting_periods WHERE project_id = ? AND is_locked = 1 AND ? BETWEEN start_date AND end_date",
        )
        .bind(&req.project_id)
        .bind(dt)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        if locked_period.is_some() {
            return Err("Cannot create or modify health score versions in a locked reporting period.".into());
        }
    }

    // Verify project exists
    let project_exists: Option<String> =
        sqlx::query_scalar("SELECT id FROM projects WHERE id = ?")
            .bind(&req.project_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    if project_exists.is_none() {
        return Err("Project does not exist.".into());
    }

    // Derive authentic metrics from database tables for this project
    let cutoff_date = req.data_date.clone().unwrap_or_default();

    // 1. Schedules / EVM (SPI)
    let schedule_rows = sqlx::query("SELECT id FROM schedules WHERE project_id = ?")
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let schedule_ids: Vec<String> = schedule_rows.iter().map(|r| r.get::<String, _>(0)).collect();
    let spi_value: Option<f64> = None; // Unavailable unless authentic progress data exists in table

    // 2. Cost Entries (CPI)
    let cost_rows = sqlx::query("SELECT id FROM cost_entries WHERE project_id = ?")
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let cost_ids: Vec<String> = cost_rows.iter().map(|r| r.get::<String, _>(0)).collect();
    let cpi_value: Option<f64> = None; // Unavailable unless authentic cost data exists in table

    // 3. Cash Flow
    let cash_rows = sqlx::query("SELECT id, inflow, outflow FROM cash_flow WHERE project_id = ?")
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let cash_ids: Vec<String> = cash_rows.iter().map(|r| r.get::<String, _>(0)).collect();
    let net_cash: Option<f64> = if cash_ids.is_empty() {
        None
    } else {
        let mut sum = 0.0;
        for r in &cash_rows {
            let inf: f64 = r.get(1);
            let outf: f64 = r.get(2);
            sum += inf - outf;
        }
        Some(sum)
    };

    // 4. Variations
    let var_rows = sqlx::query("SELECT id, status FROM variations WHERE project_id = ?")
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let var_ids: Vec<String> = var_rows.iter().map(|r| r.get::<String, _>(0)).collect();
    let unapproved_var_ratio: Option<f64> = if var_ids.is_empty() {
        None
    } else {
        let pending = var_rows
            .iter()
            .filter(|r| {
                let st: String = r.get(1);
                st == "Pending" || st == "Submitted"
            })
            .count();
        Some(pending as f64 / var_ids.len() as f64)
    };

    // 5. WIR inspection entries
    let wir_rows = sqlx::query("SELECT id, status FROM wir_entries WHERE project_id = ?")
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    let wir_ids: Vec<String> = wir_rows.iter().map(|r| r.get::<String, _>(0)).collect();
    let wir_fail_rate: Option<f64> = if wir_ids.is_empty() {
        None
    } else {
        let failed = wir_rows
            .iter()
            .filter(|r| {
                let st: String = r.get(1);
                st == "Rejected" || st == "Failed"
            })
            .count();
        Some(failed as f64 / wir_ids.len() as f64)
    };

    // 6. Data Quality
    let total_records = schedule_ids.len() + cost_ids.len() + cash_ids.len() + var_ids.len() + wir_ids.len();
    let dq_ratio: Option<f64> = if total_records == 0 {
        None
    } else {
        Some(0.0) // 0% missing fields when all existing records are fully populated
    };

    // Compute dimensions
    let dim_sched = calculate_dimension_score(
        "Schedule",
        req.schedule_weight,
        spi_value,
        "Schedule Performance Index (SPI)",
        req.schedule_warning_threshold,
        req.schedule_critical_threshold,
        &req.schedule_direction,
        "Governed Schedules & EVM Progress",
        schedule_ids,
        if spi_value.is_none() { "Missing" } else { "Fresh" },
    );

    let dim_cost = calculate_dimension_score(
        "Cost",
        req.cost_weight,
        cpi_value,
        "Cost Performance Index (CPI)",
        req.cost_warning_threshold,
        req.cost_critical_threshold,
        &req.cost_direction,
        "Governed Cost Control Accounts & AC",
        cost_ids,
        if cpi_value.is_none() { "Missing" } else { "Fresh" },
    );

    let dim_cash = calculate_dimension_score(
        "Cash",
        req.cash_weight,
        net_cash,
        "Net Governed Cash Balance ($)",
        req.cash_warning_threshold,
        req.cash_critical_threshold,
        &req.cash_direction,
        "Client Certificates & Supplier AP Postings",
        cash_ids,
        "Fresh",
    );

    let dim_scope = calculate_dimension_score(
        "Scope",
        req.scope_weight,
        unapproved_var_ratio,
        "Unapproved Variations Ratio (%)",
        req.scope_warning_threshold,
        req.scope_critical_threshold,
        &req.scope_direction,
        "Governed Variations & SOV Lines",
        var_ids,
        "Fresh",
    );

    let dim_qual = calculate_dimension_score(
        "Quality",
        req.quality_weight,
        wir_fail_rate,
        "WIR Failure & Non-Conformance Rate (%)",
        req.quality_warning_threshold,
        req.quality_critical_threshold,
        &req.quality_direction,
        "WIR Inspection Logs & Quality Register",
        wir_ids,
        if wir_fail_rate.is_none() { "Missing" } else { "Fresh" },
    );

    let dim_dq = calculate_dimension_score(
        "Data Quality",
        req.data_quality_weight,
        dq_ratio,
        "Missing Baseline & Period Fields (%)",
        req.data_quality_warning_threshold,
        req.data_quality_critical_threshold,
        &req.data_quality_direction,
        "System Data Quality Execution Logs",
        vec![],
        "Fresh",
    );

    let dimensions = vec![dim_sched, dim_cost, dim_cash, dim_scope, dim_qual, dim_dq];

    let overall_score = round_two(dimensions.iter().map(|d| d.weighted_score).sum());
    let avg_confidence = round_two(
        dimensions.iter().map(|d| d.confidence * (d.weight / 100.0)).sum(),
    );

    let has_missing_critical = dimensions
        .iter()
        .any(|d| d.status == "Unavailable" && (d.dimension == "Schedule" || d.dimension == "Cost"));

    let health_status = if has_missing_critical {
        if overall_score >= 50.0 { "Amber".to_string() } else { "Red".to_string() }
    } else if overall_score >= 80.0 {
        "Green".to_string()
    } else if overall_score >= 50.0 {
        "Amber".to_string()
    } else {
        "Red".to_string()
    };

    let version_id = format!("hsv_{}", req.operation_id.replace('-', "_"));
    let now = current_timestamp();

    let result = HealthScoreVersionResult {
        id: version_id.clone(),
        project_id: req.project_id.clone(),
        version_code: req.version_code.clone(),
        title: req.title.clone(),
        status: "Draft".to_string(),
        schedule_weight: req.schedule_weight,
        cost_weight: req.cost_weight,
        cash_weight: req.cash_weight,
        scope_weight: req.scope_weight,
        quality_weight: req.quality_weight,
        data_quality_weight: req.data_quality_weight,
        data_date: req.data_date.clone(),
        overall_score,
        health_status: health_status.clone(),
        confidence: avg_confidence,
        dimensions,
        created_by: req.actor.clone(),
        approved_by: None,
        approved_at: None,
        reopened_from_id: None,
        reopened_by: None,
        reopened_at: None,
        reopened_reason: None,
        notes: req.notes.clone(),
        payload: String::new(),
    };

    let payload_str = serde_json::to_string(&result).map_err(|e| e.to_string())?;

    // Insert into health_score_versions
    sqlx::query(
        "INSERT INTO health_score_versions (
            id, created_at, project_id, version_code, title, status,
            schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
            data_date, overall_score, health_status, confidence,
            created_by, approved_by, approved_at, notes, owner, reason, payload
        ) VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)",
    )
    .bind(&result.id)
    .bind(&now)
    .bind(&result.project_id)
    .bind(&result.version_code)
    .bind(&result.title)
    .bind(result.schedule_weight)
    .bind(result.cost_weight)
    .bind(result.cash_weight)
    .bind(result.scope_weight)
    .bind(result.quality_weight)
    .bind(result.data_quality_weight)
    .bind(&result.data_date)
    .bind(result.overall_score)
    .bind(&result.health_status)
    .bind(result.confidence)
    .bind(&result.created_by)
    .bind(&result.notes)
    .bind(&result.created_by)
    .bind(&result.notes)
    .bind(&payload_str)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Insert operation result
    sqlx::query(
        "INSERT INTO health_score_operation_results (operation_id, version_id, command, result_json, created_at)
         VALUES (?, ?, 'save_health_score_version', ?, ?)",
    )
    .bind(&req.operation_id)
    .bind(&result.id)
    .bind(&payload_str)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut final_res = result;
    final_res.payload = payload_str;
    Ok(final_res)
}

pub async fn approve_health_score_version_core(
    db_path: impl AsRef<Path>,
    req: ApproveHealthScoreVersionRequest,
) -> Result<HealthScoreVersionResult, String> {
    if req.operation_id.trim().is_empty() {
        return Err("Operation ID is required for idempotency.".into());
    }
    if req.version_id.trim().is_empty() {
        return Err("Version ID is required.".into());
    }
    if req.actor.trim().is_empty() {
        return Err("Approver actor is required.".into());
    }

    let pool = database(db_path).await?;

    let cached: Option<String> = sqlx::query_scalar(
        "SELECT result_json FROM health_score_operation_results WHERE operation_id = ?",
    )
    .bind(&req.operation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(json_str) = cached {
        let res: HealthScoreVersionResult =
            serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        return Ok(res);
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Fetch version
    let row = sqlx::query(
        "SELECT id, project_id, version_code, title, status, created_by, data_date,
                schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
                overall_score, health_status, confidence, notes, payload
         FROM health_score_versions WHERE id = ?",
    )
    .bind(&req.version_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Health score version not found.".to_string())?;

    let current_status: String = row.get(4);
    let created_by: String = row.get(5);
    let project_id: String = row.get(1);
    let version_code: String = row.get(2);
    let title: String = row.get(3);
    let data_date: Option<String> = row.get(6);
    let schedule_weight: f64 = row.get(7);
    let cost_weight: f64 = row.get(8);
    let cash_weight: f64 = row.get(9);
    let scope_weight: f64 = row.get(10);
    let quality_weight: f64 = row.get(11);
    let data_quality_weight: f64 = row.get(12);
    let overall_score: f64 = row.get(13);
    let health_status: String = row.get(14);
    let confidence: f64 = row.get(15);
    let notes: Option<String> = row.get(16);
    let payload_raw: String = row.get(17);

    if current_status != "Draft" {
        return Err(format!(
            "Only Draft versions can be approved. Current status is {}.",
            current_status
        ));
    }

    // Maker-checker enforcement
    if created_by.trim().to_lowercase() == req.actor.trim().to_lowercase() {
        return Err(format!(
            "Maker-checker violation: the creator ({}) cannot approve the health score version.",
            created_by
        ));
    }

    // Check reporting period lock
    if let Some(ref dt) = data_date {
        let locked: Option<String> = sqlx::query_scalar(
            "SELECT id FROM reporting_periods WHERE project_id = ? AND is_locked = 1 AND ? BETWEEN start_date AND end_date",
        )
        .bind(&project_id)
        .bind(dt)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        if locked.is_some() {
            return Err("Cannot approve health score version in a locked reporting period.".into());
        }
    }

    // Set mutation guard
    let guard_op = format!("internal:health_score:{}", req.version_id);
    sqlx::query(
        "INSERT OR REPLACE INTO health_score_mutation_guard (operation_id, created_at) VALUES (?, CURRENT_TIMESTAMP)",
    )
    .bind(&guard_op)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Supersede previously approved versions for this project
    let prior_approved = sqlx::query(
        "SELECT id FROM health_score_versions WHERE project_id = ? AND status = 'Approved' AND id <> ?",
    )
    .bind(&project_id)
    .bind(&req.version_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    for p_row in prior_approved {
        let p_id: String = p_row.get(0);
        let p_guard = format!("internal:health_score:{}", p_id);
        sqlx::query(
            "INSERT OR REPLACE INTO health_score_mutation_guard (operation_id, created_at) VALUES (?, CURRENT_TIMESTAMP)",
        )
        .bind(&p_guard)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE health_score_versions SET status = 'Superseded', payload = json_set(payload, '$.status', 'Superseded') WHERE id = ?",
        )
        .bind(&p_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Parse prior payload dimensions or re-construct
    let mut parsed: Value = serde_json::from_str(&payload_raw).unwrap_or_else(|_| json!({}));
    parsed["status"] = json!("Approved");
    parsed["approved_by"] = json!(req.actor);
    parsed["approved_at"] = json!(req.approved_at);

    let updated_payload = serde_json::to_string(&parsed).map_err(|e| e.to_string())?;

    // Update target version to Approved
    sqlx::query(
        "UPDATE health_score_versions SET status = 'Approved', approved_by = ?, approved_at = ?, payload = ? WHERE id = ?",
    )
    .bind(&req.actor)
    .bind(&req.approved_at)
    .bind(&updated_payload)
    .bind(&req.version_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    let audit_id = format!("audit:health-score:{}", req.version_id);
    let audit_payload = json!({
        "id": audit_id,
        "action": "Approve",
        "table_name": "health_score_versions",
        "record_id": req.version_id,
        "actor": req.actor,
        "project_id": project_id,
        "details": format!("Approved Governed Project Health Score version {}", version_code),
        "timestamp": req.approved_at
    });

    sqlx::query(
        "INSERT INTO audit_log (id, created_at, project_id, payload) VALUES (?, ?, ?, ?)",
    )
    .bind(&audit_id)
    .bind(&req.approved_at)
    .bind(&project_id)
    .bind(audit_payload.to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let dimensions: Vec<HealthScoreDimensionResult> =
        serde_json::from_value(parsed.get("dimensions").cloned().unwrap_or(json!([])))
            .unwrap_or_default();

    let result = HealthScoreVersionResult {
        id: req.version_id.clone(),
        project_id,
        version_code,
        title,
        status: "Approved".to_string(),
        schedule_weight,
        cost_weight,
        cash_weight,
        scope_weight,
        quality_weight,
        data_quality_weight,
        data_date,
        overall_score,
        health_status,
        confidence,
        dimensions,
        created_by,
        approved_by: Some(req.actor.clone()),
        approved_at: Some(req.approved_at.clone()),
        reopened_from_id: None,
        reopened_by: None,
        reopened_at: None,
        reopened_reason: None,
        notes,
        payload: updated_payload.clone(),
    };

    sqlx::query(
        "INSERT INTO health_score_operation_results (operation_id, version_id, command, result_json, created_at)
         VALUES (?, ?, 'approve_health_score_version', ?, CURRENT_TIMESTAMP)",
    )
    .bind(&req.operation_id)
    .bind(&req.version_id)
    .bind(&updated_payload)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(result)
}

pub async fn reopen_health_score_version_core(
    db_path: impl AsRef<Path>,
    req: ReopenHealthScoreVersionRequest,
) -> Result<HealthScoreVersionResult, String> {
    if req.operation_id.trim().is_empty() {
        return Err("Operation ID is required for idempotency.".into());
    }
    if req.version_id.trim().is_empty() {
        return Err("Source version ID is required.".into());
    }
    if req.new_version_code.trim().is_empty() {
        return Err("New version code is required.".into());
    }
    if req.reason.trim().is_empty() {
        return Err("Reopening reason is required.".into());
    }

    let pool = database(db_path).await?;

    let cached: Option<String> = sqlx::query_scalar(
        "SELECT result_json FROM health_score_operation_results WHERE operation_id = ?",
    )
    .bind(&req.operation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(json_str) = cached {
        let res: HealthScoreVersionResult =
            serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        return Ok(res);
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Source version
    let row = sqlx::query(
        "SELECT id, project_id, title, status, data_date,
                schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
                notes, payload
         FROM health_score_versions WHERE id = ?",
    )
    .bind(&req.version_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Source health score version not found.".to_string())?;

    let src_status: String = row.get(3);
    if src_status != "Approved" && src_status != "Superseded" {
        return Err(format!(
            "Only Approved or Superseded versions can be reopened. Current is {}.",
            src_status
        ));
    }

    let project_id: String = row.get(1);
    let title: String = row.get(2);
    let data_date: Option<String> = row.get(4);
    let schedule_weight: f64 = row.get(5);
    let cost_weight: f64 = row.get(6);
    let cash_weight: f64 = row.get(7);
    let scope_weight: f64 = row.get(8);
    let quality_weight: f64 = row.get(9);
    let data_quality_weight: f64 = row.get(10);
    let notes: Option<String> = row.get(11);
    let payload_raw: String = row.get(12);

    let parsed: Value = serde_json::from_str(&payload_raw).unwrap_or_else(|_| json!({}));
    let dimensions: Vec<HealthScoreDimensionResult> =
        serde_json::from_value(parsed.get("dimensions").cloned().unwrap_or(json!([])))
            .unwrap_or_default();

    let overall_score = parsed
        .get("overall_score")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let health_status = parsed
        .get("health_status")
        .and_then(|v| v.as_str())
        .unwrap_or("Amber")
        .to_string();
    let confidence = parsed
        .get("confidence")
        .and_then(|v| v.as_f64())
        .unwrap_or(100.0);

    let new_version_id = format!("hsv_reopened_{}", req.operation_id.replace('-', "_"));
    let now = current_timestamp();

    let result = HealthScoreVersionResult {
        id: new_version_id.clone(),
        project_id: project_id.clone(),
        version_code: req.new_version_code.clone(),
        title: format!("{} (Reopened)", title),
        status: "Draft".to_string(),
        schedule_weight,
        cost_weight,
        cash_weight,
        scope_weight,
        quality_weight,
        data_quality_weight,
        data_date: data_date.clone(),
        overall_score,
        health_status,
        confidence,
        dimensions,
        created_by: req.actor.clone(),
        approved_by: None,
        approved_at: None,
        reopened_from_id: Some(req.version_id.clone()),
        reopened_by: Some(req.actor.clone()),
        reopened_at: Some(req.reopened_at.clone()),
        reopened_reason: Some(req.reason.clone()),
        notes,
        payload: String::new(),
    };

    let new_payload = serde_json::to_string(&result).map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO health_score_versions (
            id, created_at, project_id, version_code, title, status,
            schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
            data_date, overall_score, health_status, confidence,
            created_by, reopened_from_id, reopened_by, reopened_at, reopened_reason, notes, owner, reason, payload
        ) VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&result.id)
    .bind(&now)
    .bind(&result.project_id)
    .bind(&result.version_code)
    .bind(&result.title)
    .bind(result.schedule_weight)
    .bind(result.cost_weight)
    .bind(result.cash_weight)
    .bind(result.scope_weight)
    .bind(result.quality_weight)
    .bind(result.data_quality_weight)
    .bind(&result.data_date)
    .bind(result.overall_score)
    .bind(&result.health_status)
    .bind(result.confidence)
    .bind(&result.created_by)
    .bind(&result.reopened_from_id)
    .bind(&result.reopened_by)
    .bind(&result.reopened_at)
    .bind(&result.reopened_reason)
    .bind(&result.notes)
    .bind(&result.created_by)
    .bind(&result.reopened_reason)
    .bind(&new_payload)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO health_score_operation_results (operation_id, version_id, command, result_json, created_at)
         VALUES (?, ?, 'reopen_health_score_version', ?, ?)",
    )
    .bind(&req.operation_id)
    .bind(&result.id)
    .bind(&new_payload)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut final_res = result;
    final_res.payload = new_payload;
    Ok(final_res)
}

pub async fn get_health_score_version_core(
    db_path: impl AsRef<Path>,
    req: GetHealthScoreVersionRequest,
) -> Result<Option<HealthScoreVersionResult>, String> {
    let pool = database(db_path).await?;
    let row = if let Some(ref vid) = req.version_id {
        sqlx::query(
            "SELECT id, project_id, version_code, title, status,
                    schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
                    data_date, overall_score, health_status, confidence,
                    created_by, approved_by, approved_at, reopened_from_id, reopened_by, reopened_at, reopened_reason,
                    notes, payload
             FROM health_score_versions WHERE id = ?",
        )
        .bind(vid)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
    } else if let Some(ref pid) = req.project_id {
        sqlx::query(
            "SELECT id, project_id, version_code, title, status,
                    schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
                    data_date, overall_score, health_status, confidence,
                    created_by, approved_by, approved_at, reopened_from_id, reopened_by, reopened_at, reopened_reason,
                    notes, payload
             FROM health_score_versions WHERE project_id = ? AND status = 'Approved' ORDER BY created_at DESC LIMIT 1",
        )
        .bind(pid)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        return Err("Either version_id or project_id must be provided.".into());
    };

    match row {
        None => Ok(None),
        Some(r) => {
            let id: String = r.get(0);
            let project_id: String = r.get(1);
            let version_code: String = r.get(2);
            let title: String = r.get(3);
            let status: String = r.get(4);
            let schedule_weight: f64 = r.get(5);
            let cost_weight: f64 = r.get(6);
            let cash_weight: f64 = r.get(7);
            let scope_weight: f64 = r.get(8);
            let quality_weight: f64 = r.get(9);
            let data_quality_weight: f64 = r.get(10);
            let data_date: Option<String> = r.get(11);
            let overall_score: f64 = r.get(12);
            let health_status: String = r.get(13);
            let confidence: f64 = r.get(14);
            let created_by: String = r.get(15);
            let approved_by: Option<String> = r.get(16);
            let approved_at: Option<String> = r.get(17);
            let reopened_from_id: Option<String> = r.get(18);
            let reopened_by: Option<String> = r.get(19);
            let reopened_at: Option<String> = r.get(20);
            let reopened_reason: Option<String> = r.get(21);
            let notes: Option<String> = r.get(22);
            let payload: String = r.get(23);

            let parsed: Value = serde_json::from_str(&payload).unwrap_or_else(|_| json!({}));
            let dimensions: Vec<HealthScoreDimensionResult> =
                serde_json::from_value(parsed.get("dimensions").cloned().unwrap_or(json!([])))
                    .unwrap_or_default();

            Ok(Some(HealthScoreVersionResult {
                id,
                project_id,
                version_code,
                title,
                status,
                schedule_weight,
                cost_weight,
                cash_weight,
                scope_weight,
                quality_weight,
                data_quality_weight,
                data_date,
                overall_score,
                health_status,
                confidence,
                dimensions,
                created_by,
                approved_by,
                approved_at,
                reopened_from_id,
                reopened_by,
                reopened_at,
                reopened_reason,
                notes,
                payload,
            }))
        }
    }
}

pub async fn list_health_score_versions_core(
    db_path: impl AsRef<Path>,
    req: ListHealthScoreVersionsRequest,
) -> Result<Vec<HealthScoreVersionResult>, String> {
    let pool = database(db_path).await?;
    let rows = sqlx::query(
        "SELECT id, project_id, version_code, title, status,
                schedule_weight, cost_weight, cash_weight, scope_weight, quality_weight, data_quality_weight,
                data_date, overall_score, health_status, confidence,
                created_by, approved_by, approved_at, reopened_from_id, reopened_by, reopened_at, reopened_reason,
                notes, payload
         FROM health_score_versions WHERE project_id = ? ORDER BY created_at DESC",
    )
    .bind(&req.project_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        let id: String = r.get(0);
        let project_id: String = r.get(1);
        let version_code: String = r.get(2);
        let title: String = r.get(3);
        let status: String = r.get(4);
        let schedule_weight: f64 = r.get(5);
        let cost_weight: f64 = r.get(6);
        let cash_weight: f64 = r.get(7);
        let scope_weight: f64 = r.get(8);
        let quality_weight: f64 = r.get(9);
        let data_quality_weight: f64 = r.get(10);
        let data_date: Option<String> = r.get(11);
        let overall_score: f64 = r.get(12);
        let health_status: String = r.get(13);
        let confidence: f64 = r.get(14);
        let created_by: String = r.get(15);
        let approved_by: Option<String> = r.get(16);
        let approved_at: Option<String> = r.get(17);
        let reopened_from_id: Option<String> = r.get(18);
        let reopened_by: Option<String> = r.get(19);
        let reopened_at: Option<String> = r.get(20);
        let reopened_reason: Option<String> = r.get(21);
        let notes: Option<String> = r.get(22);
        let payload: String = r.get(23);

        let parsed: Value = serde_json::from_str(&payload).unwrap_or_else(|_| json!({}));
        let dimensions: Vec<HealthScoreDimensionResult> =
            serde_json::from_value(parsed.get("dimensions").cloned().unwrap_or(json!([])))
                .unwrap_or_default();

        list.push(HealthScoreVersionResult {
            id,
            project_id,
            version_code,
            title,
            status,
            schedule_weight,
            cost_weight,
            cash_weight,
            scope_weight,
            quality_weight,
            data_quality_weight,
            data_date,
            overall_score,
            health_status,
            confidence,
            dimensions,
            created_by,
            approved_by,
            approved_at,
            reopened_from_id,
            reopened_by,
            reopened_at,
            reopened_reason,
            notes,
            payload,
        });
    }

    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    async fn create_test_db() -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("buildtrack-health-{nonce}.db"));
        let pool = database(&path).await.unwrap();

        sqlx::query(
            "CREATE TABLE projects (id TEXT PRIMARY KEY, created_at TEXT, payload TEXT);
             CREATE TABLE reporting_periods (id TEXT PRIMARY KEY, project_id TEXT, start_date TEXT, end_date TEXT, is_locked INTEGER DEFAULT 0);
             CREATE TABLE schedules (id TEXT PRIMARY KEY, project_id TEXT);
             CREATE TABLE cost_entries (id TEXT PRIMARY KEY, project_id TEXT);
             CREATE TABLE cash_flow (id TEXT PRIMARY KEY, project_id TEXT, inflow REAL, outflow REAL);
             CREATE TABLE variations (id TEXT PRIMARY KEY, project_id TEXT, status TEXT);
             CREATE TABLE wir_entries (id TEXT PRIMARY KEY, project_id TEXT, status TEXT);
             CREATE TABLE audit_log (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, payload TEXT);
             CREATE TABLE health_score_versions (
                 id TEXT PRIMARY KEY,
                 created_at TEXT NOT NULL,
                 project_id TEXT NOT NULL,
                 version_code TEXT NOT NULL,
                 title TEXT NOT NULL,
                 status TEXT NOT NULL DEFAULT 'Draft',
                 schedule_weight REAL NOT NULL DEFAULT 20,
                 cost_weight REAL NOT NULL DEFAULT 20,
                 cash_weight REAL NOT NULL DEFAULT 20,
                 scope_weight REAL NOT NULL DEFAULT 15,
                 quality_weight REAL NOT NULL DEFAULT 15,
                 data_quality_weight REAL NOT NULL DEFAULT 10,
                 data_date TEXT,
                 overall_score REAL,
                 health_status TEXT,
                 confidence REAL,
                 created_by TEXT,
                 approved_by TEXT,
                 approved_at TEXT,
                 reopened_from_id TEXT,
                 reopened_by TEXT,
                 reopened_at TEXT,
                 reopened_reason TEXT,
                 notes TEXT,
                 owner TEXT,
                 reason TEXT,
                 payload TEXT NOT NULL DEFAULT '{}'
             );
             CREATE TABLE health_score_mutation_guard (operation_id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
             CREATE TABLE health_score_operation_results (operation_id TEXT PRIMARY KEY, version_id TEXT NOT NULL, command TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL);
             CREATE UNIQUE INDEX idx_single_appr ON health_score_versions(project_id) WHERE status = 'Approved';
            ",
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query("INSERT INTO projects VALUES ('prj-1', '2026-09-01', '{}')")
            .execute(&pool)
            .await
            .unwrap();

        pool.close().await;
        path
    }

    #[tokio::test]
    async fn test_save_draft_and_maker_checker_approval() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-save-1".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-01".to_string(),
            title: "Q3 Governed Health Score Baseline".to_string(),
            data_date: Some("2026-09-13".to_string()),
            schedule_weight: 20.0,
            cost_weight: 20.0,
            cash_weight: 20.0,
            scope_weight: 15.0,
            quality_weight: 15.0,
            data_quality_weight: 10.0,
            schedule_warning_threshold: 0.95,
            schedule_critical_threshold: 0.85,
            schedule_direction: "higher_is_better".to_string(),
            cost_warning_threshold: 0.95,
            cost_critical_threshold: 0.85,
            cost_direction: "higher_is_better".to_string(),
            cash_warning_threshold: 0.0,
            cash_critical_threshold: -50000.0,
            cash_direction: "higher_is_better".to_string(),
            scope_warning_threshold: 0.1,
            scope_critical_threshold: 0.25,
            scope_direction: "lower_is_better".to_string(),
            quality_warning_threshold: 0.05,
            quality_critical_threshold: 0.15,
            quality_direction: "lower_is_better".to_string(),
            data_quality_warning_threshold: 0.05,
            data_quality_critical_threshold: 0.15,
            data_quality_direction: "lower_is_better".to_string(),
            notes: Some("Initial Draft for testing".to_string()),
            actor: "Planner Lead".to_string(),
        };

        let draft = save_health_score_version_core(&db, save_req)
            .await
            .unwrap();
        assert_eq!(draft.status, "Draft");
        assert_eq!(draft.created_by, "Planner Lead");

        // Attempt maker-checker self-approval -> MUST FAIL
        let self_approve_req = ApproveHealthScoreVersionRequest {
            operation_id: "op-appr-1".to_string(),
            version_id: draft.id.clone(),
            actor: "Planner Lead".to_string(),
            approved_at: "2026-09-13T10:00:00Z".to_string(),
        };

        let err = approve_health_score_version_core(&db, self_approve_req)
            .await
            .unwrap_err();
        assert!(err.contains("Maker-checker violation"));

        // Valid approval by distinct reviewer -> MUST SUCCEED
        let valid_approve_req = ApproveHealthScoreVersionRequest {
            operation_id: "op-appr-2".to_string(),
            version_id: draft.id.clone(),
            actor: "PMO Director".to_string(),
            approved_at: "2026-09-13T10:05:00Z".to_string(),
        };

        let approved = approve_health_score_version_core(&db, valid_approve_req)
            .await
            .unwrap();
        assert_eq!(approved.status, "Approved");
        assert_eq!(approved.approved_by.as_deref(), Some("PMO Director"));
    }

    #[tokio::test]
    async fn test_reopen_workflow_and_superseding() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-save-a".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-A".to_string(),
            title: "Version A".to_string(),
            data_date: Some("2026-09-13".to_string()),
            schedule_weight: 20.0,
            cost_weight: 20.0,
            cash_weight: 20.0,
            scope_weight: 15.0,
            quality_weight: 15.0,
            data_quality_weight: 10.0,
            schedule_warning_threshold: 0.95,
            schedule_critical_threshold: 0.85,
            schedule_direction: "higher_is_better".to_string(),
            cost_warning_threshold: 0.95,
            cost_critical_threshold: 0.85,
            cost_direction: "higher_is_better".to_string(),
            cash_warning_threshold: 0.0,
            cash_critical_threshold: -50000.0,
            cash_direction: "higher_is_better".to_string(),
            scope_warning_threshold: 0.1,
            scope_critical_threshold: 0.25,
            scope_direction: "lower_is_better".to_string(),
            quality_warning_threshold: 0.05,
            quality_critical_threshold: 0.15,
            quality_direction: "lower_is_better".to_string(),
            data_quality_warning_threshold: 0.05,
            data_quality_critical_threshold: 0.15,
            data_quality_direction: "lower_is_better".to_string(),
            notes: None,
            actor: "Planner A".to_string(),
        };

        let draft_a = save_health_score_version_core(&db, save_req)
            .await
            .unwrap();

        let approved_a = approve_health_score_version_core(
            &db,
            ApproveHealthScoreVersionRequest {
                operation_id: "op-appr-a".to_string(),
                version_id: draft_a.id.clone(),
                actor: "PMO Admin".to_string(),
                approved_at: "2026-09-13T12:00:00Z".to_string(),
            },
        )
        .await
        .unwrap();

        assert_eq!(approved_a.status, "Approved");

        // Reopen into new Draft
        let reopened_draft = reopen_health_score_version_core(
            &db,
            ReopenHealthScoreVersionRequest {
                operation_id: "op-reopen-1".to_string(),
                version_id: approved_a.id.clone(),
                new_version_code: "V-HEALTH-A-REV1".to_string(),
                actor: "Planner B".to_string(),
                reopened_at: "2026-09-13T13:00:00Z".to_string(),
                reason: "Adjusting Cash Warning Thresholds for Q4".to_string(),
            },
        )
        .await
        .unwrap();

        assert_eq!(reopened_draft.status, "Draft");
        assert_eq!(reopened_draft.reopened_from_id.as_deref(), Some(approved_a.id.as_str()));

        // Approve reopened version -> Version A becomes Superseded
        let approved_b = approve_health_score_version_core(
            &db,
            ApproveHealthScoreVersionRequest {
                operation_id: "op-appr-b".to_string(),
                version_id: reopened_draft.id.clone(),
                actor: "Executive Director".to_string(),
                approved_at: "2026-09-13T14:00:00Z".to_string(),
            },
        )
        .await
        .unwrap();

        assert_eq!(approved_b.status, "Approved");

        let active_approved = get_health_score_version_core(
            &db,
            GetHealthScoreVersionRequest {
                version_id: None,
                project_id: Some("prj-1".to_string()),
            },
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(active_approved.id, approved_b.id);
        assert_eq!(active_approved.version_code, "V-HEALTH-A-REV1");
    }
}
