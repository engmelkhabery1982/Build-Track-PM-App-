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

fn parse_date_to_days(d: &str) -> Option<i64> {
    let clean = d.trim();
    let prefix = if clean.len() >= 10 { &clean[..10] } else { clean };
    let parts: Vec<&str> = prefix.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let y: i64 = parts[0].parse().ok()?;
    let m: i64 = parts[1].parse().ok()?;
    let day: i64 = parts[2].parse().ok()?;
    let m_adj = if m <= 2 { m + 12 } else { m };
    let y_adj = if m <= 2 { y - 1 } else { y };
    let days = 365 * y_adj + y_adj / 4 - y_adj / 100 + y_adj / 400 + (153 * (m_adj - 3) + 2) / 5 + day - 1;
    Some(days)
}

fn date_diff_days(start: &str, end: &str) -> i64 {
    match (parse_date_to_days(start), parse_date_to_days(end)) {
        (Some(s), Some(e)) => e - s,
        _ => 1,
    }
}

#[derive(Debug, Clone)]
struct EvmCalculationResult {
    pub pv: f64,
    pub ev: f64,
    pub ac: f64,
    pub spi: Option<f64>,
    pub cpi: Option<f64>,
    pub schedule_record_ids: Vec<String>,
    pub cost_record_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveHealthScoreVersionRequest {
    pub operation_id: String,
    pub version_id: String,
    pub actor: String,
    pub approved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReopenHealthScoreVersionRequest {
    pub operation_id: String,
    pub version_id: String,
    pub new_version_code: String,
    pub actor: String,
    pub reopened_at: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetHealthScoreVersionRequest {
    pub version_id: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    use sqlx::sqlite::SqliteConnectOptions;
    let opts = SqliteConnectOptions::new()
        .filename(path.as_ref())
        .create_if_missing(true)
        .foreign_keys(true);
    sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(opts)
        .await
        .map_err(|error| error.to_string())
}

fn round_two(val: f64) -> f64 {
    (val * 100.0).round() / 100.0
}

fn validate_thresholds(
    dimension: &str,
    warning: f64,
    critical: f64,
    direction: &str,
) -> Result<(), String> {
    match direction {
        "higher_is_better" if warning <= critical => Err(format!(
            "Warning threshold must be strictly greater than critical threshold for {dimension}"
        )),
        "lower_is_better" if warning >= critical => Err(format!(
            "Warning threshold must be strictly less than critical threshold for {dimension}"
        )),
        "higher_is_better" | "lower_is_better" => Ok(()),
        _ => Err(format!("Unsupported threshold direction for {dimension}: {direction}")),
    }
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

async fn calculate_governed_evm_core(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    project_id: &str,
    cutoff_date: &str,
) -> Result<EvmCalculationResult, String> {
    // 1. Fetch contracts for this project
    let contract_rows = sqlx::query(
        "SELECT id, parent_main_contract_id FROM contracts WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut main_contract_ids: Vec<String> = contract_rows
        .iter()
        .filter(|r| {
            let parent: Option<String> = r.get(1);
            parent.as_deref().unwrap_or("").trim().is_empty()
        })
        .map(|r| r.get(0))
        .collect();

    if main_contract_ids.is_empty() {
        main_contract_ids = vec![project_id.to_string()];
    }

    let mut performance_contract_ids = main_contract_ids.clone();
    for r in &contract_rows {
        let id: String = r.get(0);
        let parent: Option<String> = r.get(1);
        if let Some(p) = parent {
            let p_trim = p.trim();
            if !p_trim.is_empty() && main_contract_ids.contains(&p_trim.to_string()) && !performance_contract_ids.contains(&id) {
                performance_contract_ids.push(id);
            }
        }
    }

    // 2. Planned Value (PV) from Active Approved Baseline
    let baseline_rows = sqlx::query(
        "SELECT id, contract_id, payload FROM project_baselines 
         WHERE project_id = ? AND json_extract(payload, '$.status') = 'Approved'
         ORDER BY CAST(COALESCE(json_extract(payload, '$.revision_number'), '0') AS INTEGER) DESC, 
                  COALESCE(json_extract(payload, '$.baseline_date'), '') DESC"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut cumulative_pv = 0.0;
    let mut schedule_record_ids: Vec<String> = Vec::new();
    let mut has_approved_baseline = false;

    let mut processed_contracts = std::collections::HashSet::new();
    for b_row in baseline_rows {
        let _b_id: String = b_row.get(0);
        let b_contract_id: Option<String> = b_row.get(1);
        let contract_key = b_contract_id.clone().unwrap_or_default();
        if processed_contracts.contains(&contract_key) {
            continue;
        }
        processed_contracts.insert(contract_key);
        has_approved_baseline = true;

        let payload_str: String = b_row.get(2);
        let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);

        let dist_snapshot = payload.get("distribution_snapshot").and_then(|v| v.as_array());
        if let Some(distributions) = dist_snapshot {
            if !distributions.is_empty() {
                for dist in distributions {
                    let sch_id = dist.get("schedule_id").and_then(|v| v.as_str()).unwrap_or("");
                    let val = dist.get("planned_value")
                        .and_then(|v| v.as_f64())
                        .unwrap_or_else(|| {
                            let q = dist.get("planned_quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let r = dist.get("unit_rate").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            q * r
                        });
                    let start = dist.get("period_start")
                        .or_else(|| dist.get("period_date"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let end = dist.get("period_end")
                        .or_else(|| dist.get("period_date"))
                        .and_then(|v| v.as_str())
                        .unwrap_or(start);

                    if cutoff_date.is_empty() {
                        cumulative_pv += val;
                        if !sch_id.is_empty() && !schedule_record_ids.contains(&sch_id.to_string()) {
                            schedule_record_ids.push(sch_id.to_string());
                        }
                    } else if !start.is_empty() && cutoff_date < start {
                        // Not started yet
                    } else if end.is_empty() || cutoff_date >= end {
                        cumulative_pv += val;
                        if !sch_id.is_empty() && !schedule_record_ids.contains(&sch_id.to_string()) {
                            schedule_record_ids.push(sch_id.to_string());
                        }
                    } else {
                        let span = date_diff_days(start, end).max(1);
                        let elapsed = date_diff_days(start, cutoff_date).max(0);
                        let frac = (elapsed as f64 / span as f64).min(1.0);
                        cumulative_pv += val * frac;
                        if !sch_id.is_empty() && !schedule_record_ids.contains(&sch_id.to_string()) {
                            schedule_record_ids.push(sch_id.to_string());
                        }
                    }
                }
                continue;
            }
        }

        // Fallback to activity_snapshot
        let act_snapshot = payload.get("activity_snapshot").and_then(|v| v.as_array());
        if let Some(activities) = act_snapshot {
            for act in activities {
                let sch_id = act.get("schedule_id").or_else(|| act.get("id")).and_then(|v| v.as_str()).unwrap_or("");
                let budget = act.get("budget")
                    .or_else(|| act.get("planned_value"))
                    .or_else(|| act.get("total_cost"))
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let start = act.get("start_date").or_else(|| act.get("planned_start")).and_then(|v| v.as_str()).unwrap_or("");
                let end = act.get("end_date").or_else(|| act.get("planned_finish")).and_then(|v| v.as_str()).unwrap_or("");

                if cutoff_date.is_empty() || (!end.is_empty() && cutoff_date >= end) {
                    cumulative_pv += budget;
                    if !sch_id.is_empty() && !schedule_record_ids.contains(&sch_id.to_string()) {
                        schedule_record_ids.push(sch_id.to_string());
                    }
                } else if !start.is_empty() && cutoff_date < start {
                    // 0
                } else if !start.is_empty() && !end.is_empty() {
                    let duration = date_diff_days(start, end).max(1);
                    let elapsed = date_diff_days(start, cutoff_date).max(0);
                    let frac = (elapsed as f64 / duration as f64).min(1.0);
                    cumulative_pv += budget * frac;
                    if !sch_id.is_empty() && !schedule_record_ids.contains(&sch_id.to_string()) {
                        schedule_record_ids.push(sch_id.to_string());
                    }
                }
            }
        }
    }

    // 3. BOQ Items & Selling Rates
    let boq_rows = sqlx::query(
        "SELECT id, contract_id, 
                CAST(COALESCE(json_extract(payload, '$.unit_rate'), 0) AS REAL),
                json_extract(payload, '$.main_boq_item_id')
         FROM boq_items WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    struct BoqEntry {
        unit_rate: f64,
        main_boq_item_id: Option<String>,
    }
    let mut boq_map: std::collections::HashMap<String, BoqEntry> = std::collections::HashMap::new();
    for r in &boq_rows {
        let b_id: String = r.get(0);
        let rate: f64 = r.get(2);
        let main_id: Option<String> = r.get(3);
        boq_map.insert(b_id, BoqEntry { unit_rate: rate, main_boq_item_id: main_id });
    }

    let get_selling_rate = |boq_id: &str, default_rate: f64| -> f64 {
        if let Some(item) = boq_map.get(boq_id) {
            if let Some(ref m_id) = item.main_boq_item_id {
                if let Some(main_item) = boq_map.get(m_id) {
                    if main_item.unit_rate > 0.0 {
                        return main_item.unit_rate;
                    }
                }
            }
            if item.unit_rate > 0.0 {
                return item.unit_rate;
            }
        }
        default_rate
    };

    // 4. Schedules and WIR entries for EV
    let sched_rows = sqlx::query(
        "SELECT id, contract_id, payload FROM schedules WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut explicit_activities: std::collections::HashMap<String, serde_json::Value> = std::collections::HashMap::new();
    for s_row in &sched_rows {
        let s_id: String = s_row.get(0);
        let s_contract: Option<String> = s_row.get(1);
        let s_contract_str = s_contract.unwrap_or_default();
        if !main_contract_ids.is_empty() && !main_contract_ids.contains(&s_contract_str) && !s_contract_str.is_empty() {
            continue;
        }
        let p_str: String = s_row.get(2);
        let p: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);
        let act_name = p.get("activity").and_then(|v| v.as_str()).unwrap_or("");
        let measurement_method = p.get("measurement_method").and_then(|v| v.as_str()).unwrap_or("");
        if !act_name.is_empty() && !measurement_method.is_empty() {
            explicit_activities.insert(s_id, p);
        }
    }

    let wir_rows = sqlx::query(
        "SELECT id, contract_id, payload FROM wir_entries WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut explicit_ev = 0.0;
    let mut handled_wir_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (act_id, act_payload) in &explicit_activities {
        let method = act_payload.get("measurement_method").and_then(|v| v.as_str()).unwrap_or("");
        let budget = act_payload.get("budget")
            .or_else(|| act_payload.get("planned_value"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let status = act_payload.get("activity_status").and_then(|v| v.as_str()).unwrap_or("");
        let actual_start = act_payload.get("actual_start_date")
            .or_else(|| act_payload.get("status_data_date"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let actual_finish = act_payload.get("actual_finish_date")
            .or_else(|| act_payload.get("status_data_date"))
            .and_then(|v| v.as_str())
            .unwrap_or("");

        match method {
            "Quantity" => {
                for w in &wir_rows {
                    let w_id: String = w.get(0);
                    let w_payload_str: String = w.get(2);
                    let w_p: serde_json::Value = serde_json::from_str(&w_payload_str).unwrap_or(serde_json::Value::Null);
                    let w_sch = w_p.get("schedule_id").and_then(|v| v.as_str()).unwrap_or("");
                    if w_sch == act_id {
                        let w_status = w_p.get("status").and_then(|v| v.as_str()).unwrap_or("");
                        let w_res = w_p.get("result").and_then(|v| v.as_str()).unwrap_or("");
                        let is_approved = w_status == "Approved" || w_status == "Passed" || w_res == "Pass" || w_res == "Conditional Pass";
                        let w_date = w_p.get("inspection_date").or_else(|| w_p.get("date")).and_then(|v| v.as_str()).unwrap_or("");
                        let date_ok = !w_date.is_empty() && (cutoff_date.is_empty() || w_date <= cutoff_date);
                        if is_approved && date_ok {
                            handled_wir_ids.insert(w_id.clone());
                            let qty = w_p.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let boq_id = w_p.get("boq_item_id").and_then(|v| v.as_str()).unwrap_or("");
                            let def_rate = w_p.get("unit_rate").or_else(|| w_p.get("unit_price")).and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let rate = get_selling_rate(boq_id, def_rate);
                            explicit_ev += qty * rate;
                            if !schedule_record_ids.contains(&w_id) {
                                schedule_record_ids.push(w_id);
                            }
                        }
                    }
                }
            },
            "0/100" => {
                let finish_ok = !actual_finish.is_empty() && (cutoff_date.is_empty() || actual_finish <= cutoff_date);
                if status == "Completed" && finish_ok {
                    explicit_ev += budget;
                    if !schedule_record_ids.contains(act_id) {
                        schedule_record_ids.push(act_id.to_string());
                    }
                }
            },
            "50/50" => {
                let finish_ok = !actual_finish.is_empty() && (cutoff_date.is_empty() || actual_finish <= cutoff_date);
                let start_ok = !actual_start.is_empty() && (cutoff_date.is_empty() || actual_start <= cutoff_date);
                if status == "Completed" && finish_ok {
                    explicit_ev += budget;
                    if !schedule_record_ids.contains(act_id) {
                        schedule_record_ids.push(act_id.to_string());
                    }
                } else if start_ok {
                    explicit_ev += budget * 0.5;
                    if !schedule_record_ids.contains(act_id) {
                        schedule_record_ids.push(act_id.to_string());
                    }
                }
            },
            "Weighted Milestone" => {
                let weight_pct = act_payload.get("measurement_weight_pct").and_then(|v| v.as_f64()).unwrap_or(0.0).clamp(0.0, 100.0);
                explicit_ev += budget * (weight_pct / 100.0);
                if !schedule_record_ids.contains(act_id) {
                    schedule_record_ids.push(act_id.to_string());
                }
            },
            _ => {}
        }
    }

    let mut legacy_ev = 0.0;
    for w in &wir_rows {
        let w_id: String = w.get(0);
        if handled_wir_ids.contains(&w_id) {
            continue;
        }
        let w_contract: Option<String> = w.get(1);
        let w_contract_str = w_contract.unwrap_or_default();
        if !performance_contract_ids.is_empty() && !performance_contract_ids.contains(&w_contract_str) && !w_contract_str.is_empty() {
            continue;
        }
        let w_payload_str: String = w.get(2);
        let w_p: serde_json::Value = serde_json::from_str(&w_payload_str).unwrap_or(serde_json::Value::Null);
        let w_sch = w_p.get("schedule_id").and_then(|v| v.as_str()).unwrap_or("");
        if explicit_activities.contains_key(w_sch) {
            continue;
        }
        let w_status = w_p.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let w_res = w_p.get("result").and_then(|v| v.as_str()).unwrap_or("");
        let is_approved = w_status == "Approved" || w_status == "Passed" || w_res == "Pass" || w_res == "Conditional Pass";
        let w_date = w_p.get("inspection_date").or_else(|| w_p.get("date")).and_then(|v| v.as_str()).unwrap_or("");
        let date_ok = !w_date.is_empty() && (cutoff_date.is_empty() || w_date <= cutoff_date);

        if is_approved && date_ok {
            let qty = w_p.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let boq_id = w_p.get("boq_item_id").and_then(|v| v.as_str()).unwrap_or("");
            let def_rate = w_p.get("unit_rate").or_else(|| w_p.get("unit_price")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let rate = get_selling_rate(boq_id, def_rate);
            legacy_ev += qty * rate;
            if !schedule_record_ids.contains(&w_id) {
                schedule_record_ids.push(w_id);
            }
        }
    }

    // Progress Corrections
    let cor_rows = sqlx::query(
        "SELECT id, original_wir_id, payload FROM progress_corrections WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut correction_ev = 0.0;
    let wir_map: std::collections::HashMap<String, (Option<String>, serde_json::Value)> = wir_rows
        .iter()
        .map(|r| {
            let id: String = r.get(0);
            let c_id: Option<String> = r.get(1);
            let p_str: String = r.get(2);
            let p: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);
            (id, (c_id, p))
        })
        .collect();

    for c_row in cor_rows {
        let cor_id: String = c_row.get(0);
        let orig_wir_id: String = c_row.get(1);
        let p_str: String = c_row.get(2);
        let c_p: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);

        let status = c_p.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status != "Posted" {
            continue;
        }
        let eff_date = c_p.get("effective_date").and_then(|v| v.as_str()).unwrap_or("");
        if eff_date.is_empty() || (!cutoff_date.is_empty() && eff_date > cutoff_date) {
            continue;
        }

        if let Some((w_contract, w_p)) = wir_map.get(&orig_wir_id) {
            let w_contract_str = w_contract.clone().unwrap_or_default();
            if !performance_contract_ids.is_empty() && !performance_contract_ids.contains(&w_contract_str) && !w_contract_str.is_empty() {
                continue;
            }
            let boq_id = w_p.get("boq_item_id").and_then(|v| v.as_str()).unwrap_or("");
            let def_rate = w_p.get("unit_rate").or_else(|| w_p.get("unit_price")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let rate = get_selling_rate(boq_id, def_rate);
            let qty = c_p.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let c_type = c_p.get("correction_type").and_then(|v| v.as_str()).unwrap_or("");
            let amt = qty * rate;
            if c_type == "Reinstatement" {
                correction_ev += amt;
            } else {
                correction_ev -= amt;
            }
            if !schedule_record_ids.contains(&cor_id) {
                schedule_record_ids.push(cor_id);
            }
        }
    }

    let total_ev = (explicit_ev + legacy_ev + correction_ev).max(0.0);

    // 5. Actual Cost (AC) from Cost Entries and Procurement Receipts
    let cost_rows = sqlx::query(
        "SELECT id, contract_id, payload FROM cost_entries WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut direct_ac = 0.0;
    let mut cost_record_ids: Vec<String> = Vec::new();
    let mut posted_receipt_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for c_row in cost_rows {
        let c_id: String = c_row.get(0);
        let c_contract: Option<String> = c_row.get(1);
        let c_contract_str = c_contract.unwrap_or_default();
        if !performance_contract_ids.is_empty() && !performance_contract_ids.contains(&c_contract_str) && !c_contract_str.is_empty() {
            continue;
        }
        let p_str: String = c_row.get(2);
        let p: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);

        let status = p.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status == "Draft" || status == "Reversed" || status == "Rejected" {
            continue;
        }

        let date = p.get("posting_date")
            .or_else(|| p.get("date"))
            .or_else(|| p.get("cost_date"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if date.is_empty() || (!cutoff_date.is_empty() && date > cutoff_date) {
            continue;
        }

        let amt = p.get("amount")
            .or_else(|| p.get("actual_cost"))
            .or_else(|| p.get("ac"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        direct_ac += amt;
        cost_record_ids.push(c_id);

        let src_type = p.get("source_type").and_then(|v| v.as_str()).unwrap_or("");
        if src_type == "procurement_receipt" {
            if let Some(src_id) = p.get("source_id").and_then(|v| v.as_str()) {
                if !src_id.is_empty() {
                    posted_receipt_ids.insert(src_id.to_string());
                }
            }
        }
    }

    let rcpt_rows = sqlx::query(
        "SELECT id, contract_id, payload FROM procurement_receipts WHERE project_id = ?"
    )
    .bind(project_id)
    .fetch_all(&mut **tx)
    .await
    .unwrap_or_default();

    let mut receipt_ac = 0.0;
    for r_row in rcpt_rows {
        let r_id: String = r_row.get(0);
        let r_contract: Option<String> = r_row.get(1);
        let r_contract_str = r_contract.unwrap_or_default();
        if !performance_contract_ids.is_empty() && !performance_contract_ids.contains(&r_contract_str) && !r_contract_str.is_empty() {
            continue;
        }
        if posted_receipt_ids.contains(&r_id) {
            continue;
        }

        let p_str: String = r_row.get(2);
        let p: serde_json::Value = serde_json::from_str(&p_str).unwrap_or(serde_json::Value::Null);

        let status = p.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status != "Accepted" {
            continue;
        }

        let r_date = p.get("receipt_date").or_else(|| p.get("date")).and_then(|v| v.as_str()).unwrap_or("");
        if r_date.is_empty() || (!cutoff_date.is_empty() && r_date > cutoff_date) {
            continue;
        }

        let amt = p.get("accepted_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or_else(|| {
                let qty = p.get("accepted_quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let uc = p.get("unit_cost").and_then(|v| v.as_f64()).unwrap_or(0.0);
                qty * uc
            });

        receipt_ac += amt;
        cost_record_ids.push(r_id);
    }

    let total_ac = direct_ac + receipt_ac;

    // 6. SPI and CPI (Enforce positive denominators, return None if missing)
    let spi_value = if !has_approved_baseline || cumulative_pv <= 0.0 {
        None
    } else {
        Some(total_ev / cumulative_pv)
    };

    let cpi_value = if total_ac <= 0.0 {
        None
    } else {
        Some(total_ev / total_ac)
    };

    Ok(EvmCalculationResult {
        pv: cumulative_pv,
        ev: total_ev,
        ac: total_ac,
        spi: spi_value,
        cpi: cpi_value,
        schedule_record_ids,
        cost_record_ids,
    })
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
            "Total dimension weights must sum to 100%, got {}%",
            total_weight
        ));
    }
    validate_thresholds("Schedule", req.schedule_warning_threshold, req.schedule_critical_threshold, &req.schedule_direction)?;
    validate_thresholds("Cost", req.cost_warning_threshold, req.cost_critical_threshold, &req.cost_direction)?;
    validate_thresholds("Cash", req.cash_warning_threshold, req.cash_critical_threshold, &req.cash_direction)?;
    validate_thresholds("Scope", req.scope_warning_threshold, req.scope_critical_threshold, &req.scope_direction)?;
    validate_thresholds("Quality", req.quality_warning_threshold, req.quality_critical_threshold, &req.quality_direction)?;
    validate_thresholds("Data Quality", req.data_quality_warning_threshold, req.data_quality_critical_threshold, &req.data_quality_direction)?;

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
    let cutoff_date = req.data_date.clone().unwrap_or_default().trim().to_string();

    // 1. Governed EVM Reconciled Engine (SPI = Total EV / Total PV, CPI = Total EV / Total AC)
    let evm_res = calculate_governed_evm_core(&mut tx, &req.project_id, &cutoff_date).await?;
    let schedule_ids = evm_res.schedule_record_ids;
    let spi_value = evm_res.spi;
    let cost_ids = evm_res.cost_record_ids;
    let cpi_value = evm_res.cpi;

    // 3. Cash Flow
    let (cash_ids, net_cash): (Vec<String>, Option<f64>) = if cutoff_date.is_empty() {
        let rows = sqlx::query(
            "SELECT id, 
                    CAST(COALESCE(json_extract(payload, '$.inflow'), 0) AS REAL), 
                    CAST(COALESCE(json_extract(payload, '$.outflow'), 0) AS REAL) 
             FROM cash_flow WHERE project_id = ?"
        )
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let net = if ids.is_empty() {
            None
        } else {
            let mut sum = 0.0;
            for r in &rows {
                let inf: f64 = r.get(1);
                let outf: f64 = r.get(2);
                sum += inf - outf;
            }
            Some(sum)
        };
        (ids, net)
    } else {
        let rows = sqlx::query(
            "SELECT id, 
                    CAST(COALESCE(json_extract(payload, '$.inflow'), 0) AS REAL), 
                    CAST(COALESCE(json_extract(payload, '$.outflow'), 0) AS REAL) 
             FROM cash_flow 
             WHERE project_id = ? 
             AND COALESCE(json_extract(payload, '$.date'), json_extract(payload, '$.entry_date')) IS NOT NULL 
             AND COALESCE(json_extract(payload, '$.date'), json_extract(payload, '$.entry_date')) <= ?"
        )
        .bind(&req.project_id)
        .bind(&cutoff_date)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let net = if ids.is_empty() {
            None
        } else {
            let mut sum = 0.0;
            for r in &rows {
                let inf: f64 = r.get(1);
                let outf: f64 = r.get(2);
                sum += inf - outf;
            }
            Some(sum)
        };
        (ids, net)
    };

    // 4. Variations
    let (var_ids, unapproved_var_ratio): (Vec<String>, Option<f64>) = if cutoff_date.is_empty() {
        let rows = sqlx::query(
            "SELECT id, COALESCE(status_sql, json_extract(payload, '$.status')) FROM variations WHERE project_id = ?"
        )
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let ratio = if ids.is_empty() {
            None
        } else {
            let unapproved_cnt = rows.iter().filter(|r| {
                let st: Option<String> = r.get(1);
                match st.as_deref() {
                    Some("Approved") => false,
                    _ => true,
                }
            }).count();
            Some(unapproved_cnt as f64 / ids.len() as f64)
        };
        (ids, ratio)
    } else {
        let rows = sqlx::query(
            "SELECT id, COALESCE(status_sql, json_extract(payload, '$.status')) FROM variations 
             WHERE project_id = ? 
             AND COALESCE(approved_date_sql, json_extract(payload, '$.approved_date'), json_extract(payload, '$.submission_date'), json_extract(payload, '$.date')) IS NOT NULL 
             AND COALESCE(approved_date_sql, json_extract(payload, '$.approved_date'), json_extract(payload, '$.submission_date'), json_extract(payload, '$.date')) <= ?"
        )
        .bind(&req.project_id)
        .bind(&cutoff_date)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let ratio = if ids.is_empty() {
            None
        } else {
            let unapproved_cnt = rows.iter().filter(|r| {
                let st: Option<String> = r.get(1);
                match st.as_deref() {
                    Some("Approved") => false,
                    _ => true,
                }
            }).count();
            Some(unapproved_cnt as f64 / ids.len() as f64)
        };
        (ids, ratio)
    };

    // 5. WIR inspection entries
    let (wir_ids, wir_fail_rate): (Vec<String>, Option<f64>) = if cutoff_date.is_empty() {
        let rows = sqlx::query(
            "SELECT id, json_extract(payload, '$.status') FROM wir_entries WHERE project_id = ?"
        )
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let fail_rate = if ids.is_empty() {
            None
        } else {
            let failed_cnt = rows.iter().filter(|r| {
                let st: Option<String> = r.get(1);
                match st.as_deref() {
                    Some("Rejected") | Some("Failed") | Some("Non-Compliant") => true,
                    _ => false,
                }
            }).count();
            Some(failed_cnt as f64 / ids.len() as f64)
        };
        (ids, fail_rate)
    } else {
        let rows = sqlx::query(
            "SELECT id, json_extract(payload, '$.status') FROM wir_entries 
             WHERE project_id = ? 
             AND COALESCE(json_extract(payload, '$.inspection_date'), json_extract(payload, '$.date')) IS NOT NULL 
             AND COALESCE(json_extract(payload, '$.inspection_date'), json_extract(payload, '$.date')) <= ?"
        )
        .bind(&req.project_id)
        .bind(&cutoff_date)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let fail_rate = if ids.is_empty() {
            None
        } else {
            let failed_cnt = rows.iter().filter(|r| {
                let st: Option<String> = r.get(1);
                match st.as_deref() {
                    Some("Rejected") | Some("Failed") | Some("Non-Compliant") => true,
                    _ => false,
                }
            }).count();
            Some(failed_cnt as f64 / ids.len() as f64)
        };
        (ids, fail_rate)
    };

    // 6. Data Quality (derived from actual dated dq_execution_logs findings, or Unavailable)
    let (dq_ids, dq_ratio): (Vec<String>, Option<f64>) = if cutoff_date.is_empty() {
        let rows = sqlx::query(
            "SELECT id, 
                    CAST(COALESCE(json_extract(payload, '$.failed_records_count'), 0) AS INTEGER),
                    CAST(COALESCE(json_extract(payload, '$.total_records_scanned'), 0) AS INTEGER)
             FROM dq_execution_logs WHERE project_id = ?"
        )
        .bind(&req.project_id)
        .fetch_all(&mut *tx)
        .await
        .unwrap_or_default();

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let failed_sum: i64 = rows.iter().map(|r| r.get::<i64, _>(1)).sum();
        let scanned_sum: i64 = rows.iter().map(|r| r.get::<i64, _>(2)).sum();

        let ratio = if ids.is_empty() || scanned_sum == 0 {
            None
        } else {
            Some(failed_sum as f64 / scanned_sum as f64)
        };
        (ids, ratio)
    } else {
        let rows = sqlx::query(
            "SELECT id, 
                    CAST(COALESCE(json_extract(payload, '$.failed_records_count'), 0) AS INTEGER),
                    CAST(COALESCE(json_extract(payload, '$.total_records_scanned'), 0) AS INTEGER)
             FROM dq_execution_logs 
             WHERE project_id = ? 
             AND COALESCE(json_extract(payload, '$.execution_date'), created_at) IS NOT NULL 
             AND COALESCE(json_extract(payload, '$.execution_date'), created_at) <= ?"
        )
        .bind(&req.project_id)
        .bind(&cutoff_date)
        .fetch_all(&mut *tx)
        .await
        .unwrap_or_default();

        let ids: Vec<String> = rows.iter().map(|r| r.get(0)).collect();
        let failed_sum: i64 = rows.iter().map(|r| r.get::<i64, _>(1)).sum();
        let scanned_sum: i64 = rows.iter().map(|r| r.get::<i64, _>(2)).sum();

        let ratio = if ids.is_empty() || scanned_sum == 0 {
            None
        } else {
            Some(failed_sum as f64 / scanned_sum as f64)
        };
        (ids, ratio)
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
        "Data Quality Exception Rate (%)",
        req.data_quality_warning_threshold,
        req.data_quality_critical_threshold,
        &req.data_quality_direction,
        "Governed Data Quality Execution Logs",
        dq_ids,
        if dq_ratio.is_none() { "Missing" } else { "Fresh" },
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
             CREATE TABLE contracts (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, parent_main_contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE boq_items (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE project_baselines (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE reporting_periods (id TEXT PRIMARY KEY, project_id TEXT, start_date TEXT, end_date TEXT, is_locked INTEGER DEFAULT 0);
             CREATE TABLE schedules (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE cost_entries (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE procurement_receipts (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE progress_corrections (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, original_wir_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE cash_flow (id TEXT PRIMARY KEY, project_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE variations (id TEXT PRIMARY KEY, project_id TEXT, status_sql TEXT, approved_date_sql TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE wir_entries (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
             CREATE TABLE dq_execution_logs (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, payload TEXT NOT NULL DEFAULT '{}');
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

        sqlx::query("INSERT INTO contracts (id, created_at, project_id, parent_main_contract_id, payload) VALUES ('cnt-1', '2026-09-01', 'prj-1', NULL, '{}')")
            .execute(&pool)
            .await
            .unwrap();

        pool.close().await;
        path
    }

    #[tokio::test]
    async fn test_invalid_weight_sum() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-save-bad-weight".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-BAD-W".to_string(),
            title: "Bad Weights".to_string(),
            data_date: Some("2026-09-13".to_string()),
            schedule_weight: 30.0, // Total weight becomes 110%
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
            actor: "Planner Lead".to_string(),
        };

        let res = save_health_score_version_core(&db, save_req).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("must sum to 100%"));
    }

    #[tokio::test]
    async fn test_invalid_threshold_order() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-save-bad-thresh".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-BAD-T".to_string(),
            title: "Bad Thresholds".to_string(),
            data_date: Some("2026-09-13".to_string()),
            schedule_weight: 20.0,
            cost_weight: 20.0,
            cash_weight: 20.0,
            scope_weight: 15.0,
            quality_weight: 15.0,
            data_quality_weight: 10.0,
            schedule_warning_threshold: 0.80, // Invalid: for higher_is_better, warning must be > critical
            schedule_critical_threshold: 0.90,
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
            actor: "Planner Lead".to_string(),
        };

        let res = save_health_score_version_core(&db, save_req).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Warning threshold must be strictly greater than critical threshold"));
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

    #[tokio::test]
    async fn test_dated_source_derivation_and_real_schema() {
        let db = create_test_db().await;
        let pool = database(&db).await.unwrap();

        // Populate lawful BOQ item and approved baseline for governed EVM derivation
        sqlx::query(
            "INSERT INTO boq_items (id, project_id, contract_id, payload) VALUES 
             ('boq-1', 'prj-1', 'cnt-1', '{\"unit_rate\": 100.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO project_baselines (id, project_id, contract_id, payload) VALUES 
             ('base-1', 'prj-1', 'cnt-1', '{\"status\": \"Approved\", \"distribution_snapshot\": [{\"schedule_id\": \"sch-1\", \"period_start\": \"2026-09-01\", \"period_end\": \"2026-09-10\", \"planned_value\": 100000.0}, {\"schedule_id\": \"sch-2\", \"period_start\": \"2026-09-15\", \"period_end\": \"2026-09-25\", \"planned_value\": 50000.0}]}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Populate sources with canonical EVM and operational fields before and after cutoff 2026-09-10
        sqlx::query(
            "INSERT INTO schedules (id, project_id, payload) VALUES 
             ('sch-1', 'prj-1', '{\"start_date\": \"2026-09-05\", \"planned_value\": 100000.0}'),
             ('sch-2', 'prj-1', '{\"start_date\": \"2026-09-15\", \"planned_value\": 50000.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO cost_entries (id, project_id, payload) VALUES 
             ('cst-1', 'prj-1', '{\"posting_date\": \"2026-09-01\", \"actual_cost\": 80000.0}'),
             ('cst-2', 'prj-1', '{\"posting_date\": \"2026-09-20\", \"actual_cost\": 60000.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO cash_flow (id, project_id, payload) VALUES 
             ('cf-1', 'prj-1', '{\"date\": \"2026-09-08\", \"inflow\": 1000.0, \"outflow\": 400.0}'),
             ('cf-2', 'prj-1', '{\"date\": \"2026-09-18\", \"inflow\": 2000.0, \"outflow\": 800.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO variations (id, project_id, status_sql, approved_date_sql, payload) VALUES 
             ('var-1', 'prj-1', 'Approved', '2026-09-03', '{\"status\": \"Approved\", \"approved_date\": \"2026-09-03\"}'),
             ('var-2', 'prj-1', 'Pending', '2026-09-04', '{\"status\": \"Pending\", \"submission_date\": \"2026-09-04\"}'),
             ('var-3', 'prj-1', 'Pending', '2026-09-19', '{\"status\": \"Pending\", \"submission_date\": \"2026-09-19\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO wir_entries (id, project_id, contract_id, payload) VALUES 
             ('wir-1', 'prj-1', 'cnt-1', '{\"inspection_date\": \"2026-09-06\", \"status\": \"Approved\", \"quantity\": 900.0, \"boq_item_id\": \"boq-1\"}'),
             ('wir-2', 'prj-1', 'cnt-1', '{\"inspection_date\": \"2026-09-07\", \"status\": \"Rejected\"}'),
             ('wir-3', 'prj-1', 'cnt-1', '{\"inspection_date\": \"2026-09-16\", \"status\": \"Rejected\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO dq_execution_logs (id, project_id, payload) VALUES 
             ('dq-1', 'prj-1', '{\"execution_date\": \"2026-09-08\", \"failed_records_count\": 2, \"total_records_scanned\": 50}'),
             ('dq-2', 'prj-1', '{\"execution_date\": \"2026-09-22\", \"failed_records_count\": 10, \"total_records_scanned\": 50}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool.close().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-save-dated-1".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-DATED".to_string(),
            title: "Dated Derivation Test".to_string(),
            data_date: Some("2026-09-10".to_string()),
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
            notes: Some("Verifying cutoff exclusion".to_string()),
            actor: "System Audit".to_string(),
        };

        let result = save_health_score_version_core(&db, save_req)
            .await
            .unwrap();

        // 1. Schedule: SPI = EV (90,000) / PV (100,000) = 0.90; sch-1 & wir-1 included, sch-2 excluded
        let sched_dim = &result.dimensions[0];
        assert_eq!(sched_dim.dimension, "Schedule");
        assert_eq!(sched_dim.raw_metric_value, Some(0.90));
        assert!(sched_dim.source_record_ids.contains(&"sch-1".to_string()));
        assert!(sched_dim.source_record_ids.contains(&"wir-1".to_string()));
        assert!(!sched_dim.source_record_ids.contains(&"sch-2".to_string()));

        // 2. Cost: CPI = EV (90,000) / AC (80,000) = 1.125; cst-1 included, cst-2 excluded
        let cost_dim = &result.dimensions[1];
        assert_eq!(cost_dim.dimension, "Cost");
        assert_eq!(cost_dim.raw_metric_value, Some(1.125));
        assert_eq!(cost_dim.source_record_ids, vec!["cst-1".to_string()]);

        // 3. Cash: Net Cash = 1,000 - 400 = 600.0; cf-1 included, cf-2 excluded
        let cash_dim = &result.dimensions[2];
        assert_eq!(cash_dim.dimension, "Cash");
        assert_eq!(cash_dim.raw_metric_value, Some(600.0));
        assert_eq!(cash_dim.source_record_ids, vec!["cf-1".to_string()]);

        // 4. Scope: Unapproved variations ratio = 1 / 2 = 0.5; var-1 & var-2 included, var-3 excluded
        let scope_dim = &result.dimensions[3];
        assert_eq!(scope_dim.dimension, "Scope");
        assert_eq!(scope_dim.raw_metric_value, Some(0.5));
        assert_eq!(scope_dim.source_record_ids, vec!["var-1".to_string(), "var-2".to_string()]);

        // 5. Quality: WIR failure rate = 1 / 2 = 0.5; wir-1 & wir-2 included, wir-3 excluded
        let qual_dim = &result.dimensions[4];
        assert_eq!(qual_dim.dimension, "Quality");
        assert_eq!(qual_dim.raw_metric_value, Some(0.5));
        assert_eq!(qual_dim.source_record_ids, vec!["wir-1".to_string(), "wir-2".to_string()]);

        // 6. Data Quality: 2 failed / 50 scanned = 0.04; dq-1 included, dq-2 excluded
        let dq_dim = &result.dimensions[5];
        assert_eq!(dq_dim.dimension, "Data Quality");
        assert_eq!(dq_dim.raw_metric_value, Some(0.04));
        assert_eq!(dq_dim.source_record_ids, vec!["dq-1".to_string()]);
    }

    #[tokio::test]
    async fn test_locked_reporting_period_rejection() {
        let db = create_test_db().await;
        let pool = database(&db).await.unwrap();

        sqlx::query(
            "INSERT INTO reporting_periods (id, project_id, start_date, end_date, is_locked)
             VALUES ('rp-1', 'prj-1', '2026-09-01', '2026-09-30', 1)"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool.close().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-locked-rp".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-LOCKED".to_string(),
            title: "Locked Period Test".to_string(),
            data_date: Some("2026-09-15".to_string()),
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
            actor: "Planner Lead".to_string(),
        };

        let err = save_health_score_version_core(&db, save_req)
            .await
            .unwrap_err();
        assert!(err.contains("locked reporting period"));
    }

    #[tokio::test]
    async fn test_idempotent_replay() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-idempotent-1".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-HEALTH-IDEMP".to_string(),
            title: "Idempotent Replay Test".to_string(),
            data_date: Some("2026-09-10".to_string()),
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
            actor: "Planner Lead".to_string(),
        };

        let first = save_health_score_version_core(&db, save_req.clone())
            .await
            .unwrap();

        let second = save_health_score_version_core(&db, save_req)
            .await
            .unwrap();

        assert_eq!(first.id, second.id);
        assert_eq!(first.version_code, second.version_code);
    }

    #[tokio::test]
    async fn test_cross_project_rejection() {
        let db = create_test_db().await;

        let save_req = SaveHealthScoreVersionRequest {
            operation_id: "op-unknown-proj".to_string(),
            project_id: "prj-nonexistent".to_string(),
            version_code: "V-HEALTH-NOPROJ".to_string(),
            title: "Unknown Project Test".to_string(),
            data_date: Some("2026-09-10".to_string()),
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
            actor: "Planner Lead".to_string(),
        };

        let err = save_health_score_version_core(&db, save_req)
            .await
            .unwrap_err();
        assert!(err.contains("Project does not exist"));
    }

    #[tokio::test]
    async fn test_evm_two_data_dates_reconciliation() {
        let db = create_test_db().await;
        let pool = database(&db).await.unwrap();

        // 1. Contracts: Main and Subcontract
        sqlx::query(
            "INSERT INTO contracts (id, created_at, project_id, parent_main_contract_id, payload) VALUES 
             ('cnt-main', '2026-09-01', 'prj-1', NULL, '{}'),
             ('cnt-sub', '2026-09-01', 'prj-1', 'cnt-main', '{}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // 2. BOQ Items: Main rate 100, Subcontract rate 60 linked to main
        sqlx::query(
            "INSERT INTO boq_items (id, project_id, contract_id, payload) VALUES 
             ('boq-main-1', 'prj-1', 'cnt-main', '{\"unit_rate\": 100.0}'),
             ('boq-sub-1', 'prj-1', 'cnt-sub', '{\"unit_rate\": 60.0, \"main_boq_item_id\": \"boq-main-1\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // 3. Approved Baseline with time-phased distribution
        sqlx::query(
            "INSERT INTO project_baselines (id, project_id, contract_id, payload) VALUES 
             ('base-1', 'prj-1', 'cnt-main', '{\"status\": \"Approved\", \"distribution_snapshot\": [
                 {\"schedule_id\": \"sch-1\", \"period_start\": \"2026-09-01\", \"period_end\": \"2026-09-10\", \"planned_value\": 60000.0},
                 {\"schedule_id\": \"sch-2\", \"period_start\": \"2026-09-11\", \"period_end\": \"2026-09-20\", \"planned_value\": 120000.0}
             ]}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO schedules (id, project_id, contract_id, payload) VALUES 
             ('sch-1', 'prj-1', 'cnt-main', '{\"start_date\": \"2026-09-01\"}'),
             ('sch-2', 'prj-1', 'cnt-main', '{\"start_date\": \"2026-09-11\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // 4. WIR inspections with subcontract roll-up and future/undated exclusions
        sqlx::query(
            "INSERT INTO wir_entries (id, project_id, contract_id, payload) VALUES 
             ('wir-1', 'prj-1', 'cnt-main', '{\"inspection_date\": \"2026-09-05\", \"status\": \"Approved\", \"quantity\": 400.0, \"boq_item_id\": \"boq-main-1\"}'),
             ('wir-sub-1', 'prj-1', 'cnt-sub', '{\"inspection_date\": \"2026-09-08\", \"status\": \"Approved\", \"quantity\": 200.0, \"boq_item_id\": \"boq-sub-1\"}'),
             ('wir-date2', 'prj-1', 'cnt-main', '{\"inspection_date\": \"2026-09-18\", \"status\": \"Approved\", \"quantity\": 300.0, \"boq_item_id\": \"boq-main-1\"}'),
             ('wir-future', 'prj-1', 'cnt-main', '{\"inspection_date\": \"2026-09-25\", \"status\": \"Approved\", \"quantity\": 500.0, \"boq_item_id\": \"boq-main-1\"}'),
             ('wir-undated', 'prj-1', 'cnt-main', '{\"status\": \"Approved\", \"quantity\": 500.0, \"boq_item_id\": \"boq-main-1\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // 5. Governed Progress Corrections (reversals)
        sqlx::query(
            "INSERT INTO progress_corrections (id, project_id, contract_id, original_wir_id, payload) VALUES 
             ('cor-1', 'prj-1', 'cnt-main', 'wir-1', '{\"status\": \"Posted\", \"effective_date\": \"2026-09-09\", \"correction_type\": \"Reversal\", \"quantity\": 50.0}'),
             ('cor-future', 'prj-1', 'cnt-main', 'wir-1', '{\"status\": \"Posted\", \"effective_date\": \"2026-09-28\", \"correction_type\": \"Reversal\", \"quantity\": 100.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        // 6. Cost Entries and Procurement Receipts (with de-duplication)
        sqlx::query(
            "INSERT INTO cost_entries (id, project_id, contract_id, payload) VALUES 
             ('cst-1', 'prj-1', 'cnt-main', '{\"posting_date\": \"2026-09-03\", \"amount\": 25000.0, \"status\": \"Posted\"}'),
             ('cst-sub-1', 'prj-1', 'cnt-sub', '{\"posting_date\": \"2026-09-07\", \"amount\": 15000.0, \"status\": \"Approved\"}'),
             ('cst-dup', 'prj-1', 'cnt-main', '{\"posting_date\": \"2026-09-04\", \"amount\": 10000.0, \"source_type\": \"procurement_receipt\", \"source_id\": \"rcpt-dup\", \"status\": \"Posted\"}'),
             ('cst-date2', 'prj-1', 'cnt-main', '{\"posting_date\": \"2026-09-15\", \"amount\": 20000.0, \"status\": \"Posted\"}'),
             ('cst-future', 'prj-1', 'cnt-main', '{\"posting_date\": \"2026-09-27\", \"amount\": 50000.0, \"status\": \"Posted\"}'),
             ('cst-undated', 'prj-1', 'cnt-main', '{\"amount\": 50000.0, \"status\": \"Posted\"}'),
             ('cst-draft', 'prj-1', 'cnt-main', '{\"posting_date\": \"2026-09-02\", \"amount\": 50000.0, \"status\": \"Draft\"}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO procurement_receipts (id, project_id, contract_id, payload) VALUES 
             ('rcpt-dup', 'prj-1', 'cnt-main', '{\"receipt_date\": \"2026-09-04\", \"status\": \"Accepted\", \"accepted_amount\": 10000.0}'),
             ('rcpt-unposted', 'prj-1', 'cnt-main', '{\"receipt_date\": \"2026-09-06\", \"status\": \"Accepted\", \"accepted_amount\": 5000.0}'),
             ('rcpt-pending', 'prj-1', 'cnt-main', '{\"receipt_date\": \"2026-09-06\", \"status\": \"Pending\", \"accepted_amount\": 50000.0}');"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool.close().await;

        // Verify Data Date 1 (2026-09-10)
        let req_date1 = SaveHealthScoreVersionRequest {
            operation_id: "op-date-1".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-DATE1".to_string(),
            title: "Data Date 1 Reconciliation".to_string(),
            data_date: Some("2026-09-10".to_string()),
            schedule_weight: 50.0,
            cost_weight: 50.0,
            cash_weight: 0.0,
            scope_weight: 0.0,
            quality_weight: 0.0,
            data_quality_weight: 0.0,
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
            actor: "PMO Lead".to_string(),
        };

        let res_date1 = save_health_score_version_core(&db, req_date1)
            .await
            .unwrap();

        // At Date 1:
        // PV = 60,000
        // EV = (400 * 100) + (200 * 100) - (50 * 100) = 55,000
        // AC = 25,000 + 15,000 + 10,000 + 5,000 = 55,000
        // SPI = 55,000 / 60,000 = 0.916666...
        // CPI = 55,000 / 55,000 = 1.0
        let spi1 = res_date1.dimensions[0].raw_metric_value.unwrap();
        let cpi1 = res_date1.dimensions[1].raw_metric_value.unwrap();
        assert!((spi1 - (55000.0 / 60000.0)).abs() < 1e-4);
        assert!((cpi1 - 1.0).abs() < 1e-4);

        // Verify Data Date 2 (2026-09-20)
        let req_date2 = SaveHealthScoreVersionRequest {
            operation_id: "op-date-2".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-DATE2".to_string(),
            title: "Data Date 2 Reconciliation".to_string(),
            data_date: Some("2026-09-20".to_string()),
            schedule_weight: 50.0,
            cost_weight: 50.0,
            cash_weight: 0.0,
            scope_weight: 0.0,
            quality_weight: 0.0,
            data_quality_weight: 0.0,
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
            actor: "PMO Lead".to_string(),
        };

        let res_date2 = save_health_score_version_core(&db, req_date2)
            .await
            .unwrap();

        // At Date 2:
        // PV = 60,000 + 120,000 = 180,000
        // EV = 55,000 + (300 * 100) = 85,000
        // AC = 55,000 + 20,000 = 75,000
        // SPI = 85,000 / 180,000 = 0.472222...
        // CPI = 85,000 / 75,000 = 1.133333...
        let spi2 = res_date2.dimensions[0].raw_metric_value.unwrap();
        let cpi2 = res_date2.dimensions[1].raw_metric_value.unwrap();
        assert!((spi2 - (85000.0 / 180000.0)).abs() < 1e-4);
        assert!((cpi2 - (85000.0 / 75000.0)).abs() < 1e-4);
    }

    #[tokio::test]
    async fn test_evm_zero_denominators_unavailable() {
        let db = create_test_db().await;

        let req = SaveHealthScoreVersionRequest {
            operation_id: "op-zero-denom".to_string(),
            project_id: "prj-1".to_string(),
            version_code: "V-ZERO".to_string(),
            title: "Zero Denominators Test".to_string(),
            data_date: Some("2026-09-10".to_string()),
            schedule_weight: 50.0,
            cost_weight: 50.0,
            cash_weight: 0.0,
            scope_weight: 0.0,
            quality_weight: 0.0,
            data_quality_weight: 0.0,
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
            actor: "PMO Lead".to_string(),
        };

        let res = save_health_score_version_core(&db, req)
            .await
            .unwrap();

        // No baseline => SPI is None, dimension is Unavailable, score is 0.0
        let sched_dim = &res.dimensions[0];
        assert_eq!(sched_dim.dimension, "Schedule");
        assert_eq!(sched_dim.raw_metric_value, None);
        assert_eq!(sched_dim.status, "Unavailable");
        assert_eq!(sched_dim.score, 0.0);
        assert_eq!(sched_dim.freshness_status, "Missing");

        // No cost entries => CPI is None, dimension is Unavailable, score is 0.0
        let cost_dim = &res.dimensions[1];
        assert_eq!(cost_dim.dimension, "Cost");
        assert_eq!(cost_dim.raw_metric_value, None);
        assert_eq!(cost_dim.status, "Unavailable");
        assert_eq!(cost_dim.score, 0.0);
        assert_eq!(cost_dim.freshness_status, "Missing");
    }
}
