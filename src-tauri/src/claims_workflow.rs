//! Atomic Claims & Potential Variation Order (PVO) lifecycle.
//! Draft / Notified -> Submitted -> Under Assessment -> Assessed -> Approved -> Converted.
//! Or Rejected / Reopened / Reversed.
//!
//! Strict governance rules:
//! 1. Submission validates non-empty claim numbers, notice_date >= event_date, scoping, and at least 1 line.
//! 2. Assessment validates lines, limits assessed value <= claimed value unless justified, calculates totals.
//! 3. Approval enforces maker-checker segregation (approver != creator/claimant). No premature commercial postings.
//! 4. Conversion creates a Draft Variation package and lines, links converted_variation_id, updates claim to Converted.
//! 5. Reversal reverts Converted claim back to Approved if the generated Variation is still Draft.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{sqlite::SqliteConnectOptions, Row, Sqlite, SqlitePool, Transaction};
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveClaimDraftRequest {
    pub operation_id: String,
    pub actor: String,
    pub claim: Value,
    pub lines: Vec<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub notified_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartClaimAssessmentRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub started_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub submitted_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssessClaimLineInput {
    pub id: String,
    pub assessed_value: f64,
    pub assessed_days: Option<f64>,
    pub justification: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssessClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub assessed_at: String,
    pub assessed_cost_impact: Option<f64>,
    pub assessed_time_impact_days: Option<f64>,
    pub lines: Option<Vec<AssessClaimLineInput>>,
    pub assessment_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveClaimLineInput {
    pub id: String,
    pub approved_value: f64,
    pub approved_days: Option<f64>,
    pub justification: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub approved_at: String,
    pub approved_cost_impact: Option<f64>,
    pub approved_time_impact_days: Option<f64>,
    pub lines: Option<Vec<ApproveClaimLineInput>>,
    pub approval_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RejectClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub rejected_at: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReopenClaimRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub reopened_at: String,
    pub target_status: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertClaimToVariationRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub converted_at: String,
    pub variation_number: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReverseClaimConversionRequest {
    pub operation_id: String,
    pub claim_id: String,
    pub actor: String,
    pub reversed_at: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimOperationResult {
    pub operation_id: String,
    pub claim_id: String,
    pub status: String,
    pub variation_id: Option<String>,
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

fn json_text(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn json_number(value: &Value, key: &str) -> f64 {
    value.get(key).and_then(Value::as_f64).unwrap_or(0.0)
}

fn json_optional_text(value: &Value, key: &str) -> Option<String> {
    let result = json_text(value, key);
    (!result.is_empty()).then_some(result)
}

fn require_text(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{} is required.", label))
    } else {
        Ok(())
    }
}

fn json_patch(mut target: Value, patch: Value) -> Result<Value, String> {
    let target = target
        .as_object_mut()
        .ok_or("Invalid JSON object payload.")?;
    let patch = patch.as_object().ok_or("Invalid JSON patch payload.")?;
    for (key, value) in patch {
        target.insert(key.clone(), value.clone());
    }
    Ok(Value::Object(target.clone()))
}

async fn open_pool(path: &Path) -> Result<SqlitePool, String> {
    let opt = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true);
    SqlitePool::connect_with(opt)
        .await
        .map_err(|e| e.to_string())
}

#[derive(Debug, Clone)]
struct ClaimHeader {
    id: String,
    project_id: String,
    contract_id: String,
    claim_number: String,
    title: String,
    notice_date: String,
    event_date: String,
    entitlement_basis: String,
    claimed_cost_impact: f64,
    claimed_time_impact_days: f64,
    approved_cost_impact: f64,
    approved_time_impact_days: f64,
    status: String,
    owner: String,
    evidence_notes: Option<String>,
    claimant_party_id: Option<String>,
    respondent_party_id: Option<String>,
    linked_rfi_id: Option<String>,
    linked_delay_id: Option<String>,
    linked_document_id: Option<String>,
    linked_activity_id: Option<String>,
    linked_boq_item_id: Option<String>,
    converted_variation_id: Option<String>,
    submitted_by: Option<String>,
    assessed_by: Option<String>,
}

#[derive(Debug, Clone)]
struct ClaimLineRow {
    id: String,
    contract_id: String,
    item_code: String,
    description: String,
    change_type: String,
    claimed_value: f64,
    assessed_value: f64,
    approved_value: f64,
    boq_header_id: Option<String>,
    boq_item_id: Option<String>,
    payload: String,
}

async fn fetch_claim(
    tx: &mut Transaction<'_, Sqlite>,
    claim_id: &str,
) -> Result<ClaimHeader, String> {
    let row = sqlx::query(
        r#"
        SELECT id, project_id, contract_id, claim_number, title, notice_date, event_date,
               entitlement_basis, claimed_cost_impact, claimed_time_impact_days,
               approved_cost_impact, approved_time_impact_days,
               status, owner, evidence_notes, claimant_party_id, respondent_party_id,
               linked_rfi_id, linked_delay_id, linked_document_id, linked_activity_id,
               linked_boq_item_id, converted_variation_id, submitted_by, assessed_by
        FROM claims
        WHERE id = ?
        "#,
    )
    .bind(claim_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    match row {
        Some(r) => Ok(ClaimHeader {
            id: r.get("id"),
            project_id: r.get("project_id"),
            contract_id: r.get("contract_id"),
            claim_number: r.get("claim_number"),
            title: r.get("title"),
            notice_date: r.get("notice_date"),
            event_date: r.get("event_date"),
            entitlement_basis: r.get("entitlement_basis"),
            claimed_cost_impact: r.get("claimed_cost_impact"),
            claimed_time_impact_days: r.get("claimed_time_impact_days"),
            approved_cost_impact: r.get("approved_cost_impact"),
            approved_time_impact_days: r.get("approved_time_impact_days"),
            status: r.get("status"),
            owner: r.get("owner"),
            evidence_notes: r.get("evidence_notes"),
            claimant_party_id: r.get("claimant_party_id"),
            respondent_party_id: r.get("respondent_party_id"),
            linked_rfi_id: r.get("linked_rfi_id"),
            linked_delay_id: r.get("linked_delay_id"),
            linked_document_id: r.get("linked_document_id"),
            linked_activity_id: r.get("linked_activity_id"),
            linked_boq_item_id: r.get("linked_boq_item_id"),
            converted_variation_id: r.get("converted_variation_id"),
            submitted_by: r.get("submitted_by"),
            assessed_by: r.get("assessed_by"),
        }),
        None => Err(format!("Claim with ID '{}' not found.", claim_id)),
    }
}

async fn fetch_claim_lines(
    tx: &mut Transaction<'_, Sqlite>,
    claim_id: &str,
) -> Result<Vec<ClaimLineRow>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, claim_id, contract_id, item_code, description, change_type,
               claimed_value, assessed_value, approved_value, boq_header_id, boq_item_id, payload
        FROM claim_lines
        WHERE claim_id = ?
        "#,
    )
    .bind(claim_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    let mut lines = Vec::new();
    for r in rows {
        lines.push(ClaimLineRow {
            id: r.get("id"),
            contract_id: r.get("contract_id"),
            item_code: r.get("item_code"),
            description: r.get("description"),
            change_type: r.get("change_type"),
            claimed_value: r.get("claimed_value"),
            assessed_value: r.get("assessed_value"),
            approved_value: r.get("approved_value"),
            boq_header_id: r.get("boq_header_id"),
            boq_item_id: r.get("boq_item_id"),
            payload: r.get("payload"),
        });
    }
    Ok(lines)
}

async fn log_claim_audit(
    tx: &mut Transaction<'_, Sqlite>,
    claim: &ClaimHeader,
    action: &str,
    actor: &str,
    details: Value,
) -> Result<(), String> {
    let audit_id = format!("audit:claim:{}:{}", claim.id, stamp());
    let payload = json!({
        "id": audit_id,
        "entity_type": "Claim",
        "entity_id": claim.id,
        "action": action,
        "actor": actor,
        "timestamp": stamp(),
        "details": details,
        "project_id": claim.project_id,
        "contract_id": claim.contract_id,
    });
    sqlx::query(
        "INSERT INTO audit_log (id, created_at, project_id, contract_id, payload) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&audit_id)
    .bind(stamp())
    .bind(&claim.project_id)
    .bind(&claim.contract_id)
    .bind(payload.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn enter_mutation_guard(tx: &mut Transaction<'_, Sqlite>, op_id: &str) -> Result<(), String> {
    sqlx::query("INSERT INTO claims_mutation_guard (operation_id, created_at) VALUES (?, ?)")
        .bind(op_id)
        .bind(stamp())
        .execute(&mut **tx)
        .await
        .map_err(|e| format!("Failed to enter claims mutation guard: {}", e))?;
    Ok(())
}

async fn exit_mutation_guard(tx: &mut Transaction<'_, Sqlite>, op_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM claims_mutation_guard WHERE operation_id = ?")
        .bind(op_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| format!("Failed to exit claims mutation guard: {}", e))?;
    Ok(())
}

async fn previous_operation(
    tx: &mut Transaction<'_, Sqlite>,
    operation_id: &str,
    claim_id: &str,
) -> Result<Option<ClaimOperationResult>, String> {
    let row = sqlx::query(
        "SELECT claim_id,status,variation_id FROM claim_workflow_operations WHERE operation_id=?",
    )
    .bind(operation_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    if let Some(row) = row {
        let stored_claim: String = row.get("claim_id");
        if stored_claim != claim_id {
            return Err("Operation ID was already used for another claim.".into());
        }
        return Ok(Some(ClaimOperationResult {
            operation_id: operation_id.into(),
            claim_id: stored_claim,
            status: row.get("status"),
            variation_id: row.get("variation_id"),
        }));
    }
    Ok(None)
}

async fn record_operation(
    tx: &mut Transaction<'_, Sqlite>,
    action: &str,
    result: &ClaimOperationResult,
) -> Result<(), String> {
    sqlx::query("INSERT INTO claim_workflow_operations(operation_id,created_at,claim_id,action,status,variation_id) VALUES (?,?,?,?,?,?)")
        .bind(&result.operation_id)
        .bind(stamp())
        .bind(&result.claim_id)
        .bind(action)
        .bind(&result.status)
        .bind(&result.variation_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn validate_claim_scope_and_notice(
    tx: &mut Transaction<'_, Sqlite>,
    claim: &ClaimHeader,
    lines: &[ClaimLineRow],
) -> Result<(i64, i64), String> {
    require_text(&claim.claim_number, "Claim number")?;
    require_text(&claim.title, "Claim title")?;
    require_text(&claim.entitlement_basis, "Entitlement basis")?;
    require_text(&claim.event_date, "Event date")?;
    require_text(&claim.notice_date, "Notice date")?;
    if lines.is_empty() {
        return Err("A claim must contain at least one real breakdown line.".into());
    }

    let contract_payload: Option<String> =
        sqlx::query_scalar("SELECT payload FROM contracts WHERE id = ? AND project_id = ?")
            .bind(&claim.contract_id)
            .bind(&claim.project_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;
    let contract: Value = serde_json::from_str(
        &contract_payload.ok_or("Contract does not belong to the claim project.")?,
    )
    .map_err(|_| "Invalid contract payload.".to_string())?;
    let notice_days = contract
        .get("claim_notice_period_days")
        .or_else(|| contract.get("notice_period_days"))
        .and_then(Value::as_i64)
        .filter(|days| *days >= 0)
        .ok_or(
            "Requires setup: configure the contractual claim notice period before notification.",
        )?;
    let elapsed: Option<i64> =
        sqlx::query_scalar("SELECT CAST(julianday(?) - julianday(?) AS INTEGER)")
            .bind(&claim.notice_date)
            .bind(&claim.event_date)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;
    let elapsed = elapsed.ok_or("Event and notice dates must be valid ISO calendar dates.")?;
    if elapsed < 0 {
        return Err("Notice date cannot precede the claim event date.".into());
    }
    if claim
        .evidence_notes
        .as_deref()
        .unwrap_or("")
        .trim()
        .is_empty()
    {
        let has_linked_evidence: Option<i64> = sqlx::query_scalar(
            "SELECT CASE WHEN linked_document_id IS NOT NULL OR linked_rfi_id IS NOT NULL THEN 1 ELSE 0 END FROM claims WHERE id = ?",
        )
        .bind(&claim.id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;
        if has_linked_evidence != Some(1) {
            return Err(
                "Claim evidence is required (linked document/RFI or evidence notes).".into(),
            );
        }
    }

    for (label, id) in [
        ("Claimant party", claim.claimant_party_id.as_deref()),
        ("Respondent party", claim.respondent_party_id.as_deref()),
    ] {
        if let Some(id) = id {
            let valid: Option<i64> = sqlx::query_scalar(
                "SELECT 1 FROM parties WHERE id=? AND (project_id IS NULL OR project_id=?) AND (contract_id IS NULL OR contract_id=?)",
            )
            .bind(id).bind(&claim.project_id).bind(&claim.contract_id)
            .fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;
            if valid.is_none() { return Err(format!("{} is outside the claim scope.", label)); }
        }
    }
    for (label, table, id, require_contract) in [
        ("RFI", "rfi_register", claim.linked_rfi_id.as_deref(), false),
        ("Delay event", "delay_events", claim.linked_delay_id.as_deref(), false),
        ("Document", "documents", claim.linked_document_id.as_deref(), false),
        ("Schedule activity", "schedules", claim.linked_activity_id.as_deref(), true),
    ] {
        if let Some(id) = id {
            let query = if require_contract {
                format!("SELECT 1 FROM {} WHERE id=? AND project_id=? AND contract_id=?", table)
            } else {
                format!("SELECT 1 FROM {} WHERE id=? AND project_id=? AND (contract_id IS NULL OR contract_id=?)", table)
            };
            let valid: Option<i64> = sqlx::query_scalar(&query)
                .bind(id).bind(&claim.project_id).bind(&claim.contract_id)
                .fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;
            if valid.is_none() { return Err(format!("Linked {} is outside the claim scope.", label)); }
        }
    }
    if let Some(item_id) = &claim.linked_boq_item_id {
        let valid: Option<i64> = sqlx::query_scalar(
            "SELECT 1 FROM boq_items item JOIN boq_headers header ON header.id=item.boq_header_id WHERE item.id=? AND item.project_id=? AND header.contract_id=?",
        )
        .bind(item_id).bind(&claim.project_id).bind(&claim.contract_id)
        .fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;
        if valid.is_none() { return Err("Linked BOQ item is outside the claim scope.".into()); }
    }

    for line in lines {
        if line.contract_id != claim.contract_id {
            return Err(format!(
                "Claim line '{}' belongs to another contract.",
                line.id
            ));
        }
        require_text(&line.item_code, "Claim line item code")?;
        require_text(&line.description, "Claim line description")?;
        if !line.claimed_value.is_finite() || line.claimed_value < 0.0 {
            return Err(format!(
                "Claim line '{}' has an invalid claimed value.",
                line.id
            ));
        }
        if let Some(item_id) = &line.boq_item_id {
            let valid: Option<i64> = sqlx::query_scalar(
                r#"SELECT 1
                   FROM boq_items item
                   JOIN boq_headers header ON header.id = item.boq_header_id
                   WHERE item.id = ? AND item.project_id = ? AND header.contract_id = ?
                     AND (? IS NULL OR header.id = ?)"#,
            )
            .bind(item_id)
            .bind(&claim.project_id)
            .bind(&claim.contract_id)
            .bind(&line.boq_header_id)
            .bind(&line.boq_header_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;
            if valid.is_none() {
                return Err(format!(
                    "Claim line '{}' references a BOQ item outside the claim scope.",
                    line.id
                ));
            }
        } else if !matches!(
            line.change_type.as_str(),
            "New Item" | "Time Only" | "Markup"
        ) {
            return Err(format!(
                "Claim line '{}' requires an in-scope BOQ item.",
                line.id
            ));
        }
    }
    Ok((elapsed, notice_days))
}

async fn reporting_period_is_locked(
    tx: &mut Transaction<'_, Sqlite>,
    project_id: &str,
    date: &str,
) -> Result<bool, String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM reporting_periods WHERE status IN ('Locked','Closed') AND (project_id IS NULL OR project_id=?) AND date(?) BETWEEN date(COALESCE(start_date,cutoff_date)) AND date(COALESCE(end_date,cutoff_date))",
    )
    .bind(project_id)
    .bind(date)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

/// Atomically replaces a Draft claim header and its real breakdown lines.
pub async fn save_claim_draft(
    path: &Path,
    req: SaveClaimDraftRequest,
) -> Result<ClaimOperationResult, String> {
    require_text(&req.operation_id, "Operation ID")?;
    require_text(&req.actor, "Actor")?;
    let claim_id = json_text(&req.claim, "id");
    let project_id = json_text(&req.claim, "project_id");
    let contract_id = json_text(&req.claim, "contract_id");
    let claim_number = json_text(&req.claim, "claim_number");
    let title = json_text(&req.claim, "title");
    let entitlement_basis = json_text(&req.claim, "entitlement_basis");
    let owner = match json_text(&req.claim, "owner") {
        value if value.is_empty() => req.actor.clone(),
        value => value,
    };
    for (value, label) in [
        (&claim_id, "Claim ID"),
        (&project_id, "Project"),
        (&contract_id, "Contract"),
        (&claim_number, "Claim number"),
        (&title, "Claim title"),
        (&entitlement_basis, "Entitlement basis"),
    ] {
        require_text(value, label)?;
    }

    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }
    enter_mutation_guard(&mut tx, &req.operation_id).await?;
    let existing_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM claims WHERE id = ?")
            .bind(&claim_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    if existing_status
        .as_deref()
        .is_some_and(|status| status != "Draft")
    {
        return Err("Only a Draft claim can be replaced by draft save.".into());
    }
    let contract_valid: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM contracts WHERE id = ? AND project_id = ?")
            .bind(&contract_id)
            .bind(&project_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    if contract_valid.is_none() {
        return Err("Contract does not belong to the selected project.".into());
    }

    let claimed_cost = m(req
        .lines
        .iter()
        .map(|line| json_number(line, "claimed_value"))
        .sum());
    let claimed_days = m(req
        .lines
        .iter()
        .map(|line| json_number(line, "claimed_days"))
        .sum());
    sqlx::query(
        r#"INSERT INTO claims (
             id,created_at,project_id,contract_id,claim_number,title,notice_date,event_date,
             claimant_party_id,respondent_party_id,entitlement_basis,linked_rfi_id,
             linked_delay_id,linked_document_id,linked_activity_id,linked_boq_item_id,
             claimed_cost_impact,claimed_time_impact_days,status,owner,evidence_notes,payload
           ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Draft',?,?,?)
           ON CONFLICT(id) DO UPDATE SET
             project_id=excluded.project_id,contract_id=excluded.contract_id,
             claim_number=excluded.claim_number,title=excluded.title,notice_date=excluded.notice_date,
             event_date=excluded.event_date,claimant_party_id=excluded.claimant_party_id,
             respondent_party_id=excluded.respondent_party_id,entitlement_basis=excluded.entitlement_basis,
             linked_rfi_id=excluded.linked_rfi_id,linked_delay_id=excluded.linked_delay_id,
             linked_document_id=excluded.linked_document_id,linked_activity_id=excluded.linked_activity_id,
             linked_boq_item_id=excluded.linked_boq_item_id,claimed_cost_impact=excluded.claimed_cost_impact,
             claimed_time_impact_days=excluded.claimed_time_impact_days,owner=excluded.owner,
             evidence_notes=excluded.evidence_notes,payload=excluded.payload"#,
    )
    .bind(&claim_id)
    .bind(json_optional_text(&req.claim, "created_at").unwrap_or_else(stamp))
    .bind(&project_id)
    .bind(&contract_id)
    .bind(&claim_number)
    .bind(&title)
    .bind(json_text(&req.claim, "notice_date"))
    .bind(json_text(&req.claim, "event_date"))
    .bind(json_optional_text(&req.claim, "claimant_party_id"))
    .bind(json_optional_text(&req.claim, "respondent_party_id"))
    .bind(&entitlement_basis)
    .bind(json_optional_text(&req.claim, "linked_rfi_id"))
    .bind(json_optional_text(&req.claim, "linked_delay_id"))
    .bind(json_optional_text(&req.claim, "linked_document_id"))
    .bind(json_optional_text(&req.claim, "linked_activity_id"))
    .bind(json_optional_text(&req.claim, "linked_boq_item_id"))
    .bind(claimed_cost)
    .bind(claimed_days)
    .bind(&owner)
    .bind(json_optional_text(&req.claim, "evidence_notes"))
    .bind(req.claim.to_string())
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM claim_lines WHERE claim_id = ?")
        .bind(&claim_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    for line in &req.lines {
        let line_id = json_text(line, "id");
        let item_code = json_text(line, "item_code");
        let description = json_text(line, "description");
        let change_type = json_text(line, "change_type");
        require_text(&line_id, "Claim line ID")?;
        require_text(&item_code, "Claim line item code")?;
        require_text(&description, "Claim line description")?;
        require_text(&change_type, "Claim line change type")?;
        if !matches!(
            change_type.as_str(),
            "New Item" | "Quantity Change" | "Rate Change" | "Quantity & Rate Change" | "Time Only" | "Markup"
        ) {
            return Err(format!("Claim line '{}' has an unsupported change type.", line_id));
        }
        let value = json_number(line, "claimed_value");
        let days = json_number(line, "claimed_days");
        if !value.is_finite() || value < 0.0 || !days.is_finite() || days < 0.0 {
            return Err("Claimed line value and days must be finite and non-negative.".into());
        }
        if let Some(boq_item_id) = json_optional_text(line, "boq_item_id") {
            let boq_header_id = json_optional_text(line, "boq_header_id");
            let valid: Option<i64> = sqlx::query_scalar(
                r#"SELECT 1 FROM boq_items item
                   JOIN boq_headers header ON header.id=item.boq_header_id
                   WHERE item.id=? AND item.project_id=? AND header.contract_id=?
                     AND (? IS NULL OR header.id=?)"#,
            )
            .bind(&boq_item_id)
            .bind(&project_id)
            .bind(&contract_id)
            .bind(&boq_header_id)
            .bind(&boq_header_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
            if valid.is_none() {
                return Err(format!(
                    "Claim line '{}' references a BOQ item outside the claim scope.",
                    line_id
                ));
            }
        } else if !matches!(change_type.as_str(), "New Item" | "Time Only" | "Markup") {
            return Err(format!(
                "Claim line '{}' requires an in-scope BOQ item.",
                line_id
            ));
        }
        sqlx::query(
            r#"INSERT INTO claim_lines (
                 id,claim_id,contract_id,item_code,description,change_type,claimed_value,
                 assessed_value,approved_value,boq_header_id,boq_item_id,value_impact,payload
               ) VALUES (?,?,?,?,?,?,?,0,0,?,?,?,?)"#,
        )
        .bind(&line_id)
        .bind(&claim_id)
        .bind(&contract_id)
        .bind(&item_code)
        .bind(&description)
        .bind(&change_type)
        .bind(m(value))
        .bind(json_optional_text(line, "boq_header_id"))
        .bind(json_optional_text(line, "boq_item_id"))
        .bind(m(value))
        .bind(line.to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    let claim = fetch_claim(&mut tx, &claim_id).await?;
    let lines = fetch_claim_lines(&mut tx, &claim_id).await?;
    log_claim_audit(
        &mut tx,
        &claim,
        "SaveClaimDraft",
        &req.actor,
        json!({"operation_id":req.operation_id,"line_count":lines.len()}),
    )
    .await?;
    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: claim_id.clone(),
        status: "Draft".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "SaveClaimDraft", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

pub async fn notify_claim(
    path: &Path,
    req: NotifyClaimRequest,
) -> Result<ClaimOperationResult, String> {
    require_text(&req.actor, "Actor")?;
    require_text(&req.notified_at, "Notification date")?;
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }
    enter_mutation_guard(&mut tx, &req.operation_id).await?;
    let claim = fetch_claim(&mut tx, &req.claim_id).await?;
    if claim.status != "Draft" {
        return Err(format!(
            "Only a Draft claim can be notified; current status is '{}'.",
            claim.status
        ));
    }
    if req.notified_at != claim.notice_date {
        return Err("Notification date must match the governed claim notice date.".into());
    }
    let lines = fetch_claim_lines(&mut tx, &req.claim_id).await?;
    let (notice_elapsed_days, notice_allowed_days) =
        validate_claim_scope_and_notice(&mut tx, &claim, &lines).await?;
    sqlx::query("UPDATE claims SET status='Notified',notified_by=?,notified_at=? WHERE id=?")
        .bind(&req.actor)
        .bind(&req.notified_at)
        .bind(&req.claim_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    log_claim_audit(
        &mut tx,
        &claim,
        "NotifyClaim",
        &req.actor,
        json!({
            "operation_id":req.operation_id,
            "notified_at":req.notified_at,
            "event_date":claim.event_date,
            "notice_elapsed_days":notice_elapsed_days,
            "notice_allowed_days":notice_allowed_days,
            "late_notice":notice_elapsed_days > notice_allowed_days
        }),
    )
    .await?;
    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Notified".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "NotifyClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

pub async fn start_claim_assessment(
    path: &Path,
    req: StartClaimAssessmentRequest,
) -> Result<ClaimOperationResult, String> {
    require_text(&req.actor, "Actor")?;
    require_text(&req.started_at, "Assessment start date")?;
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }
    enter_mutation_guard(&mut tx, &req.operation_id).await?;
    let claim = fetch_claim(&mut tx, &req.claim_id).await?;
    if claim.status != "Submitted" {
        return Err(format!(
            "Only a Submitted claim can enter assessment; current status is '{}'.",
            claim.status
        ));
    }
    if claim.owner.trim().eq_ignore_ascii_case(req.actor.trim()) {
        return Err("Maker-checker violation: claim owner cannot start assessment.".into());
    }
    sqlx::query("UPDATE claims SET status='Under Assessment',assessment_started_by=?,assessment_started_at=? WHERE id=?").bind(&req.actor).bind(&req.started_at).bind(&req.claim_id).execute(&mut *tx).await.map_err(|e|e.to_string())?;
    log_claim_audit(
        &mut tx,
        &claim,
        "StartClaimAssessment",
        &req.actor,
        json!({"operation_id":req.operation_id,"started_at":req.started_at}),
    )
    .await?;
    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Under Assessment".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "StartClaimAssessment", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Submit Claim
pub async fn submit_claim(
    path: &Path,
    req: SubmitClaimRequest,
) -> Result<ClaimOperationResult, String> {
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }

    enter_mutation_guard(&mut tx, &req.operation_id).await?;

    let claim = fetch_claim(&mut tx, &req.claim_id).await?;

    if claim.status != "Notified" {
        return Err(format!(
            "Cannot submit claim with status '{}'. Must be Notified.",
            claim.status
        ));
    }

    let lines = fetch_claim_lines(&mut tx, &req.claim_id).await?;
    let (notice_elapsed_days, notice_allowed_days) =
        validate_claim_scope_and_notice(&mut tx, &claim, &lines).await?;

    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Submitted',
            submitted_by = ?,
            submitted_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&req.actor)
    .bind(&req.submitted_at)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "SubmitClaim",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "submitted_at": req.submitted_at,
            "line_count": lines.len(),
            "claimed_cost_impact": claim.claimed_cost_impact,
            "claimed_time_impact_days": claim.claimed_time_impact_days,
            "notice_elapsed_days": notice_elapsed_days,
            "notice_allowed_days": notice_allowed_days,
            "late_notice": notice_elapsed_days > notice_allowed_days,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Submitted".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "SubmitClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Assess Claim
pub async fn assess_claim(
    path: &Path,
    req: AssessClaimRequest,
) -> Result<ClaimOperationResult, String> {
    require_text(&req.actor, "Actor")?;
    require_text(&req.assessed_at, "Assessment date")?;
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }
    enter_mutation_guard(&mut tx, &req.operation_id).await?;
    let claim = fetch_claim(&mut tx, &req.claim_id).await?;
    if claim.status != "Under Assessment" {
        return Err("Only an Under Assessment claim can be assessed.".into());
    }
    if claim.owner.trim().eq_ignore_ascii_case(req.actor.trim())
        || claim
            .submitted_by
            .as_deref()
            .is_some_and(|actor| actor.eq_ignore_ascii_case(req.actor.trim()))
    {
        return Err(
            "Maker-checker violation: assessor must differ from claim owner and submitter.".into(),
        );
    }

    let stored = fetch_claim_lines(&mut tx, &req.claim_id).await?;
    let inputs = req
        .lines
        .as_ref()
        .ok_or("Assessment requires a decision for every claim line.")?;
    if inputs.len() != stored.len() {
        return Err("Assessment must cover every claim line exactly once.".into());
    }
    let mut total_assessed_cost = 0.0;
    let mut total_assessed_days = 0.0;
    for line in &stored {
        let input = inputs
            .iter()
            .find(|item| item.id == line.id)
            .ok_or_else(|| format!("Missing assessment for claim line '{}'.", line.id))?;
        let days = input.assessed_days.unwrap_or(0.0);
        if !input.assessed_value.is_finite()
            || input.assessed_value < 0.0
            || !days.is_finite()
            || days < 0.0
        {
            return Err("Assessed value and days must be finite and non-negative.".into());
        }
        let payload: Value = serde_json::from_str(&line.payload)
            .map_err(|_| "Invalid claim-line payload.".to_string())?;
        let claimed_days = json_number(&payload, "claimed_days");
        if (input.assessed_value > line.claimed_value + 0.001 || days > claimed_days + 0.001)
            && input
                .justification
                .as_deref()
                .unwrap_or("")
                .trim()
                .is_empty()
        {
            return Err(format!(
                "Assessment above claimed entitlement for line '{}' requires justification.",
                line.id
            ));
        }
        let next_payload = json_patch(
            payload,
            json!({
                "assessed_days": m(days),
                "assessment_justification": input.justification,
            }),
        )?;
        let affected = sqlx::query(
            "UPDATE claim_lines SET assessed_value=?,payload=? WHERE id=? AND claim_id=?",
        )
        .bind(m(input.assessed_value))
        .bind(next_payload.to_string())
        .bind(&line.id)
        .bind(&req.claim_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();
        if affected != 1 {
            return Err(format!("Claim line '{}' changed concurrently.", line.id));
        }
        total_assessed_cost += input.assessed_value;
        total_assessed_days += days;
    }
    total_assessed_cost = m(total_assessed_cost);
    total_assessed_days = m(total_assessed_days);
    if req
        .assessed_cost_impact
        .is_some_and(|value| (m(value) - total_assessed_cost).abs() > 0.01)
        || req
            .assessed_time_impact_days
            .is_some_and(|value| (m(value) - total_assessed_days).abs() > 0.01)
    {
        return Err("Assessment header totals must equal governed line totals.".into());
    }
    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Assessed',
            assessed_by = ?,
            assessed_at = ?,
            assessed_cost_impact = ?,
            assessed_time_impact_days = ?
        WHERE id = ?
        "#,
    )
    .bind(&req.actor)
    .bind(&req.assessed_at)
    .bind(total_assessed_cost)
    .bind(total_assessed_days)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "AssessClaim",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "assessed_at": req.assessed_at,
            "assessed_cost_impact": total_assessed_cost,
            "assessed_time_impact_days": total_assessed_days,
            "notes": req.assessment_notes,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Assessed".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "AssessClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Approve Claim
pub async fn approve_claim(
    path: &Path,
    req: ApproveClaimRequest,
) -> Result<ClaimOperationResult, String> {
    require_text(&req.actor, "Actor")?;
    require_text(&req.approved_at, "Approval date")?;
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }
    enter_mutation_guard(&mut tx, &req.operation_id).await?;
    let claim = fetch_claim(&mut tx, &req.claim_id).await?;
    if claim.status != "Assessed" {
        return Err("Only an Assessed claim can be approved.".into());
    }
    if claim.owner.trim().eq_ignore_ascii_case(req.actor.trim())
        || claim
            .submitted_by
            .as_deref()
            .is_some_and(|actor| actor.eq_ignore_ascii_case(req.actor.trim()))
        || claim
            .assessed_by
            .as_deref()
            .is_some_and(|actor| actor.eq_ignore_ascii_case(req.actor.trim()))
    {
        return Err(
            "Maker-checker violation: approver must differ from owner, submitter and assessor."
                .into(),
        );
    }

    let stored = fetch_claim_lines(&mut tx, &req.claim_id).await?;
    let inputs = req
        .lines
        .as_ref()
        .ok_or("Approval requires a decision for every claim line.")?;
    if inputs.len() != stored.len() {
        return Err("Approval must cover every claim line exactly once.".into());
    }
    let mut approved_cost = 0.0;
    let mut approved_days = 0.0;
    for line in &stored {
        let input = inputs
            .iter()
            .find(|item| item.id == line.id)
            .ok_or_else(|| format!("Missing approval for claim line '{}'.", line.id))?;
        let days = input.approved_days.unwrap_or(0.0);
        if !input.approved_value.is_finite()
            || input.approved_value < 0.0
            || !days.is_finite()
            || days < 0.0
        {
            return Err("Approved value and days must be finite and non-negative.".into());
        }
        let payload: Value = serde_json::from_str(&line.payload)
            .map_err(|_| "Invalid claim-line payload.".to_string())?;
        let assessed_days = json_number(&payload, "assessed_days");
        if (input.approved_value > line.assessed_value + 0.001 || days > assessed_days + 0.001)
            && input
                .justification
                .as_deref()
                .unwrap_or("")
                .trim()
                .is_empty()
        {
            return Err(format!(
                "Approval above assessed entitlement for line '{}' requires justification.",
                line.id
            ));
        }
        let next_payload = json_patch(
            payload,
            json!({
                "approved_days": m(days),
                "approval_justification": input.justification,
            }),
        )?;
        sqlx::query("UPDATE claim_lines SET approved_value=?,value_impact=?,payload=? WHERE id=? AND claim_id=?")
        .bind(m(input.approved_value))
        .bind(m(input.approved_value))
        .bind(next_payload.to_string())
        .bind(&line.id)
        .bind(&req.claim_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        approved_cost += input.approved_value;
        approved_days += days;
    }
    approved_cost = m(approved_cost);
    approved_days = m(approved_days);
    if req
        .approved_cost_impact
        .is_some_and(|value| (m(value) - approved_cost).abs() > 0.01)
        || req
            .approved_time_impact_days
            .is_some_and(|value| (m(value) - approved_days).abs() > 0.01)
    {
        return Err("Approval header totals must equal governed line totals.".into());
    }
    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Approved',
            approved_by = ?,
            approved_at = ?,
            approved_cost_impact = ?,
            approved_time_impact_days = ?
        WHERE id = ?
        "#,
    )
    .bind(&req.actor)
    .bind(&req.approved_at)
    .bind(approved_cost)
    .bind(approved_days)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "ApproveClaim",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "approved_at": req.approved_at,
            "approved_cost_impact": approved_cost,
            "approved_time_impact_days": approved_days,
            "notes": req.approval_notes,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Approved".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "ApproveClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Reject Claim
pub async fn reject_claim(
    path: &Path,
    req: RejectClaimRequest,
) -> Result<ClaimOperationResult, String> {
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }

    enter_mutation_guard(&mut tx, &req.operation_id).await?;

    let claim = fetch_claim(&mut tx, &req.claim_id).await?;

    if !matches!(
        claim.status.as_str(),
        "Notified" | "Submitted" | "Under Assessment" | "Assessed"
    ) {
        return Err(format!("Claim cannot be rejected from '{}'.", claim.status));
    }

    if req.reason.trim().is_empty() {
        return Err("Rejection reason is required.".into());
    }

    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Rejected',
            rejected_by = ?,
            rejected_at = ?,
            rejection_reason = ?,
            payload = json_set(payload, '$.rejected_from_status', ?)
        WHERE id = ?
        "#,
    )
    .bind(&req.actor)
    .bind(&req.rejected_at)
    .bind(&req.reason)
    .bind(&claim.status)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "RejectClaim",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "rejected_at": req.rejected_at,
            "reason": req.reason,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Rejected".into(),
        variation_id: None,
    };
    record_operation(&mut tx, "RejectClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Reopen Claim
pub async fn reopen_claim(
    path: &Path,
    req: ReopenClaimRequest,
) -> Result<ClaimOperationResult, String> {
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }

    enter_mutation_guard(&mut tx, &req.operation_id).await?;

    let claim = fetch_claim(&mut tx, &req.claim_id).await?;

    if claim.status != "Rejected" {
        return Err(format!(
            "Cannot reopen claim with status '{}'. Must be Rejected.",
            claim.status
        ));
    }
    if req.reason.trim().is_empty() {
        return Err("Reopen reason is required.".into());
    }
    if !matches!(req.target_status.as_str(), "Draft" | "Under Assessment") {
        return Err("Reopen target must be Draft or Under Assessment.".into());
    }
    let target = req.target_status.as_str();

    sqlx::query(
        r#"
        UPDATE claims
        SET status = ?,
            reopened_by = ?,
            reopened_at = ?,
            reopened_reason = ?
        WHERE id = ?
        "#,
    )
    .bind(target)
    .bind(&req.actor)
    .bind(&req.reopened_at)
    .bind(&req.reason)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "ReopenClaim",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "reopened_at": req.reopened_at,
            "target_status": target,
            "reason": req.reason,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: target.into(),
        variation_id: None,
    };
    record_operation(&mut tx, "ReopenClaim", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Convert Claim to Variation
pub async fn convert_claim_to_variation(
    path: &Path,
    req: ConvertClaimToVariationRequest,
) -> Result<ClaimOperationResult, String> {
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }

    enter_mutation_guard(&mut tx, &req.operation_id).await?;

    let claim = fetch_claim(&mut tx, &req.claim_id).await?;

    // Idempotency: if already converted and variation exists, return result cleanly
    if claim.status == "Converted" {
        if let Some(var_id) = &claim.converted_variation_id {
            let result = ClaimOperationResult {
                operation_id: req.operation_id.clone(),
                claim_id: req.claim_id.clone(),
                status: "Converted".into(),
                variation_id: Some(var_id.clone()),
            };
            record_operation(&mut tx, "ConvertClaimToVariation", &result).await?;
            exit_mutation_guard(&mut tx, &req.operation_id).await?;
            tx.commit().await.map_err(|e| e.to_string())?;
            return Ok(result);
        }
    }

    if claim.status != "Approved" {
        exit_mutation_guard(&mut tx, &req.operation_id).await?;
        return Err(format!(
            "Only an Approved claim can be converted to a Variation. Current status is '{}'.",
            claim.status
        ));
    }

    let lines = fetch_claim_lines(&mut tx, &req.claim_id).await?;
    let variation_id = format!("var:claim:{}", claim.id);
    let var_number = req
        .variation_number
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| format!("VO-CLM-{}", claim.claim_number.trim_start_matches("CLM-")));
    let number_exists: Option<String> = sqlx::query_scalar(
        "SELECT id FROM variations WHERE contract_id=? AND lower(json_extract(payload,'$.variation_number'))=lower(?) LIMIT 1",
    )
    .bind(&claim.contract_id)
    .bind(&var_number)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    if number_exists.is_some() {
        return Err("Variation number already exists in this contract.".into());
    }

    let duplicate: Option<String> = sqlx::query_scalar(
        "SELECT id FROM variations WHERE id=? OR json_extract(payload,'$.source_claim_id')=? LIMIT 1",
    )
    .bind(&variation_id)
    .bind(&claim.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    if duplicate.is_some() {
        return Err(
            "A variation already exists for this claim; duplicate conversion is forbidden.".into(),
        );
    }
    let contract =
        sqlx::query("SELECT parent_main_contract_id FROM contracts WHERE id=? AND project_id=?")
            .bind(&claim.contract_id)
            .bind(&claim.project_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Claim contract scope is invalid.")?;
    let parent_main_contract_id: Option<String> = contract.get("parent_main_contract_id");
    let parent_main_project_id = parent_main_contract_id
        .as_ref()
        .map(|_| claim.project_id.clone());
    let cost_impact = m(claim.approved_cost_impact);
    let time_impact = m(claim.approved_time_impact_days);
    let first_boq_header = lines.first().and_then(|line| line.boq_header_id.clone());
    let first_boq_item = lines.first().and_then(|line| line.boq_item_id.clone());

    // Insert Variation in Draft status
    sqlx::query(
        r#"
        INSERT INTO variations (
            id, created_at, project_id, contract_id, boq_header_id, boq_item_id,
            parent_main_project_id, parent_main_contract_id, payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&variation_id)
    .bind(&req.converted_at)
    .bind(&claim.project_id)
    .bind(&claim.contract_id)
    .bind(&first_boq_header)
    .bind(&first_boq_item)
    .bind(&parent_main_project_id)
    .bind(&parent_main_contract_id)
    .bind(
        json!({
            "id": variation_id,
            "project_id": claim.project_id,
            "contract_id": claim.contract_id,
            "variation_number": var_number,
            "type": "PVO / Claim Conversion",
            "title": format!("PVO from Claim: {}", claim.title),
            "description": format!("Governed conversion from Claim #{}: {}", claim.claim_number, claim.entitlement_basis),
            "cost_impact": cost_impact,
            "time_impact_days": time_impact,
            "status": "Draft",
            "source_claim_id": claim.id,
            "claim_number": claim.claim_number,
            "converted_by": req.actor,
            "converted_at": req.converted_at
        })
        .to_string(),
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to insert converted variation: {}", e))?;

    // Insert Variation Lines
    for line in &lines {
        let line_id = format!("varline:claim:{}:{}", claim.id, line.id);
        sqlx::query(
            r#"
            INSERT INTO variation_lines (
                id, contract_id, boq_item_id, payload
            ) VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&line_id)
        .bind(&claim.contract_id)
        .bind(&line.boq_item_id)
        .bind(
            json!({
                "id": line_id,
                "variation_id": variation_id,
                "contract_id": claim.contract_id,
                "item_code": line.item_code,
                "description": line.description,
                "change_type": line.change_type,
                "pricing_scope": "Changed Quantity Only",
                "boq_header_id": line.boq_header_id,
                "boq_item_id": line.boq_item_id,
                "value_impact": m(line.approved_value),
                "source_claim_line_id": line.id,
                "source_claim_id": claim.id
            })
            .to_string(),
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to insert variation line: {}", e))?;
    }

    // Update Claim to Converted
    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Converted',
            converted_variation_id = ?,
            converted_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&variation_id)
    .bind(&req.converted_at)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "ConvertClaimToVariation",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "variation_id": variation_id,
            "variation_number": var_number,
            "cost_impact": m(cost_impact),
            "time_impact": m(time_impact),
            "converted_at": req.converted_at,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Converted".into(),
        variation_id: Some(variation_id.clone()),
    };
    record_operation(&mut tx, "ConvertClaimToVariation", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

/// Reverse Claim Conversion
pub async fn reverse_claim_conversion(
    path: &Path,
    req: ReverseClaimConversionRequest,
) -> Result<ClaimOperationResult, String> {
    let pool = open_pool(path).await?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    if let Some(result) = previous_operation(&mut tx, &req.operation_id, &req.claim_id).await? {
        tx.rollback().await.ok();
        return Ok(result);
    }

    enter_mutation_guard(&mut tx, &req.operation_id).await?;

    let claim = fetch_claim(&mut tx, &req.claim_id).await?;

    if claim.status != "Converted" {
        return Err(format!(
            "Cannot reverse claim with status '{}'. Must be Converted.",
            claim.status
        ));
    }
    require_text(&req.reason, "Reversal reason")?;
    require_text(&req.reversed_at, "Reversal date")?;
    if reporting_period_is_locked(&mut tx, &claim.project_id, &req.reversed_at).await? {
        return Err("Reversal date falls within a locked or closed reporting period.".into());
    }
    let variation_id = claim
        .converted_variation_id
        .clone()
        .ok_or("Converted claim has no linked variation.")?;
    let raw: String = sqlx::query_scalar("SELECT payload FROM variations WHERE id = ?")
        .bind(&variation_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Linked variation was not found.")?;
    let mut variation: Value =
        serde_json::from_str(&raw).map_err(|_| "Invalid variation payload.".to_string())?;
    if json_text(&variation, "source_claim_id") != claim.id {
        return Err("Linked variation provenance does not match this claim.".into());
    }
    if json_text(&variation, "status") != "Draft" {
        return Err(
            "Only the unapproved Draft variation generated by this claim can be reversed.".into(),
        );
    }
    variation = json_patch(
        variation,
        json!({
            "status":"Reversed",
            "reversed_by":req.actor,
            "reversed_at":req.reversed_at,
            "reversal_reason":req.reason,
        }),
    )?;
    sqlx::query("UPDATE variations SET payload=? WHERE id=?")
        .bind(variation.to_string())
        .bind(&variation_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("UPDATE variation_lines SET payload=json_set(payload,'$.status','Reversed','$.reversed_at',?,'$.reversed_by',?) WHERE json_extract(payload,'$.variation_id')=?")
        .bind(&req.reversed_at).bind(&req.actor).bind(&variation_id)
        .execute(&mut *tx).await.map_err(|e|e.to_string())?;

    sqlx::query(
        r#"
        UPDATE claims
        SET status = 'Approved',
            converted_at = NULL,
            reversal_reason = ?
        WHERE id = ?
        "#,
    )
    .bind(&req.reason)
    .bind(&req.claim_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    log_claim_audit(
        &mut tx,
        &claim,
        "ReverseClaimConversion",
        &req.actor,
        json!({
            "operation_id": req.operation_id,
            "reversed_at": req.reversed_at,
            "reason": req.reason,
            "variation_id": variation_id,
            "non_destructive": true,
        }),
    )
    .await?;

    let result = ClaimOperationResult {
        operation_id: req.operation_id.clone(),
        claim_id: req.claim_id.clone(),
        status: "Approved".into(),
        variation_id: Some(variation_id.clone()),
    };
    record_operation(&mut tx, "ReverseClaimConversion", &result).await?;
    exit_mutation_guard(&mut tx, &req.operation_id).await?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "buildtrack-claims-{}-{}.db",
            name,
            std::process::id()
        ))
    }

    async fn setup(path: &Path) {
        let pool = open_pool(path).await.unwrap();
        for statement in [
            "CREATE TABLE projects(id TEXT PRIMARY KEY,created_at TEXT,payload TEXT)",
            "CREATE TABLE contracts(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,parent_main_contract_id TEXT,payload TEXT)",
            "CREATE TABLE boq_headers(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,contract_id TEXT,payload TEXT)",
            "CREATE TABLE boq_items(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,boq_header_id TEXT,payload TEXT)",
            "CREATE TABLE parties(id TEXT PRIMARY KEY,project_id TEXT,contract_id TEXT)",
            "CREATE TABLE rfi_register(id TEXT PRIMARY KEY,project_id TEXT,contract_id TEXT)",
            "CREATE TABLE delay_events(id TEXT PRIMARY KEY,project_id TEXT,contract_id TEXT)",
            "CREATE TABLE documents(id TEXT PRIMARY KEY,project_id TEXT,contract_id TEXT)",
            "CREATE TABLE schedules(id TEXT PRIMARY KEY,project_id TEXT,contract_id TEXT)",
            "CREATE TABLE claims(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,contract_id TEXT,claim_number TEXT,title TEXT,notice_date TEXT,event_date TEXT,claimant_party_id TEXT,respondent_party_id TEXT,entitlement_basis TEXT,linked_rfi_id TEXT,linked_delay_id TEXT,linked_document_id TEXT,linked_activity_id TEXT,linked_boq_item_id TEXT,claimed_cost_impact REAL DEFAULT 0,claimed_time_impact_days REAL DEFAULT 0,assessed_cost_impact REAL DEFAULT 0,assessed_time_impact_days REAL DEFAULT 0,approved_cost_impact REAL DEFAULT 0,approved_time_impact_days REAL DEFAULT 0,status TEXT,owner TEXT,evidence_notes TEXT,reversal_reason TEXT,converted_variation_id TEXT,payload TEXT,submitted_by TEXT,submitted_at TEXT,assessed_by TEXT,assessed_at TEXT,approved_by TEXT,approved_at TEXT,rejected_by TEXT,rejected_at TEXT,rejection_reason TEXT,reopened_by TEXT,reopened_at TEXT,reopened_reason TEXT,converted_at TEXT,notified_by TEXT,notified_at TEXT,assessment_started_by TEXT,assessment_started_at TEXT)",
            "CREATE TABLE claim_lines(id TEXT PRIMARY KEY,claim_id TEXT,contract_id TEXT,item_code TEXT,description TEXT,change_type TEXT,claimed_value REAL,assessed_value REAL,approved_value REAL,boq_header_id TEXT,boq_item_id TEXT,value_impact REAL,payload TEXT)",
            "CREATE TABLE variations(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,contract_id TEXT,boq_header_id TEXT,boq_item_id TEXT,parent_main_project_id TEXT,parent_main_contract_id TEXT,payload TEXT)",
            "CREATE TABLE variation_lines(id TEXT PRIMARY KEY,contract_id TEXT,boq_item_id TEXT,payload TEXT)",
            "CREATE TABLE audit_log(id TEXT PRIMARY KEY,created_at TEXT,project_id TEXT,contract_id TEXT,payload TEXT)",
            "CREATE TABLE reporting_periods(id TEXT PRIMARY KEY,project_id TEXT,start_date TEXT,end_date TEXT,cutoff_date TEXT,status TEXT)",
            "CREATE TABLE claims_mutation_guard(operation_id TEXT PRIMARY KEY,created_at TEXT)",
            "CREATE TABLE claim_workflow_operations(operation_id TEXT PRIMARY KEY,created_at TEXT,claim_id TEXT,action TEXT,status TEXT,variation_id TEXT)",
        ] {
            sqlx::query(statement).execute(&pool).await.unwrap();
        }
        sqlx::query("INSERT INTO projects VALUES('p','t','{}')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO contracts VALUES('c','t','p',NULL,?)")
            .bind(json!({"claim_notice_period_days":28}).to_string())
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO boq_headers VALUES('h','t','p','c','{}')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO boq_items VALUES('b','t','p','h','{}')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO documents VALUES('doc','p','c')")
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;
    }

    fn draft(operation_id: &str) -> SaveClaimDraftRequest {
        SaveClaimDraftRequest {
            operation_id: operation_id.into(),
            actor: "maker".into(),
            claim: json!({
                "id":"cl","created_at":"2026-01-01","project_id":"p","contract_id":"c",
                "claim_number":"CLM-1","title":"Delay","notice_date":"2026-01-05",
                "event_date":"2026-01-01","entitlement_basis":"Clause 1",
                "linked_document_id":"doc","owner":"maker","evidence_notes":"notice"
            }),
            lines: vec![json!({
                "id":"l","claim_id":"cl","contract_id":"c","item_code":"1",
                "description":"Work","change_type":"Quantity Change","claimed_value":100.0,
                "claimed_days":5.0,"boq_header_id":"h","boq_item_id":"b"
            })],
        }
    }

    async fn approved_claim(path: &Path) {
        save_claim_draft(path, draft("save")).await.unwrap();
        notify_claim(
            path,
            NotifyClaimRequest {
                operation_id: "notify".into(),
                claim_id: "cl".into(),
                actor: "maker".into(),
                notified_at: "2026-01-05".into(),
            },
        )
        .await
        .unwrap();
        submit_claim(
            path,
            SubmitClaimRequest {
                operation_id: "submit".into(),
                claim_id: "cl".into(),
                actor: "maker".into(),
                submitted_at: "2026-01-06".into(),
            },
        )
        .await
        .unwrap();
        start_claim_assessment(
            path,
            StartClaimAssessmentRequest {
                operation_id: "start".into(),
                claim_id: "cl".into(),
                actor: "assessor".into(),
                started_at: "2026-01-07".into(),
            },
        )
        .await
        .unwrap();
        assess_claim(
            path,
            AssessClaimRequest {
                operation_id: "assess".into(),
                claim_id: "cl".into(),
                actor: "assessor".into(),
                assessed_at: "2026-01-08".into(),
                assessed_cost_impact: Some(90.0),
                assessed_time_impact_days: Some(4.0),
                lines: Some(vec![AssessClaimLineInput {
                    id: "l".into(),
                    assessed_value: 90.0,
                    assessed_days: Some(4.0),
                    justification: None,
                }]),
                assessment_notes: None,
            },
        )
        .await
        .unwrap();
        approve_claim(
            path,
            ApproveClaimRequest {
                operation_id: "approve".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                approved_at: "2026-01-09".into(),
                approved_cost_impact: Some(80.0),
                approved_time_impact_days: Some(3.0),
                lines: Some(vec![ApproveClaimLineInput {
                    id: "l".into(),
                    approved_value: 80.0,
                    approved_days: Some(3.0),
                    justification: None,
                }]),
                approval_notes: None,
            },
        )
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn strict_lifecycle_and_schema_compatible_conversion_are_idempotent() {
        let path = test_path("lifecycle");
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        approved_claim(&path).await;
        let request = ConvertClaimToVariationRequest {
            operation_id: "convert".into(),
            claim_id: "cl".into(),
            actor: "approver".into(),
            converted_at: "2026-01-10".into(),
            variation_number: None,
        };
        let first = convert_claim_to_variation(&path, request).await.unwrap();
        let retry = convert_claim_to_variation(
            &path,
            ConvertClaimToVariationRequest {
                operation_id: "convert".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                converted_at: "2026-01-10".into(),
                variation_number: None,
            },
        )
        .await
        .unwrap();
        assert_eq!(first.variation_id, retry.variation_id);
        let pool = open_pool(&path).await.unwrap();
        let counts: (i64, i64) = (
            sqlx::query_scalar("SELECT count(*) FROM variations")
                .fetch_one(&pool)
                .await
                .unwrap(),
            sqlx::query_scalar("SELECT count(*) FROM variation_lines")
                .fetch_one(&pool)
                .await
                .unwrap(),
        );
        assert_eq!(counts, (1, 1));
        pool.close().await;
        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn invalid_scope_and_late_audit_failure_roll_back_atomically() {
        let path = test_path("rollback");
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        let mut bad = draft("bad");
        bad.lines[0]["boq_item_id"] = json!("wrong");
        assert!(save_claim_draft(&path, bad).await.is_err());
        let pool = open_pool(&path).await.unwrap();
        let before: i64 = sqlx::query_scalar("SELECT count(*) FROM claims")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(before, 0);
        sqlx::query("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log WHEN json_extract(NEW.payload,'$.action')='SaveClaimDraft' BEGIN SELECT RAISE(ABORT,'late audit failure'); END").execute(&pool).await.unwrap();
        pool.close().await;
        assert!(save_claim_draft(&path, draft("late")).await.is_err());
        let pool = open_pool(&path).await.unwrap();
        let count: i64 = sqlx::query_scalar("SELECT count(*) FROM claims")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
        pool.close().await;
        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn late_notice_with_real_evidence_is_recorded_and_audited_not_erased() {
        let path = test_path("late-notice");
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        let mut request = draft("save-late");
        request.claim["notice_date"] = json!("2026-02-15");
        save_claim_draft(&path, request).await.unwrap();
        notify_claim(
            &path,
            NotifyClaimRequest {
                operation_id: "notify-late".into(),
                claim_id: "cl".into(),
                actor: "maker".into(),
                notified_at: "2026-02-15".into(),
            },
        )
        .await
        .unwrap();
        let pool = open_pool(&path).await.unwrap();
        let audit: String = sqlx::query_scalar(
            "SELECT payload FROM audit_log WHERE json_extract(payload,'$.action')='NotifyClaim' ORDER BY created_at DESC LIMIT 1",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let audit: Value = serde_json::from_str(&audit).unwrap();
        assert_eq!(audit["details"]["late_notice"], json!(true));
        assert_eq!(audit["details"]["notice_allowed_days"], json!(28));
        pool.close().await;
        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn reversal_respects_period_lock_and_preserves_variation_history() {
        let path = test_path("reverse");
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        approved_claim(&path).await;
        convert_claim_to_variation(
            &path,
            ConvertClaimToVariationRequest {
                operation_id: "convert".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                converted_at: "2026-01-10".into(),
                variation_number: None,
            },
        )
        .await
        .unwrap();
        let pool = open_pool(&path).await.unwrap();
        sqlx::query("INSERT INTO reporting_periods VALUES('lock','p','2026-01-11','2026-01-11','2026-01-11','Locked')").execute(&pool).await.unwrap();
        pool.close().await;
        assert!(reverse_claim_conversion(
            &path,
            ReverseClaimConversionRequest {
                operation_id: "locked".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                reversed_at: "2026-01-11".into(),
                reason: "Correction".into()
            }
        )
        .await
        .is_err());
        reverse_claim_conversion(
            &path,
            ReverseClaimConversionRequest {
                operation_id: "reverse".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                reversed_at: "2026-01-12".into(),
                reason: "Correction".into(),
            },
        )
        .await
        .unwrap();
        let pool = open_pool(&path).await.unwrap();
        let status: String =
            sqlx::query_scalar("SELECT json_extract(payload,'$.status') FROM variations")
                .fetch_one(&pool)
                .await
                .unwrap();
        let lines: i64 = sqlx::query_scalar("SELECT count(*) FROM variation_lines")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(status, "Reversed");
        assert_eq!(lines, 1);
        pool.close().await;
        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn explicit_zero_assessment_and_approval_remain_zero_on_conversion() {
        let path = test_path("zero");
        let _ = std::fs::remove_file(&path);
        setup(&path).await;
        save_claim_draft(&path, draft("save-zero")).await.unwrap();
        notify_claim(
            &path,
            NotifyClaimRequest {
                operation_id: "notify-zero".into(),
                claim_id: "cl".into(),
                actor: "maker".into(),
                notified_at: "2026-01-05".into(),
            },
        )
        .await
        .unwrap();
        submit_claim(
            &path,
            SubmitClaimRequest {
                operation_id: "submit-zero".into(),
                claim_id: "cl".into(),
                actor: "maker".into(),
                submitted_at: "2026-01-06".into(),
            },
        )
        .await
        .unwrap();
        start_claim_assessment(
            &path,
            StartClaimAssessmentRequest {
                operation_id: "start-zero".into(),
                claim_id: "cl".into(),
                actor: "assessor".into(),
                started_at: "2026-01-07".into(),
            },
        )
        .await
        .unwrap();
        assess_claim(
            &path,
            AssessClaimRequest {
                operation_id: "assess-zero".into(),
                claim_id: "cl".into(),
                actor: "assessor".into(),
                assessed_at: "2026-01-08".into(),
                assessed_cost_impact: Some(0.0),
                assessed_time_impact_days: Some(0.0),
                lines: Some(vec![AssessClaimLineInput {
                    id: "l".into(),
                    assessed_value: 0.0,
                    assessed_days: Some(0.0),
                    justification: None,
                }]),
                assessment_notes: None,
            },
        )
        .await
        .unwrap();
        approve_claim(
            &path,
            ApproveClaimRequest {
                operation_id: "approve-zero".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                approved_at: "2026-01-09".into(),
                approved_cost_impact: Some(0.0),
                approved_time_impact_days: Some(0.0),
                lines: Some(vec![ApproveClaimLineInput {
                    id: "l".into(),
                    approved_value: 0.0,
                    approved_days: Some(0.0),
                    justification: None,
                }]),
                approval_notes: None,
            },
        )
        .await
        .unwrap();
        convert_claim_to_variation(
            &path,
            ConvertClaimToVariationRequest {
                operation_id: "convert-zero".into(),
                claim_id: "cl".into(),
                actor: "approver".into(),
                converted_at: "2026-01-10".into(),
                variation_number: None,
            },
        )
        .await
        .unwrap();
        let pool = open_pool(&path).await.unwrap();
        let value: f64 = sqlx::query_scalar(
            "SELECT CAST(json_extract(payload,'$.cost_impact') AS REAL) FROM variations",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(value, 0.0);
        pool.close().await;
        let _ = std::fs::remove_file(path);
    }
}
