# Codex G3 integration and weekly-plan verification — 2026-09-07

## Integrated checkpoints

- Agent Cloud input: `941e4c9`.
- Cleanup/build-fix checkpoint: `7e1ee2d`.
- Reviewed local/official/Agent Cloud checkpoint: `c4c155a`.
- `main`, `origin/main`, and `agent-cloud/main` point to the same commit.

## Accepted corrections

- Preserved useful F3–G3 source and tests; no whole-package rejection.
- Removed temporary cloud patch scripts, `bun.lock`, and cloud metadata.
- Replaced undeclared Rust `chrono`/`uuid` usage with one SQLite transaction time
  and a deterministic report-template audit ID.
- Added a real template-approval test for atomic approval, audit-time equality,
  and refusal of repeated approval.
- Added missing audit tables to commercial/AP Rust fixtures and corrected the labor
  audit assertion to read the governed JSON payload.
- Removed the insecure outer `admin/admin` demo login and restored the existing
  first-local-administrator flow.
- Removed the conflicting second `app_users` table definition from migration 70.

## Automated evidence

- Node: `228 passed`, `0 failed`.
- TypeScript/Vite production build: PASS (`2391 modules transformed`).
- Rust/SQLite: `32 passed`, `0 failed`.
- `git diff --check`: PASS.
- Non-blocking warnings: large Vite bundle and unused Rust fields/parentheses.

## Honest maturity finding

The bundle is integrated and regression-green, but this does **not** prove every
F3–G3 capability is 8/10. Remaining production gaps found by code inspection include:

- Claims save/conversion needs one atomic backend transaction and reliable line
  reopen/linkage.
- Cash and health versions need persisted approved-version consumption.
- Resource-leveling Apply must create/reopen a real Forecast schedule version.
- Generic repository mappings must be proven for every new compact SQL schema.
- Audit + outbox must be atomic with each generic mutation.
- G1/G2/G3 need backend transport/session/authorization/isolation, not demo-only UI.

These are prioritized as W01–W13 in
`docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md`; nothing is marked
`CLOSED — 8/10` until its persistence, reopen, negative, cross-scope, idempotency,
rollback, and reconciliation gates pass.

## Independent Ollama gate

The required read-only review was invoked with five bounded relevant files using
`qwen2.5-coder:7b`. It returned `NOT RUN / TIMEOUT`: the local HTTP client canceled
after 180 seconds. No Ollama output was treated as approval, and Codex's direct code
review findings above remain the governing result.

## Manual PowerShell acceptance

Run from a separate clone so test output cannot modify the development checkout:

```powershell
cd "F:\PM App\BuildTrack-G3-Manual-Test"
git pull
npm ci
npm test
npm run build
cargo test --manifest-path "src-tauri\Cargo.toml"
git status --short
```

Expected: Node `228/228`, Vite `built`, Rust `32/32`, and a blank final status.
