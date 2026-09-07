const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

const migration = `
        tauri_plugin_sql::Migration {
            version: 70,
            description: "add_g2_auth_tables",
            sql: "
            CREATE TABLE IF NOT EXISTS app_users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                email TEXT,
                role TEXT NOT NULL DEFAULT 'Viewer',
                status TEXT NOT NULL DEFAULT 'Active',
                approval_limit REAL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audit_auth (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT
            );

            INSERT OR IGNORE INTO app_users (id, username, password_hash, display_name, role, status, created_at)
            VALUES ('admin-1', 'admin', 'admin', 'PMO Admin', 'PMO Admin', 'Active', datetime('now'));
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];`;

if (code.includes('tauri_plugin_sql::Migration {')) {
  code = code.replace("    ];\n\n    tauri::Builder::default()", migration + "\n\n    tauri::Builder::default()");
  fs.writeFileSync('src-tauri/src/lib.rs', code);
}
