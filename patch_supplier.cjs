const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/supplier_ap.rs', 'utf8');

const oldPost = `async fn posting(tx:&mut Transaction<'_,Sqlite>,id:&str,table:&str,source:&str,kind:&str,actor:&str,effective:&str,reason:&str,snapshot:&Value)->Result<(),String>{sqlx::query("INSERT INTO supplier_ap_postings (id,created_at,source_table,source_id,posting_type,status,actor,effective_date,reason,snapshot_json) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id).bind(stamp()).bind(table).bind(source).bind(kind).bind("Posted").bind(actor).bind(effective).bind(reason).bind(snapshot.to_string()).execute(&mut **tx).await.map_err(|e|e.to_string())?;Ok(())}`;

const newPost = `async fn posting(tx:&mut Transaction<'_,Sqlite>,id:&str,table:&str,source:&str,kind:&str,actor:&str,effective:&str,reason:&str,snapshot:&Value)->Result<(),String>{
  sqlx::query("INSERT INTO supplier_ap_postings (id,created_at,source_table,source_id,posting_type,status,actor,effective_date,reason,snapshot_json) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id).bind(stamp()).bind(table).bind(source).bind(kind).bind("Posted").bind(actor).bind(effective).bind(reason).bind(snapshot.to_string()).execute(&mut **tx).await.map_err(|e|e.to_string())?;
  
  let audit_id = format!("audit:{}:{}", table, id);
  let audit = serde_json::json!({"id":audit_id,"timestamp":effective,"action":kind,"table_name":table,"record_id":source,"actor":actor,"details":reason,"before":null,"after":snapshot});
  let project_id = snapshot.get("project_id").and_then(|v| v.as_str());
  let contract_id = snapshot.get("contract_id").and_then(|v| v.as_str());
  
  sqlx::query("INSERT INTO audit_log (id, created_at, project_id, contract_id, payload) VALUES (?, ?, ?, ?, ?)")
   .bind(audit_id).bind(stamp()).bind(project_id).bind(contract_id).bind(audit.to_string())
   .execute(&mut **tx).await.map_err(|e|e.to_string())?;
   
  Ok(())
}`;

if (code.includes(oldPost)) {
    code = code.replace(oldPost, newPost);
    fs.writeFileSync('src-tauri/src/supplier_ap.rs', code);
    console.log("Successfully patched supplier_ap.rs");
} else {
    console.log("oldPost not found in supplier_ap.rs");
}
