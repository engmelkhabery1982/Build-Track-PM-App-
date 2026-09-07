const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

const migration68 = `
        tauri_plugin_sql::Migration {
            version: 68,
            description: "add_data_quality_tables",
            sql: r#"
      CREATE TABLE IF NOT EXISTS dq_rules (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        project_id TEXT,
        payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
      );
      
      CREATE TABLE IF NOT EXISTS dq_execution_logs (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        project_id TEXT,
        payload TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
      );
    "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
`;

code = code.replace(
  "kind: tauri_plugin_sql::MigrationKind::Up,\n        },",
  "kind: tauri_plugin_sql::MigrationKind::Up,\n        }," + migration68
);

fs.writeFileSync('src-tauri/src/lib.rs', code);
