const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

const triggerMigration = `
        tauri_plugin_sql::Migration {
            version: 68,
            description: "add_audit_log_append_only_triggers",
            sql: "
            CREATE TRIGGER IF NOT EXISTS audit_log_prevent_update
            BEFORE UPDATE ON audit_log
            BEGIN
                SELECT RAISE(ABORT, 'Audit log is append-only and cannot be updated.');
            END;
            CREATE TRIGGER IF NOT EXISTS audit_log_prevent_delete
            BEFORE DELETE ON audit_log
            BEGIN
                SELECT RAISE(ABORT, 'Audit log is append-only and cannot be deleted.');
            END;
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];`;

code = code.replace("    ];\n\n    tauri::Builder::default()", triggerMigration + "\n\n    tauri::Builder::default()");
fs.writeFileSync('src-tauri/src/lib.rs', code);
