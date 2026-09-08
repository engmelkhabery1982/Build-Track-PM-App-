//! Atomic equipment log, meter, hours & fuel posting lifecycle.
//! Draft -> Submitted -> Approved -> Posted -> Reversed.
//! Approval validates schedule activities, control accounts, active equipment resources,
//! non-negative hours/rates, meter rollback (meter_end >= meter_start), shift capacity <= 24h,
//! meter reading overlap for the same equipment, and locked reporting periods.
//! Posting creates immutable CostEntry rows atomically with source_type='EquipmentUsage' and 'EquipmentFuel'.
//! Reversal creates negative offset CostEntry rows without deleting the original audit trail.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{sqlite::SqliteConnectOptions, Row, Sqlite, SqlitePool, Transaction};
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveEquipmentLogRequest {
    pub operation_id: String,
    pub log_id: String,
    pub actor: String,
    pub approved_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitEquipmentLogRequest {
    pub operation_id: String,
    pub log_id: String,
    pub actor: String,
    pub submitted_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostEquipmentLogRequest {
    pub operation_id: String,
    pub log_id: String,
    pub actor: String,
    pub posted_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReverseEquipmentLogRequest {
    pub operation_id: String,
    pub log_id: String,
    pub actor: String,
    pub reason: String,
    pub reversed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentLogOperationResult {
    pub operation_id: String,
    pub log_id: String,
    pub status: String,
}

fn stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    format!(
        "{}Z",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    )
}

fn m(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn s(v: &Value, k: &str) -> String {
    v.get(k)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

async fn db(path: &Path) -> Result<SqlitePool, String> {
    SqlitePool::connect_with(
        SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .foreign_keys(true),
    )
    .await
    .map_err(|e| e.to_string())
}

async fn guard_on(tx: &mut Transaction<'_, Sqlite>, operation_id: &str) -> Result<(), String> {
    sqlx::query(
        "INSERT OR IGNORE INTO equipment_log_mutation_guard (operation_id, created_at) VALUES (?, ?)",
    )
    .bind(operation_id)
    .bind(stamp())
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn guard_off(tx: &mut Transaction<'_, Sqlite>, operation_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM equipment_log_mutation_guard WHERE operation_id = ?")
        .bind(operation_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub struct EquipmentLogHeader {
    pub id: String,
    pub project_id: String,
    pub contract_id: String,
    pub log_number: String,
    pub log_date: String,
    pub shift: String,
    pub resource_id: String,
    pub schedule_activity_id: String,
    pub control_account_id: String,
    pub boq_item_id: String,
    pub cost_code_id: Option<String>,
    pub submitter: String,
    pub approved_by: Option<String>,
    pub meter_start: f64,
    pub meter_end: f64,
    pub operating_hours: f64,
    pub idle_hours: f64,
    pub breakdown_hours: f64,
    pub hours_override_reason: Option<String>,
    pub hourly_rate: f64,
    pub fuel_quantity: f64,
    pub fuel_rate: f64,
    pub status: String,
    pub payload: Value,
}

async fn load_equipment_log(
    tx: &mut Transaction<'_, Sqlite>,
    id: &str,
) -> Result<EquipmentLogHeader, String> {
    let r = sqlx::query(
        "SELECT e.id, e.project_id, e.contract_id, e.log_number, e.log_date, e.shift, e.resource_id, e.schedule_activity_id, e.control_account_id, e.cost_code_id, COALESCE(e.submitter, e.operator_name, '') AS submitter, e.approved_by, e.meter_start, e.meter_end, e.operating_hours, e.idle_hours, e.breakdown_hours, e.hours_override_reason, e.hourly_rate, e.fuel_quantity, e.fuel_rate, e.status, e.payload, ca.boq_item_id FROM equipment_logs e JOIN control_accounts ca ON ca.id = e.control_account_id WHERE e.id = ?"
    )
    .bind(id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| format!("Equipment log {} was not found.", id))?;

    let payload_str: String = r.try_get("payload").map_err(|e| e.to_string())?;
    let payload: Value = serde_json::from_str(&payload_str).map_err(|e| e.to_string())?;

    Ok(EquipmentLogHeader {
        id: r.try_get("id").map_err(|e| e.to_string())?,
        project_id: r.try_get("project_id").map_err(|e| e.to_string())?,
        contract_id: r.try_get("contract_id").map_err(|e| e.to_string())?,
        log_number: r.try_get("log_number").map_err(|e| e.to_string())?,
        log_date: r.try_get("log_date").map_err(|e| e.to_string())?,
        shift: r.try_get("shift").map_err(|e| e.to_string())?,
        resource_id: r.try_get("resource_id").map_err(|e| e.to_string())?,
        schedule_activity_id: r
            .try_get("schedule_activity_id")
            .map_err(|e| e.to_string())?,
        control_account_id: r.try_get("control_account_id").map_err(|e| e.to_string())?,
        boq_item_id: r.try_get("boq_item_id").map_err(|e| e.to_string())?,
        cost_code_id: r.try_get("cost_code_id").ok(),
        submitter: r.try_get("submitter").map_err(|e| e.to_string())?,
        approved_by: r.try_get("approved_by").ok(),
        meter_start: r.try_get("meter_start").unwrap_or(0.0),
        meter_end: r.try_get("meter_end").unwrap_or(0.0),
        operating_hours: r.try_get("operating_hours").unwrap_or(0.0),
        idle_hours: r.try_get("idle_hours").unwrap_or(0.0),
        breakdown_hours: r.try_get("breakdown_hours").unwrap_or(0.0),
        hours_override_reason: r.try_get("hours_override_reason").ok(),
        hourly_rate: r.try_get("hourly_rate").unwrap_or(0.0),
        fuel_quantity: r.try_get("fuel_quantity").unwrap_or(0.0),
        fuel_rate: r.try_get("fuel_rate").unwrap_or(0.0),
        status: r.try_get("status").map_err(|e| e.to_string())?,
        payload,
    })
}

async fn write_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    log: &EquipmentLogHeader,
    action: &str,
    actor: &str,
    details: &str,
) -> Result<(), String> {
    let audit_id = format!(
        "audit:equipment-log:{}:{}:{}",
        log.id,
        action.to_lowercase(),
        stamp()
    );
    let payload = json!({
        "id": audit_id,
        "entity_type": "EquipmentLog",
        "entity_id": log.id,
        "action": action,
        "actor": actor,
        "timestamp": stamp(),
        "details": details,
        "project_id": log.project_id,
        "contract_id": log.contract_id,
    });
    sqlx::query(
        "INSERT INTO audit_log (id, created_at, project_id, contract_id, payload) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&audit_id)
    .bind(stamp())
    .bind(&log.project_id)
    .bind(&log.contract_id)
    .bind(payload.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn validate_equipment_log_rules(
    tx: &mut Transaction<'_, Sqlite>,
    log: &EquipmentLogHeader,
) -> Result<(), String> {
    // 1. Check project and contract scope
    let contract_valid: Option<String> =
        sqlx::query_scalar("SELECT id FROM contracts WHERE id = ? AND project_id = ? AND parent_main_contract_id IS NULL")
            .bind(&log.contract_id)
            .bind(&log.project_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

    if contract_valid.is_none() {
        return Err("Main contract does not belong to the selected project.".into());
    }

    // 2. Check reporting period lock
    let locked_period_count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM reporting_periods WHERE status IN ('Locked', 'Closed') AND (project_id IS NULL OR project_id = ?) AND ? >= COALESCE(start_date, cutoff_date) AND ? <= COALESCE(end_date, cutoff_date)"
    )
    .bind(&log.project_id)
    .bind(&log.log_date)
    .bind(&log.log_date)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    if locked_period_count > 0 {
        return Err(format!(
            "Log date {} falls within a locked or closed reporting period.",
            log.log_date
        ));
    }

    let calendar_payload: Option<String> = sqlx::query_scalar(
        "SELECT payload FROM work_calendars WHERE (project_id IS NULL OR project_id = ?) ORDER BY project_id DESC LIMIT 1",
    )
    .bind(&log.project_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    if let Some(raw) = calendar_payload {
        if let Ok(calendar) = serde_json::from_str::<Value>(&raw) {
            let working_days = calendar
                .get("calendar_working_days")
                .or_else(|| calendar.get("working_days"))
                .and_then(Value::as_array);
            let exceptions = calendar
                .get("calendar_exceptions")
                .or_else(|| calendar.get("holidays"))
                .and_then(Value::as_array);
            let non_working = parse_ymd(&log.log_date)
                .map(|(year, month, day)| day_of_week(year, month, day))
                .and_then(|dow| working_days.map(|days| (dow, days)))
                .is_some_and(|(dow, days)| {
                    let configured: Vec<i64> = days.iter().filter_map(Value::as_i64).collect();
                    !configured.is_empty() && !configured.contains(&(dow as i64))
                })
                || exceptions.is_some_and(|days| {
                    days.iter().any(|day| day.as_str() == Some(log.log_date.as_str()))
                });
            if non_working
                && log
                    .hours_override_reason
                    .as_deref()
                    .unwrap_or("")
                    .trim()
                    .is_empty()
            {
                return Err("Non-working calendar date requires a documented override reason.".into());
            }
        }
    }

    // 3. Validate meter readings: meter_end >= meter_start
    if log.meter_end < log.meter_start {
        return Err(format!(
            "Meter rollback detected: End meter ({}) cannot be less than start meter ({}).",
            log.meter_end, log.meter_start
        ));
    }

    let calculated_meter_hours = m(log.meter_end - log.meter_start);
    if log.operating_hours != calculated_meter_hours {
        let reason = log.hours_override_reason.as_deref().unwrap_or("").trim();
        if reason.is_empty() {
            return Err(format!(
                "Operating hours ({}) differs from meter hours ({}); documented hours_override_reason is required.",
                log.operating_hours, calculated_meter_hours
            ));
        }
    }

    // 4. Validate non-negative hours and rates
    if log.operating_hours < 0.0 || log.idle_hours < 0.0 || log.breakdown_hours < 0.0 {
        return Err("Equipment hours cannot be negative.".into());
    }
    if log.hourly_rate < 0.0 || log.fuel_rate < 0.0 || log.fuel_quantity < 0.0 {
        return Err("Equipment rates and fuel quantities cannot be negative.".into());
    }

    let total_h = log.operating_hours + log.idle_hours + log.breakdown_hours;
    if total_h <= 0.0 && log.fuel_quantity <= 0.0 {
        return Err(
            "Equipment log must record either working/standby hours or fuel consumption.".into(),
        );
    }
    if total_h > 24.0 {
        return Err(format!(
            "Total hours ({}) cannot exceed 24 hours in a single shift.",
            total_h
        ));
    }

    // 5. Validate Resource Master (Equipment type and Active status)
    let res_row = sqlx::query("SELECT payload FROM resource_masters WHERE id = ?")
        .bind(&log.resource_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    let res_payload_str: String = match res_row {
        Some(r) => r.try_get("payload").map_err(|e| e.to_string())?,
        None => {
            return Err(format!(
                "Equipment resource {} does not exist in Resource Master.",
                log.resource_id
            ))
        }
    };

    let res_payload: Value = serde_json::from_str(&res_payload_str).map_err(|e| e.to_string())?;
    let res_type = s(&res_payload, "resource_type");
    if !res_type.is_empty() && res_type != "Equipment" {
        return Err(format!(
            "Resource {} is of type '{}', must be 'Equipment'.",
            log.resource_id, res_type
        ));
    }
    let res_status = s(&res_payload, "status");
    if res_status == "Inactive" || res_status == "Decommissioned" {
        return Err(format!(
            "Equipment {} is {} and cannot log operational hours.",
            log.resource_id, res_status
        ));
    }

    let governed_hourly_rate = res_payload
        .get("standard_rate")
        .and_then(Value::as_f64)
        .filter(|value| *value > 0.0)
        .ok_or("Equipment Resource Master requires a governed standard rate.")?;
    if (log.hourly_rate - governed_hourly_rate).abs() > 0.009 {
        return Err("Equipment hourly rate does not match the governed Resource Master rate.".into());
    }
    if log.fuel_quantity > 0.0 {
        let governed_fuel_rate = res_payload
            .get("fuel_rate")
            .and_then(Value::as_f64)
            .filter(|value| *value > 0.0)
            .ok_or("Fuel consumption requires a governed Resource Master fuel rate.")?;
        if (log.fuel_rate - governed_fuel_rate).abs() > 0.009 {
            return Err("Fuel rate does not match the governed Resource Master fuel rate.".into());
        }
    }

    let governed_capacity = res_payload
        .get("daily_capacity_hours")
        .and_then(Value::as_f64)
        .filter(|value| *value > 0.0)
        .ok_or("Equipment Resource Master requires governed daily capacity hours.")?;

    // 6. Validate Schedule Activity scope
    let act_row = sqlx::query("SELECT project_id, contract_id, control_account_id FROM schedules WHERE id = ?")
        .bind(&log.schedule_activity_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    match act_row {
        Some(ar) => {
            let act_proj: String = ar.try_get("project_id").unwrap_or_default();
            let act_cont: String = ar.try_get("contract_id").unwrap_or_default();
            let act_ca: String = ar.try_get("control_account_id").unwrap_or_default();
            if !act_proj.is_empty() && act_proj != log.project_id {
                return Err(format!(
                    "Activity {} belongs to another project.",
                    log.schedule_activity_id
                ));
            }
            if !act_cont.is_empty() && act_cont != log.contract_id {
                return Err(format!(
                    "Activity {} belongs to another contract.",
                    log.schedule_activity_id
                ));
            }
            if !act_ca.is_empty() && act_ca != log.control_account_id {
                return Err("Schedule activity and Control Account do not match.".into());
            }
        }
        None => {
            return Err(format!(
                "Schedule activity {} not found.",
                log.schedule_activity_id
            ))
        }
    }

    // 7. Validate Control Account scope
    let ca_row = sqlx::query("SELECT project_id, contract_id, cost_code_id FROM control_accounts WHERE id = ?")
        .bind(&log.control_account_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    match ca_row {
        Some(cr) => {
            let ca_proj: String = cr.try_get("project_id").unwrap_or_default();
            let ca_cont: String = cr.try_get("contract_id").unwrap_or_default();
            let ca_cost_code: Option<String> = cr.try_get("cost_code_id").ok();
            if !ca_proj.is_empty() && ca_proj != log.project_id {
                return Err(format!(
                    "Control account {} belongs to another project.",
                    log.control_account_id
                ));
            }
            if !ca_cont.is_empty() && ca_cont != log.contract_id {
                return Err(format!(
                    "Control account {} belongs to another contract.",
                    log.control_account_id
                ));
            }
            if log.cost_code_id.as_deref() != ca_cost_code.as_deref() {
                return Err("Cost Code must match the selected Control Account.".into());
            }
        }
        None => {
            return Err(format!(
                "Control account {} not found.",
                log.control_account_id
            ))
        }
    }

    // 8. Validate Meter Overlap across other active equipment logs for the same equipment on the same date/shift
    if log.meter_end > log.meter_start {
        let overlap_count: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM equipment_logs WHERE id <> ? AND resource_id = ? AND log_date = ? AND shift = ? AND status <> 'Reversed' AND meter_start < ? AND meter_end > ?"
        )
        .bind(&log.id)
        .bind(&log.resource_id)
        .bind(&log.log_date)
        .bind(&log.shift)
        .bind(log.meter_end)
        .bind(log.meter_start)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

        if overlap_count > 0 {
            return Err(format!(
                "Meter readings ({} - {}) overlap with another active log for equipment {} on {} ({}).",
                log.meter_start, log.meter_end, log.resource_id, log.log_date, log.shift
            ));
        }
    }

    let other_daily_hours: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(operating_hours + idle_hours + breakdown_hours), 0) AS REAL)
         FROM equipment_logs WHERE id <> ? AND resource_id = ? AND log_date = ? AND status IN ('Submitted','Approved','Posted')",
    )
    .bind(&log.id)
    .bind(&log.resource_id)
    .bind(&log.log_date)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    if other_daily_hours + total_h > governed_capacity + 0.000_001 {
        return Err(format!(
            "Equipment daily hours ({}) exceed governed capacity ({}).",
            m(other_daily_hours + total_h),
            m(governed_capacity)
        ));
    }

    Ok(())
}

fn parse_ymd(value: &str) -> Option<(i32, u32, u32)> {
    let mut parts = value.split('-');
    Some((
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
    ))
}

fn day_of_week(year: i32, month: u32, day: u32) -> u32 {
    let offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let adjusted_year = if month < 3 { year - 1 } else { year };
    ((adjusted_year
        + adjusted_year / 4
        - adjusted_year / 100
        + adjusted_year / 400
        + offsets[(month - 1) as usize]
        + day as i32)
        % 7) as u32
}

pub async fn submit_equipment_log(
    path: &Path,
    request: SubmitEquipmentLogRequest,
) -> Result<EquipmentLogOperationResult, String> {
    if request.operation_id.trim().is_empty()
        || request.actor.trim().is_empty()
        || request.submitted_at.trim().is_empty()
    {
        return Err("Equipment log submission requires operation ID, actor and date.".into());
    }
    let mut tx = db(path).await?.begin().await.map_err(|e| e.to_string())?;
    guard_on(&mut tx, &request.operation_id).await?;
    let result = async {
        let log = load_equipment_log(&mut tx, &request.log_id).await?;
        if log.status == "Submitted" {
            return Ok(());
        }
        if log.status != "Draft" {
            return Err(format!(
                "Only a Draft equipment log can be submitted (current status: '{}').",
                log.status
            ));
        }
        if request.actor != log.submitter {
            return Err("Only the recorded equipment-log submitter can submit this draft.".into());
        }
        validate_equipment_log_rules(&mut tx, &log).await?;
        let meter_hours = m(log.meter_end - log.meter_start);
        let total_hours = m(log.operating_hours + log.idle_hours + log.breakdown_hours);
        let equipment_cost = m(log.operating_hours * log.hourly_rate);
        let fuel_cost = m(log.fuel_quantity * log.fuel_rate);
        let total_cost = m(equipment_cost + fuel_cost);
        let mut payload = log.payload.clone();
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("status".into(), json!("Submitted"));
            obj.insert("submitted_by".into(), json!(request.actor));
            obj.insert("submitted_at".into(), json!(request.submitted_at));
            obj.insert("meter_hours".into(), json!(meter_hours));
            obj.insert("total_hours".into(), json!(total_hours));
            obj.insert("equipment_cost".into(), json!(equipment_cost));
            obj.insert("fuel_cost".into(), json!(fuel_cost));
            obj.insert("total_cost".into(), json!(total_cost));
        }
        sqlx::query(
            "UPDATE equipment_logs SET status='Submitted', submitted_by=?, submitted_at=?, meter_hours=?, total_hours=?, equipment_cost=?, fuel_cost=?, total_cost=?, payload=? WHERE id=?",
        )
        .bind(&request.actor)
        .bind(&request.submitted_at)
        .bind(meter_hours)
        .bind(total_hours)
        .bind(equipment_cost)
        .bind(fuel_cost)
        .bind(total_cost)
        .bind(payload.to_string())
        .bind(&request.log_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        write_audit_log(
            &mut tx,
            &log,
            "Submit",
            &request.actor,
            &format!("Submitted equipment log #{}", log.log_number),
        )
        .await?;
        Ok(())
    }
    .await;
    match result {
        Ok(()) => {
            guard_off(&mut tx, &request.operation_id).await?;
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(EquipmentLogOperationResult {
                operation_id: request.operation_id,
                log_id: request.log_id,
                status: "Submitted".into(),
            })
        }
        Err(error) => {
            let _ = tx.rollback().await;
            Err(error)
        }
    }
}

pub async fn approve_equipment_log(
    path: &Path,
    request: ApproveEquipmentLogRequest,
) -> Result<EquipmentLogOperationResult, String> {
    if request.operation_id.trim().is_empty()
        || request.actor.trim().is_empty()
        || request.approved_at.trim().is_empty()
    {
        return Err("Equipment log approval requires operation ID, actor and date.".into());
    }

    let mut tx = db(path).await?.begin().await.map_err(|e| e.to_string())?;
    guard_on(&mut tx, &request.operation_id).await?;

    let result = async {
        let log = load_equipment_log(&mut tx, &request.log_id).await?;

        if log.status == "Approved" {
            return Ok(());
        }
        if log.status != "Submitted" {
            return Err(format!(
                "Equipment log {} in status '{}' cannot be approved; it must be Submitted first.",
                log.log_number, log.status
            ));
        }
        if request.actor == log.submitter {
            return Err(
                "Maker-checker violation: the submitter cannot approve the same equipment log."
                    .into(),
            );
        }

        validate_equipment_log_rules(&mut tx, &log).await?;

        let meter_hours = m(log.meter_end - log.meter_start);
        let total_hours = m(log.operating_hours + log.idle_hours + log.breakdown_hours);
        let equipment_cost = m(log.operating_hours * log.hourly_rate);
        let fuel_cost = m(log.fuel_quantity * log.fuel_rate);
        let total_cost = m(equipment_cost + fuel_cost);

        let mut payload = log.payload.clone();
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("status".into(), json!("Approved"));
            obj.insert("approved_by".into(), json!(request.actor));
            obj.insert("approved_at".into(), json!(request.approved_at));
            obj.insert("meter_hours".into(), json!(meter_hours));
            obj.insert("total_hours".into(), json!(total_hours));
            obj.insert("equipment_cost".into(), json!(equipment_cost));
            obj.insert("fuel_cost".into(), json!(fuel_cost));
            obj.insert("total_cost".into(), json!(total_cost));
        }

        sqlx::query(
            "UPDATE equipment_logs SET status = 'Approved', approved_by = ?, approved_at = ?, meter_hours = ?, total_hours = ?, equipment_cost = ?, fuel_cost = ?, total_cost = ?, payload = ? WHERE id = ?"
        )
        .bind(&request.actor)
        .bind(&request.approved_at)
        .bind(meter_hours)
        .bind(total_hours)
        .bind(equipment_cost)
        .bind(fuel_cost)
        .bind(total_cost)
        .bind(payload.to_string())
        .bind(&request.log_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        write_audit_log(
            &mut tx,
            &log,
            "Approve",
            &request.actor,
            &format!("Approved equipment log #{}", log.log_number),
        )
        .await?;

        Ok(())
    }
    .await;

    match result {
        Ok(()) => {
            guard_off(&mut tx, &request.operation_id).await?;
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(EquipmentLogOperationResult {
                operation_id: request.operation_id,
                log_id: request.log_id,
                status: "Approved".into(),
            })
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

pub async fn post_equipment_log(
    path: &Path,
    request: PostEquipmentLogRequest,
) -> Result<EquipmentLogOperationResult, String> {
    if request.operation_id.trim().is_empty()
        || request.actor.trim().is_empty()
        || request.posted_at.trim().is_empty()
    {
        return Err("Equipment log posting requires operation ID, actor and date.".into());
    }

    let mut tx = db(path).await?.begin().await.map_err(|e| e.to_string())?;
    guard_on(&mut tx, &request.operation_id).await?;

    let result = async {
        let log = load_equipment_log(&mut tx, &request.log_id).await?;

        if log.status == "Posted" {
            // Idempotent: already posted
            return Ok(());
        }

        if log.status != "Approved" {
            return Err(format!(
                "Only an Approved equipment log can be posted (current status: '{}').",
                log.status
            ));
        }
        if log.approved_by.as_deref() == Some(request.actor.as_str()) {
            return Err(
                "Maker-checker violation: the approver cannot post the same equipment log."
                    .into(),
            );
        }

        validate_equipment_log_rules(&mut tx, &log).await?;

        let meter_hours = m(log.meter_end - log.meter_start);
        let total_hours = m(log.operating_hours + log.idle_hours + log.breakdown_hours);
        let equipment_cost = m(log.operating_hours * log.hourly_rate);
        let fuel_cost = m(log.fuel_quantity * log.fuel_rate);
        let total_cost = m(equipment_cost + fuel_cost);

        // 1. Post Equipment Usage Cost Entry if operating hours & rate > 0
        if log.operating_hours > 0.0 && equipment_cost > 0.0 {
            let cost_entry_id = format!("equipment-log-cost:{}", log.id);
            let description = format!(
                "Equipment Log #{}: {} ({}h @ {})",
                log.log_number, log.resource_id, log.operating_hours, log.hourly_rate
            );

            let cost_payload = json!({
                "id": cost_entry_id,
                "project_id": log.project_id,
                "contract_id": log.contract_id,
                "control_account_id": log.control_account_id,
                "boq_item_id": log.boq_item_id,
                "cost_code_id": log.cost_code_id,
                "schedule_activity_id": log.schedule_activity_id,
                "date": log.log_date,
                "cost_type": "Equipment",
                "amount": equipment_cost,
                "source_type": "EquipmentUsage",
                "source_id": log.id,
                "invoice_number": log.log_number,
                "description": description,
                "created_at": request.posted_at,
            });

            sqlx::query(
                "INSERT INTO cost_entries (id, created_at, project_id, contract_id, boq_item_id, control_account_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&cost_entry_id)
            .bind(&request.posted_at)
            .bind(&log.project_id)
            .bind(&log.contract_id)
            .bind(&log.boq_item_id)
            .bind(&log.control_account_id)
            .bind(cost_payload.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        // 2. Post Fuel Cost Entry if fuel quantity & rate > 0
        if log.fuel_quantity > 0.0 && fuel_cost > 0.0 {
            let fuel_cost_entry_id = format!("equipment-fuel-cost:{}", log.id);
            let fuel_description = format!(
                "Equipment Fuel #{}: {} ({} units @ {})",
                log.log_number, log.resource_id, log.fuel_quantity, log.fuel_rate
            );

            let fuel_cost_payload = json!({
                "id": fuel_cost_entry_id,
                "project_id": log.project_id,
                "contract_id": log.contract_id,
                "control_account_id": log.control_account_id,
                "boq_item_id": log.boq_item_id,
                "cost_code_id": log.cost_code_id,
                "schedule_activity_id": log.schedule_activity_id,
                "date": log.log_date,
                "cost_type": "Fuel",
                "amount": fuel_cost,
                "source_type": "EquipmentFuel",
                "source_id": log.id,
                "invoice_number": log.log_number,
                "description": fuel_description,
                "created_at": request.posted_at,
            });

            sqlx::query(
                "INSERT INTO cost_entries (id, created_at, project_id, contract_id, boq_item_id, control_account_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&fuel_cost_entry_id)
            .bind(&request.posted_at)
            .bind(&log.project_id)
            .bind(&log.contract_id)
            .bind(&log.boq_item_id)
            .bind(&log.control_account_id)
            .bind(fuel_cost_payload.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        let mut payload = log.payload.clone();
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("status".into(), json!("Posted"));
            obj.insert("posted_by".into(), json!(request.actor));
            obj.insert("posted_at".into(), json!(request.posted_at));
            obj.insert("meter_hours".into(), json!(meter_hours));
            obj.insert("total_hours".into(), json!(total_hours));
            obj.insert("equipment_cost".into(), json!(equipment_cost));
            obj.insert("fuel_cost".into(), json!(fuel_cost));
            obj.insert("total_cost".into(), json!(total_cost));
        }

        sqlx::query(
            "UPDATE equipment_logs SET status = 'Posted', posted_by = ?, posted_at = ?, meter_hours = ?, total_hours = ?, equipment_cost = ?, fuel_cost = ?, total_cost = ?, payload = ? WHERE id = ?"
        )
        .bind(&request.actor)
        .bind(&request.posted_at)
        .bind(meter_hours)
        .bind(total_hours)
        .bind(equipment_cost)
        .bind(fuel_cost)
        .bind(total_cost)
        .bind(payload.to_string())
        .bind(&request.log_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        write_audit_log(
            &mut tx,
            &log,
            "Post",
            &request.actor,
            &format!(
                "Posted equipment log #{}: equipment {} + fuel {} = {}",
                log.log_number, equipment_cost, fuel_cost, total_cost
            ),
        )
        .await?;

        Ok(())
    }
    .await;

    match result {
        Ok(()) => {
            guard_off(&mut tx, &request.operation_id).await?;
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(EquipmentLogOperationResult {
                operation_id: request.operation_id,
                log_id: request.log_id,
                status: "Posted".into(),
            })
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

pub async fn reverse_equipment_log(
    path: &Path,
    request: ReverseEquipmentLogRequest,
) -> Result<EquipmentLogOperationResult, String> {
    if request.operation_id.trim().is_empty()
        || request.actor.trim().is_empty()
        || request.reason.trim().is_empty()
        || request.reversed_at.trim().is_empty()
    {
        return Err(
            "Equipment log reversal requires operation ID, actor, documented reason and date."
                .into(),
        );
    }

    let mut tx = db(path).await?.begin().await.map_err(|e| e.to_string())?;
    guard_on(&mut tx, &request.operation_id).await?;

    let result = async {
        let log = load_equipment_log(&mut tx, &request.log_id).await?;

        if log.status == "Reversed" {
            // Idempotent: already reversed
            return Ok(());
        }

        if log.status != "Posted" {
            return Err(format!(
                "Only a Posted equipment log can be reversed (current status: '{}').",
                log.status
            ));
        }

        // Check reporting period lock for reversal date
        let locked_period_count: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM reporting_periods WHERE status IN ('Locked', 'Closed') AND (project_id IS NULL OR project_id = ?) AND ? >= COALESCE(start_date, cutoff_date) AND ? <= COALESCE(end_date, cutoff_date)"
        )
        .bind(&log.project_id)
        .bind(&request.reversed_at)
        .bind(&request.reversed_at)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        if locked_period_count > 0 {
            return Err(format!("Reversal date {} falls within a locked reporting period.", request.reversed_at));
        }

        // Create negative offsetting CostEntry rows without changing the original facts.
        {
            let equipment_cost = m(log.operating_hours * log.hourly_rate);
            let fuel_cost = m(log.fuel_quantity * log.fuel_rate);

            if equipment_cost > 0.0 {
                let original_cost_id = format!("equipment-log-cost:{}", log.id);
                let reversal_cost_id = format!("reversal:equipment-log-cost:{}", log.id);
                let rev_payload = json!({
                    "id": reversal_cost_id,
                    "project_id": log.project_id,
                    "contract_id": log.contract_id,
                    "control_account_id": log.control_account_id,
                    "boq_item_id": log.boq_item_id,
                    "cost_code_id": log.cost_code_id,
                    "schedule_activity_id": log.schedule_activity_id,
                    "date": request.reversed_at,
                    "cost_type": "Equipment",
                    "amount": -equipment_cost,
                    "source_type": "EquipmentUsageReversal",
                    "source_id": format!("reversal:{}", log.id),
                    "invoice_number": log.log_number,
                    "description": format!("Reversal of Equipment Log #{}: {}", log.log_number, request.reason),
                    "original_cost_entry_id": original_cost_id,
                    "reversal_reason": request.reason,
                    "created_at": request.reversed_at,
                });

                sqlx::query(
                    "INSERT INTO cost_entries (id, created_at, project_id, contract_id, boq_item_id, control_account_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&reversal_cost_id)
                .bind(&request.reversed_at)
                .bind(&log.project_id)
                .bind(&log.contract_id)
                .bind(&log.boq_item_id)
                .bind(&log.control_account_id)
                .bind(rev_payload.to_string())
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            }

            if fuel_cost > 0.0 {
                let original_fuel_cost_id = format!("equipment-fuel-cost:{}", log.id);
                let reversal_fuel_cost_id = format!("reversal:equipment-fuel-cost:{}", log.id);
                let rev_fuel_payload = json!({
                    "id": reversal_fuel_cost_id,
                    "project_id": log.project_id,
                    "contract_id": log.contract_id,
                    "control_account_id": log.control_account_id,
                    "boq_item_id": log.boq_item_id,
                    "cost_code_id": log.cost_code_id,
                    "schedule_activity_id": log.schedule_activity_id,
                    "date": request.reversed_at,
                    "cost_type": "Fuel",
                    "amount": -fuel_cost,
                    "source_type": "EquipmentFuelReversal",
                    "source_id": format!("reversal:{}", log.id),
                    "invoice_number": log.log_number,
                    "description": format!("Reversal of Equipment Fuel #{}: {}", log.log_number, request.reason),
                    "original_cost_entry_id": original_fuel_cost_id,
                    "reversal_reason": request.reason,
                    "created_at": request.reversed_at,
                });

                sqlx::query(
                    "INSERT INTO cost_entries (id, created_at, project_id, contract_id, boq_item_id, control_account_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&reversal_fuel_cost_id)
                .bind(&request.reversed_at)
                .bind(&log.project_id)
                .bind(&log.contract_id)
                .bind(&log.boq_item_id)
                .bind(&log.control_account_id)
                .bind(rev_fuel_payload.to_string())
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            }
        }

        let mut payload = log.payload.clone();
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("status".into(), json!("Reversed"));
            obj.insert("reversed_by".into(), json!(request.actor));
            obj.insert("reversed_at".into(), json!(request.reversed_at));
            obj.insert("reversal_reason".into(), json!(request.reason));
        }

        sqlx::query(
            "UPDATE equipment_logs SET status = 'Reversed', reversed_by = ?, reversed_at = ?, reversal_reason = ?, payload = ? WHERE id = ?"
        )
        .bind(&request.actor)
        .bind(&request.reversed_at)
        .bind(&request.reason)
        .bind(payload.to_string())
        .bind(&request.log_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        write_audit_log(
            &mut tx,
            &log,
            "Reverse",
            &request.actor,
            &format!(
                "Reversed equipment log #{} on {}: {}",
                log.log_number, request.reversed_at, request.reason
            ),
        )
        .await?;

        Ok(())
    }
    .await;

    match result {
        Ok(()) => {
            guard_off(&mut tx, &request.operation_id).await?;
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(EquipmentLogOperationResult {
                operation_id: request.operation_id,
                log_id: request.log_id,
                status: "Reversed".into(),
            })
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    async fn fixture_db() -> std::path::PathBuf {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("buildtrack-equipment-test-{nonce}.db"));
        let pool = db(&path).await.unwrap();
        sqlx::query(
            "CREATE TABLE projects (id TEXT PRIMARY KEY);
             CREATE TABLE contracts (id TEXT PRIMARY KEY, project_id TEXT, parent_main_contract_id TEXT);
             CREATE TABLE control_accounts (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT, cost_code_id TEXT);
             CREATE TABLE schedules (id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, control_account_id TEXT);
             CREATE TABLE resource_masters (id TEXT PRIMARY KEY, payload TEXT);
             CREATE TABLE reporting_periods (id TEXT PRIMARY KEY, project_id TEXT, start_date TEXT, end_date TEXT, cutoff_date TEXT, status TEXT);
             CREATE TABLE work_calendars (id TEXT PRIMARY KEY, project_id TEXT, payload TEXT);
             CREATE TABLE equipment_log_mutation_guard (operation_id TEXT PRIMARY KEY, created_at TEXT);
             CREATE TABLE audit_log (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, payload TEXT);
             CREATE TABLE cost_entries (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, boq_item_id TEXT, control_account_id TEXT, payload TEXT);
             CREATE TABLE equipment_logs (
               id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT, project_id TEXT NOT NULL,
               contract_id TEXT NOT NULL, log_number TEXT NOT NULL, log_date TEXT NOT NULL, shift TEXT NOT NULL,
               resource_id TEXT NOT NULL, schedule_activity_id TEXT NOT NULL, control_account_id TEXT NOT NULL,
               cost_code_id TEXT, operator_name TEXT, submitter TEXT, submitted_by TEXT, submitted_at TEXT,
               meter_start REAL NOT NULL DEFAULT 0, meter_end REAL NOT NULL DEFAULT 0, meter_hours REAL NOT NULL DEFAULT 0,
               operating_hours REAL NOT NULL DEFAULT 0, idle_hours REAL NOT NULL DEFAULT 0,
               breakdown_hours REAL NOT NULL DEFAULT 0, total_hours REAL NOT NULL DEFAULT 0,
               hours_override_reason TEXT, hourly_rate REAL NOT NULL DEFAULT 0, equipment_cost REAL NOT NULL DEFAULT 0,
               fuel_quantity REAL NOT NULL DEFAULT 0, fuel_rate REAL NOT NULL DEFAULT 0, fuel_cost REAL NOT NULL DEFAULT 0,
               total_cost REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Draft', approved_by TEXT,
               approved_at TEXT, posted_by TEXT, posted_at TEXT, reversed_by TEXT, reversed_at TEXT,
               reversal_reason TEXT, notes TEXT, payload TEXT NOT NULL
             );
             CREATE TRIGGER equipment_log_governed_update_v2 BEFORE UPDATE ON equipment_logs
             WHEN (OLD.status <> 'Draft' OR NEW.status <> 'Draft')
               AND NOT EXISTS (SELECT 1 FROM equipment_log_mutation_guard)
             BEGIN SELECT RAISE(ABORT, 'Governed equipment-log changes must use a lifecycle command.'); END;
             CREATE TRIGGER equipment_log_governed_delete_v2 BEFORE DELETE ON equipment_logs
             WHEN OLD.status <> 'Draft'
             BEGIN SELECT RAISE(ABORT, 'Governed equipment logs cannot be deleted.'); END;"
        ).execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO projects VALUES ('PRJ-1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO contracts VALUES ('CTR-1','PRJ-1',NULL),('SUB-1','PRJ-1','CTR-1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO control_accounts VALUES ('CA-1','PRJ-1','CTR-1','BOQ-1','CC-1'),('CA-X','PRJ-1','CTR-1','BOQ-X','CC-X')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO schedules VALUES ('ACT-1','PRJ-1','CTR-1','CA-1'),('ACT-X','PRJ-1','CTR-1','CA-X')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO resource_masters VALUES ('EQ-1',json('{\"resource_type\":\"Equipment\",\"status\":\"Active\",\"standard_rate\":100,\"fuel_rate\":4,\"daily_capacity_hours\":12}'))").execute(&pool).await.unwrap();
        pool.close().await;
        path
    }

    async fn seed(path: &Path, id: &str, status: &str, contract: &str, activity: &str, account: &str) {
        let pool = db(path).await.unwrap();
        let payload = json!({
            "id":id,"project_id":"PRJ-1","contract_id":contract,"log_number":format!("LOG-{id}"),
            "log_date":"2026-09-07","shift":"Day","resource_id":"EQ-1",
            "schedule_activity_id":activity,"control_account_id":account,"cost_code_id":"CC-1",
            "operator_name":"Operator","submitter":"Foreman","meter_start":100.0,"meter_end":108.0,
            "operating_hours":8.0,"idle_hours":1.0,"breakdown_hours":0.0,"hourly_rate":100.0,
            "fuel_quantity":10.0,"fuel_rate":4.0,"status":status
        });
        sqlx::query("INSERT INTO equipment_logs (id,created_at,project_id,contract_id,log_number,log_date,shift,resource_id,schedule_activity_id,control_account_id,cost_code_id,operator_name,submitter,meter_start,meter_end,operating_hours,idle_hours,breakdown_hours,hourly_rate,fuel_quantity,fuel_rate,status,payload) VALUES (?,'2026-09-07', 'PRJ-1', ?, ?, '2026-09-07','Day','EQ-1',?,?,?,?, 'Foreman',100,108,8,1,0,100,10,4,?,?)")
            .bind(id).bind(contract).bind(format!("LOG-{id}")).bind(activity).bind(account).bind("CC-1").bind("Operator").bind(status).bind(payload.to_string())
            .execute(&pool).await.unwrap();
        pool.close().await;
    }

    #[tokio::test]
    async fn lifecycle_posts_separate_costs_and_reconciles_after_reopen() {
        let path = fixture_db().await;
        seed(&path,"one","Draft","CTR-1","ACT-1","CA-1").await;
        assert_eq!(submit_equipment_log(&path, SubmitEquipmentLogRequest{operation_id:"s1".into(),log_id:"one".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap().status,"Submitted");
        assert_eq!(approve_equipment_log(&path, ApproveEquipmentLogRequest{operation_id:"a1".into(),log_id:"one".into(),actor:"Engineer".into(),approved_at:"2026-09-07".into()}).await.unwrap().status,"Approved");
        assert_eq!(post_equipment_log(&path, PostEquipmentLogRequest{operation_id:"p1".into(),log_id:"one".into(),actor:"Cost Control".into(),posted_at:"2026-09-07".into()}).await.unwrap().status,"Posted");
        assert_eq!(post_equipment_log(&path, PostEquipmentLogRequest{operation_id:"p2".into(),log_id:"one".into(),actor:"Cost Control".into(),posted_at:"2026-09-07".into()}).await.unwrap().status,"Posted");
        let pool = db(&path).await.unwrap();
        let before: (i64,f64) = sqlx::query_as("SELECT count(*),CAST(SUM(json_extract(payload,'$.amount')) AS REAL) FROM cost_entries").fetch_one(&pool).await.unwrap();
        assert_eq!(before,(2,840.0));
        pool.close().await;
        assert_eq!(reverse_equipment_log(&path, ReverseEquipmentLogRequest{operation_id:"r1".into(),log_id:"one".into(),actor:"Controller".into(),reason:"Correction".into(),reversed_at:"2026-09-08".into()}).await.unwrap().status,"Reversed");
        let reopened = db(&path).await.unwrap();
        let final_state: String = sqlx::query_scalar("SELECT status FROM equipment_logs WHERE id='one'").fetch_one(&reopened).await.unwrap();
        let final_cost: (i64,f64) = sqlx::query_as("SELECT count(*),CAST(SUM(json_extract(payload,'$.amount')) AS REAL) FROM cost_entries").fetch_one(&reopened).await.unwrap();
        let audits: i64 = sqlx::query_scalar("SELECT count(*) FROM audit_log").fetch_one(&reopened).await.unwrap();
        assert_eq!(final_state,"Reversed"); assert_eq!(final_cost,(4,0.0)); assert_eq!(audits,4);
        reopened.close().await; let _=std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn lifecycle_rejects_skips_and_maker_checker_conflicts() {
        let path=fixture_db().await; seed(&path,"two","Draft","CTR-1","ACT-1","CA-1").await;
        assert!(approve_equipment_log(&path,ApproveEquipmentLogRequest{operation_id:"a2".into(),log_id:"two".into(),actor:"Engineer".into(),approved_at:"2026-09-07".into()}).await.unwrap_err().contains("Submitted"));
        submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s2".into(),log_id:"two".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap();
        assert!(approve_equipment_log(&path,ApproveEquipmentLogRequest{operation_id:"a3".into(),log_id:"two".into(),actor:"Foreman".into(),approved_at:"2026-09-07".into()}).await.unwrap_err().contains("Maker-checker"));
        approve_equipment_log(&path,ApproveEquipmentLogRequest{operation_id:"a4".into(),log_id:"two".into(),actor:"Engineer".into(),approved_at:"2026-09-07".into()}).await.unwrap();
        assert!(post_equipment_log(&path,PostEquipmentLogRequest{operation_id:"p3".into(),log_id:"two".into(),actor:"Engineer".into(),posted_at:"2026-09-07".into()}).await.unwrap_err().contains("Maker-checker"));
        let _=std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn scope_capacity_and_locked_period_rules_are_enforced() {
        let path=fixture_db().await;
        seed(&path,"rollback","Draft","CTR-1","ACT-1","CA-1").await;
        let pool=db(&path).await.unwrap();
        sqlx::query("UPDATE equipment_logs SET meter_end=90 WHERE id='rollback'").execute(&pool).await.unwrap();
        pool.close().await;
        assert!(submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-roll".into(),log_id:"rollback".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap_err().contains("Meter rollback"));
        seed(&path,"sub","Draft","SUB-1","ACT-1","CA-1").await;
        assert!(submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-sub".into(),log_id:"sub".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap_err().contains("Main contract"));
        seed(&path,"cross","Draft","CTR-1","ACT-X","CA-1").await;
        assert!(submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-cross".into(),log_id:"cross".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap_err().contains("do not match"));
        seed(&path,"cap-old","Draft","CTR-1","ACT-1","CA-1").await;
        let pool=db(&path).await.unwrap();
        sqlx::query("UPDATE equipment_logs SET meter_start=200,meter_end=208 WHERE id='cap-old'").execute(&pool).await.unwrap(); pool.close().await;
        submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-cap-old".into(),log_id:"cap-old".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap();
        seed(&path,"cap-new","Draft","CTR-1","ACT-1","CA-1").await;
        let pool=db(&path).await.unwrap();
        sqlx::query("UPDATE equipment_logs SET meter_start=300,meter_end=308 WHERE id='cap-new'").execute(&pool).await.unwrap(); pool.close().await;
        assert!(submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-cap-new".into(),log_id:"cap-new".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap_err().contains("capacity"));
        let pool=db(&path).await.unwrap();
        sqlx::query("INSERT INTO reporting_periods VALUES ('lock','PRJ-1','2026-09-01','2026-09-30','2026-09-30','Locked')").execute(&pool).await.unwrap(); pool.close().await;
        seed(&path,"locked","Draft","CTR-1","ACT-1","CA-1").await;
        assert!(submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s-lock".into(),log_id:"locked".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap_err().contains("locked"));
        let _=std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn posting_conflict_rolls_back_status_audit_and_second_cost() {
        let path=fixture_db().await; seed(&path,"conflict","Draft","CTR-1","ACT-1","CA-1").await;
        submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"s4".into(),log_id:"conflict".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap();
        approve_equipment_log(&path,ApproveEquipmentLogRequest{operation_id:"a5".into(),log_id:"conflict".into(),actor:"Engineer".into(),approved_at:"2026-09-07".into()}).await.unwrap();
        let pool=db(&path).await.unwrap(); sqlx::query("INSERT INTO cost_entries VALUES ('equipment-log-cost:conflict','x','PRJ-1','CTR-1','BOQ-1','CA-1','{}')").execute(&pool).await.unwrap(); pool.close().await;
        assert!(post_equipment_log(&path,PostEquipmentLogRequest{operation_id:"p4".into(),log_id:"conflict".into(),actor:"Controller".into(),posted_at:"2026-09-07".into()}).await.is_err());
        let reopened=db(&path).await.unwrap();
        let status:String=sqlx::query_scalar("SELECT status FROM equipment_logs WHERE id='conflict'").fetch_one(&reopened).await.unwrap();
        let fuel:i64=sqlx::query_scalar("SELECT count(*) FROM cost_entries WHERE id='equipment-fuel-cost:conflict'").fetch_one(&reopened).await.unwrap();
        let post_audit:i64=sqlx::query_scalar("SELECT count(*) FROM audit_log WHERE json_extract(payload,'$.action')='Post'").fetch_one(&reopened).await.unwrap();
        assert_eq!(status,"Approved"); assert_eq!(fuel,0); assert_eq!(post_audit,0);
        reopened.close().await; let _=std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn late_audit_failure_rolls_back_posting_and_locked_reversal_preserves_originals() {
        let path=fixture_db().await; seed(&path,"late","Draft","CTR-1","ACT-1","CA-1").await;
        submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"sl".into(),log_id:"late".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap();
        approve_equipment_log(&path,ApproveEquipmentLogRequest{operation_id:"al".into(),log_id:"late".into(),actor:"Engineer".into(),approved_at:"2026-09-07".into()}).await.unwrap();
        let pool=db(&path).await.unwrap(); sqlx::query("DROP TABLE audit_log").execute(&pool).await.unwrap(); pool.close().await;
        assert!(post_equipment_log(&path,PostEquipmentLogRequest{operation_id:"pl".into(),log_id:"late".into(),actor:"Controller".into(),posted_at:"2026-09-07".into()}).await.is_err());
        let pool=db(&path).await.unwrap();
        let status:String=sqlx::query_scalar("SELECT status FROM equipment_logs WHERE id='late'").fetch_one(&pool).await.unwrap();
        let costs:i64=sqlx::query_scalar("SELECT count(*) FROM cost_entries").fetch_one(&pool).await.unwrap();
        assert_eq!(status,"Approved"); assert_eq!(costs,0);
        sqlx::query("CREATE TABLE audit_log (id TEXT PRIMARY KEY, created_at TEXT, project_id TEXT, contract_id TEXT, payload TEXT)").execute(&pool).await.unwrap(); pool.close().await;
        post_equipment_log(&path,PostEquipmentLogRequest{operation_id:"pl2".into(),log_id:"late".into(),actor:"Controller".into(),posted_at:"2026-09-07".into()}).await.unwrap();
        let pool=db(&path).await.unwrap();
        sqlx::query("INSERT INTO reporting_periods VALUES ('reverse-lock','PRJ-1','2026-09-08','2026-09-08','2026-09-08','Locked')").execute(&pool).await.unwrap(); pool.close().await;
        assert!(reverse_equipment_log(&path,ReverseEquipmentLogRequest{operation_id:"rl".into(),log_id:"late".into(),actor:"Controller".into(),reason:"Correction".into(),reversed_at:"2026-09-08".into()}).await.unwrap_err().contains("locked"));
        let reopened=db(&path).await.unwrap();
        let status:String=sqlx::query_scalar("SELECT status FROM equipment_logs WHERE id='late'").fetch_one(&reopened).await.unwrap();
        let costs:i64=sqlx::query_scalar("SELECT count(*) FROM cost_entries").fetch_one(&reopened).await.unwrap();
        assert_eq!(status,"Posted"); assert_eq!(costs,2);
        reopened.close().await; let _=std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn direct_sql_cannot_mutate_or_delete_governed_log() {
        let path=fixture_db().await; seed(&path,"guarded","Draft","CTR-1","ACT-1","CA-1").await;
        submit_equipment_log(&path,SubmitEquipmentLogRequest{operation_id:"sg".into(),log_id:"guarded".into(),actor:"Foreman".into(),submitted_at:"2026-09-07".into()}).await.unwrap();
        let pool=db(&path).await.unwrap();
        assert!(sqlx::query("UPDATE equipment_logs SET status='Posted' WHERE id='guarded'").execute(&pool).await.is_err());
        assert!(sqlx::query("DELETE FROM equipment_logs WHERE id='guarded'").execute(&pool).await.is_err());
        pool.close().await; let _=std::fs::remove_file(path);
    }
}
