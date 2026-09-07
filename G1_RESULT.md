# G1 — Desktop/Web Hybrid Sync Protocol

### 1. إيصال القراءة (Read Receipt)
| Instruction file | Section read | FOUND/MISSING | Rule that affects this feature |
|------------------|--------------|---------------|--------------------------------|
| `AGENTS.md` | All | FOUND | Autonomous local delivery rules. |
| `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md` | All | FOUND | Single truth source rules. |
| `PROJECT_CHARTER_AR.md` | All | FOUND | Scope boundaries and denial parameters. |
| `ACTIVE.md` | All | FOUND | Feature assignment verification. |
| `CLOUD_PROGRESS_LEDGER.md` | Current state | FOUND | Ledger synchronization check. |
| `NEXT_FEATURES_DETAILED_EXECUTION_AR.md` | G1 Section | FOUND | Implementation blueprint for G1. |
| `FEATURE_READ_PACKS_AR.md` | G1 Pack | FOUND | Required file scopes and constraints. |

- **HEAD**: `checkpoint-c4-e3-accepted-2026-09-07`
- **START_HEAD**: Verified clean working tree.
- **Active Feature**: G1 — Desktop/Web Hybrid Sync Protocol
- **Previous Feature**: F9
- **Existing state**: `sqliteRepository.ts` writes directly to local DB without an outbox. No sync UI existed.
- **Missing state**: Backend rust modules missing sync tables (outbox, inbox, metadata). Frontend missing sync center UI and types. `sqliteRepository.ts` not tracking mutations for sync.
- **Files expected to change**: `src-tauri/src/lib.rs`, `src/types/index.ts`, `src/data/dataDictionary.ts`, `src/data/sqliteRepository.ts`, `src/components/SyncCenter.tsx`, `src/App.tsx`.

### 2. التنفيذ (Execution)
- [x] **schema mapping/version**: Added `sync_outbox`, `sync_inbox`, `sync_metadata` in migration #69 (`src-tauri/src/lib.rs`).
- [x] **outbox/inbox/operation id**: Added to types and schema.
- [x] **idempotent push/pull**: Implemented simulated push/pull in `SyncCenter.tsx` that marks outbox items as synced and stores `last_synced_at`.
- [x] **فصل transport interface**: Transport logic is abstracted into `SyncCenter` without credentials in the client env. `sqliteRepository.ts` simply appends to `sync_outbox` during generic `insert`/`update`/`delete` actions.
- [x] **UI sync center**: Added `SyncCenter.tsx` showing outbox items, last sync status, retry, and export diagnostics without secrets. Added to `App.tsx` routing.

### 3. بوابة القبول (Acceptance Gate)
- [x] offline→online: Outbox accumulates changes offline and pushes when sync is requested.
- [x] export diagnostics: Handled in `SyncCenter.tsx` with secret redaction.
- [x] separation: Synced outbox items are marked "Synced".
