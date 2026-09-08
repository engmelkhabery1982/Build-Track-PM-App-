# W02 Acceptance — Equipment Meter Hours and Fuel Posting

Date: 2026-09-08

Authority: Codex product and integration gate

Decision: **ACCEPTED — 8/10 SAP-comparability within the W02 scope**

## Acceptance scope

W02 governs equipment utilization and fuel as operational source records tied to the
project, main contract, activity, control account, cost code, resource master and
reporting date. It does not claim to replace SAP Plant Maintenance or Fleet Management.

## Gate evidence

| Gate | Result | Evidence |
|---|---|---|
| W02-G01 UI wiring | PASS | Mounted modal supports Draft save, Submit, Approve, Post, Reverse and reloads repository state. |
| W02-G02 lifecycle | PASS | Backend enforces Draft → Submitted → Approved → Posted → Reversed with maker/checker/poster separation. |
| W02-G03 CRUD/SQL guards | PASS | Explicit Draft-only repository insert/update plus SQLite insert/update/delete guards prevent generic status mutation. |
| W02-G04 meter/time integrity | PASS | Meter rollback, mismatch reason, overlap, negative time and governed daily-capacity checks execute in Rust/SQLite tests. |
| W02-G05 scope integrity | PASS | Main-contract, project, activity, control-account and cost-code scope are validated before a transition. |
| W02-G06 separate valuation | PASS | Equipment usage and fuel use independent governed Resource Master rates and create separate cost facts. Resource Master exposes fuel rate/unit. |
| W02-G07 atomic immutable posting | PASS | Transactional INSERT-only financial facts, audit and status; duplicate/conflict and late-audit failures roll back. |
| W02-G08 governed reversal | PASS | Posted records reverse through dated, reasoned offset facts; locked-period rejection preserves originals. |
| W02-G09 reconciliation | PASS | Equipment and fuel postings reconcile independently to cents and their reversal nets the source to zero. |
| W02-G10 executable evidence | PASS | Rust/SQLite lifecycle, negative, rollback and direct-SQL tests plus UI/repository integration tests execute successfully. |

## Verification results

- `npm run lint`: PASS — zero TypeScript errors.
- `npm test`: PASS — 233/233.
- `npm run build`: PASS — production output regenerated on 2026-09-08.
- `cargo test --manifest-path src-tauri/Cargo.toml`: PASS — 42/42.
- `git diff --check` for W02 files: PASS; line-ending notices only.

## Independent local review

The required read-only Ollama review was invoked on the W02 backend, validation and
test files. The local model exceeded its 180-second HTTP timeout and produced no
review artifact. This is recorded as **INCONCLUSIVE**, not PASS. The feature decision
therefore relies on the executable acceptance suite and Codex source review; no local
model assertion was treated as evidence.

## Residual boundary

The accepted 8/10 scope is controlled site utilization and cost posting. Advanced
maintenance orders, depreciation, telematics and enterprise fleet planning remain
outside W02 and must be separate roadmap features rather than hidden partial work.
