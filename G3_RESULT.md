# G3 — Scoped External Portal (Client / Subcontractor / Supplier)

### 1. إيصال القراءة (Read Receipt)
| Instruction file | Section read | FOUND/MISSING | Rule that affects this feature |
|------------------|--------------|---------------|--------------------------------|
| `AGENTS.md` | All | FOUND | Autonomous local delivery rules & SAP-comparability target >= 8/10. |
| `MASTER_CLOUD_DEVELOPMENT_WORK_ORDER_AR.md` | All | FOUND | Single truth source rules & strict segregation. |
| `PROJECT_CHARTER_AR.md` | All | FOUND | Scope boundaries and architectural denial parameters. |
| `ACTIVE.md` | G3 Section | FOUND | Feature assignment verification. |
| `CLOUD_PROGRESS_LEDGER.md` | Current state | FOUND | Ledger synchronization check. |
| `NEXT_FEATURES_DETAILED_EXECUTION_AR.md` | G3 Section | FOUND | Implementation blueprint for Scoped External Portal. |
| `FEATURE_READ_PACKS_AR.md` | G3 Pack | FOUND | Required file scopes and constraints: no direct desktop SQLite writes, scope isolation, upload limits/hash, quarantine. |

- **HEAD**: `checkpoint-c4-e3-accepted-2026-09-07`
- **START_HEAD**: Verified clean working tree.
- **Active Feature**: G3 — Scoped External Portal (Client / Subcontractor / Supplier)
- **Previous Feature**: G2 (Users, Roles & Segregation of Duties)
- **Existing state**: Portal types and security logic were missing. No UI existed for external parties (Client, Subcontractor, Supplier) to submit WIRs, Invoices, Submittals, or Documents under strict party/contract scopes. No sync outbox tables existed in SQLite migrations for portal ingestion.
- **Missing state**: Decoupled portal validation and workflow engine (`portalEngine.ts`), attachment validation/quarantine scanning with SHA-256 calculation, strict segregation of duties (external users cannot self-approve or transition out of draft), rate limiting, G1 sync outbox item generation, Migration 71 for `portal_outbox` and `portal_audit_log`, and responsive interactive UI (`ExternalPortalView.tsx`) integrated into navigation.
- **Files expected to change / added**:
  - `src/types/index.ts` (added PortalUser, PortalSession, PortalSubmission, PortalAttachment, PortalAuditLog, ViewKey update)
  - `src/data/dataDictionary.ts` (added portalSubmission status definitions)
  - `src-tauri/src/lib.rs` (Migration 71: `portal_outbox` and `portal_audit_log` tables)
  - `src/utils/portalEngine.ts` (security engine, session validation, scope access enforcement, role boundaries, file scanner, SHA-256 computation, rate limiting, and G1 sync payload generator)
  - `src/components/ExternalPortalView.tsx` (portal interface with persona switching, scope filtering, submission wizard, live file upload scanning, and G1 sync status monitoring)
  - `src/App.tsx` (fixed compilation duplicate, integrated `ExternalPortalView` into navigation and view rendering)
  - `tests/g3-scoped-portal.test.mjs` (comprehensive adversarial test suite)

### 2. التنفيذ (Execution)
- [x] **Strict Scope & Isolation Model**:
  - Created `validateScopeAccess` and `filterSubmissionsForSession` ensuring external users can only access records matching their exact `party_id`, authorized `contract_ids`, and authorized `project_ids`. Cross-party and guessed IDs throw `PortalSecurityError`.
- [x] **Session & Account Governance**:
  - Created `validateSession` checking token validity, expiration timestamps, and suspended account states.
- [x] **Role Boundaries & Submission Matrix**:
  - Implemented `validateSubmissionTypeForRole`:
    - `Portal_Supplier`: Restricted to Invoices and Documents. Cannot submit Work Inspection Requests (WIR) or technical Submittals directly.
    - `Portal_Client`: Restricted to Submittals and Documents. Cannot submit supplier/subcontractor Invoices.
    - `Portal_Subcontractor`: Permitted to submit WIRs, Invoices, Submittals, and Documents.
- [x] **Attachment Security, Size Limits, Hash & Quarantine**:
  - Implemented `validateAndScanAttachment` and `computeSha256`:
    - File size constraints enforced (0 < size <= 25MB).
    - Prohibited executable and script extensions blocked (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.js`, etc.).
    - Content scanning for malicious script tags and EICAR virus test signatures, routing flagged files into `Quarantined` state and preventing submission.
    - Deterministic SHA-256 cryptographic hash calculated for all valid attachments.
- [x] **Approval Separation & Segregation of Duties**:
  - Implemented `validateWorkflowTransition`: External portal users are strictly blocked from setting submissions to `Approved` or `Rejected` (`PortalSecurityError`). Only internal project control actors can approve or reject submissions.
- [x] **No Direct Desktop SQLite Writes & G1 Outbox Integration**:
  - Implemented `buildG1PortalSyncItem` that constructs G1-compliant queue items (`entity_type: 'portal_submission'`). Submissions are enqueued to the outbox rather than directly altering desktop SQLite tables.
  - Added Migration 71 in `src-tauri/src/lib.rs` providing `portal_outbox` and `portal_audit_log` tables for decoupled desktop reconciliation.
- [x] **Rate Limiting**:
  - Implemented in-memory sliding window rate limiter (`checkRateLimit`) preventing brute force or submission flooding.
- [x] **External Portal UI Component**:
  - Developed `ExternalPortalView.tsx` with persona simulation (Subcontractor, Supplier, Client), live scope filtering, secure attachment scanning indicator, status timelines, and G1 synchronization telemetry.
- [x] **Integration into App.tsx**:
  - Resolved prior TypeScript compilation errors in `App.tsx`, added `portal` to `NAV_ITEMS` under 'Commercial & Cash', and mounted `ExternalPortalView` in `renderView()`.

### 3. بوابة القبول (Acceptance Gate)
- [x] **Tenant Isolation Adversarial Tests**: Verified that accessing cross-party resources throws `PortalSecurityError`.
- [x] **Guessed IDs**: Verified that guessing unauthorized contract or project IDs is strictly denied.
- [x] **Expired Session & Suspended Status**: Verified that expired sessions or suspended accounts are rejected on all operations.
- [x] **Role Boundaries**: Verified strict role-based submission constraints for Suppliers, Clients, and Subcontractors.
- [x] **Upload Limits, Type & Hash**: Verified 25MB boundary, executable blocking, SHA-256 generation, and quarantine of suspicious content.
- [x] **Duplicate Submissions & Rate Limits**: Verified sliding-window rate limit enforcement.
- [x] **Approval Separation**: Verified external actors cannot approve, reject, or bypass workflow transitions.
- [x] **Sync Reconciliation & No Direct Writes**: Verified G1 outbox payload structure and Migration 71 in `lib.rs`.
- [x] **Automated Tests**: All 8 G3 tests in `tests/g3-scoped-portal.test.mjs` passed (0 failures). Full test suite (227 tests) passes.
- [x] **Build & Lint**: `compile_applet` and `lint_applet` both succeeded without warnings or errors.
