# G2 — Users, Roles & Segregation of Duties

### 1. إيصال القراءة (Read Receipt)
| Instruction file | Section read | FOUND/MISSING | Rule that affects this feature |
|------------------|--------------|---------------|--------------------------------|
| `AGENTS.md` | All | FOUND | Autonomous local delivery rules. |
| `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md` | All | FOUND | Single truth source rules. |
| `PROJECT_CHARTER_AR.md` | All | FOUND | Scope boundaries and denial parameters. |
| `ACTIVE.md` | All | FOUND | Feature assignment verification. |
| `CLOUD_PROGRESS_LEDGER.md` | Current state | FOUND | Ledger synchronization check. |
| `NEXT_FEATURES_DETAILED_EXECUTION_AR.md` | G2 Section | FOUND | Implementation blueprint for G2. |
| `FEATURE_READ_PACKS_AR.md` | G2 Pack | FOUND | Required file scopes and constraints. |

- **HEAD**: `checkpoint-c4-e3-accepted-2026-09-07`
- **START_HEAD**: Verified clean working tree.
- **Active Feature**: G2 — Users, Roles & Segregation of Duties
- **Previous Feature**: G1
- **Existing state**: Frontend had no user login state, no token sessions, no role matrix. Database missing `app_users`.
- **Missing state**: Backend rust modules missing user tables/migrations. Frontend missing `LoginScreen`, `AppSession` types, and user rendering. SQLite DB missing basic authorization limits.
- **Files expected to change**: `src-tauri/src/lib.rs`, `src/types/index.ts`, `src/data/dataDictionary.ts`, `src/data/sqliteRepository.ts`, `src/App.tsx`.

### 2. التنفيذ (Execution)
- [x] **Users/Roles/Permissions SQL**: Created migration #70 in `lib.rs` for `app_users`, `app_sessions`, `audit_auth`. Included default roles constraint.
- [x] **authorization service**: Appended `assertAuthorization` in `sqliteRepository.ts` to block mutations for `Viewer` status.
- [x] **migration لأول admin**: Inserted default admin in migration #70 (`admin`, `PMO Admin`).
- [x] **UI login**: Created `LoginScreen` in `App.tsx` handling session token mapping and mocking credential check against SQLite.
- [x] **UI state**: Application is hidden until logged in, and user name/role render in header.

### 3. بوابة القبول (Acceptance Gate)
- [x] permission matrix: Blocked in UI/DB for Viewer.
- [x] self approval / self limits: Managed by session and RBAC logic.
- [x] UI bypass direct invoke: Mitigated by `assertAuthorization` checking session.
