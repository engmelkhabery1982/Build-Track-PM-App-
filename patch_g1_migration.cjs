const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

const migration = `
        tauri_plugin_sql::Migration {
            version: 69,
            description: "add_sync_protocol_tables",
            sql: "
            CREATE TABLE IF NOT EXISTS sync_outbox (
                id TEXT PRIMARY KEY,
                operation_id TEXT UNIQUE,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                created_at TEXT NOT NULL,
                synced_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);

            CREATE TABLE IF NOT EXISTS sync_inbox (
                id TEXT PRIMARY KEY,
                operation_id TEXT UNIQUE,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL,
                applied_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sync_metadata (
                id TEXT PRIMARY KEY,
                last_synced_at TEXT,
                status TEXT,
                last_error TEXT
            );
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];`;

code = code.replace("    ];\n\n    tauri::Builder::default()", migration + "\n\n    tauri::Builder::default()");
fs.writeFileSync('src-tauri/src/lib.rs', code);
